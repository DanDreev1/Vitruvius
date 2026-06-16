'use client';

import type { SceneImagesViewMode } from '@/features/tablet/master/scene/types';

type SceneImagesToolbarProps = {
  canDelete: boolean;
  isCurrentImageActive: boolean;
  viewMode: SceneImagesViewMode;
  onAddImage: () => void;
  onDeleteImage: () => void;
  onToggleImageActive: () => void;
  onChangeViewMode: (mode: SceneImagesViewMode) => void;
};

export default function SceneImagesToolbar({
  canDelete,
  isCurrentImageActive,
  viewMode,
  onAddImage,
  onDeleteImage,
  onToggleImageActive,
  onChangeViewMode,
}: SceneImagesToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-[12px]">
      <button
        type="button"
        onClick={onAddImage}
        className="rounded-[14px] bg-white px-[18px] py-[10px] font-montserrat text-[15px] font-bold text-black"
      >
        Add image
      </button>

      <button
        type="button"
        onClick={onDeleteImage}
        disabled={!canDelete}
        className={[
          'rounded-[14px] px-[18px] py-[10px] font-montserrat text-[15px] font-bold transition-opacity',
          canDelete
            ? 'bg-white text-black'
            : 'cursor-not-allowed bg-white/30 text-black/50',
        ].join(' ')}
      >
        Delete
      </button>

      <button
        type="button"
        onClick={onToggleImageActive}
        disabled={!canDelete}
        className={[
          'rounded-[14px] px-[18px] py-[10px] font-montserrat text-[15px] font-bold transition-opacity',
          canDelete
            ? 'bg-white text-black'
            : 'cursor-not-allowed bg-white/30 text-black/50',
        ].join(' ')}
      >
        {isCurrentImageActive ? 'Hide' : 'Show'}
      </button>

      <div className="ml-auto flex items-center gap-[8px] rounded-full bg-[#5C5C5C] p-[6px]">
        <button
          type="button"
          onClick={() => onChangeViewMode('stack')}
          className={[
            'rounded-full px-[14px] py-[8px] font-montserrat text-[14px] font-bold transition-colors',
            viewMode === 'stack'
              ? 'bg-white text-black'
              : 'bg-transparent text-white',
          ].join(' ')}
        >
          Stack
        </button>

        <button
          type="button"
          onClick={() => onChangeViewMode('fit')}
          className={[
            'rounded-full px-[14px] py-[8px] font-montserrat text-[14px] font-bold transition-colors',
            viewMode === 'fit'
              ? 'bg-white text-black'
              : 'bg-transparent text-white',
          ].join(' ')}
        >
          Fit
        </button>
      </div>
    </div>
  );
}