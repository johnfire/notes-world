import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Refetch when the screen regains focus (tab switch / returning from a detail
 * screen) and when the app returns to the foreground, so data created on another
 * device (e.g. the web app) shows up without a manual pull-to-refresh.
 *
 * The latest callback is held in a ref so callers can pass an inline function
 * without re-subscribing every render. The first focus (initial mount) is
 * skipped by default so screens that already load on mount don't double-fetch;
 * pass { immediate: true } to also run on that first focus.
 */
export function useRefreshOnFocus(
  refetch: () => void,
  opts: { immediate?: boolean } = {},
): void {
  const cb = useRef(refetch);
  cb.current = refetch;
  const firstFocus = useRef(true);
  const immediate = opts.immediate ?? false;

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        if (!immediate) return;
      }
      cb.current();
    }, [immediate]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") cb.current();
    });
    return () => sub.remove();
  }, []);
}
