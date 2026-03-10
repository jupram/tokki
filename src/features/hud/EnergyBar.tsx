import { Tooltip } from "../../components/Tooltip";
import type { Mood } from "../../types/tokki";

interface EnergyBarProps {
  energy: number;
  mood: Mood;
}

const MOOD_LABELS: Record<Mood, string> = {
  idle: "",
  playful: "Playful",
  curious: "Curious",
  sleepy: "Sleepy",
  surprised: "Surprised",
};

const MOOD_TIPS: Record<Mood, string> = {
  idle: "Energy level shows how active Tokki feels",
  playful: "Tokki is feeling playful! Great time for games",
  curious: "Tokki is curious and ready to explore",
  sleepy: "Tokki is getting sleepy and might need rest soon",
  surprised: "Something caught Tokki's attention!",
};

function isMood(value: string): value is Mood {
  return Object.prototype.hasOwnProperty.call(MOOD_LABELS, value);
}

function clampEnergy(energy: number): number {
  if (!Number.isFinite(energy)) return 0;
  return Math.max(0, Math.min(100, Math.round(energy)));
}

export function EnergyBar({ energy, mood }: EnergyBarProps): JSX.Element {
  const safeMood = isMood(mood) ? mood : "idle";
  const label = MOOD_LABELS[safeMood];
  const pct = clampEnergy(energy);
  const valueText = label ? `${pct}% energy, ${label}` : `${pct}% energy`;
  const tip = MOOD_TIPS[safeMood];

  return (
    <Tooltip content={tip} position="bottom">
      <div
        className="energy-bar"
        role="progressbar"
        aria-label="Tokki energy"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={valueText}
      >
        <div className="energy-bar__track" aria-hidden="true">
          <div
            className={`energy-bar__fill energy-bar__fill--${safeMood}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {label && <span className="energy-bar__mood">{label}</span>}
      </div>
    </Tooltip>
  );
}
