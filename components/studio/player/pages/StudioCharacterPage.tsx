'use client';

import Image from 'next/image';

import TabletUserPage from '@/components/tablet/pages/player/TabletUserPage';
import {
  PLAYER_TABLET_ATTRIBUTE_MAX_VALUE,
  PLAYER_TABLET_ATTRIBUTE_MIN_VALUE,
  PLAYER_TABLET_HEALTH_MULTIPLIER,
  PLAYER_TABLET_INSPIRATION_MAX_VALUE,
  PLAYER_TABLET_PARAMETER_MIN_VALUE,
  PLAYER_TABLET_STRESS_MAX_VALUE,
} from '@/features/tablet/player/constants';
import type { TabletPlayerCharacterDraft, TabletPlayerParameter } from '@/features/tablet/player/types';

const attributeIcons: Record<string, string> = {
  constitution: '/attributes-imgs/Cons.png', 'heart-pulse': '/attributes-imgs/Cons.png',
  awareness: '/attributes-imgs/Awareness.png', 'user-alert': '/attributes-imgs/Awareness.png',
  agility: '/attributes-imgs/Agility.png', running: '/attributes-imgs/Agility.png',
  thinking: '/attributes-imgs/Thinking.png', brain: '/attributes-imgs/Thinking.png',
  charisma: '/attributes-imgs/Charisma.png', mask: '/attributes-imgs/Charisma.png',
  will: '/attributes-imgs/Will.png', fist: '/attributes-imgs/Will.png',
};

const parameterIcons: Record<string, string> = {
  health: '/parameters/Health.png', heart: '/parameters/Health.png',
  inspiration: '/parameters/Inspirations.png', star: '/parameters/Inspirations.png',
  stress: '/parameters/Stress.png',
};

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
function isParameter(parameter: TabletPlayerParameter, key: string) { return parameter.key === key || parameter.iconKey === key; }

function parameterMax(parameter: TabletPlayerParameter, draft: TabletPlayerCharacterDraft) {
  if (isParameter(parameter, 'health')) {
    const constitution = draft.attributes.find((attribute) => attribute.key === 'constitution')?.value ?? 1;
    return constitution * PLAYER_TABLET_HEALTH_MULTIPLIER;
  }
  if (isParameter(parameter, 'inspiration')) {
    const stress = draft.parameters.find((item) => isParameter(item, 'stress'))?.currentValue ?? 0;
    return Math.max(0, PLAYER_TABLET_INSPIRATION_MAX_VALUE - stress);
  }
  if (isParameter(parameter, 'stress')) return PLAYER_TABLET_STRESS_MAX_VALUE;
  return parameter.maxValue;
}

type Props = {
  draft: TabletPlayerCharacterDraft;
  status: string | null;
  onChange: (draft: TabletPlayerCharacterDraft) => void;
  onNameChange: (name: string) => void;
  onPortraitSelect: (file: File | null) => void;
};

