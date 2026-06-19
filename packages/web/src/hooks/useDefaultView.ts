import { useState, useEffect } from "react";
import { AppView } from "../components/layout/ViewBar";

const STORAGE_KEY = "nw_default_view";
const CHANGE_EVENT = "nw-default-view-changed";
const DEFAULT_VIEW: AppView = "dashboard";

// The views a user is allowed to land on. Kept in sync with ViewBar's VIEW_IDS.
export const DEFAULT_VIEW_OPTIONS: AppView[] = [
  "dashboard",
  "tasks",
  "ideas",
  "checklists",
];

// Read the saved landing view, falling back to the dashboard for unset or
// stale/invalid values. Exported so non-hook code (DashboardView's initial
// state) can read it without subscribing to changes.
export function getDefaultView(): AppView {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && (DEFAULT_VIEW_OPTIONS as string[]).includes(stored)
    ? (stored as AppView)
    : DEFAULT_VIEW;
}

export function useDefaultView() {
  const [defaultView, setView] = useState<AppView>(getDefaultView);

  useEffect(() => {
    function sync() {
      setView(getDefaultView());
    }
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  function setDefaultView(view: AppView) {
    localStorage.setItem(STORAGE_KEY, view);
    setView(view);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { defaultView, setDefaultView, options: DEFAULT_VIEW_OPTIONS };
}
