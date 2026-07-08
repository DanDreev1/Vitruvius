'use client';

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-[18px]">
      <h2 className="font-montserrat-alt text-[30px] font-extrabold text-[#D6B25E]">
        {title}
      </h2>

      {subtitle ? (
        <p className="font-montserrat mt-[6px] text-[15px] text-white/65">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'rounded-[24px] border border-white/8 bg-[#1A2332] p-[18px]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
