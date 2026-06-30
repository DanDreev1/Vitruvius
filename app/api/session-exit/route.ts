import { createHash, randomUUID } from 'node:crypto';

import {
  authenticateSessionExitRequest,
  cleanupResolvedSessionFiles,
  copyPendingExitFiles,
  getPendingSessionExit,
  isAnonymousUser,
  preserveEndedSessionBeforeUserDeletion,
  removeStoragePrefix,
  queueOverwrittenFiles,
  removeTemporaryExitFiles,
} from '@/features/session-exit/server';
import type { SessionExitSaveMode } from '@/features/session-exit/types';

export const runtime = 'nodejs';

function errorResponse(error: unknown) {
  if (error instanceof Response) return error;
  console.error('Session exit request failed:', error);
  return Response.json(
    { error: error instanceof Error ? error.message : 'Session exit failed.' },
    { status: 500 }
  );
}

function hashHandoffToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET(request: Request) {
  try {
    const { userClient, user } = await authenticateSessionExitRequest(request);
    const pending = await getPendingSessionExit(userClient);
    return Response.json({ pending, isAnonymous: isAnonymousUser(user) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { admin, userClient, user } = await authenticateSessionExitRequest(request);
    const body = (await request.json()) as {
      action?: 'begin' | 'discard' | 'save' | 'prepare-handoff' | 'claim-handoff';
      sessionId?: string;
      participantId?: string;
      mode?: SessionExitSaveMode;
      handoffToken?: string;
    };

    if (body.action === 'begin') {
      if (!body.sessionId) {
        return Response.json({ error: 'Session id is required.' }, { status: 400 });
      }
      const { data, error } = await userClient.rpc('begin_session_exit', {
        p_session_id: body.sessionId,
      });
      if (error) throw new Error(error.message);
      return Response.json(data);
    }

    if (body.action === 'prepare-handoff') {
      if (!isAnonymousUser(user)) {
        return Response.json({ error: 'The current user is not anonymous.' }, { status: 400 });
      }
      const pending = await getPendingSessionExit(userClient);
      if (!pending) {
        return Response.json({ error: 'Pending session exit was not found.' }, { status: 404 });
      }
      const token = randomUUID();
      const { error } = await admin.from('session_exit_handoffs').insert({
        token_hash: hashHandoffToken(token),
        participant_id: pending.participantId,
        anonymous_user_id: user.id,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
      if (error) throw new Error(error.message);
      return Response.json({ handoffToken: token });
    }

    if (body.action === 'claim-handoff') {
      if (isAnonymousUser(user) || !body.handoffToken) {
        return Response.json({ error: 'A permanent account is required.' }, { status: 400 });
      }
      const tokenHash = hashHandoffToken(body.handoffToken);
      const { data: handoff, error: handoffError } = await admin
        .from('session_exit_handoffs')
        .select('participant_id, anonymous_user_id, expires_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (handoffError || !handoff || Date.parse(handoff.expires_at) <= Date.now()) {
        return Response.json({ error: 'The sign-in handoff has expired.' }, { status: 400 });
      }

      const { data: participant, error: participantError } = await admin
        .from('session_participants')
        .select('session_id, role')
        .eq('id', handoff.participant_id)
        .eq('user_id', handoff.anonymous_user_id)
        .eq('participation_status', 'save_pending')
        .single();
      if (participantError) throw new Error(participantError.message);

      const { error: updateParticipantError } = await admin
        .from('session_participants')
        .update({
          user_id: user.id,
          previous_anonymous_user_id: handoff.anonymous_user_id,
        })
        .eq('id', handoff.participant_id);
      if (updateParticipantError) throw new Error(updateParticipantError.message);

      if (participant.role === 'master') {
        const { error: updateSessionOwnerError } = await admin
          .from('live_sessions')
          .update({ created_by: user.id })
          .eq('id', participant.session_id)
          .eq('created_by', handoff.anonymous_user_id);
        if (updateSessionOwnerError) throw new Error(updateSessionOwnerError.message);
      }

      const { error: updateCharacterError } = await admin
        .from('in_game_characters')
        .update({ user_id: user.id })
        .eq('session_id', participant.session_id)
        .eq('user_id', handoff.anonymous_user_id);
      if (updateCharacterError) throw new Error(updateCharacterError.message);

      await admin.from('session_exit_handoffs').delete().eq('token_hash', tokenHash);
      return Response.json({ claimed: true });
    }

    const pending = await getPendingSessionExit(userClient);
    if (!pending || pending.participantId !== body.participantId) {
      return Response.json({ error: 'Pending session exit was not found.' }, { status: 404 });
    }

    if (body.action === 'discard') {
      const { data: participant } = await admin
        .from('session_participants')
        .select('previous_anonymous_user_id')
        .eq('id', pending.participantId)
        .single();
      if (pending.role === 'player') {
        await removeTemporaryExitFiles(admin, pending);
      }
      const { error } = await userClient.rpc('discard_my_session_exit', {
        p_participant_id: pending.participantId,
      });
      if (error) throw new Error(error.message);

      await cleanupResolvedSessionFiles(admin, pending.sessionId);

      if (isAnonymousUser(user)) {
        await preserveEndedSessionBeforeUserDeletion(admin, pending.sessionId, user.id);
        await removeStoragePrefix(admin, 'temporary-avatars', user.id);
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
        if (deleteError) throw new Error(deleteError.message);
      }
      if (participant?.previous_anonymous_user_id) {
        await preserveEndedSessionBeforeUserDeletion(
          admin,
          pending.sessionId,
          participant.previous_anonymous_user_id
        );
        await removeStoragePrefix(admin, 'temporary-avatars', participant.previous_anonymous_user_id);
        await admin.auth.admin.deleteUser(participant.previous_anonymous_user_id);
      }

      return Response.json({ resolved: true, deletedAnonymousUser: isAnonymousUser(user) });
    }

    if (body.action === 'save') {
      if (isAnonymousUser(user)) {
        return Response.json(
          { error: 'Sign in before saving this session.' },
          { status: 403 }
        );
      }
      if (body.mode !== 'new' && body.mode !== 'current') {
        return Response.json({ error: 'Save mode is required.' }, { status: 400 });
      }

      const destinationId =
        body.mode === 'current'
          ? pending.role === 'master'
            ? pending.sourceWorldId
            : pending.sourceCharacterId
          : randomUUID();

      if (!destinationId) {
        return Response.json(
          { error: 'There is no current record to overwrite.' },
          { status: 400 }
        );
      }

      const rpcName =
        pending.role === 'master'
          ? 'save_my_session_world'
          : 'save_my_session_character';
      const idKey = pending.role === 'master' ? 'p_world_id' : 'p_character_id';
      if (body.mode === 'current') {
        await queueOverwrittenFiles(admin, pending, destinationId);
      }
      const copiedFiles = await copyPendingExitFiles(admin, pending, destinationId);
      const { data: participant } = await admin
        .from('session_participants')
        .select('previous_anonymous_user_id')
        .eq('id', pending.participantId)
        .single();
      const { data, error } = await userClient.rpc(rpcName, {
        p_participant_id: pending.participantId,
        p_mode: body.mode,
        [idKey]: destinationId,
        p_avatar_url: copiedFiles.avatarUrl,
        p_file_urls: copiedFiles.replacements,
      });
      if (error) throw new Error(error.message);

      if (pending.role === 'player') {
        await removeTemporaryExitFiles(admin, pending);
      }
      await cleanupResolvedSessionFiles(admin, pending.sessionId);
      if (participant?.previous_anonymous_user_id) {
        await preserveEndedSessionBeforeUserDeletion(
          admin,
          pending.sessionId,
          participant.previous_anonymous_user_id
        );
        await removeStoragePrefix(admin, 'temporary-avatars', participant.previous_anonymous_user_id);
        await admin.auth.admin.deleteUser(participant.previous_anonymous_user_id);
      }
      return Response.json({ resolved: true, id: data });
    }

    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
