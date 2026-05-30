import Image from 'next/image';
import Link from 'next/link';

type HeaderProps = {
  logoSrc?: string;
  creatorsHref?: string;
  profileHref?: string;
  isAuthenticated?: boolean;
  avatarSrc?: string | null;
  avatarPlaceholderSrc?: string;
};

export default function Header({
  logoSrc = '/Logo_Icon.png',
  creatorsHref = '/creators',
  profileHref = '/profile',
  isAuthenticated = false,
  avatarSrc = null,
  avatarPlaceholderSrc = '/Profile_Placeholder.png',
}: HeaderProps) {
  const currentAvatar = isAuthenticated && avatarSrc ? avatarSrc : avatarPlaceholderSrc;

  return (
    <header
      className="hidden min-[320px]:block w-full bg-[#182135]"
      style={{
        fontFamily: '"Monsteratt Alternatives", "Montserrat Alternates", sans-serif',
      }}
    >
      <div className="flex h-[56px] items-center justify-between px-3 min-[480px]:h-[68px] min-[480px]:px-5 min-[768px]:h-[86px] min-[768px]:px-7">
        <Link
          href="/"
          aria-label="Go to home page"
          className="flex items-center gap-2 min-[480px]:gap-3"
        >
          <Image
            src={logoSrc}
            alt="Vitruvius logo"
            priority
            width={160}
            height={90}
            className="h-[22px] w-auto min-[480px]:h-[28px] min-[768px]:h-[42px]"
          />

          <span className="font-montserrat-alt select-none text-[20px] font-extrabold leading-none tracking-[-0.03em] text-[#D6B25E] min-[480px]:text-[26px] min-[768px]:text-[40px]">
            Vitruvius
          </span>
        </Link>

        <div className="flex items-center gap-3 min-[480px]:gap-5 min-[768px]:gap-7">
          <Link
            href={creatorsHref}
            className="font-montserrat-alt text-[12px] font-extrabold leading-none text-[#8D8D8D] transition-colors duration-200 hover:text-white min-[480px]:text-[14px] min-[768px]:text-[22px]"
          >
            Creators
          </Link>

          <Link
            href={profileHref}
            aria-label="Open profile page"
            className="flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-full border border-white bg-black transition-colors duration-200 hover:border-[#D6B25E] min-[480px]:h-[36px] min-[480px]:w-[36px] min-[768px]:h-[48px] min-[768px]:w-[48px]"
          >
            <Image
              src={currentAvatar}
              alt="Profile avatar"
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}