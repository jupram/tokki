import { setAvatar } from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { AvatarId } from "../../types/tokki";
import { getAllAvatars } from "./avatars";

export function AvatarPicker(): JSX.Element {
  const avatarId = useTokkiStore((s) => s.avatarId);
  const setAvatarId = useTokkiStore((s) => s.setAvatarId);

  const pick = (id: AvatarId): void => {
    setAvatarId(id);
    void setAvatar(id);
  };

  const avatars = getAllAvatars();

  return (
    <div className="avatar-picker-wrap">
      <div className="avatar-picker" role="radiogroup" aria-label="Choose avatar">
        {avatars.map((a) => (
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
    </div>
  );
}
