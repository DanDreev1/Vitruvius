import { densityPresets } from './densityPresets';
import type { DensityPreset, DensityPresetKey } from './types';

export function getDensityPreset(presetKey: DensityPresetKey): DensityPreset {
  return densityPresets[presetKey];
}