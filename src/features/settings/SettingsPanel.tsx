import { useCallback, useEffect, useRef, useState } from "react";
import { isAmbientEnabled, setAmbientEnabled } from "../../audio/sfx";
import { checkProviderHealth, getPersonality, getProviderConfig, getProviderInfo, setPersonality } from "../../bridge/tauri";
import { Tooltip } from "../../components/Tooltip";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { PersonalityConfig, ProviderConfig, ProviderHealth, ProviderInfo } from "../../types/tokki";
import { createOnboardingProfile, loadOnboardingProfile, saveOnboardingProfile } from "../../utils/onboardingProfile";

function clampDial(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
}

const SAVE_SUCCESS_CLOSE_DELAY_MS = 850;

interface SettingsPanelProps {
  onClose: () => void;
  embedded?: boolean;
}

export function SettingsPanel({ onClose, embedded = false }: SettingsPanelProps): JSX.Element {
  const personality = useTokkiStore((s) => s.personality);
  const avatarId = useTokkiStore((s) => s.avatarId);
  const privacyMode = useTokkiStore((s) => s.privacyMode);
  const setStorePersonality = useTokkiStore((s) => s.setPersonality);
  const setPrivacyMode = useTokkiStore((s) => s.setPrivacyMode);

  const [local, setLocal] = useState<PersonalityConfig | null>(null);
  const [ambient, setAmbient] = useState(isAmbientEnabled);
  const [providerInfo, setProviderInfoState] = useState<ProviderInfo | null>(null);
  const [providerConfig, setProviderConfigState] = useState<ProviderConfig | null>(null);
  const [providerStatusError, setProviderStatusError] = useState<string | null>(null);
  const [providerHealth, setProviderHealthState] = useState<ProviderHealth | null>(null);
  const [providerHealthLoading, setProviderHealthLoading] = useState(true);
  const [providerHealthError, setProviderHealthError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const mountedRef = useRef(true);
  const saveCloseTimeoutRef = useRef<number | null>(null);

  const clearPendingSaveClose = useCallback(() => {
    if (saveCloseTimeoutRef.current !== null) {
      window.clearTimeout(saveCloseTimeoutRef.current);
      saveCloseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (personality) {
      setLocal({ ...personality });
    } else {
      // Guard against setState on unmounted component
      getPersonality().then((p) => {
        if (mountedRef.current) setLocal(p);
      });
    }
  }, [personality]);

  useEffect(() => () => {
    clearPendingSaveClose();
    mountedRef.current = false;
  }, [clearPendingSaveClose]);

  const refreshProviderHealth = useCallback(async () => {
    setProviderHealthLoading(true);
    setProviderHealthError(null);

    try {
      const nextHealth = await checkProviderHealth();
      if (!mountedRef.current) return;
      setProviderHealthState(nextHealth);
    } catch {
      if (!mountedRef.current) return;
      setProviderHealthError("No worries — Tokki is still here for you! 🐰 Chat will keep working with offline replies while we sort this out.");
    } finally {
      if (mountedRef.current) {
        setProviderHealthLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadProviderStatus = async (): Promise<void> => {
      try {
        const [info, config] = await Promise.all([getProviderInfo(), getProviderConfig()]);
        if (!active) return;
        setProviderInfoState(info);
        setProviderConfigState(config);
        setProviderStatusError(null);
      } catch {
        if (!active) return;
        setProviderStatusError("Couldn't peek at chat settings right now — but don't worry, Tokki will keep chatting with offline replies! 🐰");
      }
    };

    void loadProviderStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void refreshProviderHealth();
  }, [refreshProviderHealth]);

  const save = useCallback(async () => {
    if (!local || saving || saveSuccess) return;
    clearPendingSaveClose();
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);

    const trimmedName = local.name.trim();
    const sanitized: PersonalityConfig = {
      ...local,
      name: trimmedName || "Tokki",
      humor: clampDial(local.humor),
      chattiness: clampDial(local.chattiness),
      reaction_intensity: clampDial(local.reaction_intensity),
    };

    try {
      await setPersonality(sanitized);
    } catch {
      if (mountedRef.current) {
        setSaving(false);
        setSaveError("Hmm, couldn't save those tweaks just yet 🐰 Give it another try in a moment!");
      }
      return;
    }

    if (!mountedRef.current) return;

    setStorePersonality(sanitized);
    const nextProfile = createOnboardingProfile({
      avatarId,
      personality: sanitized,
    });
    const existingProfile = loadOnboardingProfile();
    saveOnboardingProfile({
      ...nextProfile,
      userName: existingProfile?.userName ?? nextProfile.userName,
      completedAt: existingProfile?.completedAt ?? nextProfile.completedAt,
    });
    setSaving(false);
    setSaveSuccess(true);
    saveCloseTimeoutRef.current = window.setTimeout(() => {
      saveCloseTimeoutRef.current = null;
      if (!mountedRef.current) return;
      setSaveSuccess(false);
      onClose();
    }, SAVE_SUCCESS_CLOSE_DELAY_MS);
  }, [avatarId, clearPendingSaveClose, local, onClose, saveSuccess, saving, setStorePersonality]);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handleClose = useCallback(() => {
    clearPendingSaveClose();
    setSaveSuccess(false);
    onClose();
  }, [clearPendingSaveClose, onClose]);

  // Auto-focus close button on open, Escape to close
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  if (!local) {
    return (
      <div
        className={`settings-panel${embedded ? " settings-panel--embedded" : ""}`}
        role={embedded ? "region" : "dialog"}
        aria-label="Settings"
        aria-modal={embedded ? undefined : true}
      >
        Loading...
      </div>
    );
  }

  const update = (field: keyof PersonalityConfig, value: string | number): void => {
    setLocal((prev) => {
      if (!prev) return prev;
      const safe = typeof value === "number" ? clampDial(value) : value;
      return { ...prev, [field]: safe };
    });
  };

  const providerConnectionLabel = providerInfo
    ? providerInfo.provider === "offline"
      ? "Fully offline"
      : providerInfo.requires_network
        ? "Cloud + internet"
        : "Local runtime"
    : "Checking connection mode…";

  const providerStatusSummary = (() => {
    if (providerStatusError) {
      return providerStatusError;
    }

    if (!providerInfo) {
      return "Checking provider status…";
    }

    if (providerInfo.provider === "offline") {
      return "Offline mode is active. Responses stay local and private.";
    }

    if (providerInfo.api_key_required && !providerInfo.api_key_configured) {
      return `${providerInfo.provider_name} is selected but no API key is configured. Chat will auto-fallback to offline replies.`;
    }

    if (providerInfo.requires_network) {
      return `${providerInfo.provider_name} needs internet. If unreachable, Tokki switches to offline fallback replies.`;
    }

    return `${providerInfo.provider_name} runs locally. If unavailable, Tokki still falls back to offline replies.`;
  })();

  const providerHealthBadge = (() => {
    if (providerHealth) {
      if (providerHealth.status === "healthy") {
        return { label: "Healthy", tone: "ready" as const };
      }

      if (providerHealth.status === "degraded") {
        return { label: "Degraded", tone: "warning" as const };
      }

      return { label: "Unavailable", tone: "danger" as const };
    }

    if (providerHealthLoading) {
      return { label: "Checking…", tone: "neutral" as const };
    }

    if (providerHealthError) {
      return { label: "Unavailable", tone: "warning" as const };
    }

    return { label: "Checking…", tone: "neutral" as const };
  })();

  const providerHealthSummary = (() => {
    if (providerHealth) {
      if (providerHealth.status === "healthy") {
        return providerHealth.provider === "offline"
          ? "Tokki is cozy in fully offline mode and ready to chat locally."
          : `${providerHealth.provider_name} looks healthy. If it needs a break, Tokki smoothly switches to offline replies.`;
      }

      if (providerHealth.status === "degraded") {
        return `${providerHealth.provider_name} needs a small tune-up, and Tokki can keep the conversation going with offline replies meanwhile.`;
      }

      return `${providerHealth.provider_name} is unavailable right now, so Tokki will stay responsive with offline replies while it reconnects.`;
    }

    if (providerHealthLoading) {
      return "Running a quick provider wellness check…";
    }

    if (providerHealthError) {
      return "Couldn't check provider health — but Tokki's offline fallback is always ready! 🐰";
    }

    return "Use Check now anytime. Tokki keeps an offline fallback ready.";
  })();

  return (
    <div
      className={`settings-panel${embedded ? " settings-panel--embedded" : ""}`}
      role={embedded ? "region" : "dialog"}
      aria-label="Settings"
      aria-modal={embedded ? undefined : true}
      ref={panelRef}
      data-testid="settings-panel"
    >
        <div className="settings-panel__header">
          <span className="settings-panel__title">Settings</span>
          <button ref={closeRef} type="button" className="settings-panel__close" onClick={handleClose} aria-label="Close settings" data-testid="settings-close">
            &times;
          </button>
        </div>

      <div className="settings-panel__label">
        Chat Provider
        <div className="settings-panel__status-row">
          <span>{providerInfo?.provider_name ?? "Loading provider…"}</span>
          {providerInfo && (
            <span
              className={`settings-panel__status-pill ${
                providerInfo.provider === "offline"
                  ? "settings-panel__status-pill--offline"
                  : providerInfo.api_key_required && !providerInfo.api_key_configured
                    ? "settings-panel__status-pill--warning"
                    : "settings-panel__status-pill--ready"
              }`}
            >
              {providerInfo.provider === "offline"
                ? "Offline active"
                : providerInfo.requires_network
                  ? "Network provider"
                  : "Local provider"}
            </span>
          )}
        </div>
        <span className="settings-panel__provider-meta">
          {providerConnectionLabel}
          {providerConfig?.model ? ` • model ${providerConfig.model}` : ""}
        </span>
        <span className="settings-panel__provider-note">{providerStatusSummary}</span>
        <div className="settings-panel__provider-health">
          <div className="settings-panel__status-row">
            <span>Provider Health</span>
            <span className={`settings-panel__status-pill settings-panel__status-pill--${providerHealthBadge.tone}`}>
              {providerHealthBadge.label}
            </span>
          </div>
          <span className="settings-panel__provider-note">{providerHealthSummary}</span>
          {providerHealth?.reason && (
            <span className="settings-panel__provider-health-reason">{providerHealth.reason}</span>
          )}
          {providerHealthError && (
            <span className="settings-panel__provider-health-error">{providerHealthError}</span>
          )}
          <div className="settings-panel__provider-health-actions">
            <button
              type="button"
              className="settings-panel__check-health"
              onClick={() => {
                void refreshProviderHealth();
              }}
              disabled={providerHealthLoading}
            >
              {providerHealthLoading ? "Checking…" : "Check now"}
            </button>
          </div>
        </div>
      </div>

      <label className="settings-panel__label">
        Name
        <input
          className="settings-panel__input"
          type="text"
          value={local.name}
          onChange={(e) => update("name", e.target.value)}
          maxLength={24}
        />
      </label>

      <label className="settings-panel__label">
        <Tooltip content="Controls joke frequency and playful language in conversations" position="right">
          <span className="settings-panel__label-text">
            Humor
          </span>
        </Tooltip>
        <div className="settings-panel__slider-row">
          <span className="settings-panel__endpoint">Serious</span>
          <input
            type="range"
            min={0}
            max={100}
            value={local.humor}
            onChange={(e) => update("humor", Number(e.target.value))}
            className="settings-panel__slider"
          />
          <span className="settings-panel__endpoint">Witty</span>
          <span className="settings-panel__val">{local.humor}</span>
        </div>
        <span className="settings-panel__slider-description">
          How often Tokki cracks jokes and uses playful language. Higher = more puns and wit.
        </span>
        <span className="settings-panel__slider-preview">
          {local.humor <= 20 ? "Serious and straightforward" : local.humor >= 80 ? "Maximum puns and playfulness" : "Balanced humor"}
        </span>
      </label>

      <label className="settings-panel__label">
        <Tooltip content="Controls response length and spontaneous messages" position="right">
          <span className="settings-panel__label-text">
            Chattiness
          </span>
        </Tooltip>
        <div className="settings-panel__slider-row">
          <span className="settings-panel__endpoint">Quiet</span>
          <input
            type="range"
            min={0}
            max={100}
            value={local.chattiness}
            onChange={(e) => update("chattiness", Number(e.target.value))}
            className="settings-panel__slider"
          />
          <span className="settings-panel__endpoint">Talkative</span>
          <span className="settings-panel__val">{local.chattiness}</span>
        </div>
        <span className="settings-panel__slider-description">
          How much Tokki talks unprompted. Higher = longer responses and more spontaneous messages.
        </span>
        <span className="settings-panel__slider-preview">
          {local.chattiness <= 20 ? "Brief and to the point" : local.chattiness >= 80 ? "Loves to chat and share" : "Conversational balance"}
        </span>
      </label>

      <label className="settings-panel__label">
        <Tooltip content="Controls animation intensity and emotional expressiveness" position="right">
          <span className="settings-panel__label-text">
            Reaction Intensity
          </span>
        </Tooltip>
        <div className="settings-panel__slider-row">
          <span className="settings-panel__endpoint">Calm</span>
          <input
            type="range"
            min={0}
            max={100}
            value={local.reaction_intensity}
            onChange={(e) => update("reaction_intensity", Number(e.target.value))}
            className="settings-panel__slider"
          />
          <span className="settings-panel__endpoint">Expressive</span>
          <span className="settings-panel__val">{local.reaction_intensity}</span>
        </div>
        <span className="settings-panel__slider-description">
          How dramatically Tokki reacts to interactions. Higher = bigger animations and stronger emotions.
        </span>
        <span className="settings-panel__slider-preview">
          {local.reaction_intensity <= 20 ? "Subtle and composed" : local.reaction_intensity >= 80 ? "Big emotions and lively animations" : "Moderately expressive"}
        </span>
      </label>

      <label className="settings-panel__label">
        Ambient Sound
        <div className="settings-panel__slider-row">
          <button
            type="button"
            className={`settings-panel__toggle${ambient ? " settings-panel__toggle--on" : ""}`}
            onClick={() => {
              const next = !ambient;
              setAmbient(next);
              setAmbientEnabled(next);
            }}
            aria-pressed={ambient}
          >
            {ambient ? "ON" : "OFF"}
          </button>
        </div>
      </label>

      <label className="settings-panel__label">
        Privacy Mode
        <div className="settings-panel__slider-row">
          <button
            type="button"
            className={`settings-panel__toggle${privacyMode ? " settings-panel__toggle--on" : ""}`}
            onClick={() => setPrivacyMode(!privacyMode)}
            aria-pressed={privacyMode}
            data-testid="settings-privacy-toggle"
          >
            {privacyMode ? "ON" : "OFF"}
          </button>
        </div>
        <span className="settings-panel__slider-description">
          Masks chat drafts on screen, hides visible chat text, and tucks memory details away until you turn it off.
        </span>
      </label>

      {saveError && (
        <span className="settings-panel__save-error" role="alert">{saveError}</span>
      )}
      {saveSuccess && (
        <span className="settings-panel__save-success" role="status" aria-live="polite">
          Saved — Tokki tucked those tweaks away.
        </span>
      )}
      <button
        type="button"
        className={`settings-panel__save${saveSuccess ? " settings-panel__save--success" : ""}`}
        onClick={() => { void save(); }}
        disabled={saving || saveSuccess}
        data-testid="settings-save"
      >
        {saving ? "Saving…" : saveSuccess ? "Saved" : "Save"}
      </button>
    </div>
  );
}
