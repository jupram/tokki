import type { ParticleProps } from "./types";

export function SnowParticle({ x, y, delay, duration, size }: ParticleProps): JSX.Element {
  return (
    <circle
      cx={x}
      cy={y}
      r={size / 2}
      fill="#E8F0FF"
      opacity={0.75}
      className="fx-snow"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}
