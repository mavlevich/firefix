import { FEATURES } from "../features/registry.js";
import { loadSettings, setFeature } from "../lib/settings.js";

const t = (key) => browser.i18n.getMessage(key);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderFeature(feature, enabled) {
  const item = element("li", feature.ready ? "" : "disabled");

  const text = element("label", "text");
  text.append(
    element("div", "title", t(feature.title)),
    element("div", "description", t(feature.description)),
  );
  item.append(text);

  if (!feature.ready) {
    item.append(element("span", "soon", t("soon")));
    return item;
  }

  const toggle = element("input", "switch");
  toggle.type = "checkbox";
  toggle.role = "switch";
  toggle.id = `feature-${feature.id}`;
  toggle.checked = enabled;
  toggle.addEventListener("change", () => setFeature(feature.id, toggle.checked));
  text.htmlFor = toggle.id;
  item.append(toggle);
  return item;
}

for (const node of document.querySelectorAll("[data-i18n]")) {
  node.textContent = t(node.dataset.i18n);
}

const settings = await loadSettings();
document
  .getElementById("features")
  .append(...FEATURES.map((feature) => renderFeature(feature, settings[feature.id])));
