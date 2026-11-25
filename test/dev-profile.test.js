import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDevProfile } from "../scripts/dev-profile.mjs";

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "firefix-"));
  mkdirSync(join(dir, "profile", "chrome"), { recursive: true });
  writeFileSync(join(dir, "profile", "user.js"), "prefs");
  writeFileSync(join(dir, "profile", "chrome", "userChrome.css"), "css");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("buildDevProfile", () => {
  it("copies user.js and the chrome folder", () => {
    buildDevProfile(join(dir, "profile"), join(dir, "dev"));
    expect(readFileSync(join(dir, "dev", "user.js"), "utf8")).toBe("prefs");
    expect(readFileSync(join(dir, "dev", "chrome", "userChrome.css"), "utf8")).toBe("css");
  });

  it("drops files left from an earlier run", () => {
    mkdirSync(join(dir, "dev"));
    writeFileSync(join(dir, "dev", "stale.css"), "old");
    buildDevProfile(join(dir, "profile"), join(dir, "dev"));
    expect(existsSync(join(dir, "dev", "stale.css"))).toBe(false);
  });
});

describe("profile/user.js", () => {
  it("turns on userChrome.css loading", () => {
    const prefs = readFileSync(new URL("../profile/user.js", import.meta.url), "utf8");
    expect(prefs).toContain('user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);');
  });
});
