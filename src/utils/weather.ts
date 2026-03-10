/**
 * Weather detection via Open-Meteo (free, no API key).
 * Uses browser geolocation → weather code → mood hint.
 */

export type WeatherCondition = "clear" | "cloudy" | "rainy" | "snowy" | "stormy" | "unknown";

export interface WeatherInfo {
  condition: WeatherCondition;
  tempC: number;
  icon: string;
  moodHint: string;
}

// WMO Weather interpretation codes → condition
function wmoToCondition(code: number): WeatherCondition {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code >= 95) return "stormy";
  if (code >= 71 && code <= 77) return "snowy";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rainy";
  return "cloudy";
}

function conditionIcon(c: WeatherCondition): string {
  switch (c) {
    case "clear": return "\u2600\uFE0F";
    case "cloudy": return "\u2601\uFE0F";
    case "rainy": return "\uD83C\uDF27\uFE0F";
    case "snowy": return "\u2744\uFE0F";
    case "stormy": return "\u26A1";
    default: return "\uD83C\uDF24\uFE0F";
  }
}

function conditionMoodHint(c: WeatherCondition): string {
  switch (c) {
    case "clear": return "playful";
    case "cloudy": return "curious";
    case "rainy": return "sleepy";
    case "snowy": return "curious";
    case "stormy": return "surprised";
    default: return "neutral";
  }
}

let cached: WeatherInfo | null = null;
let lastFetch = 0;
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
  });
}

export async function fetchWeather(): Promise<WeatherInfo | null> {
  if (cached && Date.now() - lastFetch < CACHE_MS) return cached;

  try {
    const pos = await getPosition();
    const { latitude, longitude } = pos.coords;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) return cached;
    const data = await res.json() as { current_weather: { weathercode: number; temperature: number } };
    const cw = data.current_weather;
    const condition = wmoToCondition(cw.weathercode);
    cached = {
      condition,
      tempC: Math.round(cw.temperature),
      icon: conditionIcon(condition),
      moodHint: conditionMoodHint(condition),
    };
    lastFetch = Date.now();
    return cached;
  } catch {
    return cached; // return stale or null
  }
}
