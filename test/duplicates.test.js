import { describe, expect, it } from "vitest";
import {
  assignIndexes,
  CODE_CHARS,
  findGroups,
  GROUP_CODES,
  groupMarker,
  MARKER,
  planMarkers,
  PREFIX_PATTERN,
  readMarker,
  webUrl,
} from "../extensions/firefix/lib/duplicates.js";

const tab = (id, url, extra = {}) => ({ id, url, title: `Page ${id}`, status: "complete", ...extra });
const marked = (id, url, index, extra = {}) => tab(id, url, { title: groupMarker(index) + `Page ${id}`, ...extra });
const ids = (groups) => groups.map((group) => group.map((t) => t.id));

describe("group codes", () => {
  it("has 16 different two character codes", () => {
    expect(GROUP_CODES).toHaveLength(16);
    expect(new Set(GROUP_CODES).size).toBe(16);
    for (const code of GROUP_CODES) expect([...code]).toHaveLength(2);
  });

  it("uses only invisible characters", () => {
    for (const char of [MARKER, ...CODE_CHARS]) {
      expect(char.codePointAt(0)).toBeGreaterThanOrEqual(0x2060);
      expect(char.codePointAt(0)).toBeLessThanOrEqual(0x2064);
    }
  });

  it("uses codes again past the last one", () => {
    expect(groupMarker(16)).toBe(groupMarker(0));
    expect(groupMarker(17)).toBe(groupMarker(1));
  });
});

describe("readMarker", () => {
  it("reads the group index back from a title", () => {
    expect(readMarker(groupMarker(5) + "GitHub")).toEqual({ prefix: groupMarker(5), index: 5 });
  });

  it("returns null for a title without a prefix", () => {
    expect(readMarker("GitHub")).toBeNull();
    expect(readMarker(undefined)).toBeNull();
  });

  it("knows a bare marker from an older version, with no group", () => {
    expect(readMarker(MARKER + "GitHub")).toEqual({ prefix: MARKER, index: null });
  });

  it("matches the same prefixes as the pattern used inside pages", () => {
    const pattern = new RegExp(PREFIX_PATTERN, "u");
    expect((groupMarker(9) + "Title").replace(pattern, "")).toBe("Title");
    expect((MARKER + "Title").replace(pattern, "")).toBe("Title");
    expect("Title".replace(pattern, "")).toBe("Title");
  });
});

describe("webUrl", () => {
  it("keeps a web address exactly as it is", () => {
    expect(webUrl("https://a.com/docs/?q=1#intro")).toBe("https://a.com/docs/?q=1#intro");
    expect(webUrl("http://a.com/")).toBe("http://a.com/");
  });

  it("skips pages that are not on the web", () => {
    expect(webUrl("about:newtab")).toBeNull();
    expect(webUrl("moz-extension://abc/popup.html")).toBeNull();
    expect(webUrl("file:///Users/me/a.html")).toBeNull();
  });

  it("returns null for a missing address", () => {
    expect(webUrl(undefined)).toBeNull();
  });
});

describe("findGroups", () => {
  it("groups tabs with the same address and leaves single tabs out", () => {
    const groups = findGroups([
      tab(1, "https://a.com/"),
      tab(2, "https://b.com/"),
      tab(3, "https://a.com/"),
      tab(4, "https://b.com/"),
      tab(5, "https://b.com/"),
      tab(6, "https://c.com/"),
    ]);
    expect(ids(groups)).toEqual([
      [1, 3],
      [2, 4, 5],
    ]);
  });

  it.each([
    ["a different #fragment", "https://a.com/docs", "https://a.com/docs#intro"],
    ["a different query", "https://a.com/search?q=1", "https://a.com/search?q=2"],
    ["a trailing slash", "https://a.com/docs", "https://a.com/docs/"],
    ["http and https", "http://a.com/", "https://a.com/"],
  ])("does not group pages with %s", (_, first, second) => {
    expect(findGroups([tab(1, first), tab(2, second)])).toEqual([]);
  });

  it("does not group new tabs", () => {
    expect(findGroups([tab(1, "about:newtab"), tab(2, "about:newtab")])).toEqual([]);
  });

  it("keeps private windows and containers apart", () => {
    expect(findGroups([tab(1, "https://a.com/"), tab(2, "https://a.com/", { incognito: true })])).toEqual([]);
    expect(
      findGroups([
        tab(1, "https://a.com/", { cookieStoreId: "firefox-container-1" }),
        tab(2, "https://a.com/", { cookieStoreId: "firefox-container-2" }),
      ]),
    ).toEqual([]);
  });
});

