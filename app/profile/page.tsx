'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Header from '@/components/ui/Header';
import ScaledPageViewport from '@/components/layout/ScaledPageViewport';
import { getCurrentUser } from '@/features/auth/getCurrentUser';
import { signOutUser } from '@/features/auth/signOutUser';
import {
  deleteOwnAccount,
  getUserProfile,
  saveProfileAvatar,
  saveProfileNickname,
} from '@/features/profile/api';
import {
  LOBBY_AVATAR_ALLOWED_MIME_TYPES,
  LOBBY_AVATAR_MAX_FILE_SIZE_BYTES,
} from '@/features/lobby/constants';

type UserInfo = { id: string; email?: string; nickname: string; avatarUrl: string | null };

export default function ProfilePage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteSeconds, setDeleteSeconds] = useState(10);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    void getCurrentUser().then((currentUser) => {
      if (!currentUser || currentUser.is_anonymous) {
        router.replace('/login');
        return;
      }
      const profile = getUserProfile(currentUser);
      setUser({ id: currentUser.id, email: currentUser.email, ...profile });
      setNickname(profile.nickname);
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not load profile.'))
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    if (!showDelete || deleteSeconds <= 0) return;
    const timer = window.setInterval(() => setDeleteSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [deleteSeconds, showDelete]);

  const saveNickname = async () => {
    const value = nickname.trim();
    if (!user || !value || value === user.nickname || isBusy) return;
    setIsBusy(true); setError(null); setMessage(null);
    try {
      await saveProfileNickname(value);
      setUser({ ...user, nickname: value });
      setNickname(value);
      setMessage('Profile nickname saved.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not save nickname.'); }
    finally { setIsBusy(false); }
  };

  const saveAvatar = async (file: File | null) => {
    if (!file || !user || isBusy) return;
    if (!LOBBY_AVATAR_ALLOWED_MIME_TYPES.includes(file.type) || file.size > LOBBY_AVATAR_MAX_FILE_SIZE_BYTES) {
      setError('Choose a JPG, PNG, WEBP, or GIF image up to 5 MB.'); return;
    }
    setIsBusy(true); setError(null); setMessage(null);
    try {
      const avatarUrl = await saveProfileAvatar(user.id, file);
      setUser({ ...user, avatarUrl });
      setMessage('Profile avatar saved.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Could not upload avatar.'); }
    finally { setIsBusy(false); }
  };

  const logout = async () => {
    setIsBusy(true);
    try { await signOutUser(); router.replace('/login'); }
    catch (logoutError) { setError(logoutError instanceof Error ? logoutError.message : 'Could not log out.'); setIsBusy(false); }
  };

  const deleteAccount = async () => {
    if (!user || deleteSeconds > 0 || deleteConfirmation !== user.nickname || isBusy) return;
    setIsBusy(true); setError(null);
    try {
      await deleteOwnAccount(deleteConfirmation);
      await signOutUser().catch(() => undefined);
      router.replace('/');
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Could not delete account.'); setIsBusy(false); }
  };

  return (
    <ScaledPageViewport headerBackdrop><Header fixedLayout />
      <main className="mx-auto flex h-[780px] w-full max-w-[1120px] items-center overflow-y-auto px-8 py-6">
        <section className="w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#182135] shadow-2xl">
          <div className="border-b border-white/[.07] px-6 py-6 sm:px-9">
            <p className="font-montserrat text-[11px] font-bold uppercase tracking-[.22em] text-white/40">Account</p>
            <h1 className="mt-2 font-montserrat-alt text-[34px] font-extrabold text-white">Your profile</h1>
            <p className="mt-2 font-montserrat text-[14px] text-white/50">These details will be used automatically when you join a lobby.</p>
          </div>
          {isLoading ? <p className="p-9 text-white/60">Loading profile…</p> : user ? (
            <div className="grid grid-cols-[1fr_300px] gap-7 p-9">
              <div className="space-y-5">
                <div className="flex items-center gap-5 rounded-[22px] border border-white/[.08] bg-[#111A2D] p-5">
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="h-[92px] w-[92px] shrink-0 rounded-full border-2 border-white/15 bg-[#252F43] bg-cover bg-center transition hover:border-white/45" style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined} aria-label="Change profile avatar" />
                  <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { void saveAvatar(event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ''; }} />
                  <div><p className="font-montserrat-alt text-[20px] font-extrabold text-white">Profile avatar</p><p className="mt-2 font-montserrat text-[12px] leading-relaxed text-white/45">Click the circle to upload an image. Maximum size: 5 MB.</p></div>
                </div>
                <div className="rounded-[22px] border border-white/[.08] bg-[#111A2D] p-5">
                  <label className="font-montserrat-alt text-[18px] font-extrabold text-white">Nickname</label>
                  <div className="mt-3 flex gap-2"><input value={nickname} maxLength={36} onChange={(event) => setNickname(event.target.value)} className="h-[50px] min-w-0 flex-1 rounded-[14px] border border-white/10 bg-[#0B1020] px-4 font-montserrat text-[14px] font-bold text-white outline-none focus:border-white/35" placeholder="Your nickname" /><button type="button" onClick={() => void saveNickname()} disabled={!nickname.trim() || nickname.trim() === user.nickname || isBusy} className="rounded-[14px] bg-white px-6 font-montserrat text-[13px] font-extrabold text-[#172033] disabled:opacity-35">Save</button></div>
                  <p className="mt-3 font-montserrat text-[12px] text-white/40">You can still use a different nickname inside a specific lobby.</p>
                </div>
                {message ? <p className="rounded-[14px] bg-emerald-400/10 px-4 py-3 font-montserrat text-[13px] text-emerald-300">{message}</p> : null}
                {error ? <p className="rounded-[14px] bg-red-400/10 px-4 py-3 font-montserrat text-[13px] text-red-300">{error}</p> : null}
              </div>
              <aside className="flex flex-col gap-4">
                <div className="rounded-[20px] border border-white/[.08] p-5"><p className="text-[11px] uppercase tracking-widest text-white/35">Email</p><p className="mt-2 break-all font-montserrat text-[14px] font-bold text-white/75">{user.email}</p></div>
                <button type="button" onClick={() => void logout()} disabled={isBusy} className="rounded-[16px] border border-white/15 px-5 py-4 font-montserrat text-[14px] font-bold text-white transition hover:bg-white/[.05]">Log out</button>
                <button type="button" onClick={() => { setShowDelete(true); setDeleteSeconds(10); setDeleteConfirmation(''); setError(null); }} disabled={!user.nickname || isBusy} className="mt-auto rounded-[16px] border border-red-300/20 px-5 py-4 font-montserrat text-[13px] font-bold text-red-300/75 transition hover:bg-red-400/[.06]">Delete account</button>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
      {showDelete && user ? <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#070C17]/90 p-4 backdrop-blur-md"><section className="w-full max-w-[500px] rounded-[26px] border border-red-300/15 bg-[#172033] p-6 shadow-2xl"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-red-300/60">Permanent action</p><h2 className="mt-2 font-montserrat-alt text-[28px] font-extrabold text-white">Delete your account?</h2><p className="mt-3 text-[13px] leading-relaxed text-white/55">All characters, worlds, files, and account data will be permanently removed.</p>{deleteSeconds > 0 ? <div className="mt-5 rounded-[16px] bg-white/[.04] p-4 text-center font-montserrat text-[14px] text-white/60">Confirmation unlocks in <strong className="text-white">{deleteSeconds}</strong> seconds</div> : <div className="mt-5"><p className="mb-2 text-[12px] text-white/50">Type <strong className="text-white">{user.nickname}</strong> to confirm</p><input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} className="h-[48px] w-full rounded-[13px] border border-white/10 bg-[#0B1020] px-4 text-white outline-none focus:border-red-300/40" /></div>}<div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setShowDelete(false)} disabled={isBusy} className="rounded-[13px] border border-white/15 py-3 font-bold text-white">Cancel</button><button type="button" onClick={() => void deleteAccount()} disabled={deleteSeconds > 0 || deleteConfirmation !== user.nickname || isBusy} className="rounded-[13px] bg-red-400 py-3 font-bold text-[#172033] disabled:opacity-30">Delete forever</button></div></section></div> : null}
    </ScaledPageViewport>
  );
}
