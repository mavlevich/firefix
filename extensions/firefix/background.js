import { FEATURES } from "./features/registry.js";
import { loadSettings, STORAGE_KEY } from "./lib/settings.js";

// Firefox does not keep a theme set by an extension across restarts,
// so every enabled feature is applied again on startup.
async function applyAll() {
  const settings = await loadSettings();
  for (const feature of FEATURES) {
    if (feature.ready) {
      await feature.apply(settings[feature.id]);
    }
  }
}

browser.runtime.onStartup.addListener(applyAll);
browser.runtime.onInstalled.addListener(applyAll);

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && STORAGE_KEY in changes) {
    applyAll();
  }
});
