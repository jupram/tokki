import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getSettings, resetSettings, saveSettings } from "../../bridge/tauri";
import {
  createDefaultTokkiSettings,
  type AvatarId,
  type TokkiSettings
} from "../../types/tokki";
import { getAllAvatars } from "../tokki/avatars";

interface SettingsDraft {
  endpoint: string;
  model: string;
  apiKey: string;
  avatarId: AvatarId;
}

function toDraft(settings: TokkiSettings): SettingsDraft {
  return {
    endpoint: settings.llm.endpoint ?? "",
    model: settings.llm.model ?? "",
    apiKey: settings.llm.apiKey ?? "",
    avatarId: settings.preferences.avatarId ?? "rabbit_v1"
  };
}

function toSettings(draft: SettingsDraft): TokkiSettings {
  return {
    llm: {
      endpoint: draft.endpoint.trim() || null,
      model: draft.model.trim() || null,
      apiKey: draft.apiKey.trim() || null
    },
    preferences: {
      avatarId: draft.avatarId
    }
  };
}

function stopPointerPropagation(event: ReactPointerEvent<HTMLElement>): void {
  event.stopPropagation();
}

export function SettingsView(): JSX.Element {
  const avatars = useMemo(() => getAllAvatars(), []);
  const [savedSettings, setSavedSettings] = useState<TokkiSettings>(createDefaultTokkiSettings);
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(createDefaultTokkiSettings()));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    getSettings()
      .then((settings) => {
        if (!mounted) {
          return;
        }

        setSavedSettings(settings);
        setDraft(toDraft(settings));
      })
      .catch((loadError: unknown) => {
        if (!mounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const dirty = JSON.stringify(toSettings(draft)) !== JSON.stringify(savedSettings);

  const onSave = async (): Promise<void> => {
    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const saved = await saveSettings(toSettings(draft));
      setSavedSettings(saved);
      setDraft(toDraft(saved));
      setStatus("Settings saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const onReset = async (): Promise<void> => {
    setSaving(true);
    setStatus(null);
    setError(null);

    try {
      const reset = await resetSettings();
      setSavedSettings(reset);
      setDraft(toDraft(reset));
      setStatus("Settings reset");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="settings-shell" onPointerDownCapture={stopPointerPropagation}>
      <section className="settings-card">
        <header className="settings-hero">
          <p className="settings-hero__eyebrow">Tokki preferences</p>
          <h1 className="settings-hero__title">Settings</h1>
          <p className="settings-hero__copy">
            Configure the LLM backend, choose a default avatar, and keep Tokki&apos;s desktop
            behavior consistent across restarts.
          </p>
        </header>

        {loading ? (
          <div className="settings-status settings-status--neutral">Loading settings...</div>
        ) : (
          <>
            <section className="settings-section">
              <div className="settings-section__heading">
                <h2>LLM backend</h2>
                <p>Saved settings are used by the desktop app before falling back to env vars.</p>
              </div>

              <label className="settings-field">
                <span>Endpoint</span>
                <input
                  className="settings-input"
                  type="url"
                  placeholder="https://api.openai.com/v1/responses"
                  value={draft.endpoint}
                  onPointerDownCapture={stopPointerPropagation}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endpoint: event.target.value }))
                  }
                />
              </label>

              <label className="settings-field">
                <span>Model</span>
                <input
                  className="settings-input"
                  type="text"
                  placeholder="gpt-4o-mini"
                  value={draft.model}
                  onPointerDownCapture={stopPointerPropagation}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, model: event.target.value }))
                  }
                />
              </label>

              <label className="settings-field">
                <span>API key</span>
                <input
                  className="settings-input"
                  type="password"
                  placeholder="sk-..."
                  value={draft.apiKey}
                  onPointerDownCapture={stopPointerPropagation}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, apiKey: event.target.value }))
                  }
                />
              </label>

              <p className="settings-help">
                Supported endpoints: OpenAI-compatible `/v1/responses`, `/v1/chat/completions`,
                Azure deployment equivalents, and localhost OpenAI-compatible servers.
              </p>
            </section>

            <section className="settings-section">
              <div className="settings-section__heading">
                <h2>General</h2>
                <p>Persist a default avatar so the main Tokki window starts in the same state.</p>
              </div>

              <div className="settings-avatar-grid" role="radiogroup" aria-label="Default avatar">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`settings-avatar-card ${draft.avatarId === avatar.id ? "settings-avatar-card--active" : ""}`}
                    role="radio"
                    aria-checked={draft.avatarId === avatar.id}
                    onPointerDownCapture={stopPointerPropagation}
                    onClick={() =>
                      setDraft((current) => ({ ...current, avatarId: avatar.id as AvatarId }))
                    }
                  >
                    <span className="settings-avatar-card__emoji">{avatar.emoji}</span>
                    <span className="settings-avatar-card__label">{avatar.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <footer className="settings-footer" onPointerDownCapture={stopPointerPropagation}>
              <div className="settings-feedback" aria-live="polite">
                {error && <div className="settings-status settings-status--error">{error}</div>}
                {!error && status && (
                  <div className="settings-status settings-status--success">{status}</div>
                )}
                {!error && !status && !dirty && (
                  <div className="settings-status settings-status--neutral">
                    No unsaved changes.
                  </div>
                )}
              </div>

              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn settings-btn--ghost"
                  disabled={saving}
                  onPointerDownCapture={stopPointerPropagation}
                  onClick={() => {
                    void onReset();
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  className="settings-btn settings-btn--primary"
                  disabled={saving || !dirty}
                  onPointerDownCapture={stopPointerPropagation}
                  onClick={() => {
                    void onSave();
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </main>
  );
}