describe("assignIndexes", () => {
  it("gives new groups the lowest free indexes", () => {
    const groups = [[tab(1, "a")], [tab(2, "b")], [tab(3, "c")]];
    expect(assignIndexes(groups)).toEqual([0, 1, 2]);
  });

  it("keeps the index a group already carries", () => {
    const groups = [[marked(1, "a", 4), marked(2, "a", 4)], [tab(3, "b")]];
    expect(assignIndexes(groups)).toEqual([4, 0]);
  });

  it("does not renumber other groups when one group goes away", () => {
    // Groups 0, 1 and 2 existed. Group 0 was closed.
    const groups = [[marked(3, "b", 1), marked(4, "b", 1)], [marked(5, "c", 2), marked(6, "c", 2)]];
    expect(assignIndexes(groups)).toEqual([1, 2]);
  });

  it("reuses a freed index, lowest first", () => {
    // Index 0 and 2 are free, 1 and 3 are taken.
    const groups = [[marked(1, "b", 1)], [marked(2, "d", 3)], [tab(3, "new")], [tab(4, "newer")]];
    expect(assignIndexes(groups)).toEqual([1, 3, 0, 2]);
  });

  it("gives a new tab of a group the group's index", () => {
    const groups = [[marked(1, "a", 6), marked(2, "a", 6), tab(3, "a")]];
    expect(assignIndexes(groups)).toEqual([6]);
  });

  it("lets the group with more tabs keep an index two groups claim", () => {
    // Tab 5 moved from group a to page b and still carries a's index.
    const groups = [
      [marked(5, "b", 2), tab(6, "b")],
      [marked(1, "a", 2), marked(2, "a", 2)],
    ];
    expect(assignIndexes(groups)).toEqual([0, 2]);
  });

  it("uses codes again when there are more groups than codes", () => {
    const groups = Array.from({ length: 18 }, (_, i) => [tab(i, `page${i}`)]);
    const indexes = assignIndexes(groups);
    expect(indexes.slice(0, 16)).toEqual([...Array(16).keys()]);
    expect(indexes.slice(16)).toEqual([0, 1]);
  });
});

describe("planMarkers", () => {
  it("gives each group its own prefix and counts the extra copies", () => {
    const plan = planMarkers(
      [tab(1, "https://a.com/"), tab(2, "https://b.com/"), tab(3, "https://a.com/"), tab(4, "https://b.com/")],
      true,
    );
    expect(plan.set).toEqual([
      { id: 1, marker: groupMarker(0) },
      { id: 2, marker: groupMarker(1) },
      { id: 3, marker: groupMarker(0) },
      { id: 4, marker: groupMarker(1) },
    ]);
    expect(plan.clear).toEqual([]);
    expect(plan.extra).toBe(2);
  });

  it("leaves tabs alone that already carry the right prefix", () => {
    const plan = planMarkers([marked(1, "https://a.com/", 3), tab(2, "https://a.com/")], true);
    expect(plan.set).toEqual([{ id: 2, marker: groupMarker(3) }]);
  });

  it("removes the prefix from a tab that is no longer a duplicate", () => {
    const plan = planMarkers([marked(1, "https://a.com/", 0)], true);
    expect(plan.clear).toEqual([1]);
  });

  it("replaces a bare marker from an older version with a group prefix", () => {
    const plan = planMarkers(
      [tab(1, "https://a.com/", { title: MARKER + "A" }), tab(2, "https://a.com/", { title: MARKER + "A" })],
      true,
    );
    expect(plan.set.map((s) => s.marker)).toEqual([groupMarker(0), groupMarker(0)]);
  });

  it("removes every prefix when the feature is off", () => {
    const plan = planMarkers([marked(1, "https://a.com/", 0), marked(2, "https://a.com/", 0)], false);
    expect(plan.set).toEqual([]);
    expect(plan.clear).toEqual([1, 2]);
    expect(plan.extra).toBe(0);
  });

  it("waits for a loading tab, since the new page brings its own title", () => {
    const plan = planMarkers([tab(1, "https://a.com/"), tab(2, "https://a.com/", { status: "loading" })], true);
    expect(plan.set.map((s) => s.id)).toEqual([1]);
    expect(plan.extra).toBe(1);
  });

  it("skips unloaded tabs, which have no page to change, but still counts them", () => {
    const plan = planMarkers([tab(1, "https://a.com/"), tab(2, "https://a.com/", { discarded: true })], true);
    expect(plan.set.map((s) => s.id)).toEqual([1]);
    expect(plan.extra).toBe(1);
  });

  it("copes with tabs that have no title", () => {
    expect(planMarkers([tab(1, "https://a.com/", { title: undefined })], true)).toEqual({
      set: [],
      clear: [],
      extra: 0,
    });
  });
});
