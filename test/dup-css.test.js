import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GROUP_CODES, MARKER } from "../extensions/firefix/lib/duplicates.js";
import { groupBlock, updateCss } from "../scripts/dup-css.mjs";

const css = readFileSync(new URL("../profile/chrome/userChrome.css", import.meta.url), "utf8");
const escape = (text) => [...text].map((char) => `\\${char.codePointAt(0).toString(16)}`).join("");

describe("duplicate group rules in userChrome.css", () => {
  it("are up to date with the group codes (run node scripts/dup-css.mjs)", () => {
    expect(css).toContain(groupBlock());
    expect(updateCss(css)).toBe(css);
  });

  it("have a rule for every group code the extension can give out", () => {
    for (const code of GROUP_CODES) {
      const label = `[label^="${escape(MARKER + code)}"]`;
      expect(css, code).toContain(`:is([visuallyselected], :hover)${label})`);
      expect(css, code).toContain(`.tabbrowser-tab${label} > .tab-stack > .tab-background`);
    }
  });
});
