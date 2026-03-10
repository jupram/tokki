import { Tooltip } from "../../components/Tooltip";

interface StreakBadgeProps {
  count: number;
}

function normalizeCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.trunc(count));
}

export function StreakBadge({ count }: StreakBadgeProps): JSX.Element | null {
  const safeCount = normalizeCount(count);
  if (safeCount <= 0) return null;

  const label = `${safeCount}-day streak`;
  const tip = `You've chatted with Tokki ${safeCount} days in a row! Keep it going 🎉`;

  return (
    <Tooltip content={tip} position="bottom">
      <div className="streak-badge" role="img" aria-label={label}>
        <span className="streak-badge__flame" aria-hidden="true">&#128293;</span>
        <span className="streak-badge__count" aria-hidden="true">{safeCount}</span>
      </div>
    </Tooltip>
  );
}
