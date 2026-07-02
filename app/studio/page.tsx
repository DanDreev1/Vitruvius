import Image from 'next/image';
import Link from 'next/link';

import ScaledPageViewport from '@/components/layout/ScaledPageViewport';
import Header from '@/components/ui/Header';
import StudioAccessGate from '@/components/studio/StudioAccessGate';

const studioRoles = [
  { href: '/studio/player', eyebrow: 'Player Studio', title: 'Characters', description: 'Create and maintain characters before joining a game.', icon: '/navigation-imgs/player/User.png' },
  { href: '/studio/master', eyebrow: 'Master Studio', title: 'Worlds', description: 'Build scenes, NPCs, assets, notes, and world settings.', icon: '/navigation-imgs/master/Scene.png' },
];

export default function StudioPage() {
  return <StudioAccessGate>{(
    <ScaledPageViewport headerBackdrop>
      <Header fixedLayout />
      <main className="flex h-[780px] items-center justify-center px-10 py-12">
        <section className="w-full max-w-[980px]">
          <div className="text-center"><p className="font-montserrat text-[11px] font-bold uppercase tracking-[.24em] text-white/35">Prepare before the session</p><h1 className="mt-3 font-montserrat-alt text-[58px] font-extrabold text-white">Vitruvius Studio</h1><p className="mx-auto mt-3 max-w-[650px] font-montserrat text-[16px] text-white/50">Choose what you want to work on. Studio data is saved to your permanent characters and worlds, without session-only mechanics.</p></div>
          <div className="mt-10 grid grid-cols-2 gap-6">
            {studioRoles.map((role) => <Link key={role.href} href={role.href} className="group flex min-h-[260px] flex-col rounded-[28px] border border-white/10 bg-[#182135] p-7 transition hover:-translate-y-1 hover:border-white/25 hover:bg-[#1C263B]"><div className="flex h-[64px] w-[64px] items-center justify-center rounded-[19px] bg-white/[.06]"><Image src={role.icon} alt="" width={40} height={40} className="h-10 w-10 object-contain" /></div><p className="mt-6 font-montserrat text-[11px] font-bold uppercase tracking-[.18em] text-white/35">{role.eyebrow}</p><h2 className="mt-2 font-montserrat-alt text-[34px] font-extrabold text-white">{role.title}</h2><p className="mt-3 max-w-[360px] font-montserrat text-[14px] leading-relaxed text-white/50">{role.description}</p><span className="mt-auto self-end text-[26px] text-white/35 transition group-hover:translate-x-1 group-hover:text-white">→</span></Link>)}
          </div>
        </section>
      </main>
    </ScaledPageViewport>
  )}</StudioAccessGate>;
}
