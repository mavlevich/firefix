// Pure logic for the duplicate tabs feature, kept apart from browser APIs so it can be tested.

// An extension cannot style native tabs, and userChrome.css cannot tell which tabs are
// duplicates. So every duplicate page gets an invisible prefix at the start of its title.
// Firefox copies the title into the tab's label attribute, and userChrome.css matches it
// with [label^="..."].
//
// The prefix is U+2060 WORD JOINER and a two character group code, so userChrome.css can
// light up the copies of one page without the others. The code characters are the
// invisible math operators U+2061 to U+2064. They have no width, do not join with the
// text around them, and Firefox keeps all of them in both the title and the tab label.
export const MARKER = "\u2060";
export const CODE_CHARS = ["\u2061", "\u2062", "\u2063", "\u2064"];

// 4 characters in 2 positions give 16 group codes. With more groups than that,
// codes are used again, and two groups share a code.
export const GROUP_CODES = CODE_CHARS.flatMap((first) => CODE_CHARS.map((second) => first + second));

// Matches any prefix this feature may have put on a title, also a bare MARKER.
export const PREFIX_PATTERN = `^${MARKER}[${CODE_CHARS.join("")}]{0,2}`;

export function groupMarker(index) {
  return MARKER + GROUP_CODES[index % GROUP_CODES.length];
}

// Reads the prefix at the start of a title: the prefix itself and the group index it
// stands for, or null when the title has no prefix.
export function readMarker(title) {
  if (typeof title !== "string" || !title.startsWith(MARKER)) return null;
  const code = title.slice(MARKER.length, MARKER.length + 2);
  const index = GROUP_CODES.indexOf(code);
  if (index === -1) return { prefix: MARKER, index: null };
  return { prefix: MARKER + code, index };
}

// Tabs are duplicates only when their addresses match exactly, as Firefox reports them
// in tab.url: a different #fragment, query or trailing slash makes a different page.
// Only web pages take part: an extension cannot change the title of about: pages,
// and many new tabs are not duplicates anyone cares about.
export function webUrl(url) {
  if (typeof url !== "string") return null;
  return url.startsWith("https://") || url.startsWith("http://") ? url : null;
}

// Tabs in private windows or in different containers are kept apart on purpose,
// so they never count as copies of each other.
function groupKey(tab) {
  const url = webUrl(tab.url);
  if (!url) return null;
  return `${tab.incognito ? "private" : "normal"} ${tab.cookieStoreId ?? ""} ${url}`;
}

// Returns every group of tabs that show the same page, in tab order, as lists of tabs.
export function findGroups(tabs) {
  const groups = new Map();
  for (const tab of tabs) {
    const key = groupKey(tab);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tab);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

// The index most tabs of a group already carry in their titles, and how many carry it.
// On a tie the lower index wins.
function carriedIndex(group) {
  const counts = new Map();
  for (const tab of group) {
    const index = readMarker(tab.title)?.index;
    if (index != null) counts.set(index, (counts.get(index) ?? 0) + 1);
  }
  let best = null;
  for (const [index, count] of counts) {
    const bestCount = best == null ? 0 : counts.get(best);
    if (count > bestCount || (count === bestCount && index < best)) best = index;
  }
  return { index: best, votes: best == null ? 0 : counts.get(best) };
}

// Gives every group an index into GROUP_CODES.
// A group keeps the index its tabs already carry, so closing one group never renumbers
// the others, and nothing has to be remembered between runs. If two groups claim the
// same index, the one with more tabs carrying it keeps it.
// New groups take the lowest free index. When all codes are taken, they are used again.
export function assignIndexes(groups) {
  const carried = groups.map(carriedIndex);
  const result = new Array(groups.length).fill(null);
  const taken = new Set();

  const claims = groups
    .map((_, position) => position)
    .filter((position) => carried[position].index != null)
    .sort((a, b) => carried[b].votes - carried[a].votes || a - b);
  for (const position of claims) {
    const { index } = carried[position];
    if (!taken.has(index)) {
      result[position] = index;
      taken.add(index);
    }
  }

  let reused = 0;
  for (let position = 0; position < groups.length; position++) {
    if (result[position] != null) continue;
    let index = 0;
    while (index < GROUP_CODES.length && taken.has(index)) index++;
    if (index === GROUP_CODES.length) index = reused++ % GROUP_CODES.length;
    result[position] = index;
    taken.add(index);
  }
  return result;
}

// Decides which tabs need a new prefix and which need theirs removed, and counts the
// extra copies. The tab title itself tells what a page carries now.
// Unloaded tabs have no page to change. Loading tabs are handled once they finish,
// because the new page brings its own title.
export function planMarkers(tabs, enabled) {
  const wanted = new Map();
  let extra = 0;
  if (enabled) {
    const groups = findGroups(tabs);
    const indexes = assignIndexes(groups);
    groups.forEach((group, position) => {
      extra += group.length - 1;
      for (const tab of group) wanted.set(tab.id, groupMarker(indexes[position]));
    });
  }

  const set = [];
  const clear = [];
  for (const tab of tabs) {
    if (tab.discarded) continue;
    const current = readMarker(tab.title)?.prefix ?? null;
    const marker = wanted.get(tab.id) ?? null;
    if (marker && marker !== current && tab.status !== "loading") set.push({ id: tab.id, marker });
    if (!marker && current) clear.push(tab.id);
  }
  return { set, clear, extra };
}
