import type { ParticleProps } from "./types";

export function PetalParticle({ x, y, delay, duration, size }: ParticleProps): JSX.Element {
  const w = size;
  const h = size * 0.6;
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={w / 2}
      ry={h / 2}
      fill="#FFB7C5"
      opacity={0.8}
      className="fx-petal"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        transformOrigin: `${x}px ${y}px`,
      }}
    />
  );
}
