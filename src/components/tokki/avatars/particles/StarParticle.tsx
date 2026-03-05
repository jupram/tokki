import type { ParticleProps } from "./types";

export function StarParticle({ x, y, delay, duration, size }: ParticleProps): JSX.Element {
  // 4-point star via polygon
  const r = size / 2;
  const ri = r * 0.35;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : ri;
    pts.push(`${x + rad * Math.cos(angle)},${y + rad * Math.sin(angle)}`);
  }
  return (
    <polygon
      points={pts.join(" ")}
      fill="#FFD848"
      opacity={0.8}
      className="fx-star"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        transformOrigin: `${x}px ${y}px`,
      }}
    />
  );
}
