type TableTabletButtonProps = {
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  label: string;
  onClick?: () => void;
};

export default function TableTabletButton({
  width,
  height,
  x,
  y,
  rotation,
  label,
  onClick,
}: TableTabletButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group absolute overflow-hidden rounded-[7px] border-[3px] border-[#050608] bg-[#050608] shadow-[0_7px_10px_rgba(0,0,0,.55),0_2px_2px_rgba(0,0,0,.8)] transition-[filter,transform] duration-150 hover:brightness-125 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#6BA8E5]/70"
      style={{
        width,
        height,
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: `translate(-50%, -62%) rotate(${rotation}deg)`,
      }}
    >
      <span className="absolute inset-[2px] overflow-hidden rounded-[3px] border border-[#315E8B] bg-[linear-gradient(145deg,#24598B_0%,#12375F_52%,#0A2545_100%)] shadow-[inset_0_0_7px_rgba(0,0,0,.55)]">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(153,211,255,.25),transparent)]" />
        <span className="absolute left-[8%] top-[18%] h-[34%] w-[36%] -rotate-[8deg] rounded-full bg-white/10 blur-[2px]" />
      </span>
      <span className="absolute right-[2px] top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-[#35516D] shadow-[0_0_2px_rgba(126,190,255,.6)]" />
    </button>
  );
}
