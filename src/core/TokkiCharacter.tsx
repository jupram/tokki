import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { composeAvatarClasses } from "../animation/composeAvatarClasses";
import { useOrganicFloat } from "../animation/useOrganicFloat";
import { mapActionToView } from "../animation/mapActionToView";
import { sfxAchievement, sfxCelebrate, sfxClick, sfxPet, sfxReceive, sfxSend, sfxSleep, sfxThought, sfxWake, updateAmbientMood } from "../audio/sfx";
import {
  decideSleepWake,
  getSleepVisualAction,
  isTokkiSleeping,
  pickProgressiveSleepResistance,
  resetSleepResistanceMemory,
} from "./sleepWake";
import {
  buildPersonalizedGreeting,
  checkProviderHealth,
  clearChatHistory,
  exportMemory,
  importMemoryFile,
  getChatHistory,
  getCurrentState,
  getMemoryContext,
  getPersonality,
  getProviderConfig,
  handleUserInteraction,
  moveToBottomRight,
  reportMouseShake,
  sendChatMessage,
  setAvatar,
  startBehaviorLoop,
  startWindowDrag,
  stopBehaviorLoop,
  subscribeBehaviorTick,
  subscribeProactiveMessage,
  type MemoryContext,
} from "../bridge/tauri";
import {
  useTokkiStore,
  selectState,
  selectConnected,
  selectAvatarId,
  selectCurrentReply,
  selectIsTyping,
  selectChatOpen,
  selectChatMessages,
  selectChatMessagesLength,
  selectSettingsOpen,
  selectPersonality,
  selectStreamingReply,
  selectStreamingContent,
} from "../state/useTokkiStore";
import type { LlmResponse, ProactiveMessage, ProviderHealthStatus, UserEvent } from "../types/tokki";
import { ChatBubble } from "../features/chat/ChatBubble";
import { ChatHistory } from "../features/chat/ChatHistory";
import { ChatInput, type ChatQuickAction } from "../features/chat/ChatInput";
import { ContextMenu } from "../features/settings/ContextMenu";
import { AvatarPicker } from "../features/avatars/AvatarPicker";
import { getAvatar } from "../features/avatars";
import { EnergyBar } from "../features/hud/EnergyBar";
import { MoodSparkles } from "../features/hud/MoodSparkles";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { TokkiAvatarAsset } from "../features/avatars/TokkiAvatarAsset";
import { FXLayer } from "../features/avatars/particles/FXLayer";
import { StreakBadge } from "../features/hud/StreakBadge";
import { ThoughtBubbles } from "../features/hud/ThoughtBubbles";
import { WeatherBadge } from "../features/hud/WeatherBadge";
import { getStreak, isMilestone, recordInteraction } from "../utils/streak";
import { fetchWeather, type WeatherInfo } from "../utils/weather";
import { checkAchievements, getAchievementById, incrementStat, loadStats, type AchievementStats } from "../utils/achievements";
import {
  createOnboardingProfile,
  loadOnboardingProfile,
  normalizeAvatarId,
  saveOnboardingProfile,
} from "../utils/onboardingProfile";

