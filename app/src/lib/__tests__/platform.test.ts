import { describe, expect, it } from "vitest";
import {
  isApplePlatform,
  pasteShortcut,
  pasteShortcutFor,
} from "@/lib/platform";

function navWith({
  platform,
  uaPlatform,
}: {
  platform?: string;
  uaPlatform?: string;
}): Navigator {
  return {
    platform: platform ?? "",
    userAgentData: uaPlatform ? { platform: uaPlatform } : undefined,
  } as unknown as Navigator;
}

describe("isApplePlatform", () => {
  it("detects Apple platforms from navigator.platform", () => {
    expect(isApplePlatform(navWith({ platform: "MacIntel" }))).toBe(true);
    expect(isApplePlatform(navWith({ platform: "iPhone" }))).toBe(true);
    expect(isApplePlatform(navWith({ platform: "iPad" }))).toBe(true);
    expect(isApplePlatform(navWith({ platform: "iPod" }))).toBe(true);
  });

  it("rejects Windows and Linux platforms", () => {
    expect(isApplePlatform(navWith({ platform: "Win32" }))).toBe(false);
    expect(isApplePlatform(navWith({ platform: "Linux x86_64" }))).toBe(false);
    expect(isApplePlatform(navWith({ platform: "Linux armv8l" }))).toBe(false);
  });

  it("prefers userAgentData when present", () => {
    expect(isApplePlatform(navWith({ uaPlatform: "macOS" }))).toBe(true);
    expect(isApplePlatform(navWith({ uaPlatform: "Windows" }))).toBe(false);
    expect(isApplePlatform(navWith({ uaPlatform: "Linux" }))).toBe(false);
  });

  it("lets userAgentData override a stale platform string", () => {
    expect(
      isApplePlatform(navWith({ platform: "MacIntel", uaPlatform: "Windows" }))
    ).toBe(false);
    expect(
      isApplePlatform(navWith({ platform: "Win32", uaPlatform: "macOS" }))
    ).toBe(true);
  });

  it("returns null when the platform cannot be determined", () => {
    expect(isApplePlatform(navWith({}))).toBeNull();
    expect(isApplePlatform(navWith({ platform: "" }))).toBeNull();
  });
});

describe("pasteShortcut", () => {
  it("maps the detection result to the platform shortcut", () => {
    expect(pasteShortcut(true)).toBe("⌘V");
    expect(pasteShortcut(false)).toBe("Ctrl+V");
    // Unknown platform → show both rather than guess.
    expect(pasteShortcut(null)).toBe("⌘V / Ctrl+V");
  });

  it("resolves the shortcut for a live navigator object", () => {
    expect(pasteShortcutFor(navWith({ platform: "MacIntel" }))).toBe("⌘V");
    expect(pasteShortcutFor(navWith({ platform: "Win32" }))).toBe("Ctrl+V");
    expect(pasteShortcutFor(undefined)).toBe("⌘V / Ctrl+V");
  });
});
