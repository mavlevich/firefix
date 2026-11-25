// Duplicate tabs: every page open more than once gets an invisible group prefix in its
// title, userChrome.css lights up the copies of the selected or hovered tab, and the
// toolbar button shows how many extra copies are open.

import { planMarkers, PREFIX_PATTERN } from "../lib/duplicates.js";

// Reading tab addresses and changing page titles needs access to all sites.
// Firefox asks the user for it when the feature is turned on in the popup.
export const PERMISSIONS = { origins: ["<all_urls>"] };

// Same amber as --firefix-dup in userChrome.css.
const BADGE_COLOR = "#d9a54a";
const BADGE_TEXT_COLOR = "#17181b";

// Runs inside the page. Must not use anything from outside its own body.
// Puts the given prefix at the start of document.title, replacing any prefix that was
// there, or removes it when marker is null. While a prefix is on, a MutationObserver
// puts it back when the page sets its own title again (single page apps, unread counters).
export function setTitleMarker(pattern, marker) {
  const state = (window.firefixDuplicate ??= { observer: null, marker: null });
  state.marker = marker;
  const prefix = new RegExp(pattern, "u");

  const update = () => {
    const bare = document.title.replace(prefix, "");
    // A page without a title would end up with an empty looking tab, so give it the address.
    const wanted = state.marker ? state.marker + (bare || location.host + location.pathname) : bare;
    if (document.title !== wanted) document.title = wanted;
  };
  update();

  if (!marker) {
    state.observer?.disconnect();
    state.observer = null;
  } else if (!state.observer) {
    state.observer = new MutationObserver(update);
    state.observer.observe(document.head ?? document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

async function setMarker(tabId, marker) {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: setTitleMarker,
      args: [PREFIX_PATTERN, marker],
    });
  } catch {
    // Pages an extension may not touch (about:, the PDF viewer, addons.mozilla.org),
    // pages closed in the meantime, or no site access granted. Nothing to do there.
  }
}

export async function sync(enabled) {
  const tabs = await browser.tabs.query({});
  const plan = planMarkers(tabs, enabled);
  await Promise.all([
    ...plan.set.map(({ id, marker }) => setMarker(id, marker)),
    ...plan.clear.map((id) => setMarker(id, null)),
  ]);
  await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
  await browser.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR });
  await browser.action.setBadgeText({ text: plan.extra > 0 ? String(plan.extra) : "" });
}

export function apply(enabled) {
  return sync(enabled);
}

// Tab events come in bursts (a restored session opens dozens of tabs at once),
// so they are folded into one run.
export function watch(isEnabled, delay = 250) {
  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (await isEnabled()) await sync(true);
    }, delay);
  };
  browser.tabs.onCreated.addListener(schedule);
  browser.tabs.onRemoved.addListener(schedule);
  browser.tabs.onUpdated.addListener(schedule, { properties: ["url", "status"] });
  browser.permissions.onAdded.addListener(schedule);
}
