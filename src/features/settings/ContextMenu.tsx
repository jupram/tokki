import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getSessionMemory } from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { SessionMemory } from "../../types/tokki";
import { loadOnboardingProfile } from "../../utils/onboardingProfile";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onTellJoke: () => void;
  onEnergyCheck: () => void;
  onToggleChat: () => void;
  onSettings: () => void;
  onSayHi?: () => void;
  onTakeBreak?: () => void;
  onSwitchAvatar?: () => void;
  onClearConversation?: () => void;
  onExportMemories?: (includeChatHistory: boolean) => void;
  onImportMemories?: () => void;
}

interface MenuItem {
  label: string;
  key: string;
  icon: string;
  dividerAfter?: boolean;
}

const buildMenuItems = (privacyMode: boolean): MenuItem[] => [
  { label: "Say hi", key: "sayhi", icon: "👋" },
  { label: "Tell me a joke", key: "joke", icon: "😄" },
  { label: "Check on Tokki", key: "energy", icon: "💫" },
  { label: "Session memory", key: "memory", icon: "🧠", dividerAfter: true },
  { label: "Switch avatar", key: "avatar", icon: "✨" },
  { label: "Take a break", key: "break", icon: "😴" },
  { label: "Export memories only", key: "export", icon: "💾" },
  { label: "Export memories + chat", key: "exportchat", icon: "📜" },
  { label: "Import memory bundle", key: "import", icon: "📥" },
  { label: "Clear conversation", key: "clearconvo", icon: "🗑️", dividerAfter: true },
  {
    label: privacyMode ? "Privacy mode: on" : "Privacy mode: off",
    key: "privacy",
    icon: privacyMode ? "🙈" : "👁️",
  },
  { label: "Toggle chat", key: "chat", icon: "💬" },
  { label: "Settings", key: "settings", icon: "⚙️" },
];

const FACET_LABELS: Record<string, string> = {
  pronouns: "Pronouns",
  location: "Location",
  origin: "From",
  occupation: "Work",
  workplace: "Workplace",
  study_focus: "Learning",
  goal: "Current goal",
  routine_morning: "Morning routine",
  routine_evening: "Evening routine",
  routine_night: "Night routine",
  routine_after_work: "After-work routine",
};

const TIME_BAND_LABELS: Record<string, string> = {
  morning: "mornings",
  afternoon: "afternoons",
  evening: "evenings",
  night: "nights",
};

const VIEWPORT_EDGE_PADDING = 8;

const clampContextMenuPosition = (
  x: number,
  y: number,
  rect: Pick<DOMRect, "width" | "height">,
): { left: number; top: number } => {
  const maxLeft = Math.max(
    VIEWPORT_EDGE_PADDING,
    window.innerWidth - rect.width - VIEWPORT_EDGE_PADDING,
  );
  const maxTop = Math.max(
    VIEWPORT_EDGE_PADDING,
    window.innerHeight - rect.height - VIEWPORT_EDGE_PADDING,
  );

  let left = x;
  let top = y;

  if (x + rect.width > window.innerWidth - VIEWPORT_EDGE_PADDING) {
    left = x - rect.width;
  }

  if (y + rect.height > window.innerHeight - VIEWPORT_EDGE_PADDING) {
    top = y - rect.height;
  }

  return {
    left: Math.max(VIEWPORT_EDGE_PADDING, Math.min(left, maxLeft)),
    top: Math.max(VIEWPORT_EDGE_PADDING, Math.min(top, maxTop)),
  };
};

const moodEmoji = (trend: string): string => {
  if (trend.includes("playful") || trend.includes("happy")) return "😊";
  if (trend.includes("sleepy") || trend.includes("tired")) return "😴";
  if (trend.includes("curious")) return "🤔";
  if (trend.includes("surprised")) return "😲";
  return "😌";
};

const memoryBondLabel = (memory: SessionMemory): string => {
  const preferenceDepth = memory.preferences.reduce(
    (total, preference) => total + Math.max(0, preference.mentions - 1),
    0,
  );
  const score = memory.message_count
    + (memory.profile_facts.length * 6)
    + (memory.conversation_highlights.length * 4)
    + preferenceDepth;
  if (score >= 70) return "Old friend";
  if (score >= 35) return "Close companion";
  if (score >= 14) return "Getting closer";
  return "New buddy";
};

