import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThoughtBubbles } from "./ThoughtBubbles";

describe("ThoughtBubbles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits before showing a thought and clears it after the animation duration", () => {
    const { container, rerender } = render(<ThoughtBubbles active={false} />);

    expect(container.firstChild).toBeNull();

    rerender(<ThoughtBubbles active={true} />);

    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("♡")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(container.firstChild).toBeNull();
  });

  it("cleans up scheduled timers when deactivated", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { rerender } = render(<ThoughtBubbles active={true} />);

    rerender(<ThoughtBubbles active={false} />);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
