import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURES } from "../extensions/firefix/features/registry.js";

const readLocale = (name) =>
  JSON.parse(
    readFileSync(new URL(`../extensions/firefix/_locales/${name}/messages.json`, import.meta.url)),
  );

const locales = { en: readLocale("en"), ru: readLocale("ru") };

describe("feature registry", () => {
  it("has unique ids", () => {
    const ids = FEATURES.map((feature) => feature.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every ready feature an apply function", () => {
    for (const feature of FEATURES.filter((f) => f.ready)) {
      expect(typeof feature.apply, feature.id).toBe("function");
    }
  });

  it.each(Object.keys(locales))("has every text in the %s locale", (name) => {
    for (const feature of FEATURES) {
      expect(locales[name], feature.title).toHaveProperty(feature.title);
      expect(locales[name], feature.description).toHaveProperty(feature.description);
    }
  });

  it("has the same message keys in all locales", () => {
    expect(Object.keys(locales.ru).sort()).toEqual(Object.keys(locales.en).sort());
  });
});