const formatRelativeTime = (timestamp: number | null): string => {
  if (!timestamp || !Number.isFinite(timestamp)) return "recently";
  const deltaMs = Math.max(0, Date.now() - timestamp);
  if (deltaMs < 60_000) return "just now";
  if (deltaMs < 3_600_000) return `${Math.round(deltaMs / 60_000)}m ago`;
  if (deltaMs < 86_400_000) return `${Math.round(deltaMs / 3_600_000)}h ago`;
  return `${Math.round(deltaMs / 86_400_000)}d ago`;
};

const formatPreference = (
  preference: SessionMemory["preferences"][number],
): string => {
  const base = [preference.label, preference.value].filter(Boolean).join(" ");
  const mentions = Math.max(1, preference.mentions);
  return mentions > 1 ? `${base} · ${mentions}x` : base;
};

const profileFacetLabel = (facet: string): string => {
  return FACET_LABELS[facet] ?? facet.replaceAll("_", " ");
};

const formatHighlightCategory = (category: string): string => {
  if (!category) return "note";
  return category.replaceAll("_", " ");
};

export function ContextMenu({
  x,
  y,
  onClose,
  onTellJoke,
  onEnergyCheck,
  onToggleChat,
  onSettings,
  onSayHi,
  onTakeBreak,
  onSwitchAvatar,
  onClearConversation,
  onExportMemories,
  onImportMemories,
}: ContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const personality = useTokkiStore((s) => s.personality);
  const privacyMode = useTokkiStore((s) => s.privacyMode);
  const setPrivacyMode = useTokkiStore((s) => s.setPrivacyMode);
  const [memoryCard, setMemoryCard] = useState<SessionMemory | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const onboardingUserName = useMemo(
    () => loadOnboardingProfile()?.userName ?? null,
    [],
  );
  const items = useMemo(() => buildMenuItems(privacyMode), [privacyMode]);

  // Measure before paint so the menu never flashes outside the viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nextPos = clampContextMenuPosition(x, y, el.getBoundingClientRect());

    setPos((current) => (
      current.left === nextPos.left && current.top === nextPos.top
        ? current
        : nextPos
    ));
  }, [x, y, memoryCard, memoryLoading, memoryError]);

  const closeWithAnimation = useCallback(() => {
    setExiting(true);
    setTimeout(onClose, 150);
  }, [onClose]);

  const handleAction = useCallback(
    (key: string) => {
      if (key === "memory") {
        setMemoryLoading(true);
        setMemoryError(null);
        void getSessionMemory()
          .then((mem) => setMemoryCard(mem))
          .catch(() => {
            setMemoryError("Oops! Tokki's memory drawer got stuck 🐰 Try again in a moment.");
          })
          .finally(() => {
            setMemoryLoading(false);
          });
        return; // Don't close — show inline card
      }
      if (key === "export") {
        closeWithAnimation();
        onExportMemories?.(false);
        return;
      }
      if (key === "exportchat") {
        closeWithAnimation();
        onExportMemories?.(true);
        return;
      }
      if (key === "import") {
        closeWithAnimation();
        onImportMemories?.();
        return;
      }
      if (key === "privacy") {
        closeWithAnimation();
        setPrivacyMode(!privacyMode);
        return;
      }
      closeWithAnimation();
      switch (key) {
        case "sayhi":
          onSayHi?.();
          break;
        case "joke":
          onTellJoke();
          break;
        case "energy":
          onEnergyCheck();
          break;
        case "avatar":
          onSwitchAvatar?.();
          break;
        case "break":
          onTakeBreak?.();
          break;
        case "clearconvo":
          onClearConversation?.();
          break;
        case "chat":
          onToggleChat();
          break;
        case "settings":
          onSettings();
          break;
      }
    },
    [closeWithAnimation, onTellJoke, onEnergyCheck, onToggleChat, onSettings, onSayHi, onTakeBreak, onSwitchAvatar, onClearConversation, onExportMemories, onImportMemories, privacyMode, setPrivacyMode],
  );

  // Focus first menu item on mount
  useEffect(() => {
    const firstItem = ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus();
    setFocusedIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        closeWithAnimation();
        return;
      }
      
      const items = Array.from(
        ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
      );
      if (items.length === 0) return;
      
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = e.key === "ArrowDown"
          ? (focusedIndex + 1) % items.length
          : (focusedIndex - 1 + items.length) % items.length;
        setFocusedIndex(newIndex);
        items[newIndex]?.focus();
      }
      
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const focused = items[focusedIndex];
        if (focused) {
          focused.click();
        }
      }
      
      // Home/End for quick navigation
      if (e.key === "Home") {
        e.preventDefault();
        setFocusedIndex(0);
        items[0]?.focus();
      }
      if (e.key === "End") {
        e.preventDefault();
        const lastIndex = items.length - 1;
        setFocusedIndex(lastIndex);
        items[lastIndex]?.focus();
      }
    };
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeWithAnimation();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [closeWithAnimation, focusedIndex]);

  const recurringPreferences = useMemo(() => {
    if (!memoryCard) return [];
    return [...memoryCard.preferences]
      .filter((preference) => Math.max(1, preference.mentions) > 1)
      .sort((left, right) => {
        const mentionDelta = right.mentions - left.mentions;
        if (mentionDelta !== 0) return mentionDelta;
        return (right.last_mentioned_at ?? 0) - (left.last_mentioned_at ?? 0);
      })
      .slice(0, 3);
  }, [memoryCard]);

  const recentProfileFacts = useMemo(() => {
    if (!memoryCard) return [];
    return memoryCard.profile_facts.slice(-4).reverse();
  }, [memoryCard]);

  const recentHighlights = useMemo(() => {
    if (!memoryCard) return [];
    return memoryCard.conversation_highlights.slice(-4).reverse();
  }, [memoryCard]);

  return (
    <div
      ref={ref}
      className={`ctx-menu${exiting ? " ctx-menu--exit" : ""}`}
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      aria-label="Tokki actions"
      data-testid="context-menu"
    >
      {/* Personality header */}
      {personality && (
        <div className="ctx-menu__header">
          <span className="ctx-menu__pet-name">{personality.name}</span>
          <span className="ctx-menu__preset">{personality.preset}</span>
        </div>
      )}

      <div className="ctx-menu__items">
        {items.map((item, index) => (
          <div key={item.key}>
            <button
              type="button"
              className={`ctx-menu__item${focusedIndex === index ? " ctx-menu__item--focused" : ""}`}
              role="menuitem"
              onClick={() => handleAction(item.key)}
              onMouseEnter={() => setFocusedIndex(index)}
              data-testid={`context-menu-${item.key}`}
              tabIndex={focusedIndex === index ? 0 : -1}
            >
              <span className="ctx-menu__icon" aria-hidden="true">{item.icon}</span>
              <span className="ctx-menu__label">{item.label}</span>
            </button>
            {item.dividerAfter && <div className="ctx-menu__divider" />}
          </div>
        ))}
      </div>

      {/* Session memory card — shown inline below the menu */}
      {(memoryCard || memoryLoading || memoryError) && (
        <div className="ctx-menu__memory">
          {memoryLoading && (
            <div className="tokki-context-menu__memory-status">
              Refreshing memory…
            </div>
          )}
          {memoryError && (
            <div className="tokki-context-menu__memory-status tokki-context-menu__memory-status--error">
              {memoryError}
            </div>
          )}

          {memoryCard && (
            <>
              <div className="tokki-context-menu__memory-row">
                <span>Messages</span>
                <strong>{memoryCard.message_count}</strong>
              </div>
              <div className="tokki-context-menu__memory-row">
                <span>Greetings</span>
                <strong>{memoryCard.greet_count}</strong>
              </div>
              <div className="tokki-context-menu__memory-row">
                <span>Bond</span>
                <strong>{memoryBondLabel(memoryCard)}</strong>
              </div>
              <div className="tokki-context-menu__memory-row">
                <span>Last chat</span>
                <strong>{formatRelativeTime(memoryCard.last_message_at)}</strong>
              </div>
              {privacyMode ? (
                <div className="tokki-context-menu__memory-status tokki-context-menu__memory-status--privacy">
                  Privacy mode is on — topics, profile facts, and remembered moments stay tucked away until you turn it off.
                </div>
              ) : (
                <>
                  {memoryCard.active_time_bands.length > 0 && (
                    <div className="tokki-context-menu__memory-row">
                      <span>Usually active</span>
                      <strong>
                        {TIME_BAND_LABELS[memoryCard.active_time_bands[0].band]
                          ?? memoryCard.active_time_bands[0].band}
                      </strong>
                    </div>
                  )}
                  {memoryCard.mood_trend && (
                    <div className="tokki-context-menu__memory-row">
                      <span>Mood</span>
                      <strong>{moodEmoji(memoryCard.mood_trend)} {memoryCard.mood_trend}</strong>
                    </div>
                  )}
                  {(memoryCard.user_name ?? onboardingUserName) && (
                    <div className="tokki-context-menu__memory-row">
                      <span>Knows you as</span>
                      <strong>{memoryCard.user_name ?? onboardingUserName}</strong>
                    </div>
                  )}
                  {memoryCard.topics.length > 0 && (
                    <div className="tokki-context-menu__memory-section">
                      <span className="tokki-context-menu__memory-label">Topics</span>
                      <div className="tokki-context-menu__memory-topics">
                        {memoryCard.topics.slice(0, 5).map((topic) => (
                          <span key={topic} className="tokki-context-menu__topic-tag">{topic}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {recurringPreferences.length > 0 && (
                    <div className="tokki-context-menu__memory-section">
                      <span className="tokki-context-menu__memory-label">Recurring favorites</span>
                      <div className="tokki-context-menu__memory-topics">
                        {recurringPreferences.map((preference) => (
                          <span
                            key={`${preference.label}-${preference.value}`}
                            className="tokki-context-menu__topic-tag tokki-context-menu__topic-tag--accent"
                          >
                            {formatPreference(preference)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {memoryCard.preferences.length > 0 && recurringPreferences.length === 0 && (
                    <div className="tokki-context-menu__memory-section">
                      <span className="tokki-context-menu__memory-label">Likes & preferences</span>
                      <div className="tokki-context-menu__memory-topics">
                        {memoryCard.preferences.slice(-3).reverse().map((preference) => (
                          <span
                            key={`${preference.label}-${preference.value}`}
                            className="tokki-context-menu__topic-tag tokki-context-menu__topic-tag--accent"
                          >
                            {formatPreference(preference)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {recentProfileFacts.length > 0 && (
                    <div className="tokki-context-menu__memory-section">
                      <span className="tokki-context-menu__memory-label">Knows about you</span>
                      <ul className="tokki-context-menu__memory-list tokki-context-menu__memory-list--rich">
                        {recentProfileFacts.map((fact) => (
                          <li key={`${fact.facet}-${fact.value}`}>
                            <strong>{profileFacetLabel(fact.facet)}:</strong> {fact.value}
                            <span className="tokki-context-menu__memory-meta">
                              {formatRelativeTime(fact.last_updated_at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recentHighlights.length > 0 && (
                    <div className="tokki-context-menu__memory-section">
                      <span className="tokki-context-menu__memory-label">Remembers</span>
                      <ul className="tokki-context-menu__memory-list tokki-context-menu__memory-list--rich">
                        {recentHighlights.map((highlight) => (
                          <li key={`${highlight.summary}-${highlight.captured_at ?? 0}`}>
                            {highlight.summary}
                            <span className="tokki-context-menu__memory-meta">
                              {formatHighlightCategory(highlight.category)} · {formatRelativeTime(highlight.captured_at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {memoryCard.mood_history.length > 1 && (
                    <div className="tokki-context-menu__memory-section">
                      <span className="tokki-context-menu__memory-label">Mood trail</span>
                      <div className="tokki-context-menu__memory-moods">
                        {memoryCard.mood_history.slice(-4).map((mood, index) => (
                          <span key={`${mood}-${index}`} className="tokki-context-menu__mood-pill">
                            {moodEmoji(mood)} {mood}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {memoryCard.message_count === 0 && (
                    <p className="tokki-context-menu__memory-subtle">
                      Keep chatting and Tokki will build a richer memory of your shared moments.
                    </p>
                  )}
                </>
              )}
              <p className="tokki-context-menu__memory-footnote">
                Memory stays local on this device.
              </p>
            </>
          )}
          {!memoryLoading && !memoryError && !memoryCard && (
            <div className="tokki-context-menu__memory-status">
              No memory snapshot yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
