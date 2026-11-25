import { describe, expect, it } from "vitest";
import { withDefaults } from "../extensions/firefix/lib/settings.js";

const features = [
  { id: "a", default: true },
  { id: "b", default: false },
];

describe("withDefaults", () => {
  it("uses defaults when nothing is stored", () => {
    expect(withDefaults(undefined, features)).toEqual({ a: true, b: false });
  });

  it("keeps stored booleans", () => {
    expect(withDefaults({ a: false, b: true }, features)).toEqual({ a: false, b: true });
  });

  it("replaces values that are not booleans with defaults", () => {
    expect(withDefaults({ a: "yes", b: null }, features)).toEqual({ a: true, b: false });
  });

  it("drops stored keys for features that no longer exist", () => {
    expect(withDefaults({ a: false, gone: true }, features)).toEqual({ a: false, b: false });
  });
});
