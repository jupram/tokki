import { useState, useCallback, useEffect, useMemo, Component, type ReactNode, type ErrorInfo } from "react";
import { setAvatar, setPersonality } from "./bridge/tauri";
import { TokkiCharacter } from "./core/TokkiCharacter";
import { OnboardingWizard } from "./features/onboarding/OnboardingWizard";
import { useTokkiStore } from "./state/useTokkiStore";
import {
  isOnboardingComplete,
  loadOnboardingProfile,
  type OnboardingProfile,
} from "./utils/onboardingProfile";

const STARTUP_RESTORE_TIMEOUT_MS = 4_000;

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

function getRecoverableOnboardingProfile(
  profile: OnboardingProfile | null
): OnboardingProfile | null {
  try {
    return isOnboardingComplete(profile) ? profile : null;
  } catch {
    return null;
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: `${error.name}: ${error.message}\n${error.stack ?? ""}` };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="tokki-error tokki-error--boundary" role="alert">
          <div className="tokki-error__icon">🐰</div>
          <div className="tokki-error__message">
            <strong>Oops! Tokki tripped over something unexpected.</strong>
            <p>Don't worry — try restarting the app and we'll bounce back!</p>
            <details className="tokki-error__details">
              <summary>Technical details (for the curious)</summary>
              <pre>{this.state.error}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App(): JSX.Element {
  const setAvatarId = useTokkiStore((s) => s.setAvatarId);
  const setStorePersonality = useTokkiStore((s) => s.setPersonality);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [startupReady, setStartupReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);
  const applyProfileToStore = useCallback((nextProfile: OnboardingProfile) => {
    setAvatarId(nextProfile.avatarId);
    setStorePersonality(nextProfile.personality);
  }, [setAvatarId, setStorePersonality]);
  const recoverableProfile = useMemo(() => getRecoverableOnboardingProfile(profile), [profile]);

  useEffect(() => {
    let cancelled = false;
    setStartupReady(false);
    setStartupError(null);

    const bootstrap = async (): Promise<void> => {
      try {
        const savedProfile = loadOnboardingProfile();
        const nextProfile = getRecoverableOnboardingProfile(savedProfile);
        if (cancelled) {
          return;
        }

        setProfile(nextProfile);

        if (savedProfile && !nextProfile) {
          setStartupError(
            "Tokki found a saved setup that seems incomplete 🐰 Let's retry or start fresh!",
          );
          return;
        }

        if (nextProfile) {
          try {
            await withTimeout(
              setAvatar(nextProfile.avatarId),
              STARTUP_RESTORE_TIMEOUT_MS,
              "Restoring avatar",
            );
            await withTimeout(
              setPersonality(nextProfile.personality),
              STARTUP_RESTORE_TIMEOUT_MS,
              "Restoring personality",
            );
          } catch (error) {
            console.error("Failed to restore onboarding profile", error);
            if (!cancelled) {
              setStartupError(
                "Tokki's taking a bit longer to wake up 🐰 Try again, or continue with your saved profile while we catch up!",
              );
            }
            return;
          }

          if (!cancelled) {
            applyProfileToStore(nextProfile);
          }
        }

        if (!cancelled) {
          setStartupReady(true);
        }
      } catch (error) {
        console.error("Tokki startup bootstrap failed", error);
        if (!cancelled) {
          setProfile(null);
          setStartupError(
            "Tokki hit a small snag while waking up 🐰 Let's try again or start fresh together!",
          );
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applyProfileToStore, startupAttempt]);

  const handleOnboardingComplete = useCallback((nextProfile: OnboardingProfile) => {
    setProfile(nextProfile);
    setStartupReady(true);
  }, []);

  const handleRetryStartup = useCallback(() => {
    setStartupAttempt((attempt) => attempt + 1);
  }, []);

  const handleContinueStartup = useCallback(() => {
    if (recoverableProfile) {
      applyProfileToStore(recoverableProfile);
    } else {
      setProfile(null);
    }

    setStartupError(null);
    setStartupReady(true);
  }, [applyProfileToStore, recoverableProfile]);

  if (!startupReady) {
    return (
      <ErrorBoundary>
        <main className="app-shell">
          <div className="onboarding">
            <div className="onboarding__card">
              {startupError ? (
                <div className="onboarding__step onboarding__step--enter onboarding__step--done">
                  <div className="onboarding__emoji">⚠️</div>
                  <h2 className="onboarding__heading">Startup needs a quick nudge</h2>
                  <p className="onboarding__sub">{startupError}</p>
                  <div className="onboarding__nav">
                    <button type="button" className="onboarding__btn" onClick={handleRetryStartup}>
                      Retry startup
                    </button>
                    <button
                      type="button"
                      className="onboarding__btn onboarding__btn--secondary"
                      onClick={handleContinueStartup}
                    >
                      {recoverableProfile ? "Continue with saved profile" : "Set up Tokki again"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="onboarding__step onboarding__step--enter onboarding__step--done">
                  <div className="onboarding__emoji onboarding__emoji--bounce">✨</div>
                  <h2 className="onboarding__heading">
                    Waking up {recoverableProfile?.personality.name ?? "Tokki"}
                    {recoverableProfile?.userName ? ` for ${recoverableProfile.userName}` : ""}…
                  </h2>
                  <p className="onboarding__sub">Getting your companion ready.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </ErrorBoundary>
    );
  }

  const onboarded = Boolean(recoverableProfile);

  return (
    <ErrorBoundary>
      <main className="app-shell">
        {onboarded ? (
          <TokkiCharacter skipStartupProfileSync />
        ) : (
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        )}
      </main>
    </ErrorBoundary>
  );
}

export default App;
