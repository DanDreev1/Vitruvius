'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';

import type {
  TabletPlayerCharacter,
  TabletPlayerCharacterDraft,
} from '@/features/tablet/player/types';

type TabletUserPageProps = {
  isEditable: boolean;
  character: TabletPlayerCharacter | null;
  isLoading: boolean;
  error: string | null;
  isEditMode: boolean;
  draft?: TabletPlayerCharacterDraft;
  portraitStatusMessage?: string | null;
  isPortraitSelectionDisabled?: boolean;
  onDescriptionChange?: (description: string) => void;
  onPortraitChangeRequest?: () => boolean;
  onPortraitFileSelect?: (file: File | null) => void;
};

const fallbackDescription = 'No character description yet.';

export default function TabletUserPage({
  isEditable,
  character,
  isLoading,
  error,
  isEditMode,
  draft,
  portraitStatusMessage = null,
  isPortraitSelectionDisabled = false,
  onDescriptionChange,
  onPortraitChangeRequest,
  onPortraitFileSelect,
}: TabletUserPageProps) {
  const portraitInputRef = useRef<HTMLInputElement | null>(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const avatarUrl = isEditMode ? draft?.avatarUrl ?? null : character?.avatarUrl ?? null;
  const shouldShowAvatar = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);

  const description = useMemo(() => {
    if (isLoading) {
      return '';
    }

    return character?.description?.trim() || fallbackDescription;
  }, [character?.description, isLoading]);
  const descriptionDraft = draft?.description ?? '';

  const handlePortraitClick = () => {
    if (!isEditable || !isEditMode || isPortraitSelectionDisabled) {
      return;
    }

    if (onPortraitChangeRequest?.() === false) {
      return;
    }

    portraitInputRef.current?.click();
  };

  return (
    <div className="grid h-full grid-cols-[350px_minmax(0,1fr)] gap-[46px]">
      <div className="flex flex-col items-center pt-[4px]">
        <button
          type="button"
          onClick={handlePortraitClick}
          disabled={!isEditable || !isEditMode || isPortraitSelectionDisabled}
          className="relative flex h-[500px] w-[350px] items-center justify-center overflow-hidden rounded-[26px] bg-[#D9D9D9] disabled:cursor-default"
          title={isEditMode ? "Upload character portrait" : "Character portrait"}
        >
          {shouldShowAvatar && avatarUrl ? (
            <img
              src={avatarUrl}
              alt={character?.name ?? "Character image"}
              className="h-full w-full object-cover"
              draggable={false}
              onError={() => setFailedAvatarUrl(avatarUrl)}
            />
          ) : (
            <Image src="/UploadImage.png" alt="" width={72} height={72} />
          )}
        </button>
        <input
          ref={portraitInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            onPortraitFileSelect?.(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
        <p className="mt-[12px] min-h-[20px] max-w-[350px] text-center font-montserrat text-[14px] font-semibold text-white/70">
          {portraitStatusMessage ?? ''}
        </p>
      </div>

      <section className="max-w-[720px] pt-[4px] text-white">
        <h2 className="font-montserrat-alt text-[32px] font-extrabold leading-none">
          Description
        </h2>

        {error ? (
          <p className="mt-[28px] max-w-[520px] font-montserrat text-[20px] font-semibold leading-[1.25] text-white/70">
            Character data is unavailable right now.
          </p>
        ) : isEditMode ? (
          <textarea
            value={descriptionDraft}
            onChange={(event) => onDescriptionChange?.(event.target.value)}
            className="mt-[24px] h-[444px] w-full resize-none rounded-[20px] border border-white/35 bg-white px-[22px] py-[18px] font-montserrat text-[20px] font-semibold leading-[1.25] text-[#172033] outline-none focus:border-white"
            aria-label="Character description"
            placeholder="Description"
          />
        ) : (
          <p className="mt-[28px] font-montserrat text-[22px] font-semibold leading-[1.2] text-white">
            {description}
          </p>
        )}
      </section>
    </div>
  );
}
