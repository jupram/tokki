import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoodSparkles } from "./MoodSparkles";

function createContextMock(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    restore: vi.fn(),
    globalAlpha: 1,
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

describe("MoodSparkles", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not crash when the browser cannot provide a 2d canvas context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("canvas unsupported");
    });

    expect(() => render(<MoodSparkles mood="idle" />)).not.toThrow();
  });

  it("cancels its scheduled animation frame on unmount", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(createContextMock());
    const requestSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 99);
    const cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);

    const { unmount } = render(<MoodSparkles mood="playful" />);

    expect(requestSpy).toHaveBeenCalledTimes(1);
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(99);
  });
});