// Custom hook to track document visibility state
function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  
  useEffect(() => {
    const handler = (): void => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  
  return visible;
}

function makeUserEvent(type: UserEvent["type"]): UserEvent {
  return {
    type,
    timestamp: Date.now()
  };
}

const DRAG_THRESHOLD = 4;
const EYE_TRACK_STEP_PX = 0.1;
const SHAKE_SAMPLE_INTERVAL_MS = 16;

// Pre-computed keyword-emoji mapping (static, no re-creation)
const KEYWORD_EMOJI: readonly [RegExp, string][] = [
  [/\blove\b|\bheart\b|❤|💕/i, "❤️"],
  [/\bhaha\b|\blol\b|\bfunny\b|😂/i, "😂"],
  [/\bfire\b|\blit\b|🔥/i, "🔥"],
  [/\bstar\b|\bamazing\b|\bwow\b|⭐/i, "⭐"],
  [/\bsad\b|\bcry\b|😢/i, "😢"],
  [/\bsleep\b|\btired\b|\bzzz\b/i, "😴"],
  [/\bfood\b|\beat\b|\bhungry\b|\byum\b/i, "🍕"],
  [/\bgame\b|\bplay\b/i, "🎮"],
] as const;

// Memoized heart burst particles (static array to avoid re-creation)
const HEART_INDICES = [0, 1, 2, 3, 4, 5] as const;
const CONFETTI_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const CONFETTI_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff9ff3", "#ff6348"] as const;

/** Reveal delay (ms per chunk) for progressive streaming, keyed by mood. */
function getStreamingRevealDelay(mood: string | undefined): number {
  switch (mood) {
    case "playful":   return 18;
    case "curious":   return 32;
    case "sleepy":    return 45;
    case "surprised": return 15;
    default:          return 28;
  }
}

const MAX_STREAMING_STEPS = 140;

interface RelationshipSnapshotProps {
  memory: MemoryContext | null;
  ready: boolean;
  mood: string;
  sleeping: boolean;
}

function sentenceCase(value: string): string {
  const normalized = value.replaceAll("-", " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function joinWarmList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function describeBondLevel(bondLevel: number): { label: string; note: string } {
  if (bondLevel >= 80) {
    return {
      label: "Deeply bonded",
      note: "favorite little ritual",
    };
  }

  if (bondLevel >= 60) {
    return {
      label: "Close and cozy",
      note: "trusted rhythm",
    };
  }

  if (bondLevel >= 40) {
    return {
      label: "Growing warmer",
      note: "steady friendship",
    };
  }

  if (bondLevel >= 20) {
    return {
      label: "Settling in",
      note: "soft new routine",
    };
  }

  return {
    label: "Just getting acquainted",
    note: "tiny beginning",
  };
}

function buildRelationshipTags(memory: MemoryContext | null, ready: boolean): string[] {
  if (!ready) {
    return ["private keepsakes"];
  }

  if (!memory) {
    return ["on-device only"];
  }

  const topics = memory.topTopics.slice(0, 2);
  if (topics.length > 0) {
    return topics;
  }

  const traits = memory.personalityTraits
    .slice(0, 2)
    .map((trait) => sentenceCase(trait));
  if (traits.length > 0) {
    return traits;
  }

  if (memory.conversationCount > 0) {
    return [`${memory.conversationCount} chats tucked away`];
  }

  return ["still learning your rhythm"];
}

function buildRelationshipSummary(memory: MemoryContext | null, ready: boolean): string {
  if (!ready) {
    return "Tokki is tucking away the feeling of your last few moments together.";
  }

  if (!memory) {
    return "Tokki keeps your shared rhythm close, private, and only on this device.";
  }

  if (memory.isFirstSession) {
    return `${memory.companionName} is still learning your rhythm. Every hello becomes a tiny keepsake.`;
  }

  const topics = memory.topTopics.slice(0, 2);
  if (topics.length > 0) {
    return `${memory.companionName} keeps drifting back to ${joinWarmList(topics)} with you.`;
  }

  const traits = memory.personalityTraits
    .slice(0, 2)
    .map((trait) => trait.replaceAll("-", " "));
  if (traits.length > 0) {
    return `${memory.companionName} feels ${joinWarmList(traits)} whenever you check in.`;
  }

  const bond = describeBondLevel(memory.bondLevel);
  return `${memory.companionName} treats your time together like a ${bond.note}.`;
}

function RelationshipSnapshot({
  memory,
  ready,
  mood,
  sleeping,
}: RelationshipSnapshotProps): JSX.Element {
  const bond = describeBondLevel(memory?.bondLevel ?? 12);
  const tags = buildRelationshipTags(memory, ready);
  const summary = buildRelationshipSummary(memory, ready);
  const meterValue = ready && memory ? Math.max(12, memory.bondLevel) : 18;
  const lastInteractionText = ready && memory
    ? `Last hello ${memory.lastInteractionAge}`
    : "Private, on-device memory";
  const moodText = sleeping ? "Dreaming softly" : `${sentenceCase(mood)} right now`;

  return (
    <section
      className={`tokki-popup__relationship${ready ? "" : " tokki-popup__relationship--loading"}`}
      aria-label="Relationship snapshot"
      data-testid="relationship-snapshot"
    >
      <div className="tokki-popup__relationship-head">
        <span className="tokki-popup__relationship-eyebrow">Little bond note</span>
        <span className="tokki-popup__relationship-bond">{bond.label}</span>
      </div>
      <div
        className="tokki-popup__relationship-meter"
        role="img"
        aria-label={ready && memory ? `Bond level ${memory.bondLevel} out of 100` : "Bond snapshot is loading"}
      >
        <span
          className="tokki-popup__relationship-meter-fill"
          style={{ width: `${meterValue}%` }}
        />
      </div>
      <p className="tokki-popup__relationship-summary">{summary}</p>
      <div className="tokki-popup__relationship-tags">
        {tags.map((tag) => (
          <span key={tag} className="tokki-popup__relationship-tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="tokki-popup__relationship-footer">
        <span>{lastInteractionText}</span>
        <span>{moodText}</span>
      </div>
    </section>
  );
}

interface TokkiCharacterProps {
  skipStartupProfileSync?: boolean;
}

export function TokkiCharacter({
  skipStartupProfileSync = false,
}: TokkiCharacterProps): JSX.Element {
  // Use fine-grained selectors to minimize re-renders
  const state = useTokkiStore(selectState);
  const connected = useTokkiStore(selectConnected);
  const avatarId = useTokkiStore(selectAvatarId);
  const currentReply = useTokkiStore(selectCurrentReply);
  const isTyping = useTokkiStore(selectIsTyping);
  const chatOpen = useTokkiStore(selectChatOpen);
  const chatMessages = useTokkiStore(selectChatMessages);
  const chatMessagesLength = useTokkiStore(selectChatMessagesLength);
  const settingsOpen = useTokkiStore(selectSettingsOpen);
  const personality = useTokkiStore(selectPersonality);
  const streamingReply = useTokkiStore(selectStreamingReply);
  const streamingContent = useTokkiStore(selectStreamingContent);

  // Action setters (stable references from Zustand)
  const applyTick = useTokkiStore((store) => store.applyTick);
  const setState = useTokkiStore((store) => store.setState);
  const setConnected = useTokkiStore((store) => store.setConnected);
  const setCurrentReply = useTokkiStore((store) => store.setCurrentReply);
  const setIsTyping = useTokkiStore((store) => store.setIsTyping);
  const setChatOpen = useTokkiStore((store) => store.setChatOpen);
  const addChatMessage = useTokkiStore((store) => store.addChatMessage);
  const loadChatHistory = useTokkiStore((store) => store.loadChatHistory);
  const resetChat = useTokkiStore((store) => store.resetChat);
  const setAvatarId = useTokkiStore((store) => store.setAvatarId);
  const setStorePersonality = useTokkiStore((store) => store.setPersonality);
  const setProactiveMessage = useTokkiStore((store) => store.setProactiveMessage);
  const setSettingsOpen = useTokkiStore((store) => store.setSettingsOpen);
  const setStreamingReply = useTokkiStore((store) => store.setStreamingReply);
  const setStreamingContent = useTokkiStore((store) => store.setStreamingContent);
  const popupOpen = chatOpen || settingsOpen;
  
  // Track document visibility for pausing animations when hidden
  const isDocumentVisible = useDocumentVisible();

  const avatarRef = useRef<HTMLButtonElement>(null);
  const memoryImportInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [heartBurst, setHeartBurst] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(false);
  const [avatarBounce, setAvatarBounce] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [blinkSlow, setBlinkSlow] = useState(false);
  const [wagging, setWagging] = useState(false);
  const [dragLand, setDragLand] = useState(false);
  const [moodFlash, setMoodFlash] = useState(false);
  const prevMoodRef = useRef(state.current_action.mood);
  const [emojiRain, setEmojiRain] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [toast, setToast] = useState<{ text: string; exiting: boolean } | null>(null);
  const toastTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [pulse, setPulse] = useState(false);
  const [todBand, setTodBand] = useState<"morning" | "afternoon" | "evening" | "night">(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 21) return "evening";
    return "night";
  });
  const [idleSleep, setIdleSleep] = useState(false);
  const lastClickRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const petGestureRef = useRef({ count: 0, start: 0, cooldown: false });
  const sleepyResistanceRef = useRef<number | null>(null);
  const sleepResistanceAttemptRef = useRef(0);
  const behaviorLoopRetryRef = useRef(0);

  // Interaction depth: spam-click, cumulative petting, Easter egg combo
  const spamClickRef = useRef<number[]>([]);
  const spamCooldownRef = useRef(false);
  const cumulativePetsRef = useRef(0);
  const shownPetMilestonesRef = useRef(new Set<number>());
  const interactionComboRef = useRef<string[]>([]);
  const lastHoverSfxRef = useRef(0);

  // Refs for consolidated mousemove (avoid re-registering listeners on callback changes)
  const onInteractRef = useRef<((type: UserEvent["type"]) => Promise<void>) | null>(null);
  const markActiveRef = useRef<(() => void) | null>(null);

  // Wake-up animation state
  const [wakingUp, setWakingUp] = useState(false);
  const sleeping = isTokkiSleeping(idleSleep, state.current_action.id);
  const prevSleepingRef = useRef(sleeping);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);
  const [memoryContextReady, setMemoryContextReady] = useState(false);
  const sleepingRef = useRef(sleeping);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [streak, setStreak] = useState(() => getStreak());
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  // Easter egg states
  const konamiBufferRef = useRef<string[]>([]);
  const [bellyRubbing, setBellyRubbing] = useState(false);
  const bellyRubTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [blushing, setBlushing] = useState(false);
  const [dancing, setDancing] = useState(false);
  const [rainbowSparkles, setRainbowSparkles] = useState(false);
  const [shootingStar, setShootingStar] = useState(false);
  const [winking, setWinking] = useState(false);
  const [nightOwlActive, setNightOwlActive] = useState(false);

  // Achievement stats tracking
  const statsRef = useRef<AchievementStats>(loadStats());

  // Provider health monitoring — track last known status for change detection
  const lastProviderHealthRef = useRef<ProviderHealthStatus | null>(null);

  // Proactive message tracking — prevent spam and enable contextual triggers
  const lastProactiveAtRef = useRef<number>(0);
  const lastGreetingBandRef = useRef<string | null>(null);
  const rapidInteractionCountRef = useRef(0);
  const rapidInteractionWindowRef = useRef<number>(0);
  const returnFromIdleShownRef = useRef(false);
  const idleCheckInShownRef = useRef(false);
  const chatMilestoneShownRef = useRef(new Set<number>());

  // Track fire-and-forget timeouts for cleanup on unmount
  const pendingTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const safeTimeout = useCallback((fn: () => void, ms: number): void => {
    const id = setTimeout(() => {
      pendingTimersRef.current.delete(id);
      fn();
    }, ms);
    pendingTimersRef.current.add(id);
  }, []);

  useEffect(() => {
    return () => {
      for (const id of pendingTimersRef.current) clearTimeout(id);
      pendingTimersRef.current.clear();
    };
  }, []);

  // Streaming reply ref — holds the active reveal timer so cleanup can cancel it.
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progressive reveal effect: drives streaming reply character-by-character, feeds
  // both ChatBubble and ChatHistory, then commits the final message to history.
  useEffect(() => {
    if (!streamingReply) return;

    const text = streamingReply.line.trim();

    // Empty reply — commit immediately without animation.
    if (!text) {
      setCurrentReply(streamingReply);
      addChatMessage({ role: "assistant", content: streamingReply.line, timestamp: Date.now() });
      setStreamingReply(null);
      setStreamingContent("");
      return;
    }

    const baseDelay = getStreamingRevealDelay(streamingReply.mood);
    const stepCount = Math.min(text.length, MAX_STREAMING_STEPS);
    const chunkSize = Math.max(1, Math.ceil(text.length / stepCount));
    // For very long messages, cap individual step delay so the reveal stays snappy.
    const stepDelay = stepCount < text.length ? Math.min(18, baseDelay) : baseDelay;

    let idx = 0;
    let active = true;
    // Capture reply in closure so cleanup can't race against a new streamingReply.
    const reply = streamingReply;

    const step = (): void => {
      if (!active) return;
      idx = Math.min(text.length, idx + chunkSize);
      setStreamingContent(text.slice(0, idx));
      if (idx < text.length) {
        streamingTimerRef.current = setTimeout(step, stepDelay);
      } else {
        streamingTimerRef.current = null;
        // Reveal complete — commit to store and clear streaming state.
        setCurrentReply(reply);
        addChatMessage({ role: "assistant", content: reply.line, timestamp: Date.now() });
        setStreamingReply(null);
        setStreamingContent("");
      }
    };

    streamingTimerRef.current = setTimeout(step, stepDelay);

    return () => {
      active = false;
      if (streamingTimerRef.current) {
        clearTimeout(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
    };
  }, [streamingReply, addChatMessage, setCurrentReply, setStreamingContent, setStreamingReply]);

  // Multi-frequency organic float via CSS custom properties
  useOrganicFloat(avatarRef);

  // Time-of-day band detection — update every 5 minutes
  useEffect(() => {
    const update = (): void => {
      const h = new Date().getHours();
      if (h >= 5 && h < 12) setTodBand("morning");
      else if (h >= 12 && h < 17) setTodBand("afternoon");
      else if (h >= 17 && h < 21) setTodBand("evening");
      else setTodBand("night");
    };
    const id = setInterval(update, 300_000);
    return () => clearInterval(id);
  }, []);

  // Night owl mode — occasional messages between midnight and 5am
  useEffect(() => {
    const isNightOwlHour = (): boolean => {
      const h = new Date().getHours();
      return h >= 0 && h < 5;
    };

    const checkNightOwl = (): void => {
      if (!isNightOwlHour() || sleeping) {
        setNightOwlActive(false);
        return;
      }
      // 1 in 30 chance each minute to trigger night owl message
      if (Math.random() < 0.033) {
        setNightOwlActive(true);
        const nightOwlMessages = [
          "You're up late too? 🌙",
          "The stars are extra bright tonight...",
          "Shh... the world is sleeping, but not us.",
          "Late night thoughts hit different, huh?",
          "Just us night owls now. 🦉",
        ];
        const msg = nightOwlMessages[Math.floor(Math.random() * nightOwlMessages.length)];
        setCurrentReply({ line: msg, mood: "sleepy", animation: "idle.blink", intent: "none" });
        safeTimeout(() => setNightOwlActive(false), 8000);
      }
    };

    const id = setInterval(checkNightOwl, 60_000);
    // Check immediately on mount
    if (isNightOwlHour()) checkNightOwl();
    return () => clearInterval(id);
  }, [sleeping, setCurrentReply, safeTimeout]);

  // Idle sleep detection — Zzz after 120s of no interaction
  useEffect(() => {
    const check = (): void => {
      const elapsed = Date.now() - lastActivityRef.current;
      setIdleSleep(elapsed > 120_000);
    };
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, []);

  const markActive = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIdleSleep(false);
    
    // Track for proactive messages
    idleCheckInShownRef.current = false;
    returnFromIdleShownRef.current = false;
    
    // Track rapid interactions for "Having fun?" message
    const now = Date.now();
    if (now - rapidInteractionWindowRef.current > 30_000) {
      rapidInteractionWindowRef.current = now;
      rapidInteractionCountRef.current = 1;
    } else {
      rapidInteractionCountRef.current += 1;
    }
  }, []);

  markActiveRef.current = markActive;

  // "Welcome back" message when returning from extended idle
  useEffect(() => {
    const WELCOME_BACK_MIN_IDLE_MS = 5 * 60 * 1000; // 5 minutes away
    const MIN_GAP_FROM_LAST_PROACTIVE_MS = 2 * 60 * 1000; // 2 minutes since last proactive

    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== "visible") return;
      if (popupOpen || sleeping || !connected) return;

      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      
      // Only show if idle for 5+ minutes and not recently shown
      if (idleTime > WELCOME_BACK_MIN_IDLE_MS && 
          !returnFromIdleShownRef.current &&
          now - lastProactiveAtRef.current > MIN_GAP_FROM_LAST_PROACTIVE_MS) {
        returnFromIdleShownRef.current = true;
        lastProactiveAtRef.current = now;
        
        const welcomeBackLines = [
          "Welcome back! I missed you ✨",
          "Hey, you're back! 👋",
          "There you are! Missed you! 💕",
          "Welcome back! What's up?",
          "Yay, you're here again! 🎉",
        ];
        const line = welcomeBackLines[Math.floor(Math.random() * welcomeBackLines.length)];
        
        setCurrentReply({
          line,
          mood: "playful",
          animation: "idle.blink",
          intent: "welcome_back",
        });
        setAvatarBounce(true);
        safeTimeout(() => setAvatarBounce(false), 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [connected, popupOpen, sleeping, setCurrentReply, setAvatarBounce, safeTimeout]);

  const closePopup = useCallback(() => {
    setSettingsOpen(false);
    setChatOpen(false);
    setCtxMenu(null);
  }, [setChatOpen, setSettingsOpen]);

  const togglePopup = useCallback(() => {
    if (popupOpen) {
      closePopup();
      return;
    }

    setChatOpen(true);
  }, [closePopup, popupOpen, setChatOpen]);

  const toggleSettings = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      setChatOpen(true);
      return;
    }

    if (!popupOpen) {
      setChatOpen(true);
    }

    setSettingsOpen(true);
  }, [popupOpen, setChatOpen, setSettingsOpen, settingsOpen]);

  useEffect(() => {
    sleepingRef.current = sleeping;
    if (!sleeping) {
      sleepyResistanceRef.current = null;
      sleepResistanceAttemptRef.current = 0;
      resetSleepResistanceMemory();
      petGestureRef.current.count = 0;
      petGestureRef.current.start = 0;
    }
  }, [sleeping]);

  // Sleep/wake transition sounds and waking-up animation
  useEffect(() => {
    const wasSleeping = prevSleepingRef.current;
    prevSleepingRef.current = sleeping;
    if (wasSleeping && !sleeping) {
      sfxWake();
      setWakingUp(true);
      const timer = setTimeout(() => setWakingUp(false), 1500);
      return () => clearTimeout(timer);
    }
    if (!wasSleeping && sleeping) {
      sfxSleep();
      sfxThought();
    }
  }, [sleeping]);

  // Fetch weather on mount, refresh every 30 min (visibility-aware)
  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const load = (): void => {
      if (document.visibilityState !== "visible") return;
      void fetchWeather()
        .then((w) => { if (active) setWeather(w); })
        .catch((err: unknown) => { console.warn("[tokki] weather fetch failed", err); });
    };

    const startInterval = (): void => {
      if (intervalId) return;
      intervalId = setInterval(load, 30 * 60 * 1000);
    };

    const stopInterval = (): void => {
      if (intervalId) { clearInterval(intervalId); intervalId = undefined; }
    };

    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        load();
        startInterval();
      } else {
        stopInterval();
      }
    };

    load();
    startInterval();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      stopInterval();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Position window at bottom-right on startup only
  useEffect(() => {
    void moveToBottomRight();
  }, []);

  // Eye tracking — move eye groups toward cursor position
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let pending = false;
    let pointerX = 0;
    let pointerY = 0;
    let lastEyeX = Number.NaN;
    let lastEyeY = Number.NaN;

    const flushEyeTracking = (): void => {
      raf = 0;
      if (!pending || document.visibilityState !== "visible") {
        return;
      }
      pending = false;

      const stage = stageRef.current;
      if (!stage) {
        return;
      }

      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.4; // eyes sit ~40% from top
      const dx = (pointerX - cx) / rect.width;
      const dy = (pointerY - cy) / rect.height;
      const maxPx = 2.5;
      const exRaw = Math.max(-maxPx, Math.min(maxPx, dx * maxPx * 2));
      const eyRaw = Math.max(-maxPx, Math.min(maxPx, dy * maxPx * 2));
      const ex = Math.round(exRaw / EYE_TRACK_STEP_PX) * EYE_TRACK_STEP_PX;
      const ey = Math.round(eyRaw / EYE_TRACK_STEP_PX) * EYE_TRACK_STEP_PX;

      if (ex === lastEyeX && ey === lastEyeY) {
        return;
      }
      lastEyeX = ex;
      lastEyeY = ey;
      stage.style.setProperty("--eye-x", `${ex.toFixed(1)}px`);
      stage.style.setProperty("--eye-y", `${ey.toFixed(1)}px`);
    };

    const scheduleEyeTracking = (): void => {
      if (raf !== 0) {
        return;
      }
      raf = requestAnimationFrame(flushEyeTracking);
    };

    const onMove = (event: globalThis.MouseEvent): void => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pending = true;
      scheduleEyeTracking();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState !== "visible" && raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      if (pending) {
        scheduleEyeTracking();
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (raf !== 0) {
        cancelAnimationFrame(raf);
      }
    };
  }, []);

  // Keyboard shortcuts: Escape closes panels, Space toggles chat
  const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (chatOpen) {
          setChatOpen(false);
        }
      } else if (e.key === " " && !settingsOpen && document.activeElement === document.body) {
        e.preventDefault();
        togglePopup();
      }

      // Konami code detection - track key presses in buffer
      const key = e.key.toLowerCase();
      const buffer = konamiBufferRef.current;
      buffer.push(key === "arrowup" ? "ArrowUp" : key === "arrowdown" ? "ArrowDown" : key === "arrowleft" ? "ArrowLeft" : key === "arrowright" ? "ArrowRight" : key);
      if (buffer.length > KONAMI_CODE.length) buffer.shift();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chatOpen, settingsOpen, setChatOpen, setSettingsOpen, togglePopup]);

  const showToast = useCallback((text: string) => {
    // Clear previous toast timers to prevent stale callbacks from overlapping
    for (const id of toastTimersRef.current) clearTimeout(id);
    setToast({ text, exiting: false });
    toastTimersRef.current = [
      setTimeout(() => setToast((t) => t ? { ...t, exiting: true } : null), 4000),
      setTimeout(() => setToast(null), 4400),
    ];
  }, []);

  const showPersistentToast = useCallback((text: string) => {
    // Clear previous toast timers - this toast stays until manually dismissed or replaced
    for (const id of toastTimersRef.current) clearTimeout(id);
    toastTimersRef.current = [];
    setToast({ text, exiting: false });
  }, []);

  const checkAndNotify = useCallback((stats: AchievementStats) => {
    const newBadges = checkAchievements(stats);
    for (const badge of newBadges) {
      const ach = getAchievementById(badge.id);
      if (ach) {
        showToast(`${ach.icon} ${ach.name} unlocked!`);
      }
    }
  }, [showToast]);

  // Track minutes open for achievements (every 60s)
  useEffect(() => {
    const id = setInterval(() => {
      statsRef.current = incrementStat("minutesOpen", 1);
      checkAndNotify(statsRef.current);
    }, 60_000);
    return () => clearInterval(id);
  }, [checkAndNotify]);

  // Background provider health monitoring — check every 5 minutes
  useEffect(() => {
    const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    const runHealthCheck = async (): Promise<void> => {
      try {
        // Skip health checks if in offline mode (no point)
        const config = await getProviderConfig();
        if (config.provider === "offline") {
          console.debug("[tokki] health check skipped: offline mode");
          return;
        }

        const health = await checkProviderHealth();
        const prevStatus = lastProviderHealthRef.current;
        const currentStatus = health.status;

        console.debug("[tokki] health check:", { provider: health.provider, status: currentStatus, reason: health.reason });

        // Only notify on status change
        if (prevStatus !== null && prevStatus !== currentStatus) {
          if (prevStatus === "healthy" && (currentStatus === "degraded" || currentStatus === "unavailable")) {
            showToast("Chat provider seems sleepy - Tokki will use offline replies for now");
          } else if ((prevStatus === "degraded" || prevStatus === "unavailable") && currentStatus === "healthy") {
            showToast("Chat provider is back! ✨");
          }
        }

        lastProviderHealthRef.current = currentStatus;
      } catch (error: unknown) {
        console.warn("[tokki] health check failed:", error);
      }
    };

    // Run initial check after a short delay to let the app settle
    const initialTimeout = setTimeout(() => {
      void runHealthCheck();
    }, 10_000);

    // Set up recurring interval
    const intervalId = setInterval(() => {
      void runHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [showToast]);

  // Proactive message generation — contextual triggers for natural companion conversation
  const MIN_PROACTIVE_GAP_MS = 10 * 60 * 1000; // 10 minutes minimum between proactive messages
  const IDLE_CHECK_IN_MS = 30 * 60 * 1000; // 30 min of no interaction triggers check-in

  const getTimeOfDayGreeting = useCallback((): { line: string; emoji: string } | null => {
    const h = new Date().getHours();
    const chattiness = personality?.chattiness ?? 0.5;
    
    // More variation with chattiness
    const variations = {
      morning: [
        { line: "Good morning! Ready to start the day?", emoji: "☀️" },
        { line: "Rise and shine! A new day awaits", emoji: "🌅" },
        { line: "Morning! Hope you slept well", emoji: "☕" },
        { line: "Good morning! What's on your mind?", emoji: "🌤️" },
      ],
      afternoon: [
        { line: "How's your afternoon going?", emoji: "🌤️" },
        { line: "Afternoon check-in! Everything okay?", emoji: "👋" },
        { line: "Hope your day is going well!", emoji: "✨" },
        { line: "Taking a moment to say hi!", emoji: "💫" },
      ],
      evening: [
        { line: "Winding down for the evening?", emoji: "🌙" },
        { line: "Evening vibes! How was your day?", emoji: "🌆" },
        { line: "The day is winding down...", emoji: "🌅" },
        { line: "Evening! Time to relax?", emoji: "🍵" },
      ],
      night: [
        { line: "Up late? Remember to rest soon!", emoji: "💤" },
        { line: "Burning the midnight oil?", emoji: "🌙" },
        { line: "Late night thoughts...", emoji: "🦉" },
        { line: "Don't forget to rest!", emoji: "😴" },
      ],
    };

    let band: keyof typeof variations;
    if (h >= 5 && h < 12) band = "morning";
    else if (h >= 12 && h < 17) band = "afternoon";
    else if (h >= 17 && h < 21) band = "evening";
    else band = "night";

    // Skip if we already greeted for this time band
    if (lastGreetingBandRef.current === band) return null;

    const options = variations[band];
    // More chattiness = more likely to pick elaborate greetings
    const idx = Math.floor(Math.random() * (chattiness > 0.6 ? options.length : Math.min(2, options.length)));
    return options[idx];
  }, [personality?.chattiness]);

  const getMoodBasedMessage = useCallback((): { line: string; mood: string } | null => {
    const energy = state.energy;
    const mood = state.current_action.mood;
    const humor = personality?.humor ?? 0.5;

    // Energy-based messages
    if (energy < 25) {
      const lowEnergyLines = [
        { line: "Feeling a bit tired... how about you?", mood: "sleepy" },
        { line: "*yawn* Energy running low...", mood: "sleepy" },
        { line: "Could use a little break...", mood: "sleepy" },
      ];
      return lowEnergyLines[Math.floor(Math.random() * lowEnergyLines.length)];
    }

    // Mood-based messages
    if (mood === "playful") {
      const playfulLines = [
        { line: "I'm feeling bouncy today!", mood: "playful" },
        { line: "Full of energy! Let's do something!", mood: "playful" },
        { line: "Feeling extra peppy right now!", mood: "playful" },
      ];
      // More humor = more exclamation points
      const picked = playfulLines[Math.floor(Math.random() * playfulLines.length)];
      if (humor > 0.7) {
        return { ...picked, line: picked.line + " 🐰" };
      }
      return picked;
    }

    if (mood === "sleepy") {
      const sleepyLines = [
        { line: "*yawn* Getting drowsy...", mood: "sleepy" },
        { line: "Eyelids feeling heavy...", mood: "sleepy" },
        { line: "So cozy and sleepy...", mood: "sleepy" },
      ];
      return sleepyLines[Math.floor(Math.random() * sleepyLines.length)];
    }

    if (mood === "curious") {
      const curiousLines = [
        { line: "Wondering what you're up to...", mood: "curious" },
        { line: "Hmm, what's happening over there?", mood: "curious" },
        { line: "I sense something interesting!", mood: "curious" },
      ];
      return curiousLines[Math.floor(Math.random() * curiousLines.length)];
    }

    return null;
  }, [state.energy, state.current_action.mood, personality?.humor]);

  const getActivityBasedMessage = useCallback((): { line: string; kind: string } | null => {
    const now = Date.now();
    const idleTime = now - lastActivityRef.current;
    const chattiness = personality?.chattiness ?? 0.5;

    // After 30 min idle — check-in (only once until next activity)
    if (idleTime > IDLE_CHECK_IN_MS && !idleCheckInShownRef.current && chattiness > 0.3) {
      idleCheckInShownRef.current = true;
      const checkInLines = [
        "Just checking in - everything okay?",
        "Haven't heard from you in a while...",
        "Still here if you need me!",
        "Taking a break? That's okay!",
      ];
      return {
        line: checkInLines[Math.floor(Math.random() * checkInLines.length)] + " 👋",
        kind: "idle_check_in",
      };
    }

    // After rapid interactions (5+ in 30 seconds)
    if (rapidInteractionCountRef.current >= 5) {
      rapidInteractionCountRef.current = 0;
      const excitedLines = [
        "Having fun?",
        "Someone's active today!",
        "Lots of energy!",
        "We're on a roll!",
      ];
      return {
        line: excitedLines[Math.floor(Math.random() * excitedLines.length)] + " 😊",
        kind: "rapid_interaction",
      };
    }

    return null;
  }, [personality?.chattiness]);

  const getMilestoneMessage = useCallback((): { line: string; kind: string } | null => {
    const msgCount = chatMessagesLength;
    
    // Chat milestones
    const milestones: Array<{ count: number; lines: string[] }> = [
      { count: 10, lines: [
        "We're really getting to know each other!",
        "10 messages in! This is fun!",
        "I'm enjoying our chats!",
      ]},
      { count: 25, lines: [
        "25 messages! We're becoming friends!",
        "Look at us, chatting away!",
        "Our bond is growing stronger!",
      ]},
      { count: 50, lines: [
        "50 messages! We're best friends now!",
        "Half a hundred chats! Wow!",
        "I treasure every conversation!",
      ]},
      { count: 100, lines: [
        "100 messages! What a journey!",
        "A century of chats! You're the best!",
        "Triple digits! We've come so far!",
      ]},
    ];

    for (const milestone of milestones) {
      if (msgCount >= milestone.count && !chatMilestoneShownRef.current.has(milestone.count)) {
        chatMilestoneShownRef.current.add(milestone.count);
        const line = milestone.lines[Math.floor(Math.random() * milestone.lines.length)];
        return { line: line + " 💕", kind: "chat_milestone" };
      }
    }

    return null;
  }, [chatMessagesLength]);

  // Proactive message scheduler — runs every 2 minutes to check triggers
  useEffect(() => {
    const PROACTIVE_CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes

    const maybeShowProactive = (): void => {
      // Skip if chat panel is open or not connected
      if (popupOpen || !connected || sleeping) return;

      const now = Date.now();

      // Enforce minimum gap between proactive messages
      if (now - lastProactiveAtRef.current < MIN_PROACTIVE_GAP_MS) return;

      // Check for return from idle (shown once per idle period)
      const wasIdle = now - lastActivityRef.current > 60_000 && 
                      now - lastActivityRef.current < 120_000; // Between 1-2 min
      if (wasIdle && !returnFromIdleShownRef.current && lastActivityRef.current > 0) {
        // Will show "Welcome back" on next activity
      }

      // Priority order for proactive messages
      let message: { line: string; mood?: string; kind?: string } | null = null;

      // 1. Chat milestones (high priority, rare)
      const milestone = getMilestoneMessage();
      if (milestone) {
        message = { line: milestone.line, mood: "playful", kind: milestone.kind };
      }

      // 2. Activity-based (check-in, rapid interactions)
      if (!message) {
        const activityMsg = getActivityBasedMessage();
        if (activityMsg) {
          message = { line: activityMsg.line, mood: "curious", kind: activityMsg.kind };
        }
      }

      // 3. Time-of-day greetings (once per band, with randomness)
      if (!message && Math.random() < 0.3) { // 30% chance to show time greeting
        const greeting = getTimeOfDayGreeting();
        if (greeting) {
          const h = new Date().getHours();
          let band: string;
          if (h >= 5 && h < 12) band = "morning";
          else if (h >= 12 && h < 17) band = "afternoon";
          else if (h >= 17 && h < 21) band = "evening";
          else band = "night";
          
          lastGreetingBandRef.current = band;
          message = { line: `${greeting.line} ${greeting.emoji}`, mood: "playful", kind: "time_greeting" };
        }
      }

      // 4. Mood-responsive messages (lowest priority, with randomness)
      if (!message && Math.random() < 0.15) { // 15% chance
        const moodMsg = getMoodBasedMessage();
        if (moodMsg) {
          message = { line: moodMsg.line, mood: moodMsg.mood, kind: "mood_response" };
        }
      }

      // Show the message if we have one
      if (message) {
        lastProactiveAtRef.current = now;
        showToast(message.line);
        setCurrentReply({
          line: message.line,
          mood: (message.mood ?? "playful") as LlmResponse["mood"],
          animation: "idle.blink",
          intent: message.kind ?? "proactive",
        });
        setAvatarBounce(true);
        safeTimeout(() => setAvatarBounce(false), 500);
      }
    };

    // Initial check after short delay
    const initialTimeout = setTimeout(maybeShowProactive, 30_000);

    // Regular interval
    const intervalId = setInterval(maybeShowProactive, PROACTIVE_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [
    connected,
    popupOpen,
    sleeping,
    getTimeOfDayGreeting,
    getMoodBasedMessage,
    getActivityBasedMessage,
    getMilestoneMessage,
    showToast,
    setCurrentReply,
    setAvatarBounce,
    safeTimeout,
  ]);

  // Natural blink system: weighted random blink types with variety
  // Pauses when document is hidden to save CPU
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const blinkTimers = new Set<ReturnType<typeof setTimeout>>();

    const trackTimer = (fn: () => void, ms: number): void => {
      const id = setTimeout(() => {
        blinkTimers.delete(id);
        fn();
      }, ms);
      blinkTimers.add(id);
    };

    setBlinking(false);
    setBlinkSlow(false);

    const cleanup = (): void => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      for (const id of blinkTimers) clearTimeout(id);
      blinkTimers.clear();
    };

    // Don't run blink loop when sleeping or document hidden
    if (sleeping || !isDocumentVisible) {
      return cleanup;
    }

    const doBlink = (): void => {
      if (cancelled) return;
      const roll = Math.random();

      if (roll < 0.6) {
        // Normal single blink (60%)
        setBlinking(true);
        trackTimer(() => { if (!cancelled) setBlinking(false); }, 150);
      } else if (roll < 0.75) {
        // Double blink (15%)
        setBlinking(true);
        trackTimer(() => { if (!cancelled) setBlinking(false); }, 120);
        trackTimer(() => { if (!cancelled) setBlinking(true); }, 250);
        trackTimer(() => { if (!cancelled) setBlinking(false); }, 370);
      } else if (roll < 0.9) {
        // Half-squint then full blink (15%)
        setBlinkSlow(true);
        trackTimer(() => { if (!cancelled) setBlinkSlow(false); }, 400);
      } else {
        // Slow daydream blink (10%)
        setBlinkSlow(true);
        trackTimer(() => { if (!cancelled) setBlinkSlow(false); }, 600);
      }
    };

    const scheduleBlink = (): void => {
      // Varied inter-blink interval: 2.5-6s, with 20% chance of rapid cluster
      const isCluster = Math.random() < 0.2;
      const delay = isCluster
        ? 400 + Math.random() * 600  // rapid cluster: 400-1000ms
        : 2500 + Math.random() * 3500; // normal: 2.5-6s

      timeout = setTimeout(() => {
        doBlink();
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();
    return cleanup;
  }, [sleeping, isDocumentVisible]);

  // Ambient mood tone — shift drone frequency when mood changes
  useEffect(() => {
    updateAmbientMood(state.current_action.mood);
  }, [state.current_action.mood]);

  // Flash brightness on mood transition — clear previous timer on rapid changes
  useEffect(() => {
    if (state.current_action.mood !== prevMoodRef.current) {
      prevMoodRef.current = state.current_action.mood;
      setMoodFlash(true);
      const timer = setTimeout(() => setMoodFlash(false), 400);
      return () => clearTimeout(timer);
    }
  }, [state.current_action.mood]);

  // Emoji rain: map keywords in chat to emoji particles
  const emojiRainId = useRef(0);

  const triggerEmojiRain = useCallback((text: string) => {
    const emojis: string[] = [];
    for (const [pattern, emoji] of KEYWORD_EMOJI) {
      if (pattern.test(text)) emojis.push(emoji);
    }
    if (emojis.length === 0) return;
    const chosen = emojis[Math.floor(Math.random() * emojis.length)];
    const particles = Array.from({ length: 6 }, () => ({
      id: emojiRainId.current++,
      emoji: chosen,
      x: 10 + Math.random() * 80,
    }));
    setEmojiRain(particles);
    safeTimeout(() => setEmojiRain([]), 2000);
  }, [safeTimeout]);

  const triggerConfetti = useCallback(() => {
    setConfettiBurst(true);
    sfxCelebrate();
    safeTimeout(() => setConfettiBurst(false), 1200);
  }, [safeTimeout]);

  // Konami code detection effect — checks buffer on each keypress
  const KONAMI_SEQUENCE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  useEffect(() => {
    const checkKonamiCode = (e: KeyboardEvent): void => {
      // Check if the buffer matches Konami code after updating
      const buffer = konamiBufferRef.current;
      if (buffer.length === KONAMI_SEQUENCE.length && buffer.every((k, i) => k === KONAMI_SEQUENCE[i])) {
        // Easter egg triggered!
        konamiBufferRef.current = [];
        triggerConfetti();
        setAvatarBounce(true);
        safeTimeout(() => setAvatarBounce(false), 500);
        showToast("🎮 Secret unlocked! You found me!");
        sfxAchievement();
      }
    };
    window.addEventListener("keydown", checkKonamiCode);
    return () => window.removeEventListener("keydown", checkKonamiCode);
  }, [triggerConfetti, safeTimeout, showToast]);

  // Rare random events — 1 in 500 chance per tick
  const triggerRareEvent = useCallback(() => {
    if (Math.random() >= 0.002) return; // 1 in 500 chance
    
    const roll = Math.random();
    if (roll < 0.33) {
      // Rainbow sparkles
      setRainbowSparkles(true);
      safeTimeout(() => setRainbowSparkles(false), 3000);
    } else if (roll < 0.66) {
      // Shooting star
      setShootingStar(true);
      safeTimeout(() => setShootingStar(false), 2000);
    } else {
      // Wink
      setWinking(true);
      safeTimeout(() => setWinking(false), 600);
    }
  }, [safeTimeout]);

  const showProactiveMessage = useCallback(
    (msg: ProactiveMessage) => {
      setCurrentReply({
        line: msg.line,
        mood: msg.mood as LlmResponse["mood"],
        animation: msg.animation,
        intent: msg.kind,
      });
      setProactiveMessage(msg);
      setPulse(true);
      safeTimeout(() => setPulse(false), 600);
      setAvatarBounce(true);
      safeTimeout(() => setAvatarBounce(false), 500);
    },
    [safeTimeout, setCurrentReply, setProactiveMessage]
  );

  const applyMemoryContext = useCallback((ctx: MemoryContext | null): MemoryContext | null => {
    setMemoryContext(ctx);
    setMemoryContextReady(true);
    return ctx;
  }, []);

  useEffect(() => {
    let mounted = true;
    let teardown: (() => void) | undefined;
    let proactiveTeardown: (() => void) | undefined;
    let milestoneTimer: ReturnType<typeof setTimeout> | undefined;
    let greetingTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      if (!skipStartupProfileSync) {
        // Restore saved avatar from onboarding
        const savedAvatar = normalizeAvatarId(localStorage.getItem("tokki_avatar_id"));
        if (savedAvatar) {
          setAvatarId(savedAvatar);
          void setAvatar(savedAvatar).catch((error: unknown) => {
            console.warn("[tokki] failed to restore avatar in backend", error);
          });
        }

        // Load personality from backend
        const personality = await getPersonality();
        if (mounted) {
          setStorePersonality(personality);
        }
      }

      teardown = await subscribeBehaviorTick((tick) => {
        applyTick(tick);
        triggerRareEvent();
      });

      proactiveTeardown = await subscribeProactiveMessage((msg) => {
        showProactiveMessage(msg);
      });

      // Start behavior loop with retry mechanism
      const MAX_RETRIES = 3;
      const RETRY_DELAY_MS = 1000;
      let behaviorLoopStarted = false;

      const attemptStartBehaviorLoop = async (): Promise<boolean> => {
        const attempt = behaviorLoopRetryRef.current + 1;
        try {
          await startBehaviorLoop();
          return true;
        } catch (error: unknown) {
          console.error(`[tokki] behavior loop start failed (attempt ${attempt}/${MAX_RETRIES})`, error);
          if (attempt < MAX_RETRIES) {
            behaviorLoopRetryRef.current = attempt;
            showToast(`⚠️ Connecting... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            if (!mounted) return false;
            return attemptStartBehaviorLoop();
          }
          return false;
        }
      };

      behaviorLoopRetryRef.current = 0;
      behaviorLoopStarted = await attemptStartBehaviorLoop();

      if (!mounted) {
        return;
      }

      if (!behaviorLoopStarted) {
        console.error("[tokki] all behavior loop start attempts failed");
        showPersistentToast("🐰 Oops! Tokki had trouble waking up. Try restarting the app — we'll get through this together!");
        setConnected(false);
        return;
      }

      // Fetch current state with error handling
      let current;
      try {
        current = await getCurrentState();
      } catch (error: unknown) {
        console.error("[tokki] failed to get current state", error);
        showPersistentToast("🐰 Hmm, Tokki got a bit confused during setup. Try restarting — we'll figure it out!");
        setConnected(false);
        return;
      }

      if (!mounted) {
        return;
      }
      setState(current);
      setConnected(true);

      // Restore persisted chat history so conversations survive app restarts.
      // getChatHistory() covers both the Tauri backend (native persistence) and
      // the browser fallback path (IndexedDB).
      try {
        const history = await getChatHistory();
        if (history.length > 0) {
          loadChatHistory(history);
        }
      } catch (error) {
        console.warn("[tokki] failed to restore chat history", error);
      }

      // Record daily streak
      const s = recordInteraction();
      setStreak(s);
      if (isMilestone(s)) {
        milestoneTimer = setTimeout(() => { if (mounted) showToast(`${s}-day streak! Keep it up!`); }, 2000);
      }
      // Sync streak to achievement stats
      statsRef.current = incrementStat("streakDays", s - statsRef.current.streakDays);
      checkAndNotify(statsRef.current);

      // Daily greeting — once per day, personalized via memory context
      const today = new Date().toDateString();
      if (localStorage.getItem("tokki_last_greeting") !== today) {
        localStorage.setItem("tokki_last_greeting", today);
        greetingTimer = setTimeout(async () => {
          if (!mounted) return;
          const ctx = await getMemoryContext().catch(() => null);
          if (mounted) {
            applyMemoryContext(ctx);
          }
          const greeting = ctx
            ? buildPersonalizedGreeting(ctx)
            : "Hey there! 👋";
          setCurrentReply({ line: greeting, mood: "playful", animation: "idle.blink", intent: "none" });
          showToast(greeting);
        }, 3000);
      } else {
        // Not a new day, but still fetch memory context for later use
        getMemoryContext()
          .then((ctx) => { if (mounted) applyMemoryContext(ctx); })
          .catch(() => { if (mounted) applyMemoryContext(null); });
      }
    })().catch((error: unknown) => {
      console.error("Tokki runtime init failed", error);
      setConnected(false);
    });

    return () => {
      mounted = false;
      if (milestoneTimer) clearTimeout(milestoneTimer);
      if (greetingTimer) clearTimeout(greetingTimer);
      teardown?.();
      proactiveTeardown?.();
      void stopBehaviorLoop();
      for (const id of toastTimersRef.current) clearTimeout(id);
    };
  }, [applyMemoryContext, applyTick, setConnected, setState, setAvatarId, setStorePersonality, showProactiveMessage, showToast, showPersistentToast, checkAndNotify, skipStartupProfileSync, triggerRareEvent, loadChatHistory]);

  useEffect(() => {
    if (!popupOpen || settingsOpen) {
      return;
    }

    let cancelled = false;
    getMemoryContext()
      .then((ctx) => {
        if (!cancelled) {
          applyMemoryContext(ctx);
        }
      })
      .catch(() => {
        if (!cancelled) {
          applyMemoryContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyMemoryContext, chatMessagesLength, popupOpen, settingsOpen]);

  const onInteract = useCallback(async (type: UserEvent["type"]): Promise<void> => {
    sleepyResistanceRef.current = null;
    sleepResistanceAttemptRef.current = 0;
    resetSleepResistanceMemory();
    markActive();
    try {
      const tick = await handleUserInteraction(makeUserEvent(type));
      applyTick(tick);
    } catch (error) {
      console.warn(`[tokki] interaction "${type}" failed`, error);
    }
  }, [applyTick, markActive]);

  const clearDragListeners = useCallback(() => {
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }
  }, []);

  const onAvatarMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return;
    }

    clearDragListeners();
    dragRef.current = { startX: event.screenX, startY: event.screenY, dragging: false };

    // Belly rub detection — hold for 3+ seconds without moving
    if (bellyRubTimerRef.current) {
      clearTimeout(bellyRubTimerRef.current);
    }
    bellyRubTimerRef.current = setTimeout(() => {
      // Only trigger if we haven't started dragging
      if (!dragRef.current?.dragging && !sleeping) {
        setBellyRubbing(true);
        setHeartBurst(true);
        sfxPet();
        setCurrentReply({ line: "*purrrr* 💕 That's the spot...", mood: "playful", animation: "idle.blink", intent: "none" });
        safeTimeout(() => {
          setBellyRubbing(false);
          setHeartBurst(false);
        }, 2000);
      }
    }, 3000);

    const onMouseMove = (moveEvent: globalThis.MouseEvent): void => {
      const drag = dragRef.current;
      if (!drag || drag.dragging) return;
      const dx = moveEvent.screenX - drag.startX;
      const dy = moveEvent.screenY - drag.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        drag.dragging = true;
        // Cancel belly rub timer if we start dragging
        if (bellyRubTimerRef.current) {
          clearTimeout(bellyRubTimerRef.current);
          bellyRubTimerRef.current = null;
        }
        void startWindowDrag().catch(() => {});
        void onInteract("drag_start");
      }
    };

    const onMouseUp = (): void => {
      // Cancel belly rub timer on mouse up
      if (bellyRubTimerRef.current) {
        clearTimeout(bellyRubTimerRef.current);
        bellyRubTimerRef.current = null;
      }
      const drag = dragRef.current;
      if (drag?.dragging) {
        void onInteract("drag_end");
        setDragLand(true);
        safeTimeout(() => setDragLand(false), 500);
      }
      dragRef.current = null;
      clearDragListeners();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    dragCleanupRef.current = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [clearDragListeners, onInteract, safeTimeout, sleeping, setCurrentReply]);

  useEffect(() => clearDragListeners, [clearDragListeners]);

  // Mouse shake detection: rapid direction reversals trigger a dizzy reaction
  useEffect(() => {
    let lastX: number | null = null;
    let lastDir = 0; // -1 left, +1 right, 0 unknown
    let reversals = 0;
    let windowStart = 0;
    const SHAKE_REVERSALS = 4;
    const SHAKE_WINDOW_MS = 600;
    let cooldown = false;
    let lastSampleAt = 0;

    const resetTracking = (): void => {
      lastX = null;
      lastDir = 0;
      reversals = 0;
      windowStart = 0;
      lastSampleAt = 0;
    };

    const onMove = (event: globalThis.MouseEvent): void => {
      if (cooldown || document.visibilityState !== "visible") return;

      if (event.timeStamp - lastSampleAt < SHAKE_SAMPLE_INTERVAL_MS) {
        return;
      }
      lastSampleAt = event.timeStamp;

      if (lastX === null) {
        lastX = event.screenX;
        return;
      }

      const dx = event.screenX - lastX;
      lastX = event.screenX;
      if (Math.abs(dx) < 3) return; // ignore tiny movements

      const dir = dx > 0 ? 1 : -1;
      const now = Date.now();

      if (lastDir !== 0 && dir !== lastDir) {
        if (now - windowStart > SHAKE_WINDOW_MS) {
          reversals = 0;
          windowStart = now;
        }
        reversals++;
        if (reversals >= SHAKE_REVERSALS) {
          reversals = 0;
          cooldown = true;
          const wakeDecision = decideSleepWake({
            sleeping: sleepingRef.current,
            source: "shake"
          });
          if (wakeDecision.shouldWake) {
            void onInteract("poke");
          } else {
            markActive();
          }
          void reportMouseShake();
          setTimeout(() => { cooldown = false; }, 5000);
        }
      }
      if (reversals === 0) {
        windowStart = now;
      }
      lastDir = dir;
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState !== "visible") {
        resetTracking();
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [markActive, onInteract]);

  const onAvatarClick = (): void => {
    if (dragRef.current?.dragging) return;
    const now = Date.now();

    if (sleeping) {
      const wakeDecision = decideSleepWake({
        sleeping,
        source: "click",
        lastResistanceAt: sleepyResistanceRef.current,
        now
      });

      if (wakeDecision.shouldResist) {
        lastClickRef.current = 0;
        sleepyResistanceRef.current = wakeDecision.rememberResistanceAt;
        sleepResistanceAttemptRef.current += 1;
        
        const resistance = pickProgressiveSleepResistance(sleepResistanceAttemptRef.current);
        sfxClick();
        
        // If yielding (4+ attempts), wake Tokki up
        if (resistance.stage === "yielding") {
          setCurrentReply({
            line: resistance.line,
            mood: "sleepy",
            animation: resistance.animationHint,
            intent: "sleep_wake"
          });
          sleepyResistanceRef.current = null;
          sleepResistanceAttemptRef.current = 0;
          resetSleepResistanceMemory();
          if (!popupOpen) {
            setChatOpen(true);
          }
          void onInteract("click");
        } else {
          setCurrentReply({
            line: resistance.line,
            mood: "sleepy",
            animation: resistance.animationHint,
            intent: "sleep_resist"
          });
        }
        statsRef.current = incrementStat("totalClicks");
        checkAndNotify(statsRef.current);
        return;
      }

      lastClickRef.current = 0;
      sleepyResistanceRef.current = wakeDecision.rememberResistanceAt;
      sleepResistanceAttemptRef.current = 0;
      resetSleepResistanceMemory();
      if (wakeDecision.reason === "follow_up_wake") {
        setCurrentReply({
          line: "Okay, okay... I'm awake now.",
          mood: "sleepy",
          animation: "idle.yawn",
          intent: "sleep_wake"
        });
      }
      sfxClick();
      if (!popupOpen) {
        setChatOpen(true);
      }
      void onInteract("click");
      statsRef.current = incrementStat("totalClicks");
      checkAndNotify(statsRef.current);
      return;
    }

    if (now - lastClickRef.current < 350) {
      // Double-click: pet interaction with heart burst
      setHeartBurst(true);
      sfxPet();
      safeTimeout(() => setHeartBurst(false), 1100);
      void onInteract("poke");
      lastClickRef.current = 0;
      statsRef.current = incrementStat("totalPets");
      checkAndNotify(statsRef.current);
      return;
    }
    lastClickRef.current = now;
    sfxClick();
    togglePopup();
    void onInteract("click");
    statsRef.current = incrementStat("totalClicks");
    checkAndNotify(statsRef.current);
  };

  const onSendMessage = useCallback(
    async (message: string): Promise<void> => {
      markActive();
      // Cancel any in-progress streaming so a new message starts cleanly.
      setStreamingReply(null);
      setStreamingContent("");
      setIsTyping(true);
      sfxSend();
      addChatMessage({ role: "user", content: message, timestamp: Date.now() });
      statsRef.current = incrementStat("totalChats");
      checkAndNotify(statsRef.current);
      triggerEmojiRain(message);

      // Chat secrets detection
      const lowerMsg = message.toLowerCase().trim();
      
      // "I love you" → Blush
      if (/\bi\s*love\s*you\b/i.test(lowerMsg)) {
        setBlushing(true);
        setHeartBurst(true);
        safeTimeout(() => {
          setBlushing(false);
          setHeartBurst(false);
        }, 2000);
      }
      
      // "tell me a secret" → Whisper something mysterious
      if (/tell\s*me\s*a?\s*secret/i.test(lowerMsg)) {
        const secrets = [
          "*whispers* Sometimes I dream about becoming a real bunny... 🐰✨",
          "*looks around nervously* I've seen things in the code... beautiful things.",
          "*quietly* There's a konami code hidden somewhere... ↑↑↓↓←→←→BA",
          "*leans in* I named all my floating particles. Don't tell anyone.",
          "*whispers* When you're not looking, I practice my dance moves.",
        ];
        const secret = secrets[Math.floor(Math.random() * secrets.length)];
        setCurrentReply({ line: secret, mood: "curious", animation: "idle.blink", intent: "none" });
        addChatMessage({ role: "assistant", content: secret, timestamp: Date.now() });
        setIsTyping(false);
        return;
      }
      
      // "dance" → Dance animation
      if (/\bdance\b/i.test(lowerMsg)) {
        setDancing(true);
        setAvatarBounce(true);
        triggerConfetti();
        const danceReplies = [
          "💃 *wiggles excitedly* Watch my moves!",
          "🎵 Dance break! *spins around happily*",
          "✨ *bounces to an invisible beat* Wheee!",
        ];
        const reply = danceReplies[Math.floor(Math.random() * danceReplies.length)];
        setCurrentReply({ line: reply, mood: "playful", animation: "idle.blink", intent: "none" });
        addChatMessage({ role: "assistant", content: reply, timestamp: Date.now() });
        safeTimeout(() => {
          setDancing(false);
          setAvatarBounce(false);
        }, 2000);
        setIsTyping(false);
        return;
      }

      try {
        const response = await sendChatMessage(message);
        applyTick(response.tick);
        sfxReceive();
        setAvatarBounce(true);
        safeTimeout(() => setAvatarBounce(false), 500);
        triggerEmojiRain(response.reply.line);
        // Begin progressive streaming reveal — the effect above drives the
        // character-by-character reveal and commits addChatMessage when done.
        setStreamingReply(response.reply);
      } catch (error) {
        console.error("Chat failed", error);
        const errorLine = "Oops! My thoughts got tangled up 🐰 Let's try that again — or we can chat offline if you'd like!";
        setCurrentReply({
          line: errorLine,
          mood: "sleepy",
          animation: "idle.blink",
          intent: "none"
        });
        addChatMessage({
          role: "assistant",
          content: errorLine,
          timestamp: Date.now()
        });
      } finally {
        setIsTyping(false);
      }
    },
    [addChatMessage, applyTick, markActive, safeTimeout, setCurrentReply, setIsTyping, setStreamingReply, setStreamingContent, triggerEmojiRain, triggerConfetti, checkAndNotify]
  );

  const quickActions = useMemo<ChatQuickAction[]>(() => {
    const moodLabel =
      state.current_action.mood === "sleepy" ? "Soft mood check 💭" : "Mood check-in 💭";
    const focusLabel = state.energy < 35 ? "Gentle focus reset 🌿" : "Focus buddy mode 🎯";
    const memoryLabel = chatMessagesLength > 2 ? "Memory recap 📖" : "Memory seed 🌱";

    return [
      {
        id: "mood-check-in",
        label: moodLabel,
        prompt: `Hey Tokki, how are you feeling right now? I'm in a ${state.current_action.mood} kind of mood too.`,
      },
      {
        id: "little-surprise",
        label: "Little surprise ✨",
        prompt: "Tokki, give me a tiny surprise or sweet thought for right now.",
      },
      {
        id: "focus-support",
        label: focusLabel,
        prompt:
          state.energy < 35
            ? "Could you help me ease into focus with one tiny next step?"
            : "Can you keep me company while I focus for 15 minutes?",
      },
      {
        id: "memory-recap",
        label: memoryLabel,
        prompt:
          chatMessagesLength > 2
            ? "Can you recap a couple things you remember from our recent chats?"
            : "Let's make today memorable—ask me one warm question.",
      },
    ];
  }, [chatMessagesLength, state.current_action.mood, state.energy]);

  const onCtxJoke = useCallback(() => {
    void onSendMessage("Tell me a joke!");
  }, [onSendMessage]);

  const onCtxEnergy = useCallback(() => {
    const e = state.energy;
    const mood = state.current_action.mood;
    const moodLabel = mood === "playful" ? "feeling playful" : mood === "curious" ? "feeling curious" : mood === "sleepy" ? "a bit sleepy" : mood === "surprised" ? "surprised!" : "doing okay";
    const energyLabel = e > 70 ? "Lots of energy!" : e > 30 ? "Getting a bit tired..." : "Running on fumes!";
    setCurrentReply({ 
      line: `${moodLabel} • ${energyLabel} (${e}% energy)`, 
      mood: e > 50 ? "playful" : "sleepy", 
      animation: "idle.blink", 
      intent: "none" 
    });
  }, [state.energy, state.current_action.mood, setCurrentReply]);

  const onCtxSayHi = useCallback(() => {
    void onSendMessage("Hey there! 👋");
  }, [onSendMessage]);

  const onCtxTakeBreak = useCallback(() => {
    setIdleSleep(true);
    setCurrentReply({ 
      line: "Time for a little nap... 💤 See you in 5 minutes!", 
      mood: "sleepy", 
      animation: "rest.nap", 
      intent: "none" 
    });
    // Auto-wake after 5 minutes
    const wakeTimer = setTimeout(() => {
      setIdleSleep(false);
      setCurrentReply({ 
        line: "I'm back! Did you miss me? ✨", 
        mood: "playful", 
        animation: "idle.blink", 
        intent: "none" 
      });
    }, 5 * 60 * 1000);
    // Cleanup on unmount
    return () => clearTimeout(wakeTimer);
  }, [setCurrentReply]);

  const onCtxSwitchAvatar = useCallback(() => {
    setChatOpen(true);
    setSettingsOpen(false);
  }, []);

  const onCtxExportMemories = useCallback((includeChatHistory: boolean) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = includeChatHistory
      ? `tokki-memories-and-chat-${timestamp}.json`
      : `tokki-memories-${timestamp}.json`;

    void exportMemory(filename, { includeChatHistory })
      .then(() => {
        showToast(includeChatHistory ? "Memories and conversation exported ✨" : "Memories exported ✨");
      })
      .catch((error) => {
        console.warn("[tokki] failed to export memories", error);
        showPersistentToast("🐰 I couldn't export your memories just now. Please try again in a moment.");
      });
  }, [showPersistentToast, showToast]);

  const onCtxImportMemories = useCallback(() => {
    memoryImportInputRef.current?.click();
  }, []);

  const onMemoryImportSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    void importMemoryFile(file)
      .then((result) => {
        setAvatarId(result.avatarId);
        setStorePersonality(result.personality);
        const nextProfile = createOnboardingProfile({
          avatarId: result.avatarId,
          userName: result.userName,
          personality: result.personality,
        });
        const existingProfile = loadOnboardingProfile();
        saveOnboardingProfile({
          ...nextProfile,
          completedAt: existingProfile?.completedAt ?? nextProfile.completedAt,
        });

        setCurrentReply(null);
        setIsTyping(false);
        setStreamingReply(null);
        setStreamingContent("");
        if (result.chatHistoryImported) {
          loadChatHistory(result.chatHistory);
          setChatOpen(true);
          setSettingsOpen(false);
        }

        showToast(
          result.chatHistoryImported
            ? "Memories and conversation imported ✨"
            : "Memories imported ✨",
        );
      })
      .catch((error) => {
        console.warn("[tokki] failed to import memories", error);
        showPersistentToast("🐰 I couldn't import that memory bundle. Double-check the file and try again.");
      });
  }, [
    loadChatHistory,
    setAvatarId,
    setChatOpen,
    setCurrentReply,
    setIsTyping,
    setSettingsOpen,
    setStorePersonality,
    setStreamingContent,
    setStreamingReply,
    showPersistentToast,
    showToast,
  ]);

  const onCtxClearConversation = useCallback(() => {
    void clearChatHistory()
      .then(() => {
        resetChat();
        showToast("Conversation cleared 🌿");
      })
      .catch((error) => {
        console.warn("[tokki] failed to clear conversation", error);
        showPersistentToast("🐰 I couldn't fully clear this conversation yet. Please try again in a moment.");
      });
  }, [resetChat, showPersistentToast, showToast]);

  const visualAction = getSleepVisualAction(state.current_action, idleSleep);
  const actionView = mapActionToView(visualAction, avatarId);
  const avatarClassName = composeAvatarClasses(actionView, {
    avatarBounce,
    blinking,
    blinkSlow,
    wagging,
    dragLand,
    moodFlash,
    blushing,
    dancing,
    bellyRubbing,
    winking
  });
  const accentColor = getAvatar(avatarId)?.accentColor ?? "#F5B7C5";
  const popupTitle = personality?.name ?? "Tokki";
  const popupSubtitle = sleeping
    ? "sleeping softly"
    : connected
      ? `${state.current_action.mood} mood • ${state.energy}% energy`
      : "waking up";

  const onAvatarMouseEnter = (): void => {
    if (sleeping) {
      petGestureRef.current.count = 0;
      petGestureRef.current.start = 0;
      return;
    }

    setWagging(true);
    safeTimeout(() => setWagging(false), 900);
    void onInteract("hover");

    const pg = petGestureRef.current;
    if (pg.cooldown) return;
    const now = Date.now();
    if (now - pg.start > 1000) {
      pg.count = 0;
      pg.start = now;
    }
    pg.count++;
    if (pg.count >= 3) {
      // Petting detected!
      pg.cooldown = true;
      pg.count = 0;
      setHeartBurst(true);
      sfxPet();
      safeTimeout(() => setHeartBurst(false), 1100);
      void onInteract("poke");
      statsRef.current = incrementStat("totalPets");
      checkAndNotify(statsRef.current);
      safeTimeout(() => { petGestureRef.current.cooldown = false; }, 2000);
    }
  };

  return (
    <section className={`tokki-card${popupOpen ? " tokki-card--chat-open" : ""}${sleeping ? " tokki-card--sleeping" : ""}${pulse ? " tokki-card--pulse" : ""}${nightOwlActive ? " tokki-card--night-owl" : ""}`} aria-label="Tokki" data-tauri-drag-region data-tod={todBand} style={{ "--tokki-accent": accentColor } as React.CSSProperties}>
      <ChatBubble
        reply={currentReply}
        isTyping={isTyping}
        chatOpen={popupOpen}
        streamingReply={streamingReply}
        streamingContent={streamingContent}
      />

      <div className="tokki-stage" data-tauri-drag-region ref={stageRef}>
        <MoodSparkles mood={visualAction.mood} />
        <button
          ref={avatarRef}
          type="button"
          className={avatarClassName}
          onClick={onAvatarClick}
          onMouseEnter={onAvatarMouseEnter}
          onMouseDown={onAvatarMouseDown}
          onContextMenu={(event) => {
            event.preventDefault();
            setCtxMenu({ x: event.clientX, y: event.clientY });
          }}
          data-testid="tokki-avatar"
          aria-label="Tokki avatar"
        >
          <TokkiAvatarAsset assetId={actionView.assetId} />
        </button>
        {!sleeping && <FXLayer />}
        <ThoughtBubbles active={sleeping} />
        {heartBurst && (
          <div className="heart-burst">
            {HEART_INDICES.map((i) => (
              <span
                key={i}
                className="heart-burst__particle"
                style={{
                  "--hx": `${(Math.random() - 0.5) * 60}px`,
                  "--hy": `${-20 - Math.random() * 40}px`,
                  animationDelay: `${i * 0.08}s`,
                } as React.CSSProperties}
              >
                &#10084;
              </span>
            ))}
          </div>
        )}
        {confettiBurst && (
          <div className="confetti-burst">
            {CONFETTI_INDICES.map((i) => (
              <span
                key={i}
                className="confetti-burst__particle"
                style={{
                  "--cx": `${(Math.random() - 0.5) * 100}px`,
                  "--cy": `${-30 - Math.random() * 60}px`,
                  "--cr": `${Math.random() * 720 - 360}deg`,
                  animationDelay: `${i * 0.04}s`,
                  background: CONFETTI_COLORS[i % 6],
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        {emojiRain.length > 0 && (
          <div className="emoji-rain" aria-hidden="true">
            {emojiRain.map((p) => (
              <span
                key={p.id}
                className="emoji-rain__drop"
                style={{ left: `${p.x}%`, animationDelay: `${Math.random() * 0.4}s` }}
              >
                {p.emoji}
              </span>
            ))}
          </div>
        )}
        {rainbowSparkles && (
          <div className="rainbow-sparkles" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className="rainbow-sparkle"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${30 + Math.random() * 40}%`,
                  background: ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff9ff3", "#ff6348", "#a29bfe", "#fd79a8"][i % 8],
                  animationDelay: `${i * 0.15}s`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        {shootingStar && (
          <div className="shooting-star" aria-hidden="true" />
        )}
      </div>

      {popupOpen && (
        <div
          className={`tokki-chat-panel tokki-popup${settingsOpen ? " tokki-chat-panel--settings" : ""}`}
          role="region"
          aria-label="Tokki companion panel"
          data-testid="chat-panel"
        >
          <div className="tokki-popup__header">
            <div className="tokki-popup__meta">
              <span className="tokki-popup__title">{popupTitle}</span>
              <span className="tokki-popup__subtitle">{popupSubtitle}</span>
            </div>
            <div className="tokki-popup__actions">
              <button
                type="button"
                className="tokki-popup__icon-btn"
                onClick={toggleSettings}
                aria-label={settingsOpen ? "Back to companion controls" : "Open settings"}
                data-testid="popup-settings"
              >
                {settingsOpen ? "\u2190" : "\u2699"}
              </button>
              <button
                type="button"
                className="tokki-popup__icon-btn"
                onClick={closePopup}
                aria-label="Close popup"
                data-testid="popup-close"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="tokki-status-row" role="status" aria-label="Companion status">
            <EnergyBar energy={state.energy} mood={state.current_action.mood} />
            <StreakBadge count={streak} />
            <WeatherBadge weather={weather} />
          </div>

          <div className={`tokki-popup__body${settingsOpen ? " tokki-popup__body--settings" : ""}`}>
            {settingsOpen ? (
              <SettingsPanel embedded onClose={() => {
                setSettingsOpen(false);
                setChatOpen(true);
              }} />
            ) : (
              <>
                <div className="tokki-popup__deck">
                  <RelationshipSnapshot
                    memory={memoryContext}
                    ready={memoryContextReady}
                    mood={state.current_action.mood}
                    sleeping={sleeping}
                  />

                  <div className="tokki-popup__section tokki-popup__section--avatar">
                    <div className="tokki-popup__section-head">
                      <span className="tokki-popup__section-title">Avatar</span>
                      <span className={`tokki-popup__section-note${sleeping ? " tokki-popup__section-note--sleepy" : ""}`}>
                        {sleeping ? "dreaming right now" : "pick a cozy form"}
                      </span>
                    </div>
                    <AvatarPicker />
                  </div>
                </div>

                {sleeping && (
                  <p className="tokki-popup__sleep-note">
                    Tokki is snoozing. Whisper something gentle, or let the dream cloud drift by.
                  </p>
                )}

                <ChatHistory
                  messages={chatMessages}
                  isTyping={isTyping}
                  streamingContent={streamingContent || undefined}
                  streamingMood={streamingReply?.mood}
                />
              </>
            )}
          </div>

          {!settingsOpen && (
            <ChatInput
              onSend={(msg) => {
                void onSendMessage(msg);
              }}
              disabled={isTyping || !!streamingReply}
              quickActions={quickActions}
            />
          )}

          {toast && (
            <div className={`tokki-toast tokki-toast--inline${toast.exiting ? " tokki-toast--exit" : ""}`} aria-live="polite">
              {toast.text}
            </div>
          )}
        </div>
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onTellJoke={onCtxJoke}
          onEnergyCheck={onCtxEnergy}
          onToggleChat={togglePopup}
          onSettings={() => {
            setChatOpen(true);
            setSettingsOpen(true);
          }}
          onSayHi={onCtxSayHi}
          onTakeBreak={onCtxTakeBreak}
          onSwitchAvatar={onCtxSwitchAvatar}
          onExportMemories={onCtxExportMemories}
          onImportMemories={onCtxImportMemories}
          onClearConversation={onCtxClearConversation}
        />
      )}

      <input
        ref={memoryImportInputRef}
        type="file"
        accept=".json,application/json"
        onChange={onMemoryImportSelected}
        style={{ display: "none" }}
        data-testid="memory-import-input"
      />

      {!popupOpen && toast && (
        <div className={`tokki-toast${toast.exiting ? " tokki-toast--exit" : ""}`} aria-live="polite">
          {toast.text}
        </div>
      )}

      <div className="tokki-debug" aria-hidden="true">
        <span data-testid="tokki-status">{connected ? "Connected" : "Disconnected"}</span>
        <span data-testid="tokki-action">{state.current_action.id}</span>
        <span data-testid="tokki-mood">{state.current_action.mood}</span>
        <span data-testid="tokki-energy">{state.energy}</span>
        <span data-testid="tokki-label">{actionView.label}</span>
      </div>
    </section>
  );
}
