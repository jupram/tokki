import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_MODE_STORAGE_KEY, useTokkiStore } from "../../state/useTokkiStore";
import { ChatInput, type ChatQuickAction } from "./ChatInput";

const QUICK_ACTIONS: ChatQuickAction[] = [
  {
    id: "mood-check-in",
    label: "Mood check-in 💭",
    prompt: "Hey Tokki, how are you feeling right now?",
  },
  {
    id: "focus-support",
    label: "Focus buddy mode 🎯",
    prompt: "Can you keep me company while I focus for 15 minutes?",
  },
];

describe("ChatInput", () => {
  beforeEach(() => {
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
  });

  afterEach(() => {
    localStorage.removeItem(PRIVACY_MODE_STORAGE_KEY);
    useTokkiStore.setState({ privacyMode: false });
  });

  it("keeps enter-to-send keyboard behavior", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByLabelText(/chat with tokki/i);
    fireEvent.change(input, { target: { value: "  hello tokki  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("hello tokki");
    expect(input).toHaveValue("");
  });

  it("does not send on shift+enter", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByLabelText(/chat with tokki/i);
    fireEvent.change(input, { target: { value: "keep typing" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("keep typing");
  });

  it("allows multiline drafts and trims outer whitespace on submit", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByLabelText(/chat with tokki/i);
    fireEvent.change(input, { target: { value: "  hello tokki\nhow are you?\n  " } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(onSend).toHaveBeenCalledWith("hello tokki\nhow are you?");
    expect(input).toHaveValue("");
  });

  it("waits for IME composition to finish before sending", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} />);

    const input = screen.getByLabelText(/chat with tokki/i);
    fireEvent.change(input, { target: { value: "こんにちは" } });
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSend).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSend).toHaveBeenCalledWith("こんにちは");
  });

  it("sends a quick action prompt through the same chat flow", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={false} quickActions={QUICK_ACTIONS} />);

    fireEvent.click(screen.getByRole("button", { name: /mood check-in/i }));

    expect(onSend).toHaveBeenCalledWith("Hey Tokki, how are you feeling right now?");
    expect(screen.getByLabelText(/chat with tokki/i)).toHaveValue("");
  });

  it("disables quick actions while typing is locked", () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled={true} quickActions={QUICK_ACTIONS} />);

    const quickAction = screen.getByRole("button", { name: /mood check-in/i });
    expect(quickAction).toBeDisabled();
    fireEvent.click(quickAction);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows privacy masking affordances when privacy mode is enabled", () => {
    useTokkiStore.setState({ privacyMode: true });

    render(<ChatInput onSend={vi.fn()} disabled={false} />);

    expect(screen.getByText(/draft masked on screen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chat with tokki/i)).toHaveClass("chat-input__field--privacy");
    expect(screen.getByPlaceholderText(/type privately/i)).toBeInTheDocument();
  });
});
