import type { ParticleProps } from "./types";

export function WispParticle({ x, y, delay, duration, size }: ParticleProps): JSX.Element {
  return (
    <circle
      cx={x}
      cy={y}
      r={size / 2}
      fill="#80E0D0"
      opacity={0.5}
      className="fx-wisp"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}
