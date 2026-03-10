import { useState, useCallback, useEffect, useRef, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import { getProviderConfig, isTauriRuntime, setAvatar, setPersonality, setProviderConfig } from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { AvatarId, ProviderConfig } from "../../types/tokki";
import {
  createOnboardingProfile,
  getAvatarNameSuggestions,
  getDefaultPersonalityForAvatar,
  getPersonalityPresetMeta,
  saveOnboardingProfile,
  type OnboardingProfile,
} from "../../utils/onboardingProfile";
import { createProviderConfig, inferOnboardingProviderConfig } from "../../utils/providerConfig";
import { sfxCelebrate } from "../../audio/sfx";
import { getAllAvatars } from "../avatars";
import { TokkiAvatarAsset, type AvatarPreviewState } from "../avatars/TokkiAvatarAsset";
import { ProviderSetupStep } from "./ProviderSetupStep";

interface OnboardingWizardProps {
  onComplete: (profile: OnboardingProfile) => void;
}

type Step = "avatar" | "identity" | "provider" | "done";
const DONE_DELAY_MS = 2500;

/** Number of columns in the onboarding avatar grid for arrow key navigation. */
const AVATAR_GRID_COLUMNS = 4;

const AVATAR_TEASERS: Record<string, string> = {
  rabbit_v2: "Warm & easy to trust",
  cat_v1: "Cool & quietly affectionate",
  fox_v2: "Curious & a little mischievous",
  dog_v1: "Sunny & eager to play",
  dragon_v1: "Bold & impossible to ignore",
  kitsune_v1: "Dreamy & full of secrets",
  penguin_v1: "Cheerful & ready for anything",
  owl_v1: "Wise & quietly magical",
};

const PLACEHOLDER_NAMES = ["Luna", "Mochi", "Pixel", "Kiki"] as const;
const PROVIDER_LOAD_TIMEOUT_MS = 4_000;
const PROVIDER_SAVE_TIMEOUT_MS = 5_000;
const PROFILE_APPLY_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, reason: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`${reason} timed out`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

/** Strip zero-width and other invisible Unicode characters that could produce blank-looking names. */
function sanitizeDisplayName(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E\u0000-\u001F\u007F]/g, "").trim();
}

function isSuggestedName(name: string, suggestions: readonly string[]): boolean {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return suggestions.some((suggestion) => suggestion.toLowerCase() === normalized);
}

