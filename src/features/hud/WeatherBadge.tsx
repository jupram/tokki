import type { WeatherInfo } from "../../utils/weather";

interface WeatherBadgeProps {
  weather: WeatherInfo | null;
}

const DEFAULT_WEATHER_ICON = "\uD83C\uDF24\uFE0F";

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeTemperature(tempC: number): number | null {
  if (!Number.isFinite(tempC)) return null;
  return Math.round(tempC);
}

export function WeatherBadge({ weather }: WeatherBadgeProps): JSX.Element | null {
  if (!weather) return null;

  const tempC = normalizeTemperature(weather.tempC);
  const condition = normalizeText(weather.condition, "unknown");
  const icon = normalizeText(weather.icon, DEFAULT_WEATHER_ICON);
  const title = tempC === null ? condition : `${tempC}\u00B0C ${condition}`;
  const label = `Weather: ${title}`;

  return (
    <div className="weather-badge" title={title} role="img" aria-label={label}>
      <span className="weather-badge__icon" aria-hidden="true">{icon}</span>
      {tempC !== null && <span className="weather-badge__temp" aria-hidden="true">{tempC}°</span>}
    </div>
  );
}
