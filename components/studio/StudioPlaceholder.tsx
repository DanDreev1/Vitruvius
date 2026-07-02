export default function StudioPlaceholder({ title, description }: { title: string; description: string }) {
  return <div className="flex h-full items-center justify-center text-center"><div className="max-w-[520px]"><p className="font-montserrat text-[10px] font-bold uppercase tracking-[.22em] text-white/30">Workspace prepared</p><h1 className="mt-3 font-montserrat-alt text-[34px] font-extrabold text-white">{title}</h1><p className="mt-3 font-montserrat text-[14px] leading-relaxed text-white/50">{description}</p></div></div>;
}