/** Simple trait level bar indicator (0-100 scale). */
function TraitBar({ label, value, emoji }: { label: string; value: number; emoji: string }): JSX.Element {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="personality-preview__trait">
      <span className="personality-preview__trait-emoji">{emoji}</span>
      <span className="personality-preview__trait-label">{label}</span>
      <div className="personality-preview__trait-bar">
        <div
          className="personality-preview__trait-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Compact personality preview panel for avatar selection. */
function PersonalityPreview({ avatarId }: { avatarId: AvatarId }): JSX.Element {
  const personality = getDefaultPersonalityForAvatar(avatarId);
  const presetMeta = getPersonalityPresetMeta(personality.preset);

  return (
    <div className="personality-preview">
      <div className="personality-preview__header">
        <span className="personality-preview__preset">{presetMeta.label}</span>
        <span className="personality-preview__blurb">{presetMeta.blurb}</span>
      </div>
      <div className="personality-preview__traits">
        <TraitBar label="Humor" value={personality.humor} emoji="😄" />
        <TraitBar label="Chatter" value={personality.chattiness} emoji="💬" />
        <TraitBar label="Energy" value={personality.reaction_intensity} emoji="⚡" />
      </div>
    </div>
  );
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps): JSX.Element {
  const avatarId = useTokkiStore((s) => s.avatarId);
  const setAvatarId = useTokkiStore((s) => s.setAvatarId);
  const setStorePersonality = useTokkiStore((s) => s.setPersonality);
  const [step, setStep] = useState<Step>("avatar");
  const [petName, setPetName] = useState(
    () => getAvatarNameSuggestions(avatarId)[0] ?? getDefaultPersonalityForAvatar(avatarId).name
  );
  const [userName, setUserName] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [providerConfig, setProviderConfigState] = useState<ProviderConfig | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);
  const [providerLoadAttempt, setProviderLoadAttempt] = useState(0);
  const [nameError, setNameError] = useState<string | null>(null);
  const previousSuggestionsRef = useRef(getAvatarNameSuggestions(avatarId));
  const doneTimerRef = useRef<number | undefined>(undefined);
  const [hoveredAvatar, setHoveredAvatar] = useState<AvatarId | null>(null);
  const [selectedBounce, setSelectedBounce] = useState<AvatarId | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [hatchPhase, setHatchPhase] = useState(0);
  const [glowPulse, setGlowPulse] = useState(false);
  const [nameInputFocused, setNameInputFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [focusedAvatarIndex, setFocusedAvatarIndex] = useState(0);
  const avatarButtonRefs = useRef<Map<AvatarId, HTMLButtonElement>>(new Map());

  useEffect(() => {
    return () => {
      if (doneTimerRef.current !== undefined) {
        window.clearTimeout(doneTimerRef.current);
      }
    };
  }, []);

  // Gentle fade-in on every step change
  useEffect(() => {
    setFadeIn(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeIn(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Hatching animation sequence when reaching the "done" step
  useEffect(() => {
    if (step !== "done") {
      setHatchPhase(0);
      return;
    }
    try { if (typeof AudioContext !== "undefined") sfxCelebrate(); } catch { /* audio unavailable */ }
    const timers = [
      window.setTimeout(() => setHatchPhase(1), 100),
      window.setTimeout(() => setHatchPhase(2), 1200),
      window.setTimeout(() => setHatchPhase(3), 1800),
      window.setTimeout(() => setHatchPhase(4), 2200),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [step]);

  // Pulsing glow during hatch phase 1
  useEffect(() => {
    if (step !== "done" || hatchPhase !== 1) {
      setGlowPulse(false);
      return;
    }
    const interval = window.setInterval(() => {
      setGlowPulse((prev) => !prev);
    }, 350);
    return () => window.clearInterval(interval);
  }, [step, hatchPhase]);

  // Rotating placeholder name inspiration in the naming step
  useEffect(() => {
    if (step !== "identity") return;
    const interval = window.setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDER_NAMES.length);
    }, 2500);
    return () => window.clearInterval(interval);
  }, [step]);

  const avatars = getAllAvatars();
  const activeAvatar = avatars.find((avatar) => avatar.id === avatarId) ?? avatars[0];
  const suggestions = getAvatarNameSuggestions(avatarId);
  const defaultPersonality = getDefaultPersonalityForAvatar(avatarId);
  const presetMeta = getPersonalityPresetMeta(defaultPersonality.preset);
  const accentStyle = {
    "--tokki-accent": activeAvatar?.accentColor ?? "#e8d5be",
  } as CSSProperties;
  const isPreviewMode = !isTauriRuntime();

  const fadeStyle: CSSProperties = {
    opacity: fadeIn ? 1 : 0,
    transform: fadeIn ? "translateY(0)" : "translateY(8px)",
    transition: "opacity 0.3s ease, transform 0.3s ease",
  };

  useEffect(() => {
    let cancelled = false;
    setProviderConfigState(null);
    setProviderLoadError(null);

    const loadInitialProviderConfig = async (): Promise<void> => {
      try {
        const currentProviderConfig = await withTimeout(
          getProviderConfig(),
          PROVIDER_LOAD_TIMEOUT_MS,
          "Loading chat setup",
        );
        if (!cancelled) {
          setProviderConfigState(inferOnboardingProviderConfig(currentProviderConfig));
        }
      } catch (error) {
        console.error("Failed to load provider config for onboarding", error);
        if (!cancelled) {
          setProviderConfigState(null);
          setProviderLoadError(
            "Tokki couldn't peek at chat settings just yet 🐰 Try again, or hop into Offline mode to start chatting right away!",
          );
        }
      }
    };

    void loadInitialProviderConfig();

    return () => {
      cancelled = true;
    };
  }, [providerLoadAttempt]);

  const handleAvatarPick = useCallback(
    (id: AvatarId) => {
      const trimmedName = petName.trim();
      const nextSuggestions = getAvatarNameSuggestions(id);
      const shouldRefreshName =
        !trimmedName || isSuggestedName(trimmedName, previousSuggestionsRef.current);

      previousSuggestionsRef.current = nextSuggestions;
      setAvatarId(id);
      setSelectedBounce(id);
      window.setTimeout(() => setSelectedBounce(null), 350);

      if (shouldRefreshName) {
        setPetName(nextSuggestions[0] ?? getDefaultPersonalityForAvatar(id).name);
        if (nameError) setNameError(null);
      }

      void setAvatar(id);
    },
    [nameError, petName, setAvatarId]
  );

  const focusAvatarByIndex = useCallback((index: number, avatarList: typeof avatars) => {
    const avatar = avatarList[index];
    if (avatar) {
      setFocusedAvatarIndex(index);
      avatarButtonRefs.current.get(avatar.id)?.focus();
    }
  }, []);

  const handleAvatarGridKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>, avatarList: typeof avatars) => {
    const count = avatarList.length;
    if (count === 0) return;

    let nextIndex = focusedAvatarIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (focusedAvatarIndex + 1) % count;
        break;
      case "ArrowLeft":
        nextIndex = (focusedAvatarIndex - 1 + count) % count;
        break;
      case "ArrowDown":
        nextIndex = (focusedAvatarIndex + AVATAR_GRID_COLUMNS) % count;
        break;
      case "ArrowUp":
        nextIndex = (focusedAvatarIndex - AVATAR_GRID_COLUMNS + count) % count;
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
        handleAvatarPick(avatarList[focusedAvatarIndex].id);
        return;
      default:
        return;
    }

    event.preventDefault();
    focusAvatarByIndex(nextIndex, avatarList);
  }, [focusedAvatarIndex, focusAvatarByIndex, handleAvatarPick]);

  const setAvatarButtonRef = useCallback((id: AvatarId, element: HTMLButtonElement | null) => {
    if (element) {
      avatarButtonRefs.current.set(id, element);
    } else {
      avatarButtonRefs.current.delete(id);
    }
  }, []);

  const handleFinish = useCallback(async (selectedProviderConfig: ProviderConfig) => {
    const trimmedName = sanitizeDisplayName(petName);
    if (!trimmedName || isFinishing) {
      return;
    }

    setIsFinishing(true);
    setProviderError(null);

    const profile = createOnboardingProfile({
      avatarId,
      name: trimmedName,
      userName: userName.trim() || null,
    });

    try {
      await withTimeout(
        setProviderConfig(selectedProviderConfig),
        PROVIDER_SAVE_TIMEOUT_MS,
        "Saving chat setup",
      );
    } catch (error) {
      console.error("Failed to apply onboarding provider config", error);
      setProviderError(
        selectedProviderConfig.provider === "offline"
          ? "Hmm, Offline mode didn't stick 🐰 Let's try that wake-up again!"
          : "That chat setup took too long to save 🐰 Give it another try, or switch to Offline mode to start now!",
      );
      setIsFinishing(false);
      setStep("provider");
      return;
    }

    try {
      await withTimeout(setAvatar(profile.avatarId), PROFILE_APPLY_TIMEOUT_MS, "Applying avatar");
      await withTimeout(
        setPersonality(profile.personality),
        PROFILE_APPLY_TIMEOUT_MS,
        "Applying personality",
      );
    } catch (error) {
      console.error("Failed to apply onboarding profile", error);
      setProviderError(
        "Tokki couldn't finish waking up in time 🐰 Let's try again — we're almost there!",
      );
      setIsFinishing(false);
      setStep("provider");
      return;
    }

    setAvatarId(profile.avatarId);
    setStorePersonality(profile.personality);
    saveOnboardingProfile(profile);
    setStep("done");

    doneTimerRef.current = window.setTimeout(() => onComplete(profile), DONE_DELAY_MS);
  }, [avatarId, isFinishing, onComplete, petName, setAvatarId, setStorePersonality, userName]);

  const handleIdentitySubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const sanitized = sanitizeDisplayName(petName);
      if (!sanitized) {
        setNameError("Every companion needs a name! 🐰 Pick one from above or make up your own.");
        return;
      }

      if (sanitized !== petName) {
        setPetName(sanitized);
      }

      setNameError(null);
      setProviderError(null);
      setStep("provider");
    },
    [petName]
  );

  const handleRetryProviderLoad = useCallback(() => {
    setProviderError(null);
    setProviderLoadError(null);
    setProviderLoadAttempt((attempt) => attempt + 1);
  }, []);

  const handleContinueOffline = useCallback(() => {
    setProviderError(null);
    setProviderLoadError(null);
    setProviderConfigState(createProviderConfig("offline"));
  }, []);

  if (!activeAvatar) {
    return (
      <div className="onboarding">
        <div className="onboarding__card">
          <div className="onboarding__step onboarding__step--enter">
            <h2 className="onboarding__heading">Tokki couldn&apos;t find any avatars</h2>
            <p className="onboarding__sub">Try restarting the app to finish setup.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding" style={accentStyle}>
      <div className="onboarding__card">
        {step === "avatar" && (
          <div className="onboarding__step onboarding__step--enter" style={fadeStyle}>
            <div className="onboarding__emoji">{activeAvatar.emoji}</div>
            <h2 className="onboarding__heading">Who&apos;s calling to you?</h2>
            <p className="onboarding__sub">
              {activeAvatar.label} brings {presetMeta.blurb} energy. We&apos;ll shape the rest
              together next, including a fitting default name.
            </p>

            <div
              className="onboarding__avatar-grid"
              role="radiogroup"
              aria-label="Choose avatar"
              onKeyDown={(e) => handleAvatarGridKeyDown(e, avatars)}
            >
              {avatars.map((avatar, index) => {
                const isHovered = hoveredAvatar === avatar.id;
                const isBouncing = selectedBounce === avatar.id;
                const isSelected = avatarId === avatar.id;
                const isFocusTarget = index === focusedAvatarIndex;
                const btnScale = isBouncing ? 1.15 : isHovered && !isSelected ? 1.06 : 1;
                const teaser =
                  AVATAR_TEASERS[avatar.id] ??
                  getPersonalityPresetMeta(getDefaultPersonalityForAvatar(avatar.id).preset).blurb;
                
                // Determine the preview animation state
                const previewState: AvatarPreviewState = isBouncing || isSelected 
                  ? "selected" 
                  : isHovered 
                    ? "hover" 
                    : "idle";

                return (
                  <button
                    key={avatar.id}
                    ref={(el) => setAvatarButtonRef(avatar.id, el)}
                    type="button"
                    className={`onboarding__avatar-btn ${isSelected ? "onboarding__avatar-btn--active" : ""}`}
                    onClick={() => handleAvatarPick(avatar.id)}
                    onMouseEnter={() => setHoveredAvatar(avatar.id)}
                    onMouseLeave={() => setHoveredAvatar(null)}
                    onFocus={() => setFocusedAvatarIndex(index)}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${avatar.label} - ${teaser}`}
                    title={avatar.label}
                    tabIndex={isFocusTarget ? 0 : -1}
                    style={{
                      transform: `scale(${btnScale})`,
                      transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    <div className="onboarding__avatar-preview-wrap">
                      <TokkiAvatarAsset 
                        assetId={avatar.id} 
                        preview 
                        previewState={previewState}
                      />
                    </div>
                    <span className="onboarding__avatar-label">{avatar.label}</span>
                    <span style={{
                      fontSize: "10px",
                      opacity: 0.6,
                      marginTop: "2px",
                      lineHeight: 1.3,
                      textAlign: "center" as const,
                    }}>
                      {teaser}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Personality preview panel */}
            <PersonalityPreview avatarId={hoveredAvatar ?? avatarId} />

            <div className="onboarding__nav">
              <button
                type="button"
                className="onboarding__btn"
                onClick={() => setStep("identity")}
              >
                This one
              </button>
            </div>
          </div>
        )}

        {step === "identity" && (
          <div className="onboarding__step onboarding__step--enter" style={fadeStyle}>
            <div className="onboarding__identity-header">
              <div className="onboarding__emoji">{activeAvatar.emoji}</div>
              <div className="onboarding__identity-copy">
                <span className="onboarding__eyebrow">{activeAvatar.label}</span>
                <span className="onboarding__pill">{presetMeta.label}</span>
              </div>
            </div>

            <h2 className="onboarding__heading">What&apos;s their name?</h2>
            <p className="onboarding__sub">
              Pick a name you love, then optionally share what they should call you.
            </p>

            <div className="onboarding__chips" aria-label="Suggested names">
              {suggestions.map((name) => {
                const active = petName.trim() === name;
                return (
                  <button
                    key={name}
                    type="button"
                    className={`onboarding__chip ${active ? "onboarding__chip--active" : ""}`}
                    onClick={() => setPetName(name)}
                    aria-pressed={active}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleIdentitySubmit} className="onboarding__form">
              <label className="onboarding__field">
                <span className="onboarding__label">Pet name</span>
                <input
                  type="text"
                  className={`onboarding__input${nameError ? " onboarding__input--error" : ""}`}
                  value={petName}
                  onChange={(event) => {
                    setPetName(event.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onFocus={() => setNameInputFocused(true)}
                  onBlur={() => {
                    setNameInputFocused(false);
                    const sanitized = sanitizeDisplayName(petName);
                    if (sanitized !== petName) setPetName(sanitized);
                  }}
                  placeholder={PLACEHOLDER_NAMES[placeholderIdx]}
                  maxLength={24}
                  autoFocus
                  style={{
                    boxShadow: nameInputFocused
                      ? `0 0 16px 3px ${activeAvatar.accentColor}50`
                      : "none",
                    transition: "box-shadow 0.3s ease",
                  }}
                />
              </label>

              {nameError && (
                <span className="onboarding__field-error" role="alert">{nameError}</span>
              )}

              {sanitizeDisplayName(petName) && !nameError && (
                <div style={{
                  fontSize: "13px",
                  color: "rgba(255, 255, 255, 0.5)",
                  marginTop: "6px",
                  fontStyle: "italic",
                  transition: "opacity 0.5s ease",
                }}>
                  {sanitizeDisplayName(petName)} is waking up…
                </div>
              )}

              <div className="onboarding__name-helper">
                <span>
                  Default for {activeAvatar.label}: <strong>{defaultPersonality.name}</strong>
                </span>
                <button
                  type="button"
                  className="onboarding__chip onboarding__chip--subtle"
                  onClick={() => setPetName(defaultPersonality.name)}
                >
                  Use default
                </button>
              </div>

              <label className="onboarding__field">
                <span className="onboarding__label">
                  What should {petName.trim() || "Tokki"} call you? (optional)
                </span>
                <input
                  type="text"
                  className="onboarding__input"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  onBlur={() => {
                    const sanitized = sanitizeDisplayName(userName);
                    if (sanitized !== userName) setUserName(sanitized);
                  }}
                  placeholder="e.g. Saket"
                  maxLength={24}
                />
              </label>

              <div className="onboarding__identity-note">
                <span className="onboarding__callout-title">{presetMeta.label} vibe</span>
                <span>{presetMeta.blurb}.</span>
                {userName.trim() && (
                  <span>
                    {petName.trim() || "Tokki"} will remember you as {userName.trim()} in local
                    context cards.
                  </span>
                )}
              </div>

              <div className="onboarding__nav">
                <button
                  type="button"
                  className="onboarding__btn onboarding__btn--secondary"
                  onClick={() => setStep("avatar")}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="onboarding__btn"
                  disabled={!sanitizeDisplayName(petName) || isFinishing}
                >
                  Next: chat setup
                </button>
              </div>
            </form>
          </div>
        )}

        {step === "provider" && (
          providerConfig ? (
            <div style={fadeStyle}>
              <ProviderSetupStep
                initialConfig={providerConfig}
                petName={petName.trim() || "Tokki"}
                userName={userName.trim() || null}
                isPreviewMode={isPreviewMode}
                isSaving={isFinishing}
                error={providerError}
                onBack={() => {
                  if (!isFinishing) {
                    setProviderError(null);
                    setStep("identity");
                  }
                }}
                onComplete={handleFinish}
              />
            </div>
          ) : providerLoadError ? (
            <div className="onboarding__step onboarding__step--enter onboarding__step--done" style={fadeStyle}>
              <div className="onboarding__emoji">⚠️</div>
              <h2 className="onboarding__heading">Chat setup couldn&apos;t load</h2>
              <div className="onboarding__error" role="alert">
                {providerLoadError}
              </div>
              <div className="onboarding__nav">
                <button
                  type="button"
                  className="onboarding__btn"
                  onClick={handleRetryProviderLoad}
                >
                  Retry loading chat setup
                </button>
                <button
                  type="button"
                  className="onboarding__btn onboarding__btn--secondary"
                  onClick={handleContinueOffline}
                >
                  Continue offline
                </button>
              </div>
            </div>
          ) : (
            <div className="onboarding__step onboarding__step--enter onboarding__step--done" style={fadeStyle}>
              <div className="onboarding__emoji onboarding__emoji--bounce">🫧</div>
              <h2 className="onboarding__heading">Loading chat setup…</h2>
              <p className="onboarding__sub">
                Tokki is checking the safest way to start chatting.
              </p>
              {/* Loading spinner indicator */}
              <div
                className="onboarding__spinner"
                role="status"
                aria-label="Loading"
                style={{
                  width: "24px",
                  height: "24px",
                  margin: "12px auto",
                  border: "3px solid rgba(255, 255, 255, 0.2)",
                  borderTopColor: activeAvatar.accentColor,
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              {/* Always offer an escape path during loading */}
              <div className="onboarding__nav" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="onboarding__btn onboarding__btn--secondary"
                  onClick={handleContinueOffline}
                  title="Skip loading and use Offline mode"
                >
                  Continue in Offline mode
                </button>
              </div>
            </div>
          )
        )}

        {step === "done" && (
          <div className="onboarding__step onboarding__step--enter onboarding__step--done" style={fadeStyle}>
            {/* Hatching animation container */}
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              margin: "0 auto 12px",
            }}>
              {/* Pulsing glow ring behind the avatar */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${activeAvatar.accentColor}${glowPulse ? "50" : "20"} 0%, transparent 70%)`,
                transform: `scale(${hatchPhase >= 1 ? (glowPulse ? 2.2 : 1.7) : 0})`,
                opacity: hatchPhase >= 1 && hatchPhase < 3 ? 1 : 0,
                transition: "all 0.4s ease",
                pointerEvents: "none" as const,
              }} />
              {/* Sparkle / star-burst ring */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "50%",
                background: `radial-gradient(circle, transparent 20%, ${activeAvatar.accentColor}30 45%, transparent 70%)`,
                transform: `scale(${hatchPhase >= 3 ? 3.5 : 0})`,
                opacity: hatchPhase === 3 ? 0.7 : 0,
                transition: hatchPhase === 3 ? "all 0.3s ease-out" : "all 0.6s ease-out",
                pointerEvents: "none" as const,
              }} />
              {/* Avatar emoji — starts tiny/blurred, springs to full size */}
              <div className="onboarding__emoji" style={{
                transform: `scale(${hatchPhase < 2 ? 0.3 : 1})`,
                filter: hatchPhase === 0 ? "blur(3px)" : "none",
                opacity: hatchPhase === 0 ? 0.3 : 1,
                transition: hatchPhase >= 2
                  ? "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "all 0.3s ease",
                position: "relative",
                zIndex: 1,
                margin: 0,
              }}>
                {activeAvatar.emoji}
              </div>
            </div>

            <h2 className="onboarding__heading" style={{
              opacity: hatchPhase >= 3 ? 1 : 0,
              transform: `translateY(${hatchPhase >= 3 ? 0 : 10}px)`,
              transition: "all 0.4s ease-out",
            }}>
              Welcome, {petName.trim()}!
            </h2>
            <p className="onboarding__sub" style={{
              opacity: hatchPhase >= 3 ? 1 : 0,
              transform: `translateY(${hatchPhase >= 3 ? 0 : 10}px)`,
              transition: "all 0.5s ease-out 0.15s",
            }}>
              {petName.trim()} has arrived! ✨
            </p>
          </div>
        )}

        <div className="onboarding__dots">
          <span className={`onboarding__dot ${step === "avatar" ? "onboarding__dot--active" : ""}`} />
          <span className={`onboarding__dot ${step === "identity" ? "onboarding__dot--active" : ""}`} />
          <span className={`onboarding__dot ${step === "provider" ? "onboarding__dot--active" : ""}`} />
          <span className={`onboarding__dot ${step === "done" ? "onboarding__dot--active" : ""}`} />
        </div>
      </div>
    </div>
  );
}
