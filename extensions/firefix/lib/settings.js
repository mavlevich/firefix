import { FEATURES } from "../features/registry.js";

export const STORAGE_KEY = "features";

// Fills in defaults for features that were never toggled and drops values
// that are not booleans, so a broken or old storage entry cannot break the popup.
export function withDefaults(stored, features) {
  const result = {};
  for (const feature of features) {
    const value = stored?.[feature.id];
    result[feature.id] = typeof value === "boolean" ? value : feature.default;
  }
  return result;
}

export async function loadSettings() {
  const { [STORAGE_KEY]: stored } = await browser.storage.local.get(STORAGE_KEY);
  return withDefaults(stored, FEATURES);
}

export async function setFeature(id, enabled) {
  const current = await loadSettings();
  await browser.storage.local.set({ [STORAGE_KEY]: { ...current, [id]: enabled } });
}
