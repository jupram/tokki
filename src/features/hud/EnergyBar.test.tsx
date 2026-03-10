import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnergyBar } from "./EnergyBar";

describe("EnergyBar", () => {
  it("clamps invalid energy values and falls back to idle styling for unknown moods", () => {
    const { container, rerender } = render(<EnergyBar energy={Number.NaN} mood={"mystery" as never} />);

    expect(screen.getByRole("progressbar", { name: /tokki energy/i })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("progressbar", { name: /tokki energy/i })).toHaveAttribute("aria-valuetext", "0% energy");
    expect(container.querySelector(".energy-bar__fill--idle")).toBeInTheDocument();
    expect(screen.queryByText("Playful")).not.toBeInTheDocument();

    rerender(<EnergyBar energy={123} mood="playful" />);

    expect(screen.getByRole("progressbar", { name: /tokki energy/i })).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("progressbar", { name: /tokki energy/i })).toHaveAttribute("aria-valuetext", "100% energy, Playful");
    expect(container.querySelector(".energy-bar__fill--playful")).toBeInTheDocument();
    expect(screen.getByText("Playful")).toBeInTheDocument();
  });
});
