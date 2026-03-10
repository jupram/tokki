import { useCallback, useEffect, useRef, useState } from "react";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { LlmResponse, Mood } from "../../types/tokki";

interface ChatBubbleProps {
  reply: LlmResponse | null;
  isTyping: boolean;
  chatOpen?: boolean;
  mood?: Mood;
  /** Full reply object currently being streamed (null when idle). */
  streamingReply?: LlmResponse | null;
  /** Portion of streamingReply.line revealed so far. Empty string while waiting for first chunk. */
  streamingContent?: string;
}

const MAX_REVEAL_STEPS = 140;
const VIEWING_TIME_MS = 12000;
const EXIT_ANIMATION_MS = 300;

function getRevealDelay(mood: Mood | undefined): number {
  switch (mood) {
    case "playful":
      return 18;
    case "curious":
      return 32;
    case "sleepy":
      return 45;
    case "surprised":
      return 15;
    default:
      return 28;
  }
}

export function ChatBubble({ reply, isTyping, chatOpen, mood, streamingReply, streamingContent }: ChatBubbleProps): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [fadeClass, setFadeClass] = useState("");
  const [revealedText, setRevealedText] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReplyRef = useRef<LlmResponse | null>(null);
  const dismissStartRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(VIEWING_TIME_MS);
  const privacyMode = useTokkiStore((s) => s.privacyMode);
  // Tracks whether we were in external-streaming mode just before reply was finalised
  const wasStreamingRef = useRef(false);

  const isChatOpenRef = useRef(chatOpen);
  isChatOpenRef.current = chatOpen;
  const isHoveredRef = useRef(isHovered);
  isHoveredRef.current = isHovered;

  const clearProgressTimer = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearProgressTimer();
  }, [clearProgressTimer]);

  const clearReveal = useCallback(() => {
    if (revealRef.current) {
      clearTimeout(revealRef.current);
      revealRef.current = null;
    }
  }, []);

  const startDismissTimer = useCallback((duration: number = VIEWING_TIME_MS) => {
    clearDismissTimer();
    dismissStartRef.current = Date.now();
    remainingTimeRef.current = duration;
    setProgress(0);

    // Progress indicator updates every 50ms
    const progressInterval = 50;
    progressRef.current = setInterval(() => {
      if (isHoveredRef.current || isChatOpenRef.current) {
        // Pause: update remaining time and skip
        if (dismissStartRef.current) {
          const elapsed = Date.now() - dismissStartRef.current;
          remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
          dismissStartRef.current = Date.now();
        }
        return;
      }
      if (dismissStartRef.current) {
        const elapsed = Date.now() - dismissStartRef.current;
        const total = remainingTimeRef.current + elapsed;
        const pct = Math.min(100, (elapsed / total) * 100 + (1 - remainingTimeRef.current / duration) * 100);
        setProgress(Math.min(100, (elapsed / remainingTimeRef.current) * 100));
      }
    }, progressInterval);

    timerRef.current = setTimeout(function tick() {
      if (isHoveredRef.current || isChatOpenRef.current) {
        // Paused: check again in 100ms
        timerRef.current = setTimeout(tick, 100);
        return;
      }
      if (remainingTimeRef.current <= 0) {
        // Time's up, dismiss
        clearProgressTimer();
        setFadeClass("chat-bubble--exit");
        timerRef.current = setTimeout(() => {
          setVisible(false);
          setFadeClass("");
          setProgress(0);
        }, EXIT_ANIMATION_MS);
      } else {
        // Decrement and check again
        const now = Date.now();
        if (dismissStartRef.current) {
          const elapsed = now - dismissStartRef.current;
          remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
          dismissStartRef.current = now;
        }
        timerRef.current = setTimeout(tick, 100);
      }
    }, duration);
  }, [clearDismissTimer, clearProgressTimer]);

  const dismissImmediately = useCallback(() => {
    clearReveal();
    clearDismissTimer();
    setFadeClass("chat-bubble--exit");
    setTimeout(() => {
      setVisible(false);
      setFadeClass("");
      setProgress(0);
    }, EXIT_ANIMATION_MS);
  }, [clearDismissTimer, clearReveal]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    // Store remaining time when hover starts
    if (dismissStartRef.current) {
      const elapsed = Date.now() - dismissStartRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    // Reset dismiss start time to now when hover ends
    dismissStartRef.current = Date.now();
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Prevent event bubbling to parent (avatar click handler)
    e.stopPropagation();
    dismissImmediately();
  }, [dismissImmediately]);

  const visibleLine = reply?.line.trim() ?? "";

  useEffect(() => {
    // --- External streaming takes priority ---
    if (streamingReply) {
      wasStreamingRef.current = true;
      setVisible(true);
      setFadeClass("chat-bubble--enter");
      clearReveal();
      clearDismissTimer();
      setProgress(0);

      const revealText = streamingContent ?? "";
      setRevealedText(revealText);

      const fullText = streamingReply.line.trim();
      const isFull = revealText.length > 0 && revealText === fullText;
      // Show cursor while text is still arriving or waiting for first chunk
      setRevealing(!isFull);

      if (isFull) {
        // Pre-populate lastReplyRef so the dismiss-timer branch below fires
        // when currentReply is set and streamingReply is cleared in the same batch.
        lastReplyRef.current = reply;
      }
      return;
    }

    // --- Typing (waiting for LLM response) ---
    if (isTyping) {
      wasStreamingRef.current = false;
      setVisible(true);
      setFadeClass("chat-bubble--enter");
      clearReveal();
      clearDismissTimer();
      setRevealing(false);
      setRevealedText("");
      setProgress(0);
      return;
    }

    if (!reply || !visibleLine) {
      if (wasStreamingRef.current && revealedText) {
        // Streaming just ended with no matching currentReply yet — keep bubble
        // visible and let the dismiss-timer start when reply is set below.
        wasStreamingRef.current = false;
        setRevealing(false);
        if (!isChatOpenRef.current) {
          startDismissTimer(VIEWING_TIME_MS);
        }
        return;
      }
      wasStreamingRef.current = false;
      clearReveal();
      clearDismissTimer();
      setRevealing(false);
      setRevealedText("");
      setFadeClass("");
      setVisible(false);
      setProgress(0);
      return;
    }

    if (reply !== lastReplyRef.current) {
      // If this reply was just fully streamed, skip the reveal animation and
      // go straight to the dismiss timer.
      if (wasStreamingRef.current && revealedText === visibleLine && visibleLine.length > 0) {
        lastReplyRef.current = reply;
        wasStreamingRef.current = false;
        setRevealing(false);
        if (!isChatOpenRef.current) {
          startDismissTimer(VIEWING_TIME_MS);
        }
        return;
      }

      // Normal (non-streamed) reply — run internal character-by-character reveal.
      wasStreamingRef.current = false;
      lastReplyRef.current = reply;
      setVisible(true);
      setFadeClass("chat-bubble--enter");
      clearReveal();
      clearDismissTimer();
      setRevealedText("");
      setRevealing(true);
      setProgress(0);

      const activeMood = mood ?? reply.mood;
      const baseDelay = getRevealDelay(activeMood);
      const text = visibleLine;
      const stepCount = Math.min(text.length, MAX_REVEAL_STEPS);
      const chunkSize = Math.max(1, Math.ceil(text.length / Math.max(stepCount, 1)));
      const stepDelay = stepCount < text.length ? Math.min(18, baseDelay) : baseDelay;
      let idx = 0;
      const step = (): void => {
        idx = Math.min(text.length, idx + chunkSize);
        setRevealedText(text.slice(0, idx));
        if (idx < text.length) {
          revealRef.current = setTimeout(step, stepDelay);
        } else {
          revealRef.current = null;
          setRevealing(false);

          if (!isChatOpenRef.current) {
            startDismissTimer(VIEWING_TIME_MS);
          }
        }
      };
      revealRef.current = setTimeout(step, stepDelay);
    } else if (wasStreamingRef.current) {
      // reply === lastReplyRef.current AND we were just streaming — start dismiss.
      wasStreamingRef.current = false;
      setRevealing(false);
      if (!isChatOpenRef.current) {
        startDismissTimer(VIEWING_TIME_MS);
      }
    }

    return () => {
      clearReveal();
      clearDismissTimer();
    };
  }, [clearDismissTimer, clearReveal, isTyping, mood, reply, streamingReply, streamingContent, startDismissTimer, visibleLine, revealedText]);

  // Handle chat panel opening and closing dynamically
  useEffect(() => {
    if (typeof chatOpen !== "boolean") {
      return;
    }

    if (chatOpen && visible) {
      clearDismissTimer();
      setProgress(0);
      return;
    }

    if (!chatOpen && visible && !isTyping && !revealing) {
      // Chat panel just closed, start a shorter dismiss timer
      startDismissTimer(2000);
    }
  }, [chatOpen, clearDismissTimer, isTyping, revealing, startDismissTimer, visible]);

  useEffect(() => {
    return () => {
      clearReveal();
      clearDismissTimer();
    };
  }, [clearDismissTimer, clearReveal]);

  if (!visible) {
    return null;
  }

  // While streaming, use streamingReply's mood for styling
  const activeMood = mood ?? streamingReply?.mood ?? reply?.mood;
  const displayMood = streamingReply?.mood ?? reply?.mood;
  const moodEmoji = displayMood ? getMoodEmoji(displayMood) : "";
  const moodClass = activeMood ? `chat-bubble--${activeMood}` : "";
  // Show typing dots when: explicitly typing OR streaming started but no content yet
  const showDots = isTyping || (!!streamingReply && !streamingContent);
  const showProgress = !showDots && !revealing && !chatOpen && progress > 0 && progress < 100;
  const privacyText = "Privacy mode kept Tokki's reply tucked away.";
  const visibleText = privacyMode ? privacyText : revealedText;
  const ariaLabel = showDots
    ? "Tokki is typing"
    : privacyMode
      ? "Tokki sent a hidden reply while privacy mode is on"
      : revealedText || visibleLine;

  return (
    <div
      className={`chat-bubble ${fadeClass} ${moodClass}`.trim()}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
      data-testid="chat-bubble"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Close button - appears on hover */}
      {!showDots && (
        <button
          className="chat-bubble__close"
          onClick={handleClick}
          aria-label="Dismiss message"
          tabIndex={-1}
        >
          ×
        </button>
      )}
      {showDots ? (
        <div className="chat-bubble__typing" aria-hidden="true">
          <span className="chat-bubble__dot" />
          <span className="chat-bubble__dot" />
          <span className="chat-bubble__dot" />
        </div>
      ) : (reply || streamingReply) ? (
        <p
          className={`chat-bubble__text${privacyMode ? " chat-bubble__text--privacy" : ""}`}
          aria-hidden="true"
        >
          {moodEmoji && <span className="chat-bubble__mood">{moodEmoji}</span>}
          {visibleText}
          {!privacyMode && revealing && <span className="chat-bubble__cursor" />}
        </p>
      ) : null}
      <div className="chat-bubble__tail" aria-hidden="true" />
      {/* Progress indicator */}
      {showProgress && (
        <div className="chat-bubble__progress" aria-hidden="true">
          <div
            className="chat-bubble__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function getMoodEmoji(mood: string): string {
  switch (mood) {
    case "playful":
      return "\u2728";
    case "curious":
      return "\uD83D\uDD0D";
    case "sleepy":
      return "\uD83D\uDCA4";
    case "surprised":
      return "\u2757";
    default:
      return "";
  }
}
