import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WeatherInfo } from "../../utils/weather";
import { WeatherBadge } from "./WeatherBadge";

describe("WeatherBadge", () => {
  it("returns null when weather data is unavailable", () => {
    const { container } = render(<WeatherBadge weather={null} />);

    expect(container.firstChild).toBeNull();
  });

  it("falls back gracefully when weather payload fields are malformed", () => {
    render(<WeatherBadge weather={{ tempC: Number.NaN, condition: "", icon: "", moodHint: "" } as unknown as WeatherInfo} />);

    expect(screen.getByRole("img", { name: /weather: unknown/i })).toHaveAttribute("title", "unknown");
    expect(screen.getByText("🌤️")).toBeInTheDocument();
    expect(screen.queryByText(/°/)).not.toBeInTheDocument();
  });

  it("rounds valid temperatures for a stable badge label", () => {
    const { container } = render(<WeatherBadge weather={{ tempC: 18.6, condition: "clear", icon: "☀️", moodHint: "playful" }} />);

    expect(screen.getByRole("img", { name: /weather: 19°c clear/i })).toHaveAttribute("title", "19°C clear");
    expect(container.querySelector(".weather-badge__temp")).toHaveTextContent("19°");
  });
});
