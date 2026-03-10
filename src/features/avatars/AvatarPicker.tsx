import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { getPersonality, setAvatar, setPersonality } from "../../bridge/tauri";
import { useTokkiStore, selectAvatarId, selectPersonality } from "../../state/useTokkiStore";
import type { AvatarId, PersonalityConfig } from "../../types/tokki";
import {
  createOnboardingProfile,
  getAvatarNameSuggestions,
  getDefaultPersonalityForAvatar,
  getPersonalityPresetMeta,
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../utils/onboardingProfile";
import { getAllAvatars } from ".";
import { TokkiAvatarAsset } from "./TokkiAvatarAsset";

/** Number of columns in the avatar picker grid for arrow key navigation. */
const GRID_COLUMNS = 4;

interface AvatarOption {
  id: AvatarId;
  label: string;
  emoji: string;
  accentColor: string;
  suggestedName: string;
  defaultPersonality: PersonalityConfig;
  vibeLabel: string;
  vibeBlurb: string;
}

interface AvatarSwitchError {
  avatarId: AvatarId;
  message: string;
}

// Memoized avatar button to prevent re-renders of unaffected buttons
const AvatarButton = memo(function AvatarButton({
  option,
  isActive,
  isPending,
  isPreviewed,
  isFocusTarget,
  disabled,
  onPick,
  onFocus,
  onHover,
  buttonRef,
}: {
  option: AvatarOption;
  isActive: boolean;
  isPending: boolean;
  isPreviewed: boolean;
  isFocusTarget: boolean;
  disabled: boolean;
  onPick: (id: AvatarId) => void;
  onFocus: () => void;
  onHover: (id: AvatarId | null) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={[
        "avatar-picker__btn",
        isActive ? "avatar-picker__btn--active" : "",
        isPending ? "avatar-picker__btn--pending" : "",
        isPreviewed ? "avatar-picker__btn--preview" : "",
      ].filter(Boolean).join(" ")}
      onClick={() => onPick(option.id)}
      onFocus={onFocus}
      onMouseEnter={() => onHover(option.id)}
      onMouseLeave={() => onHover(null)}
      role="radio"
      aria-checked={isActive}
      aria-busy={isPending || undefined}
      aria-label={`${option.label}, ${option.vibeLabel}`}
      title={`${option.label} — ${option.vibeBlurb}`}
      tabIndex={disabled ? -1 : isFocusTarget ? 0 : -1}
      disabled={disabled}
      data-testid={`avatar-${option.id}`}
      style={{ "--avatar-accent": option.accentColor } as CSSProperties}
    >
      <span className="avatar-picker__emoji" aria-hidden="true">{option.emoji}</span>
      <span className="avatar-picker__name">{option.label}</span>
      <span className="avatar-picker__feel">{option.vibeLabel}</span>
    </button>
  );
});

export const AvatarPicker = memo(function AvatarPicker(): JSX.Element {
  const avatarId = useTokkiStore(selectAvatarId);
  const activePersonality = useTokkiStore(selectPersonality);
  const setAvatarId = useTokkiStore((s) => s.setAvatarId);
  const setStorePersonality = useTokkiStore((s) => s.setPersonality);
  const buttonRefs = useRef<Map<AvatarId, HTMLButtonElement>>(new Map());
  const [pendingAvatarId, setPendingAvatarId] = useState<AvatarId | null>(null);
  const [switchError, setSwitchError] = useState<AvatarSwitchError | null>(null);
  const [hoveredAvatarId, setHoveredAvatarId] = useState<AvatarId | null>(null);

  const avatars: AvatarOption[] = getAllAvatars().map((avatar) => {
    const defaultPersonality = getDefaultPersonalityForAvatar(avatar.id);
    const vibe = getPersonalityPresetMeta(defaultPersonality.preset);
    return {
      ...avatar,
      defaultPersonality,
      suggestedName: getAvatarNameSuggestions(avatar.id)[0] ?? defaultPersonality.name,
      vibeLabel: vibe.label,
      vibeBlurb: vibe.blurb,
    };
  });
  const storedProfile = loadOnboardingProfile();
  const selectedIndex = avatars.findIndex((avatar) => avatar.id === avatarId);
  const [focusedIndex, setFocusedIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const activeAvatar = avatars[selectedIndex] ?? avatars[0];
  const focusedAvatar = avatars[focusedIndex] ?? activeAvatar;
  const previewAvatar = (
    avatars.find((avatar) => avatar.id === pendingAvatarId)
    ?? avatars.find((avatar) => avatar.id === hoveredAvatarId)
    ?? focusedAvatar
    ?? activeAvatar
  );
  const spotlightPersonality = previewAvatar?.id === avatarId
    ? (
      activePersonality
      ?? (storedProfile?.avatarId === avatarId ? storedProfile.personality : null)
      ?? previewAvatar.defaultPersonality
    )
    : (previewAvatar?.defaultPersonality ?? getDefaultPersonalityForAvatar(avatarId));
  const spotlightName = previewAvatar?.id === avatarId
    ? spotlightPersonality.name
    : (previewAvatar?.suggestedName ?? spotlightPersonality.name);
  const isSwitching = pendingAvatarId !== null;

  useEffect(() => {
    if (selectedIndex >= 0) {
      setFocusedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const pick = useCallback((id: AvatarId): void => {
    if (isSwitching || id === avatarId) {
      return;
    }

    const nextAvatar = avatars.find((avatar) => avatar.id === id);
    const currentAvatar = avatars.find((avatar) => avatar.id === avatarId) ?? activeAvatar;
    if (!nextAvatar) {
      return;
    }

    const currentProfile = loadOnboardingProfile();
    const stablePersonality = (
      activePersonality
      ?? (currentProfile?.avatarId === avatarId ? currentProfile.personality : null)
      ?? currentAvatar.defaultPersonality
    );

    setSwitchError(null);
    setHoveredAvatarId(id);
    setPendingAvatarId(id);

    void (async () => {
      try {
        await setAvatar(id);
        const personality = await getPersonality();
        setAvatarId(id);
        setStorePersonality(personality);

        const nextProfile = createOnboardingProfile({
          avatarId: id,
          personality,
        });
        const existingProfile = loadOnboardingProfile();
        saveOnboardingProfile({
          ...nextProfile,
          userName: existingProfile?.userName ?? nextProfile.userName,
          completedAt: existingProfile?.completedAt ?? nextProfile.completedAt,
        });
        setPendingAvatarId(null);
        setHoveredAvatarId(null);
      } catch (error) {
        console.warn("[tokki] avatar switch failed", error);

        try {
          await setAvatar(currentAvatar.id);
          await setPersonality(stablePersonality);
        } catch (recoveryError) {
          console.warn("[tokki] avatar switch recovery failed", recoveryError);
        }

        setStorePersonality(stablePersonality);
        setPendingAvatarId(null);
        setHoveredAvatarId(null);
        setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(() => {
            buttonRefs.current.get(currentAvatar.id)?.focus();
          });
        } else {
          buttonRefs.current.get(currentAvatar.id)?.focus();
        }
        setSwitchError({
          avatarId: id,
          message: `Couldn't switch to ${nextAvatar.label} just yet. ${stablePersonality.name} stayed close instead.`,
        });
      }
    })();
  }, [activeAvatar, activePersonality, avatarId, avatars, isSwitching, selectedIndex, setAvatarId, setStorePersonality]);

  const focusAvatar = useCallback((index: number) => {
    const avatar = avatars[index];
    if (avatar) {
      setFocusedIndex(index);
      setHoveredAvatarId(null);
      buttonRefs.current.get(avatar.id)?.focus();
    }
  }, [avatars]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const count = avatars.length;
    if (count === 0 || isSwitching) return;

    let nextIndex = focusedIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (focusedIndex + 1) % count;
        break;
      case "ArrowLeft":
        nextIndex = (focusedIndex - 1 + count) % count;
        break;
      case "ArrowDown":
        nextIndex = (focusedIndex + GRID_COLUMNS) % count;
        break;
      case "ArrowUp":
        nextIndex = (focusedIndex - GRID_COLUMNS + count) % count;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = count - 1;
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        pick((avatars[focusedIndex] ?? activeAvatar).id);
        return;
      default:
        return;
    }

    event.preventDefault();
    focusAvatar(nextIndex);
  }, [avatars, focusedIndex, focusAvatar, pick]);

  const setButtonRef = useCallback((id: AvatarId, element: HTMLButtonElement | null) => {
    if (element) {
      buttonRefs.current.set(id, element);
    } else {
      buttonRefs.current.delete(id);
    }
  }, []);

  return (
    <div className="avatar-picker" data-testid="avatar-picker">
      {previewAvatar && (
        <div
          className="avatar-picker__spotlight"
          data-testid="avatar-picker-spotlight"
          style={{ "--avatar-accent": previewAvatar.accentColor } as CSSProperties}
        >
          <div className="avatar-picker__spotlight-preview" aria-hidden="true">
            <TokkiAvatarAsset
              assetId={previewAvatar.id}
              preview
              previewState={
                pendingAvatarId === previewAvatar.id
                  ? "hover"
                  : previewAvatar.id === avatarId
                    ? "selected"
                    : hoveredAvatarId === previewAvatar.id || focusedAvatar?.id === previewAvatar.id
                      ? "hover"
                      : "idle"
              }
            />
          </div>
          <div className="avatar-picker__spotlight-copy">
            <div className="avatar-picker__spotlight-row">
              <span className={`avatar-picker__spotlight-badge${
                pendingAvatarId === previewAvatar.id
                  ? " avatar-picker__spotlight-badge--pending"
                  : previewAvatar.id === avatarId
                    ? " avatar-picker__spotlight-badge--active"
                    : ""
              }`}>
                {pendingAvatarId === previewAvatar.id
                  ? "Switching…"
                  : previewAvatar.id === avatarId
                    ? "With you now"
                    : "Previewing"}
              </span>
              <span className="avatar-picker__spotlight-label">{previewAvatar.label}</span>
            </div>
            <div className="avatar-picker__spotlight-title">{spotlightName}</div>
            <p className="avatar-picker__spotlight-blurb">
              <strong>{previewAvatar.vibeLabel}</strong> · {previewAvatar.vibeBlurb}
            </p>
            <div className="avatar-picker__spotlight-meta" role={isSwitching ? "status" : undefined} aria-live="polite">
              <span className="avatar-picker__spotlight-chip">
                {pendingAvatarId === previewAvatar.id
                  ? "Holding your current form until everything syncs"
                  : previewAvatar.id === avatarId
                    ? "Current companion shape"
                    : "Use Enter or click to invite this look"}
              </span>
            </div>
          </div>
        </div>
      )}

      {switchError && (
        <div className="avatar-picker__feedback avatar-picker__feedback--error" role="alert">
          <span>{switchError.message}</span>
          <button
            type="button"
            className="avatar-picker__retry"
            onClick={() => pick(switchError.avatarId)}
          >
            Try again
          </button>
        </div>
      )}

      <div className="avatar-picker__grid-shell">
        <div
          className="avatar-picker__grid"
          role="radiogroup"
          aria-label="Choose avatar"
          aria-busy={isSwitching || undefined}
          data-testid="avatar-picker-grid"
          onKeyDown={handleKeyDown}
        >
          {avatars.map((avatar, index) => (
            <AvatarButton
              key={avatar.id}
              option={avatar}
              isActive={avatarId === avatar.id}
              isPending={pendingAvatarId === avatar.id}
              isPreviewed={previewAvatar?.id === avatar.id && avatarId !== avatar.id && pendingAvatarId !== avatar.id}
              isFocusTarget={index === focusedIndex}
              disabled={isSwitching}
              onPick={pick}
              onFocus={() => setFocusedIndex(index)}
              onHover={setHoveredAvatarId}
              buttonRef={(el) => setButtonRef(avatar.id, el)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
