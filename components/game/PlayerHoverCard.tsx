'use client';

import { useMemo, useState } from 'react';

type PlayerHoverCardProps = {
  left: number;
  top: number;
  name: string;
  role: string;
  avatarUrl?: string | null;
  width: number;
  avatarSize: number;
  padding: number;
  gap: number;
  nameFontSize: number;
  roleFontSize: number;
};

const PLACEHOLDER_SRC = '/avatar-placeholder.png';

export default function PlayerHoverCard({
  left,
  top,
  name,
  role,
  avatarUrl,
  width,
  avatarSize,
  padding,
  gap,
  nameFontSize,
  roleFontSize,
}: PlayerHoverCardProps) {
  const [hasImageError, setHasImageError] = useState(false);

  const src = useMemo(() => {
    if (!avatarUrl || hasImageError) {
      return PLACEHOLDER_SRC;
    }

    return avatarUrl;
  }, [avatarUrl, hasImageError]);

  return (
    <div
      className="pointer-events-none absolute z-[60] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/10 bg-[#182135] shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        padding: `${padding}px`,
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: `${gap}px`,
        }}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded-full border-2 border-white/10 bg-[#D9D9D9]"
          style={{
            width: `${avatarSize}px`,
            height: `${avatarSize}px`,
            minWidth: `${avatarSize}px`,
            minHeight: `${avatarSize}px`,
          }}
        >
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setHasImageError(true)}
            draggable={false}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="font-montserrat-alt line-clamp-2 break-words font-extrabold leading-[1.05] text-white"
            style={{
              fontSize: `${nameFontSize}px`,
            }}
          >
            {name}
          </p>

          <p
            className="font-montserrat mt-1 font-medium text-[#D6B25E]"
            style={{
              fontSize: `${roleFontSize}px`,
            }}
          >
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}