import { useMemo } from "react";
import { useTokkiStore } from "../../../../state/useTokkiStore";
import { getAvatar } from "../index";
import type { FXConfig } from "../types";
import { EmberParticle } from "./EmberParticle";
import { PetalParticle } from "./PetalParticle";
import { SnowParticle } from "./SnowParticle";
import { WispParticle } from "./WispParticle";
import { StarParticle } from "./StarParticle";
import { InkTrail } from "./InkTrail";
import type { ParticleProps } from "./types";

type ParticleType = NonNullable<FXConfig["particle"]>;

const PARTICLE_MAP: Record<ParticleType, (props: ParticleProps) => JSX.Element> = {
  ember: EmberParticle,
  petal: PetalParticle,
  snow: SnowParticle,
  wisp: WispParticle,
  star: StarParticle,
  ink: InkTrail,
};

function spawnParticles(fxConfig: FXConfig): Array<ParticleProps & { key: string }> {
  const count =
    fxConfig.count[0] +
    Math.floor(Math.random() * (fxConfig.count[1] - fxConfig.count[0] + 1));

  return Array.from({ length: count }, (_, i) => ({
    x: fxConfig.zone.x[0] + Math.random() * (fxConfig.zone.x[1] - fxConfig.zone.x[0]),
    y: fxConfig.zone.y[0] + Math.random() * (fxConfig.zone.y[1] - fxConfig.zone.y[0]),
    delay: Math.random() * 2,
    duration: 1.5 + Math.random() * 1.5,
    size: 3 + Math.random() * fxConfig.intensity * 5,
    key: `${fxConfig.particle}-${i}-${Date.now()}`,
  }));
}

export function FXLayer(): JSX.Element | null {
  const avatarId = useTokkiStore((s) => s.avatarId);
  const mood = useTokkiStore((s) => s.state.current_action.mood);

  const avatar = getAvatar(avatarId);
  const fxConfig = avatar?.fx[mood];
  const particleType = fxConfig?.particle ?? null;

  const particles = useMemo(() => {
    if (!fxConfig || !particleType) return [];
    return spawnParticles(fxConfig);
  }, [particleType, mood]);

  if (!particleType || particles.length === 0) return null;

  const ParticleComponent = PARTICLE_MAP[particleType];

  return (
    <svg
      className="fx-layer"
      viewBox="0 0 160 160"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <ParticleComponent
          key={p.key}
          x={p.x}
          y={p.y}
          delay={p.delay}
          duration={p.duration}
          size={p.size}
        />
      ))}
    </svg>
  );
}
