import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_MODE_STORAGE_KEY, useTokkiStore } from "../../state/useTokkiStore";
import { ChatBubble } from "./ChatBubble";

describe("ChatBubble", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
  });

  it("announces typing accessibly without exposing the animated dots", () => {
    render(<ChatBubble reply={null} isTyping={true} />);

    expect(screen.getByRole("status", { name: /tokki is typing/i })).toBeInTheDocument();
  });

  it("hides blank replies after typing finishes", () => {
    const { rerender } = render(<ChatBubble reply={null} isTyping={true} />);

    rerender(
      <ChatBubble
        reply={{ line: "   ", mood: "idle", animation: "idle.blink", intent: "none" }}
        isTyping={false}
      />
    );

    expect(screen.queryByTestId("chat-bubble")).not.toBeInTheDocument();
  });

  it("restarts the bubble timer for repeated identical replies", () => {
    const reply = { line: "Same line", mood: "idle" as const, animation: "idle.blink", intent: "none" };
    const { rerender } = render(<ChatBubble reply={reply} isTyping={false} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    rerender(
      <ChatBubble
        reply={{ line: "Same line", mood: "playful", animation: "idle.blink", intent: "none" }}
        isTyping={false}
      />
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByTestId("chat-bubble")).toBeInTheDocument();
  });

  it("shows typing dots while streaming reply has no content yet", () => {
    const streamingReply = { line: "Hello there!", mood: "playful" as const, animation: "idle.blink", intent: "none" };

    render(
      <ChatBubble
        reply={null}
        isTyping={false}
        streamingReply={streamingReply}
        streamingContent=""
      />
    );

    // Bubble should be visible (streaming is active)
    expect(screen.getByTestId("chat-bubble")).toBeInTheDocument();
    // No text visible yet — typing dots shown
    expect(screen.getByRole("status", { name: /tokki is typing/i })).toBeInTheDocument();
  });

  it("shows streaming content with cursor as text arrives", () => {
    const streamingReply = { line: "Hello there!", mood: "playful" as const, animation: "idle.blink", intent: "none" };

    render(
      <ChatBubble
        reply={null}
        isTyping={false}
        streamingReply={streamingReply}
        streamingContent="Hello"
      />
    );

    const bubble = screen.getByTestId("chat-bubble");
    expect(bubble).toBeInTheDocument();
    expect(bubble).toHaveTextContent("Hello");
  });

  it("uses streaming reply mood for bubble styling", () => {
    const streamingReply = { line: "Curious thought", mood: "curious" as const, animation: "idle.blink", intent: "none" };

    const { container } = render(
      <ChatBubble
        reply={null}
        isTyping={false}
        streamingReply={streamingReply}
        streamingContent="Curious"
      />
    );

    expect(container.querySelector(".chat-bubble--curious")).toBeInTheDocument();
  });

  it("transitions from streaming to finalized reply without re-revealing", () => {
    const fullText = "Hello there!";
    const streamingReply = { line: fullText, mood: "playful" as const, animation: "idle.blink", intent: "none" };
    const finalReply = { line: fullText, mood: "playful" as const, animation: "idle.blink", intent: "none" };

    const { rerender } = render(
      <ChatBubble
        reply={null}
        isTyping={false}
        streamingReply={streamingReply}
        streamingContent={fullText}
      />
    );

    // Bubble shows full text at end of streaming
    expect(screen.getByTestId("chat-bubble")).toHaveTextContent(fullText);

    // Streaming ends: currentReply is set, streamingReply cleared
    rerender(
      <ChatBubble
        reply={finalReply}
        isTyping={false}
        streamingReply={null}
        streamingContent=""
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Bubble should still be visible with full text (no blank flash)
    expect(screen.getByTestId("chat-bubble")).toBeInTheDocument();
  });

  it("keeps reply text private when privacy mode is enabled", () => {
    useTokkiStore.setState({ privacyMode: true });

    render(
      <ChatBubble
        reply={{ line: "Secret thoughts", mood: "curious", animation: "idle.blink", intent: "none" }}
        isTyping={false}
      />
    );

    expect(screen.getByTestId("chat-bubble")).toHaveTextContent(/reply tucked away/i);
    expect(screen.queryByText("Secret thoughts")).not.toBeInTheDocument();
  });
});
