import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ViewBar } from "./ViewBar";

describe("ViewBar", () => {
  test("renders every view button, including Notes and Untyped", () => {
    render(<ViewBar currentView="dashboard" onViewChange={vi.fn()} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Untyped")).toBeInTheDocument();
  });

  test("clicking a button reports its view id", () => {
    const onViewChange = vi.fn();
    render(<ViewBar currentView="dashboard" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText("Notes"));
    expect(onViewChange).toHaveBeenCalledWith("notes");
    fireEvent.click(screen.getByText("Untyped"));
    expect(onViewChange).toHaveBeenCalledWith("untyped");
  });
});
