'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import ScaledPageViewport from '@/components/layout/ScaledPageViewport';
import Header from '@/components/ui/Header';
import { createStudioEntity, deleteStudioEntity, loadStudioEntities, type StudioEntity } from '@/features/studio/api';
import type { StudioRole, StudioTab, StudioTabConfig } from '@/features/studio/types';

export type StudioDraftExitActions = {
  canSave: boolean;
  save: () => Promise<boolean>;
};

type StudioWorkspaceProps<TTab extends StudioTab> = {
  role: StudioRole;
  entityLabel: string;
  tabs: StudioTabConfig<TTab>[];
  renderContent: (tab: TTab, entity: StudioEntity, onEntityChange: (patch: Partial<StudioEntity>) => void, registerDraftExitActions: (actions: StudioDraftExitActions | null) => void) => React.ReactNode;
};

export default function StudioWorkspace<TTab extends StudioTab>({ role, entityLabel, tabs, renderContent }: StudioWorkspaceProps<TTab>) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TTab>(tabs[0].key);
  const [entities, setEntities] = useState<StudioEntity[]>([]);
  const [selected, setSelected] = useState<StudioEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudioEntity | null>(null);
  const [isLeaveConfirmationOpen, setIsLeaveConfirmationOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [canSaveDraftOnExit, setCanSaveDraftOnExit] = useState(false);
  const [isSavingDraftOnExit, setIsSavingDraftOnExit] = useState(false);
  const [draftExitActions, setDraftExitActions] = useState<StudioDraftExitActions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pluralLabel = role === 'master' ? 'worlds' : 'characters';
  const entityTitle = entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1);
  const pluralTitle = pluralLabel.charAt(0).toUpperCase() + pluralLabel.slice(1);
  const updateSelectedEntity = useCallback((patch: Partial<StudioEntity>) => {
    if (!selected) return;
    const next = { ...selected, ...patch };
    setSelected(next);
    setEntities((current) => {
      const previousIndex = current.findIndex((entity) => entity.id === selected.id);
      if (previousIndex < 0) return next.isDraft ? current : [next, ...current];
      return current.map((entity, index) => index === previousIndex ? next : entity);
    });
  }, [selected]);

  useEffect(() => {
    void loadStudioEntities(role).then(setEntities).catch((loadError) => {
      const message = loadError instanceof Error ? loadError.message : 'Could not load Studio.';
      if (message.includes('Log in')) { router.replace(`/login?next=/studio/${role}`); return; }
      setError(message);
    }).finally(() => setIsLoading(false));
  }, [role, router]);

  const createEntity = async () => {
    if (isBusy) return;
    if (role === 'player') {
      setActiveTab(tabs[0].key);
      setSelected({ id: `draft-${crypto.randomUUID()}`, name: 'New character', avatarUrl: null, isDraft: true });
      return;
    }
    setIsBusy(true); setError(null);
    try {
      const entity = await createStudioEntity(role);
      setEntities((current) => [entity, ...current]);
      setSelected(entity);
    } catch (createError) { setError(createError instanceof Error ? createError.message : 'Could not create item.'); }
    finally { setIsBusy(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isBusy) return;
    setIsBusy(true); setError(null);
    try {
      if (!deleteTarget.isDraft) await deleteStudioEntity(role, deleteTarget.id);
      setEntities((current) => current.filter((entity) => entity.id !== deleteTarget.id));
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Could not delete item.'); }
    finally { setIsBusy(false); }
  };

  const requestEditorExit = () => {
    if (selected?.isDraft) {
      setIsLeaveConfirmationOpen(true);
      return;
    }
    setSelected(null);
  };

  const confirmEditorExit = () => {
    setIsLeaveConfirmationOpen(false);
    setSelected(null);
    setActiveTab(tabs[0].key);
  };

  const registerDraftExitActions = useCallback((actions: StudioDraftExitActions | null) => {
    setDraftExitActions(actions);
    setCanSaveDraftOnExit(actions?.canSave ?? false);
  }, []);

  const saveAndExitEditor = async () => {
    const actions = draftExitActions;
    if (!actions?.canSave || isSavingDraftOnExit) return;
    setIsSavingDraftOnExit(true);
    try {
      if (await actions.save()) {
        setIsLeaveConfirmationOpen(false);
        setSelected(null);
        setActiveTab(tabs[0].key);
      }
    } finally {
      setIsSavingDraftOnExit(false);
    }
  };

  return (
    <ScaledPageViewport headerBackdrop>
      <Header fixedLayout />
      {!selected ? (
        <main className="flex h-[780px] items-center justify-center px-6 py-8">
          <section className="flex h-[660px] w-full max-w-[1120px] flex-col rounded-[28px] border border-white/[.08] bg-[#141D2E] p-6">
            <div className="flex items-center justify-between border-b border-white/[.07] pb-5">
              <div><Link href="/studio" className="group inline-flex items-center gap-2.5 font-montserrat text-[13px] font-extrabold text-white transition hover:opacity-70"><Image src="/Logo_Icon.png" alt="" width={25} height={25} className="h-[25px] w-[25px] object-contain transition-transform duration-300 group-hover:-translate-y-0.5" /><span>Vitruvius Studio</span></Link><h1 className="mt-3 font-montserrat-alt text-[34px] font-extrabold text-white">Your {pluralTitle}</h1><p className="mt-1 font-montserrat text-[13px] text-white/55">Choose an existing {entityLabel} to edit or create a new one.</p></div>
              <span className="rounded-full border border-white/10 px-4 py-2 font-montserrat text-[12px] font-bold text-white/45">{entities.length} {entities.length === 1 ? entityLabel : pluralLabel}</span>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-2">
              {isLoading ? <div className="grid h-full place-items-center text-white/45">Loading {pluralLabel}…</div> : entities.length ? (
                <div className="grid grid-cols-3 gap-4">
                  {entities.map((entity) => <article key={entity.id} className="group rounded-[21px] border border-white/[.08] bg-[#182135] p-4 transition hover:border-white/20"><button type="button" onClick={() => setSelected(entity)} className="w-full text-left"><div className="h-[130px] w-full rounded-[16px] bg-[#0D1525] bg-cover bg-center" style={entity.avatarUrl ? { backgroundImage: `url(${entity.avatarUrl})` } : undefined}>{!entity.avatarUrl ? <div className="flex h-full items-center justify-center font-montserrat-alt text-[42px] font-extrabold uppercase text-white/15">{entity.name.charAt(0)}</div> : null}</div><h2 className="mt-4 truncate font-montserrat-alt text-[20px] font-extrabold text-white">{entity.name}</h2><p className="mt-1 font-montserrat text-[11px] text-white/35">Open {entityLabel} editor →</p></button><button type="button" onClick={() => setDeleteTarget(entity)} className="mt-4 w-full rounded-[11px] border border-red-300/10 py-2 font-montserrat text-[11px] font-bold text-red-300/45 transition hover:bg-red-400/[.06] hover:text-red-300">Delete {entityLabel}</button></article>)}
                </div>
              ) : <div className="grid h-full place-items-center text-center"><div><h2 className="font-montserrat-alt text-[28px] font-extrabold text-white">No {pluralLabel} yet</h2><p className="mt-2 text-[13px] text-white/45">Create your first {entityLabel} to start building.</p></div></div>}
            </div>
            <button type="button" onClick={() => void createEntity()} disabled={isBusy} className="mt-5 flex h-[58px] shrink-0 items-center justify-center gap-3 rounded-[16px] bg-white font-montserrat text-[14px] font-extrabold text-[#172033] transition hover:bg-white/90 disabled:opacity-40"><span className="text-[25px] font-normal leading-none">+</span>Add {entityTitle}</button>
            {error ? <p className="mt-3 text-center text-[12px] text-red-300">{error}</p> : null}
          </section>
        </main>
      ) : (
        <main className="grid h-[780px] grid-cols-[145px_minmax(0,1fr)] gap-5 p-6">
          <aside className="flex h-full min-h-0 flex-col items-center rounded-[25px] border border-white/[.08] bg-[#11192A] px-2.5 py-5">
            <button type="button" onClick={requestEditorExit} className="group mb-2 flex h-[82px] w-full shrink-0 flex-col items-center justify-center gap-2 font-montserrat text-[15px] font-extrabold text-white transition hover:opacity-70">
              <Image
                src={role === 'master' ? '/navigation-imgs/master/Scene.png' : '/navigation-imgs/player/User.png'}
                alt=""
                width={34}
                height={34}
                className="h-[34px] w-[34px] object-contain transition-transform duration-300 group-hover:-translate-y-0.5"
              />
              <span>{pluralTitle}</span>
            </button>
            <nav className="flex min-h-0 flex-1 flex-col items-center justify-around">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;
                return <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} title={tab.label} className="group relative flex h-[62px] w-[76px] items-center justify-center"><span className={`pointer-events-none absolute h-[62px] w-[62px] transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}><Image src="/tablet/master/scene/tabs/tab-active-frame-left.svg" alt="" fill sizes="62px" className="object-contain" /></span><Image src={tab.iconSrc} alt="" width={35} height={35} className="relative z-10 h-[35px] w-[35px] object-contain" /></button>;
              })}
            </nav>
          </aside>
          <section className="flex h-full min-h-0 flex-col">
            <div className="mb-5 flex h-[64px] shrink-0 items-center justify-between rounded-[18px] border border-white/[.08] bg-[#182135] px-5"><div><p className="font-montserrat text-[11px] font-extrabold uppercase tracking-[.16em] text-white">{entityTitle}</p><p className="mt-1 font-montserrat-alt text-[18px] font-extrabold text-white">{selected.name}</p></div><button type="button" onClick={requestEditorExit} className="rounded-[12px] border border-white/15 px-4 py-2 font-montserrat text-[11px] font-extrabold text-white transition hover:bg-white/[.05]">Change {entityTitle}</button></div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/[.08] bg-[#141D2E] p-5">{renderContent(activeTab, selected, updateSelectedEntity, registerDraftExitActions)}</div>
          </section>
        </main>
      )}

      {deleteTarget ? <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#070C17]/85 p-5 backdrop-blur-md"><section className="w-full max-w-[450px] rounded-[24px] border border-red-300/15 bg-[#172033] p-6"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-red-300/55">Delete {entityLabel}</p><h2 className="mt-2 font-montserrat-alt text-[26px] font-extrabold text-white">Delete “{deleteTarget.name}”?</h2><p className="mt-3 font-montserrat text-[13px] leading-relaxed text-white/50">This action permanently removes the {entityLabel} and its related files.</p><div className="mt-6 grid grid-cols-2 gap-2"><button type="button" onClick={() => setDeleteTarget(null)} disabled={isBusy} className="rounded-[13px] border border-white/15 py-3 font-bold text-white">Cancel</button><button type="button" onClick={() => void confirmDelete()} disabled={isBusy} className="rounded-[13px] bg-red-400 py-3 font-bold text-[#172033] disabled:opacity-40">{isBusy ? 'Deleting…' : 'Delete'}</button></div></section></div> : null}
      {isLeaveConfirmationOpen ? <div className="fixed inset-0 z-[1000] grid place-items-center bg-[#070C17]/85 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="leave-character-editor-title"><section className="w-full max-w-[520px] rounded-[24px] border border-white/15 bg-[#172033] p-6 shadow-[0_28px_80px_rgba(0,0,0,.5)]"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/40">Unsaved character</p><h2 id="leave-character-editor-title" className="mt-2 font-montserrat-alt text-[27px] font-extrabold text-white">Save before leaving?</h2><p className="mt-3 font-montserrat text-[13px] leading-relaxed text-white/55">You can keep editing, leave and discard this draft, or save the character before returning to your character list.</p>{!canSaveDraftOnExit ? <div className="mt-4 rounded-[12px] border border-white/10 bg-white/[.04] px-4 py-3"><p className="font-montserrat text-[11px] font-semibold text-white/55">Add a character name and description to enable saving.</p></div> : null}<button type="button" onClick={() => void saveAndExitEditor()} disabled={!canSaveDraftOnExit || isSavingDraftOnExit} className="mt-5 h-[50px] w-full rounded-[13px] bg-white font-montserrat-alt text-[14px] font-extrabold text-[#172033] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">{isSavingDraftOnExit ? 'Saving character…' : 'Save and exit'}</button><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setIsLeaveConfirmationOpen(false)} disabled={isSavingDraftOnExit} className="rounded-[13px] border border-white/15 py-3 font-bold text-white transition hover:bg-white/[.05] disabled:opacity-40">Keep editing</button><button type="button" onClick={confirmEditorExit} disabled={isSavingDraftOnExit} className="rounded-[13px] border border-red-300/25 py-3 font-bold text-red-200 transition hover:bg-red-400/10 disabled:opacity-40">Exit without saving</button></div></section></div> : null}
    </ScaledPageViewport>
  );
}
