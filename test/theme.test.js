import { afterEach, describe, expect, it, vi } from "vitest";
import { apply, GRAPHITE } from "../extensions/firefix/features/theme.js";

function mockBrowser() {
  const theme = { update: vi.fn(), reset: vi.fn() };
  vi.stubGlobal("browser", { theme });
  return theme;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme feature", () => {
  it("applies Graphite when enabled", async () => {
    const theme = mockBrowser();
    await apply(true);
    expect(theme.update).toHaveBeenCalledWith(GRAPHITE);
    expect(theme.reset).not.toHaveBeenCalled();
  });

  it("gives control back to the user's theme when disabled", async () => {
    const theme = mockBrowser();
    await apply(false);
    expect(theme.reset).toHaveBeenCalled();
    expect(theme.update).not.toHaveBeenCalled();
  });

  it("keeps the tab strip and new tab page pure black for OLED screens", () => {
    expect(GRAPHITE.colors.frame).toBe("#000000");
    expect(GRAPHITE.colors.frame_inactive).toBe("#000000");
    expect(GRAPHITE.colors.ntp_background).toBe("#000000");
  });
});
