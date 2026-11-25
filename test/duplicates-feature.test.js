import { afterEach, describe, expect, it, vi } from "vitest";
import { apply, setTitleMarker, watch } from "../extensions/firefix/features/duplicates.js";
import { groupMarker, MARKER, PREFIX_PATTERN } from "../extensions/firefix/lib/duplicates.js";

function mockBrowser(tabs, { executeScript = vi.fn() } = {}) {
  const listeners = {};
  const event = (name) => ({ addListener: vi.fn((fn) => (listeners[name] = fn)) });
  const api = {
    tabs: {
      query: vi.fn(async () => tabs),
      onCreated: event("created"),
      onRemoved: event("removed"),
      onUpdated: event("updated"),
    },
    permissions: { onAdded: event("permissions") },
    scripting: { executeScript },
    action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn(), setBadgeTextColor: vi.fn() },
  };
  vi.stubGlobal("browser", api);
  return { api, listeners };
}

const markedWith = (call) => [call[0].target.tabId, call[0].args[1]];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("duplicates feature", () => {
  it("marks duplicate pages and shows the extra copies on the badge", async () => {
    const { api } = mockBrowser([
      { id: 1, url: "https://a.com/", title: "A", status: "complete" },
      { id: 2, url: "https://a.com/", title: "A", status: "complete" },
      { id: 3, url: "https://b.com/", title: "B", status: "complete" },
    ]);
    await apply(true);
    expect(api.scripting.executeScript.mock.calls.map(markedWith)).toEqual([
      [1, groupMarker(0)],
      [2, groupMarker(0)],
    ]);
    expect(api.scripting.executeScript.mock.calls[0][0].args[0]).toBe(PREFIX_PATTERN);
    expect(api.action.setBadgeText).toHaveBeenCalledWith({ text: "1" });
  });

  it("removes markers and clears the badge when turned off", async () => {
    const { api } = mockBrowser([
      { id: 1, url: "https://a.com/", title: groupMarker(0) + "A", status: "complete" },
      { id: 2, url: "https://a.com/", title: MARKER + "A", status: "complete" },
    ]);
    await apply(false);
    expect(api.scripting.executeScript.mock.calls.map(markedWith)).toEqual([
      [1, null],
      [2, null],
    ]);
    expect(api.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
  });

  it("keeps going when a page refuses the script", async () => {
    const executeScript = vi.fn(async ({ target }) => {
      if (target.tabId === 1) throw new Error("Missing host permission");
    });
    const { api } = mockBrowser(
      [
        { id: 1, url: "https://a.com/", title: "A", status: "complete" },
        { id: 2, url: "https://a.com/", title: "A", status: "complete" },
      ],
      { executeScript },
    );
    await expect(apply(true)).resolves.toBeUndefined();
    expect(executeScript).toHaveBeenCalledTimes(2);
    expect(api.action.setBadgeText).toHaveBeenCalledWith({ text: "1" });
  });

  it("folds a burst of tab events into one run", async () => {
    vi.useFakeTimers();
    const { api, listeners } = mockBrowser([]);
    watch(async () => true, 100);
    listeners.created();
    listeners.updated();
    listeners.removed();
    await vi.advanceTimersByTimeAsync(150);
    expect(api.tabs.query).toHaveBeenCalledTimes(1);
  });

  it("does nothing on tab events while the feature is off", async () => {
    vi.useFakeTimers();
    const { api, listeners } = mockBrowser([]);
    watch(async () => false, 100);
    listeners.created();
    await vi.advanceTimersByTimeAsync(150);
    expect(api.tabs.query).not.toHaveBeenCalled();
  });

  it("listens only to address and loading changes, not to every title change", () => {
    const { api } = mockBrowser([]);
    watch(async () => true);
    expect(api.tabs.onUpdated.addListener.mock.calls[0][1]).toEqual({ properties: ["url", "status"] });
  });
});

describe("setTitleMarker, run inside the page", () => {
  function fakePage(title) {
    const observers = [];
    class FakeObserver {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe() {}
      disconnect() {
        observers.splice(observers.indexOf(this), 1);
      }
    }
    const page = { document: { title, head: {} }, location: { host: "a.com", pathname: "/x" } };
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", page.document);
    vi.stubGlobal("location", page.location);
    vi.stubGlobal("MutationObserver", FakeObserver);
    // The page sets its own title, then the observer runs.
    page.retitle = (text) => {
      page.document.title = text;
      for (const observer of [...observers]) observer.callback();
    };
    page.observers = observers;
    return page;
  }

  it("puts the group prefix in front of the title", () => {
    const page = fakePage("GitHub");
    setTitleMarker(PREFIX_PATTERN, groupMarker(3));
    expect(page.document.title).toBe(groupMarker(3) + "GitHub");
  });

  it("replaces the prefix of another group instead of adding a second one", () => {
    const page = fakePage(groupMarker(1) + "GitHub");
    setTitleMarker(PREFIX_PATTERN, groupMarker(3));
    expect(page.document.title).toBe(groupMarker(3) + "GitHub");
  });

  it("puts the prefix back when the page changes its title", () => {
    const page = fakePage("Inbox");
    setTitleMarker(PREFIX_PATTERN, groupMarker(2));
    page.retitle("(1) Inbox");
    expect(page.document.title).toBe(groupMarker(2) + "(1) Inbox");
  });

  it("removes the prefix and stops watching when the tab is no longer a duplicate", () => {
    const page = fakePage("GitHub");
    setTitleMarker(PREFIX_PATTERN, groupMarker(2));
    setTitleMarker(PREFIX_PATTERN, null);
    expect(page.document.title).toBe("GitHub");
    expect(page.observers).toHaveLength(0);
  });

  it("uses the address for a page without a title", () => {
    const page = fakePage("");
    setTitleMarker(PREFIX_PATTERN, groupMarker(0));
    expect(page.document.title).toBe(groupMarker(0) + "a.com/x");
  });
});
