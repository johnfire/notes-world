import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { BugReportButton } from "./BugReportButton";
import * as api from "../api";

vi.mock("../api", () => ({
  bugReports: { submit: vi.fn() },
}));

const submit = api.bugReports.submit as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BugReportButton", () => {
  test("submits description with page + user agent and shows the issue link", async () => {
    submit.mockResolvedValue({
      number: 42,
      url: "https://github.com/johnfire/notes-world/issues/42",
    });
    render(<BugReportButton />);

    await userEvent.click(
      screen.getByRole("button", { name: /report a bug/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText(/what happened/i),
      "Save button does nothing",
    );
    await userEvent.click(screen.getByRole("button", { name: /send report/i }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Save button does nothing",
        page: expect.any(String),
        userAgent: expect.any(String),
      }),
    );
    expect(await screen.findByText(/issue #42/i)).toBeInTheDocument();
  });

  test("keeps the form open and shows the error on failure", async () => {
    submit.mockRejectedValue(new Error("GitHub rejected the issue"));
    render(<BugReportButton />);

    await userEvent.click(
      screen.getByRole("button", { name: /report a bug/i }),
    );
    await userEvent.type(
      screen.getByPlaceholderText(/what happened/i),
      "Something broke",
    );
    await userEvent.click(screen.getByRole("button", { name: /send report/i }));

    expect(
      await screen.findByText(/github rejected the issue/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/what happened/i)).toBeInTheDocument();
  });
});
