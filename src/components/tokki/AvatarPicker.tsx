import { setAvatar } from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { AvatarId } from "../../types/tokki";

const AVATARS: { id: AvatarId; label: string; emoji: string }[] = [
  { id: "rabbit_v1", label: "Rabbit", emoji: "🐰" },
  { id: "cat_v1", label: "Cat", emoji: "🐱" },
  { id: "fox_v1", label: "Fox", emoji: "🦊" },
];

export function AvatarPicker(): JSX.Element {
  const avatarId = useTokkiStore((s) => s.avatarId);
  const setAvatarId = useTokkiStore((s) => s.setAvatarId);

  const pick = (id: AvatarId): void => {
    setAvatarId(id);
    void setAvatar(id);
  };

  return (
    <div className="avatar-picker" role="radiogroup" aria-label="Choose avatar">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`avatar-picker__btn ${avatarId === a.id ? "avatar-picker__btn--active" : ""}`}
          onClick={() => pick(a.id)}
          role="radio"
          aria-checked={avatarId === a.id}
          aria-label={a.label}
          title={a.label}
        >
          <span className="avatar-picker__emoji">{a.emoji}</span>
        </button>
      ))}
    </div>
  );
}
