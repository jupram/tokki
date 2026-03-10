import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreakBadge } from "./StreakBadge";

describe("StreakBadge", () => {
  it("hides invalid or empty streak counts", () => {
    const { container, rerender } = render(<StreakBadge count={0} />);

    expect(container.firstChild).toBeNull();

    rerender(<StreakBadge count={Number.NaN} />);
    expect(container.firstChild).toBeNull();

    rerender(<StreakBadge count={-3} />);
    expect(container.firstChild).toBeNull();
  });

  it("normalizes positive streak counts for display and accessibility", () => {
    render(<StreakBadge count={7.9} />);

    expect(screen.getByRole("img", { name: /7-day streak/i })).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
