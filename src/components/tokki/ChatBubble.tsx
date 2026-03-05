import { useEffect, useRef, useState } from "react";
import type { LlmResponse } from "../../types/tokki";

interface ChatBubbleProps {
  reply: LlmResponse | null;
  isTyping: boolean;
}

export function ChatBubble({ reply, isTyping }: ChatBubbleProps): JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [fadeClass, setFadeClass] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isTyping) {
      setVisible(true);
      setFadeClass("chat-bubble--enter");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (reply) {
      setVisible(true);
      setFadeClass("chat-bubble--enter");

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setFadeClass("chat-bubble--exit");
        timerRef.current = setTimeout(() => {
          setVisible(false);
          setFadeClass("");
        }, 400);
      }, 6000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [reply, isTyping]);

  if (!visible) {
    return null;
  }

  const moodEmoji = reply
    ? getMoodEmoji(reply.mood)
    : "";

  return (
    <div className={`chat-bubble ${fadeClass}`} aria-live="polite">
      {isTyping ? (
        <div className="chat-bubble__typing">
          <span className="chat-bubble__dot" />
          <span className="chat-bubble__dot" />
          <span className="chat-bubble__dot" />
        </div>
      ) : reply ? (
        <p className="chat-bubble__text">
          {moodEmoji && <span className="chat-bubble__mood">{moodEmoji}</span>}
          {reply.line}
        </p>
      ) : null}
      <div className="chat-bubble__tail" />
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
