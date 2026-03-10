import type { Mood } from "../../types/tokki";

export interface FXConfig {
  particle: "ember" | "petal" | "snow" | "wisp" | "star" | "ink" | null;
  count: [number, number];
  zone: { x: [number, number]; y: [number, number] };
  intensity: number;
}

export type AvatarFXMap = Partial<Record<Mood, FXConfig>>;
