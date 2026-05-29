type PagePlaceholderProps = {
  title: string;
  subtitle?: string;
};

export default function PagePlaceholder({
  title,
  subtitle = 'This page is currently under development.',
}: PagePlaceholderProps) {
  return (
    <section className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 min-[480px]:min-h-[calc(100vh-68px)] min-[768px]:min-h-[calc(100vh-86px)]">
      <div className="w-full max-w-[720px] rounded-[24px] border border-white/10 bg-white/5 px-6 py-10 text-center backdrop-blur-sm min-[480px]:px-8 min-[480px]:py-12 min-[768px]:px-12 min-[768px]:py-16">
        <h1 className="text-[28px] font-extrabold leading-none tracking-[-0.03em] text-white min-[480px]:text-[36px] min-[768px]:text-[52px]">
          {title}
        </h1>

        <p className="mx-auto mt-4 max-w-[540px] text-[14px] font-medium leading-[1.5] text-[#8E929B] min-[480px]:text-[16px] min-[768px]:mt-5 min-[768px]:text-[18px]">
          {subtitle}
        </p>
      </div>
    </section>
  );
}