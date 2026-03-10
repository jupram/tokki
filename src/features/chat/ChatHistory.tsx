import { useLayoutEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "../../types/tokki";
import { useTokkiStore } from "../../state/useTokkiStore";

interface ChatHistoryMessage extends Omit<ChatMessage, "role"> {
  role: string;
}

interface ChatHistoryProps {
  messages: ReadonlyArray<ChatHistoryMessage>;
  isTyping: boolean;
  /** Currently-streaming reply content to show as a live message at the bottom. */
  streamingContent?: string;
  /** Mood of the streaming reply, used for accessibility label. */
  streamingMood?: string;
}

interface VisibleChatMessage extends ChatHistoryMessage {
  variant: "user" | "assistant" | "system" | "error";
  key: string;
}

function useCompanionName(): string {
  const personality = useTokkiStore((s) => s.personality);
  if (personality?.name) {
    return personality.name;
  }
  try {
    const raw = localStorage.getItem("tokki_onboarding_profile");
    if (raw) {
      const profile = JSON.parse(raw) as { petName?: string };
      if (profile.petName) {
        return profile.petName;
      }
    }
  } catch {
    // ignore parse errors
  }
  return "Tokki";
}

function getSenderLabel(variant: string, companionName: string): { label: string; emoji: string } {
  switch (variant) {
    case "assistant":
      return { label: companionName, emoji: "🐾 " };
    case "user":
      return { label: "You", emoji: "" };
    default:
      return { label: variant, emoji: "" };
  }
}

function maskVisibleText(content: string): string {
  return content.replace(/[^\s]/g, "•");
}

export function ChatHistory({ messages, isTyping, streamingContent, streamingMood: _streamingMood }: ChatHistoryProps): JSX.Element | null {
  const historyRef = useRef<HTMLDivElement>(null);
  const hasRenderedHistoryRef = useRef(false);
  const companionName = useCompanionName();
  const privacyMode = useTokkiStore((s) => s.privacyMode);

  const visibleMessages = useMemo<VisibleChatMessage[]>(() => {
    const seenKeys = new Map<string, number>();

    return messages
      .filter((message) => message.content.trim().length > 0)
      .map((message) => {
        const variant = getMessageVariant(message.role);
        const keyBase = `${variant}:${message.timestamp}:${message.content}`;
        const duplicateCount = seenKeys.get(keyBase) ?? 0;
        seenKeys.set(keyBase, duplicateCount + 1);

        return {
          ...message,
          variant,
          key: duplicateCount === 0 ? keyBase : `${keyBase}:${duplicateCount}`
        };
      });
  }, [messages]);

  useLayoutEffect(() => {
    const history = historyRef.current;
    if (!history) {
      return;
    }

    const behavior = hasRenderedHistoryRef.current ? "smooth" : "auto";
    hasRenderedHistoryRef.current = true;

    if (typeof history.scrollTo === "function") {
      history.scrollTo({ top: history.scrollHeight, behavior });
      return;
    }

    history.scrollTop = history.scrollHeight;
  }, [isTyping, visibleMessages, streamingContent]);

  if (visibleMessages.length === 0 && !isTyping && !streamingContent) {
    return null;
  }

  return (
    <div
      ref={historyRef}
      className={`chat-history${privacyMode ? " chat-history--privacy" : ""}`}
      role="log"
      aria-label="Chat history"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      aria-busy={isTyping}
    >
      {privacyMode && (
        <div className="chat-history__privacy-note" role="status" aria-live="polite">
          Privacy mode is on — chat text is tucked away on screen.
        </div>
      )}
      {visibleMessages.map((message) => {
        const sender = getSenderLabel(message.variant, companionName);
        const visibleText = privacyMode ? maskVisibleText(message.content) : message.content;
        return (
          <div key={message.key} className={`chat-history__msg chat-history__msg--${message.variant}`}>
            <span className={`chat-history__sender chat-history__sender--${message.variant}`}>
              {sender.emoji}{sender.label}
            </span>
            <span className="chat-history__text">{visibleText}</span>
            <time className="chat-history__time" dateTime={formatTimestamp(message.timestamp)}>
              {formatTime(message.timestamp)}
            </time>
          </div>
        );
      })}
      {/* Live streaming message — grows character-by-character before being committed to history */}
      {streamingContent && (
        <div
          className="chat-history__msg chat-history__msg--assistant chat-history__msg--streaming"
          aria-live="polite"
          aria-atomic="false"
        >
          <span className="chat-history__sender chat-history__sender--assistant">
            🐾 {companionName}
          </span>
          <span className="chat-history__text">
            {privacyMode ? "Privacy mode is hiding Tokki's reply while it arrives." : streamingContent}
            {!privacyMode && <span className="chat-history__streaming-cursor" aria-hidden="true" />}
          </span>
        </div>
      )}
      {isTyping && (
        <div className="chat-history__typing" role="status" aria-label="Tokki is typing">
          <span className="chat-history__typing-dot" aria-hidden="true" />
          <span className="chat-history__typing-dot" aria-hidden="true" />
          <span className="chat-history__typing-dot" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function getMessageVariant(role: string): "user" | "assistant" | "system" | "error" {
  switch (role) {
    case "user":
    case "assistant":
    case "system":
    case "error":
      return role;
    default:
      return "system";
  }
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
