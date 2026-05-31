import { useState, useEffect } from "react";

const SEEN_KEY = "nw_tour_seen";
const RESTART_EVENT = "nw-tour-restart";

export function useOnboardingTour() {
  const [run, setRun] = useState(() => !localStorage.getItem(SEEN_KEY));

  useEffect(() => {
    function onRestart() {
      setRun(true);
    }
    window.addEventListener(RESTART_EVENT, onRestart);
    return () => window.removeEventListener(RESTART_EVENT, onRestart);
  }, []);

  function markSeen() {
    localStorage.setItem(SEEN_KEY, "true");
    setRun(false);
  }

  function restart() {
    localStorage.removeItem(SEEN_KEY);
    window.dispatchEvent(new Event(RESTART_EVENT));
  }

  return { run, markSeen, restart };
}
