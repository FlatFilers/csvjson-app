import { useCallback, useSyncExternalStore } from "react";

/**
 * Reactive matchMedia. Safe in environments without matchMedia (tests,
 * older webviews) — returns `false` and never re-renders.
 *
 * Backed by useSyncExternalStore: the subscription keeps React outside the
 * effect/setState cycle (react-hooks/set-state-in-effect), and the server
 * snapshot keeps prerendered markup on the `false` branch.
 */
export function useMediaQuery(query: string): boolean {
  const supported =
    typeof window !== "undefined" && typeof window.matchMedia === "function";

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!supported) return () => {};
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query, supported]
  );

  const getSnapshot = useCallback(
    () => (supported ? window.matchMedia(query).matches : false),
    [query, supported]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
