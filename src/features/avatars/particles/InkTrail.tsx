import type { ParticleProps } from "./types";

export function InkTrail({ x, y, delay, duration, size }: ParticleProps): JSX.Element {
  return (
    <circle
      cx={x}
      cy={y}
      r={size / 2}
      fill="#2C2C2C"
      opacity={0.6}
      className="fx-ink"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}
