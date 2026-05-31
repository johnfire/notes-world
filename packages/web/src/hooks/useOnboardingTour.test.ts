import { renderHook, act } from "@testing-library/react";
import { useOnboardingTour } from "./useOnboardingTour";

const SEEN_KEY = "nw_tour_seen";
const RESTART_EVENT = "nw-tour-restart";

beforeEach(() => {
  localStorage.clear();
});

describe("useOnboardingTour", () => {
  test("run is true when the user has not seen the tour", () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.run).toBe(true);
  });

  test("run is false when the tour has already been seen", () => {
    localStorage.setItem(SEEN_KEY, "true");
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.run).toBe(false);
  });

  test("markSeen sets run to false and writes localStorage", () => {
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.run).toBe(true);

    act(() => {
      result.current.markSeen();
    });

    expect(result.current.run).toBe(false);
    expect(localStorage.getItem(SEEN_KEY)).toBe("true");
  });

  test("restart clears localStorage and sets run to true", () => {
    localStorage.setItem(SEEN_KEY, "true");
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.run).toBe(false);

    act(() => {
      result.current.restart();
    });

    expect(result.current.run).toBe(true);
    expect(localStorage.getItem(SEEN_KEY)).toBeNull();
  });

  test("restart event syncs run across hook instances", () => {
    localStorage.setItem(SEEN_KEY, "true");

    const { result: a } = renderHook(() => useOnboardingTour());
    const { result: b } = renderHook(() => useOnboardingTour());

    expect(a.current.run).toBe(false);
    expect(b.current.run).toBe(false);

    act(() => {
      // simulate the restart event fired by a third instance
      localStorage.removeItem(SEEN_KEY);
      window.dispatchEvent(new Event(RESTART_EVENT));
    });

    expect(a.current.run).toBe(true);
    expect(b.current.run).toBe(true);
  });
});
