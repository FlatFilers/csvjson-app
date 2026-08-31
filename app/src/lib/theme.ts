/**
 * Theme persistence. localStorage sits behind try/catch — private mode just
 * doesn't persist (spec: Browser / platform). Everything here is defensive
 * so a throwing storage never breaks the converter.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "csvjson-theme";

export function loadSavedTheme(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "dark" || saved === "light" ? saved : null;
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  try {
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
  } catch {
    // matchMedia unavailable — fall through to light.
  }
  return "light";
}

/** Saved preference wins; otherwise follow the OS preference. */
export function initialTheme(): Theme {
  return loadSavedTheme() ?? systemTheme();
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode just doesn't persist — never surface this.
  }
}
