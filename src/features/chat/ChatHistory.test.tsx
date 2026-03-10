import { render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_MODE_STORAGE_KEY, useTokkiStore } from "../../state/useTokkiStore";
import { ChatHistory } from "./ChatHistory";

const scrollToMock = vi.fn();

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: scrollToMock,
    writable: true
  });
});

describe("ChatHistory", () => {
  beforeEach(() => {
    scrollToMock.mockReset();
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
  });

  it("returns nothing when there is no visible history and Tokki is idle", () => {
    const { container } = render(<ChatHistory messages={[]} isTyping={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("uses instant scroll on first paint and smooth scroll for appended replies", () => {
    const initialMessages = [
      { role: "user", content: "Hi", timestamp: 1 },
      { role: "assistant", content: "Hello!", timestamp: 2 }
    ];
    const { rerender } = render(<ChatHistory messages={initialMessages} isTyping={false} />);

    expect(scrollToMock).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "auto" }));

    rerender(
      <ChatHistory
        messages={[...initialMessages, { role: "assistant", content: "How are you?", timestamp: 3 }]}
        isTyping={false}
      />
    );

    expect(scrollToMock).toHaveBeenLastCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("scrolls when restored history changes without changing the message count", () => {
    const initialMessages = [
      { role: "user", content: "Hi", timestamp: 1 },
      { role: "assistant", content: "Hello!", timestamp: 2 }
    ];
    const { rerender } = render(<ChatHistory messages={initialMessages} isTyping={false} />);

    scrollToMock.mockClear();

    rerender(
      <ChatHistory
        messages={[
          { role: "user", content: "New hello", timestamp: 11 },
          { role: "assistant", content: "Restored tail", timestamp: 12 }
        ]}
        isTyping={false}
      />
    );

    expect(scrollToMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("renders repeated, system, and error messages inside an accessible live log", () => {
    const messages: Parameters<typeof ChatHistory>[0]["messages"] = [
      { role: "assistant", content: "Repeated", timestamp: 1 },
      { role: "assistant", content: "Repeated", timestamp: 1 },
      { role: "system", content: "Tokki reconnected", timestamp: 2 },
      { role: "error", content: "Tokki could not send that just now", timestamp: 3 }
    ];
    const { container } = render(<ChatHistory messages={messages} isTyping={true} />);

    const log = screen.getByRole("log", { name: /chat history/i });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText("Repeated")).toHaveLength(2);
    expect(container.querySelector(".chat-history__msg--system")).toHaveTextContent("Tokki reconnected");
    expect(container.querySelector(".chat-history__msg--error")).toHaveTextContent("Tokki could not send that just now");
    expect(screen.getByRole("status", { name: /tokki is typing/i })).toBeInTheDocument();
  });

  it("renders a streaming message row when streamingContent is provided", () => {
    const { container } = render(
      <ChatHistory
        messages={[{ role: "user", content: "Hello", timestamp: 1 }]}
        isTyping={false}
        streamingContent="Hello back"
      />
    );

    expect(container.querySelector(".chat-history__msg--streaming")).toBeInTheDocument();
    expect(container.querySelector(".chat-history__msg--streaming")).toHaveTextContent("Hello back");
  });

  it("shows streaming cursor inside the streaming message", () => {
    const { container } = render(
      <ChatHistory
        messages={[]}
        isTyping={false}
        streamingContent="Typing..."
      />
    );

    expect(container.querySelector(".chat-history__streaming-cursor")).toBeInTheDocument();
  });

  it("does not render when messages are empty and streamingContent is empty", () => {
    const { container } = render(
      <ChatHistory messages={[]} isTyping={false} streamingContent="" />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("scrolls when streamingContent updates", () => {
    const { rerender } = render(
      <ChatHistory
        messages={[{ role: "user", content: "Hi", timestamp: 1 }]}
        isTyping={false}
        streamingContent="Hello"
      />
    );

    scrollToMock.mockClear();

    rerender(
      <ChatHistory
        messages={[{ role: "user", content: "Hi", timestamp: 1 }]}
        isTyping={false}
        streamingContent="Hello world"
      />
    );

    expect(scrollToMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("masks visible message content when privacy mode is enabled", () => {
    useTokkiStore.setState({ privacyMode: true });

    render(
      <ChatHistory
        messages={[
          { role: "user", content: "private plans", timestamp: 1 },
          { role: "assistant", content: "I remember that", timestamp: 2 },
        ]}
        isTyping={false}
      />
    );

    expect(screen.getByText(/privacy mode is on/i)).toBeInTheDocument();
    expect(screen.queryByText("private plans")).not.toBeInTheDocument();
    expect(screen.queryByText("I remember that")).not.toBeInTheDocument();
    expect(screen.getAllByText(/[•]{3,}/)).not.toHaveLength(0);
  });
});
