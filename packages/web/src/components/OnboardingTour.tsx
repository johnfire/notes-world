import { Joyride, STATUS, Step, EventData } from "react-joyride";
import { useOnboardingTour } from "../hooks/useOnboardingTour";

const STEPS: Step[] = [
  {
    target: "body",
    content:
      "Welcome to notes-world! This quick tour covers the key features. You can skip at any time.",
    placement: "center",
    skipBeacon: true,
  },
  {
    target: '[data-tour="search"]',
    content:
      "Search all your items here. Press / from anywhere to jump straight to the search bar.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="viewbar"]',
    content:
      "Switch between your Dashboard, Ideas, and Tasks views using these tabs.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="capture"]',
    content:
      "Quick capture: type anything and press Enter to save it. Press C from anywhere to focus this bar.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="sidebar"]',
    content:
      "Your tags live here. Create and colour-code them, drag to reorder, and drop items onto a tag to file them.",
    placement: "right",
    skipBeacon: true,
  },
  {
    target: '[data-tour="account"]',
    content:
      "Account settings: change your email, password, language, tooltip preferences, and more.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="bug-report"]',
    content:
      "Found something wrong? Report it here — it opens a GitHub issue directly.",
    placement: "left",
    skipBeacon: true,
  },
];

const STYLES = {
  tooltip: {
    borderRadius: "0.75rem",
    border: "1px solid #2a2f42",
    fontSize: "0.875rem",
  },
  buttonPrimary: {
    backgroundColor: "#6c8ef7",
    borderRadius: "0.375rem",
    fontSize: "0.75rem",
    padding: "6px 14px",
  },
  buttonBack: { color: "#9ca3af", fontSize: "0.75rem" },
  buttonSkip: { color: "#6b7280", fontSize: "0.75rem" },
  buttonClose: { color: "#6b7280" },
};

export function OnboardingTour() {
  const { run, markSeen } = useOnboardingTour();

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      markSeen();
    }
  }

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      styles={STYLES}
      options={{
        primaryColor: "#6c8ef7",
        backgroundColor: "#13161e",
        textColor: "#e5e7eb",
        arrowColor: "#13161e",
        overlayColor: "rgba(0,0,0,0.6)",
        zIndex: 10000,
        showProgress: true,
        buttons: ["back", "close", "primary", "skip"],
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Done",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}
