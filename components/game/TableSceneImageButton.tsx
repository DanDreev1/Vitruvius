'use client';

import type { SceneImageItem } from '@/features/tablet/master/scene/types';
import type { DensityPreset } from '@/lib/game/types';
import { useTranslations } from 'next-intl';

type TableSceneImageButtonProps = {
  image: SceneImageItem;
  density: DensityPreset;
  onClick: () => void;
};

export default function TableSceneImageButton({
  image,
  density,
  onClick,
}: TableSceneImageButtonProps) {
  const t = useTranslations('Game');
  if (!image.imageUrl) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0"
      style={{
        width: `${density.tableImageMaxWidth}px`,
        height: `${density.tableImageMaxHeight}px`,
      }}
      aria-label={t('openImage', { title: image.title })}
    >
      <span
        className="relative flex h-full w-full items-center justify-center"
        style={{
          animation: 'table-scene-image-idle 4.8s ease-in-out infinite',
        }}
      >
        <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[62%] w-[82%] -translate-x-1/2 -translate-y-[35%] rounded-full bg-white/12 blur-[18px]" />
        <img
          src={image.imageUrl}
          alt={image.title}
          className="max-h-full max-w-full rounded-[10px] object-contain shadow-[0_14px_30px_rgba(0,0,0,0.28),0_0_18px_rgba(255,255,255,0.14)]"
          draggable={false}
        />
      </span>
    </button>
  );
}
