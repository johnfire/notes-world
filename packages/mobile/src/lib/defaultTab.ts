import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Href } from "expo-router";

// Which tab the app opens on. "index" is the Notes home tab (the app default).
export type DefaultTab = "index" | "tags" | "checklists";

const STORAGE_KEY = "nw_default_tab";

export const DEFAULT_TAB: DefaultTab = "index";
export const DEFAULT_TAB_OPTIONS: DefaultTab[] = [
  "index",
  "tags",
  "checklists",
];

// i18n keys for each option's label, reusing the existing tab labels.
export const DEFAULT_TAB_LABEL_KEYS: Record<DefaultTab, string> = {
  index: "tabs.notes",
  tags: "tabs.tags",
  checklists: "tabs.checklists",
};

export async function getDefaultTab(): Promise<DefaultTab> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored && (DEFAULT_TAB_OPTIONS as string[]).includes(stored)
      ? (stored as DefaultTab)
      : DEFAULT_TAB;
  } catch {
    return DEFAULT_TAB;
  }
}

export async function setDefaultTab(tab: DefaultTab): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, tab);
  } catch {
    /* best-effort; falls back to the default on next launch */
  }
}

// Route to redirect to for a given tab. Parenthesized groups don't appear in
// the path under Expo Router, so the Notes home is the group root "/(tabs)".
export function tabHref(tab: DefaultTab): Href {
  switch (tab) {
    case "tags":
      return "/tags";
    // The committed Expo Router typed-routes cache is stale and omits the
    // checklists tab, so cast to satisfy the type — the route is real at runtime.
    case "checklists":
      return "/checklists" as Href;
    default:
      return "/(tabs)";
  }
}
