import type { ViewPreset, ViewPresetId } from "./types";

export const presetRegistry = new Map<ViewPresetId, ViewPreset>();

export function registerPreset(preset: ViewPreset): void {
  presetRegistry.set(preset.id, preset);
}

export function getPreset(id: ViewPresetId): ViewPreset | undefined {
  return presetRegistry.get(id);
}
