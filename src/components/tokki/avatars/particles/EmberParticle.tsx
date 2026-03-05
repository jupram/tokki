import type { ParticleProps } from "./types";

export function EmberParticle({ x, y, delay, duration, size }: ParticleProps): JSX.Element {
  return (
    <circle
      cx={x}
      cy={y}
      r={size / 2}
      fill="#FF6B35"
      opacity={0.85}
      className="fx-ember"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}
