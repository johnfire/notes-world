import { render } from "@testing-library/react";
import { vi } from "vitest";

// Mock react-joyride — it manipulates the real DOM and doesn't work in jsdom.
// We capture the props passed to it so we can assert on them.
vi.mock("react-joyride", () => ({
  Joyride: vi.fn(() => null),
  STATUS: { FINISHED: "finished", SKIPPED: "skipped" },
}));

import { Joyride } from "react-joyride";
import { OnboardingTour } from "./OnboardingTour";

const MockJoyride = Joyride as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("OnboardingTour", () => {
  test("passes run=true to Joyride when the tour has not been seen", () => {
    render(<OnboardingTour />);
    expect(MockJoyride).toHaveBeenCalledWith(
      expect.objectContaining({ run: true }),
      expect.anything(),
    );
  });

  test("passes run=false to Joyride when the tour has already been seen", () => {
    localStorage.setItem("nw_tour_seen", "true");
    render(<OnboardingTour />);
    expect(MockJoyride).toHaveBeenCalledWith(
      expect.objectContaining({ run: false }),
      expect.anything(),
    );
  });

  test("onEvent with FINISHED status marks the tour as seen", () => {
    render(<OnboardingTour />);

    const { onEvent } = MockJoyride.mock.calls[0][0] as {
      onEvent: (data: { status: string }) => void;
    };

    onEvent({ status: "finished" });

    expect(localStorage.getItem("nw_tour_seen")).toBe("true");
  });

  test("onEvent with SKIPPED status marks the tour as seen", () => {
    render(<OnboardingTour />);

    const { onEvent } = MockJoyride.mock.calls[0][0] as {
      onEvent: (data: { status: string }) => void;
    };

    onEvent({ status: "skipped" });

    expect(localStorage.getItem("nw_tour_seen")).toBe("true");
  });

  test("onEvent with other statuses does not mark the tour as seen", () => {
    render(<OnboardingTour />);

    const { onEvent } = MockJoyride.mock.calls[0][0] as {
      onEvent: (data: { status: string }) => void;
    };

    onEvent({ status: "running" });

    expect(localStorage.getItem("nw_tour_seen")).toBeNull();
  });
});
