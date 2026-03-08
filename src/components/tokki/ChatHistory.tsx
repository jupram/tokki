import { memo, useDeferredValue, useEffect, useMemo, useRef } from "react";
import type { ChatMessage } from "../../types/tokki";

interface ChatHistoryProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

const MAX_VISIBLE_MESSAGES = 8;

export const ChatHistory = memo(function ChatHistory({
  messages,
  isTyping
}: ChatHistoryProps): JSX.Element {
  const deferredMessages = useDeferredValue(messages);
  const endRef = useRef<HTMLDivElement>(null);
  const visibleMessages = useMemo(
    () => deferredMessages.slice(-MAX_VISIBLE_MESSAGES),
    [deferredMessages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [isTyping, visibleMessages]);

  return (
    <div className="chat-history" role="log" aria-live="polite" aria-label="Recent chat">
      {visibleMessages.length === 0 ? (
        <p className="chat-history__empty">Ask Tokki anything. It keeps the latest replies here.</p>
      ) : (
        visibleMessages.map((message) => (
          <article
            key={`${message.role}-${message.timestamp}`}
            className={`chat-history__item chat-history__item--${message.role}`}
          >
            <span className="chat-history__role">
              {message.role === "assistant" ? "Tokki" : "You"}
            </span>
            <p className="chat-history__text">{message.content}</p>
          </article>
        ))
      )}
      {isTyping && (
        <article className="chat-history__item chat-history__item--assistant chat-history__item--typing">
          <span className="chat-history__role">Tokki</span>
          <p className="chat-history__text">Thinking...</p>
        </article>
      )}
      <div ref={endRef} />
    </div>
  );
});