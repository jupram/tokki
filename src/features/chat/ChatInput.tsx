import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { Mood } from "../../types/tokki";

export interface ChatQuickAction {
  id: string;
  label: string;
  prompt: string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  quickActions?: ChatQuickAction[];
}

const MAX_TEXTAREA_HEIGHT_PX = 92;

const THINKING_PHRASES = [
  "Hmm… 🤔",
  "Let me think…",
  "One moment… ✨",
  "Hmm…",
] as const;

function buildContextQuickActions(mood: Mood, energy: number, hasHistory: boolean): ChatQuickAction[] {
  const actions: ChatQuickAction[] = [];

  if (!hasHistory) {
    actions.push({ id: "greeting", label: "Hi there! 👋", prompt: "Hi there! Nice to meet you!" });
  }

  if (energy < 30) {
    actions.push({ id: "feeling", label: "How are you feeling?", prompt: "How are you feeling? You seem a bit low on energy." });
  }

  if (mood === "playful") {
    actions.push({ id: "joke", label: "Tell me a joke 😄", prompt: "Tell me a joke!" });
    actions.push({ id: "play", label: "Let's play! 🎮", prompt: "Let's play a game together!" });
  } else if (mood === "sleepy") {
    actions.push({ id: "dreams", label: "Sweet dreams 🌙", prompt: "Sweet dreams, rest well!" });
    actions.push({ id: "rest", label: "Rest well 💤", prompt: "You should take a rest, you seem sleepy." });
  } else if (mood === "curious") {
    actions.push({ id: "surprise", label: "Surprise me ✨", prompt: "Surprise me with something interesting!" });
    actions.push({ id: "wonder", label: "What's on your mind?", prompt: "What are you thinking about right now?" });
  } else {
    actions.push({ id: "mood-check", label: "Mood check-in 💭", prompt: "Hey, how are you feeling right now?" });
    actions.push({ id: "surprise", label: "Little surprise ✨", prompt: "Give me a tiny surprise or sweet thought." });
  }

  return actions.slice(0, 4);
}

export function ChatInput({ onSend, disabled, quickActions = [] }: ChatInputProps): JSX.Element {
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const privacyHintId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendLockRef = useRef(false);
  const thinkingIndexRef = useRef(0);
  const [thinkingText, setThinkingText] = useState<string>(THINKING_PHRASES[0]);

  const mood = useTokkiStore((s) => s.state.current_action.mood);
  const energy = useTokkiStore((s) => s.state.energy);
  const messageCount = useTokkiStore((s) => s.chatMessages.length);
  const privacyMode = useTokkiStore((s) => s.privacyMode);

  const resolvedActions = useMemo<ChatQuickAction[]>(() => {
    if (quickActions.length > 0) {
      return quickActions;
    }
    return buildContextQuickActions(mood, energy, messageCount > 0);
  }, [quickActions, mood, energy, messageCount]);

  useEffect(() => {
    if (!disabled) {
      return;
    }
    const interval = setInterval(() => {
      thinkingIndexRef.current = (thinkingIndexRef.current + 1) % THINKING_PHRASES.length;
      setThinkingText(THINKING_PHRASES[thinkingIndexRef.current]);
    }, 2400);
    return () => clearInterval(interval);
  }, [disabled]);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.style.height = "0px";
    const nextHeight = Math.min(input.scrollHeight, MAX_TEXTAREA_HEIGHT_PX);
    input.style.height = `${Math.max(nextHeight, 32)}px`;
    input.style.overflowY = input.scrollHeight > MAX_TEXTAREA_HEIGHT_PX ? "auto" : "hidden";
  }, [value]);

  useEffect(() => {
    if (!disabled) {
      sendLockRef.current = false;
    }
  }, [disabled]);

  const releaseSendLock = (): void => {
    window.setTimeout(() => {
      if (!inputRef.current?.disabled) {
        sendLockRef.current = false;
      }
    }, 0);
  };

  const sendValue = (rawValue: string): void => {
    const trimmed = rawValue.trim();
    if (!trimmed || disabled || sendLockRef.current) {
      return;
    }

    sendLockRef.current = true;

    try {
      onSend(trimmed);
      setValue("");
    } finally {
      inputRef.current?.focus();
      releaseSendLock();
    }
  };

  const submit = (): void => {
    sendValue(value);
  };

  const onQuickActionClick = (prompt: string): void => {
    sendValue(prompt);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      if (isComposing || event.nativeEvent.isComposing) {
        return;
      }
      event.preventDefault();
      submit();
    }
  };

  const onFormSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  const placeholderText = disabled
    ? thinkingText
    : privacyMode
      ? "Type privately…"
      : "Say something...";
  const describedBy = privacyMode ? `${hintId} ${privacyHintId}` : hintId;

  return (
    <form className="chat-input" onSubmit={onFormSubmit}>
      {resolvedActions.length > 0 && (
        <div className="chat-input__quick-actions" role="group" aria-label="Quick prompts">
          {resolvedActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="chat-input__quick-action"
              onClick={() => onQuickActionClick(action.prompt)}
              disabled={disabled}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {privacyMode && (
        <span id={privacyHintId} className="chat-input__privacy-note">
          Privacy mode keeps your draft masked on screen.
        </span>
      )}
      <div className="chat-input__row">
        <span id={hintId} className="chat-input__sr-only">
          Press Enter to send. Press Shift plus Enter for a new line.
        </span>
        <textarea
          id={inputId}
          ref={inputRef}
          className={`chat-input__field${disabled ? " chat-input__field--thinking" : ""}${privacyMode ? " chat-input__field--privacy" : ""}`}
          placeholder={placeholderText}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          disabled={disabled}
          aria-label="Chat with Tokki"
          aria-describedby={describedBy}
          autoComplete="off"
          spellCheck={false}
          rows={1}
          data-testid="chat-input-field"
        />
        <button
          type="submit"
          className="chat-input__send"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          data-testid="chat-input-send"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M3 10l7-7m0 0l7 7m-7-7v14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="rotate(90, 10, 10)"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
