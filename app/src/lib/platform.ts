/**
 * Platform detection for the paste-anywhere shortcut chip. The affordance
 * names the real modifier key — ⌘V on Apple platforms, Ctrl+V elsewhere —
 * and never guesses: when the platform cannot be determined, the caller
 * shows both shortcuts.
 */

export type PasteShortcut = "⌘V" | "Ctrl+V" | "⌘V / Ctrl+V";

/** Client hints are Chromium-only; checked before the legacy platform string. */
type NavigatorHints = Navigator & { userAgentData?: { platform?: string } };

/**
 * true → Apple platform, false → not Apple, null → undeterminable.
 * iPadOS 13+ reports "MacIntel" on purpose (and its keyboard uses ⌘), so
 * the platform string is trusted as-is.
 */
export function isApplePlatform(nav: Navigator): boolean | null {
  const uaPlatform = (nav as NavigatorHints).userAgentData?.platform;
  if (uaPlatform) return /mac|ios|iphone|ipad|ipod/i.test(uaPlatform);
  if (nav.platform) return /mac|iphone|ipad|ipod/i.test(nav.platform);
  return null;
}

/** Pure mapping from detection result to the displayed shortcut. */
export function pasteShortcut(apple: boolean | null): PasteShortcut {
  if (apple === true) return "⌘V";
  if (apple === false) return "Ctrl+V";
  return "⌘V / Ctrl+V";
}

/**
 * Shortcut for a live navigator; undefined (build-time prerender runs in
 * Node, which has no navigator) falls back to showing both.
 */
export function pasteShortcutFor(nav: Navigator | undefined): PasteShortcut {
  return pasteShortcut(nav === undefined ? null : isApplePlatform(nav));
}
