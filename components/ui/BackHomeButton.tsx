type BackHomeButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export default function BackHomeButton({
  onClick,
  disabled = false,
  className = '',
}: BackHomeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex min-h-[52px] items-center gap-3 rounded-full border border-white/15 bg-[#091332]/90 px-6 text-[16px] font-semibold leading-none text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-[6px] transition-all duration-200 hover:border-white/30 hover:bg-[#12204D] hover:shadow-[0_14px_36px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>

      <span className="text-white">Back Home</span>
    </button>
  );
}