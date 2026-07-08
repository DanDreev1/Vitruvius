'use client';

import { useMemo, useState } from 'react';

type ParticipantAvatarProps = {
  avatarUrl?: string | null;
  displayName: string;
  size: number;
  isMaster?: boolean;
  isOffline?: boolean;
  className?: string;
};

const PLACEHOLDER_SRC = '/avatar-placeholder.png';

export default function ParticipantAvatar({
  avatarUrl,
  displayName,
  size,
  isMaster = false,
  isOffline = false,
  className = '',
}: ParticipantAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  const src = useMemo(() => {
    if (!avatarUrl || hasImageError) {
      return PLACEHOLDER_SRC;
    }

    return avatarUrl;
  }, [avatarUrl, hasImageError]);

  return (
    <div
      className={[
        'relative overflow-hidden rounded-full bg-[#D9D9D9]',
        isMaster ? 'border-4 border-[#D6B25E]' : 'border-2 border-white/15',
        className,
      ].join(' ')}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        opacity: isOffline ? 0.45 : 1,
      }}
    >
      <img
        src={src}
        alt={displayName}
        className="h-full w-full object-cover"
        onError={() => setHasImageError(true)}
        draggable={false}
      />
    </div>
  );
}