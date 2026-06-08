export default function RotateScreenPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center px-6 text-center">
      <div className="max-w-[530px]">
        <h1 className="font-montserrat-alt text-[28px] font-extrabold text-[#D6B25E] sm:text-[32px]">
          Rotate your device
        </h1>

        <p className="font-montserrat mt-4 text-[15px] leading-[1.5] text-white/80 sm:text-[16px]">
          Game Table is available only on wider screens.
        </p>
      </div>
    </div>
  );
}