export default function StudioCharacterPage({ draft, status, onChange, onNameChange, onPortraitSelect }: Props) {
  const changeAttribute = (attributeId: string, delta: number) => {
    const attributes = draft.attributes.map((attribute) => attribute.id === attributeId
      ? { ...attribute, value: clamp(attribute.value + delta, PLAYER_TABLET_ATTRIBUTE_MIN_VALUE, PLAYER_TABLET_ATTRIBUTE_MAX_VALUE) }
      : attribute);
    const constitution = attributes.find((attribute) => attribute.key === 'constitution')?.value ?? 1;
    const healthMax = constitution * PLAYER_TABLET_HEALTH_MULTIPLIER;
    const parameters = draft.parameters.map((parameter) => isParameter(parameter, 'health')
      ? { ...parameter, currentValue: Math.min(parameter.currentValue, healthMax), maxValue: healthMax }
      : parameter);
    onChange({ ...draft, attributes, parameters });
  };

  const changeParameter = (parameterId: string, delta: number) => {
    const target = draft.parameters.find((parameter) => parameter.id === parameterId);
    if (!target) return;
    const max = parameterMax(target, draft);
    const nextValue = clamp(target.currentValue + delta, PLAYER_TABLET_PARAMETER_MIN_VALUE, max ?? Number.MAX_SAFE_INTEGER);
    let parameters = draft.parameters.map((parameter) => parameter.id === parameterId ? { ...parameter, currentValue: nextValue } : parameter);
    if (isParameter(target, 'stress')) {
      const inspirationMax = Math.max(0, PLAYER_TABLET_INSPIRATION_MAX_VALUE - nextValue);
      parameters = parameters.map((parameter) => isParameter(parameter, 'inspiration') ? { ...parameter, currentValue: Math.min(parameter.currentValue, inspirationMax) } : parameter);
    }
    onChange({ ...draft, parameters });
  };

  return (
    <div className="relative h-full min-h-0 text-white">
      <div className="absolute inset-x-0 top-0 flex h-[58px] items-center">
        <input
          value={draft.name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={32}
          placeholder="Character name"
          aria-label="Character name"
          className="h-[54px] w-[360px] rounded-[14px] border border-white/35 bg-white/8 px-[16px] font-montserrat-alt text-[30px] font-extrabold leading-none text-white outline-none placeholder:text-white/35 focus:border-white"
        />

        <div className="ml-auto flex items-center justify-end gap-[16px]">
          {draft.attributes.map((attribute) => (
            <div key={attribute.id} className="flex min-w-[84px] items-center justify-center gap-[6px]">
              <Image src={attributeIcons[attribute.key] ?? attributeIcons[attribute.iconKey] ?? attributeIcons.constitution} alt="" width={38} height={38} />
              <span className="font-montserrat-alt text-[25px] font-extrabold leading-none">{attribute.value}</span>
              <div className="flex flex-col gap-[3px]">
                <button type="button" onClick={() => changeAttribute(attribute.id, 1)} disabled={attribute.value >= PLAYER_TABLET_ATTRIBUTE_MAX_VALUE} className="flex h-[17px] w-[21px] items-center justify-center rounded-[6px] border border-white/55 text-[14px] font-black leading-none disabled:opacity-35" aria-label={`Increase ${attribute.label}`}>+</button>
                <button type="button" onClick={() => changeAttribute(attribute.id, -1)} disabled={attribute.value <= PLAYER_TABLET_ATTRIBUTE_MIN_VALUE} className="flex h-[17px] w-[21px] items-center justify-center rounded-[6px] border border-white/55 text-[14px] font-black leading-none disabled:opacity-35" aria-label={`Decrease ${attribute.label}`}>-</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-[102px] top-[78px]">
        <TabletUserPage
          isEditable
          character={null}
          isLoading={false}
          error={null}
          isEditMode
          draft={draft}
          portraitStatusMessage={status}
          onDescriptionChange={(description) => onChange({ ...draft, description })}
          onPortraitChangeRequest={() => true}
          onPortraitFileSelect={onPortraitSelect}
        />
      </div>

      <div className="absolute bottom-[8px] right-0 flex w-[82px] flex-col gap-[28px]">
        {draft.parameters.map((parameter) => {
          const max = parameterMax(parameter, draft);
          return <div key={parameter.id} className="flex flex-col items-center">
            <Image src={parameterIcons[parameter.key] ?? parameterIcons[parameter.iconKey] ?? parameterIcons.health} alt="" width={48} height={48} />
            <div className="mt-[10px] flex items-center justify-center font-montserrat-alt text-[23px] font-extrabold leading-none">
              <button type="button" onClick={() => changeParameter(parameter.id, -1)} disabled={parameter.currentValue <= PLAYER_TABLET_PARAMETER_MIN_VALUE} className="flex h-[34px] w-[24px] items-center justify-center disabled:opacity-35" aria-label={`Decrease ${parameter.label}`}>-</button>
              <span className="min-w-[24px] text-center">{parameter.currentValue}</span>
              <button type="button" onClick={() => changeParameter(parameter.id, 1)} disabled={max !== null && parameter.currentValue >= max} className="flex h-[34px] w-[24px] items-center justify-center disabled:opacity-35" aria-label={`Increase ${parameter.label}`}>+</button>
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
