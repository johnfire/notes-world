import { useState, useEffect } from "react";

const STORAGE_KEY = "nw_tooltips_enabled";
const CHANGE_EVENT = "nw-tooltips-changed";

export function useTooltips() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "false",
  );

  useEffect(() => {
    function sync() {
      setEnabled(localStorage.getItem(STORAGE_KEY) !== "false");
    }
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  function toggle() {
    const next = !enabled;
    localStorage.setItem(STORAGE_KEY, String(next));
    setEnabled(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return { enabled, toggle };
}
