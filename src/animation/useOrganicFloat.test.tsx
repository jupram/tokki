import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { useOrganicFloat } from "./useOrganicFloat";

type MatchMediaChangeListener = (event: MediaQueryListEvent | MediaQueryList) => void;

function OrganicFloatHarness(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useOrganicFloat(ref);
  return <div ref={ref} data-testid="organic-float-target" />;
}

describe("useOrganicFloat", () => {
  let visibilityState = "visible";
  let reducedMotion = false;
  let rafCallback: FrameRequestCallback | null = null;
  let changeListener: MatchMediaChangeListener | null = null;
  let legacyChangeListener: MatchMediaChangeListener | null = null;
  let nextRafId = 1;

  beforeEach(() => {
    visibilityState = "visible";
    reducedMotion = false;
    rafCallback = null;
    changeListener = null;
    legacyChangeListener = null;
    nextRafId = 1;

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState
    });

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
      rafCallback = callback;
      return nextRafId++;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: reducedMotion,
        addEventListener: vi.fn((_event: string, listener: MatchMediaChangeListener) => {
          changeListener = listener;
        }),
        removeEventListener: vi.fn(),
        addListener: vi.fn((listener: MatchMediaChangeListener) => {
          legacyChangeListener = listener;
        }),
        removeListener: vi.fn()
      }))
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies floating CSS variables while visible and resets them when hidden", () => {
    render(<OrganicFloatHarness />);

    const target = screen.getByTestId("organic-float-target");
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      rafCallback?.(1000);
    });

    expect(target.style.getPropertyValue("--organic-y")).not.toBe("0px");
    expect(target.style.getPropertyValue("--organic-scale")).not.toBe("1");

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(target.style.getPropertyValue("--organic-y")).toBe("0px");
    expect(target.style.getPropertyValue("--organic-scale")).toBe("1");
  });

  it("respects reduced motion and supports legacy media query listeners", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: reducedMotion,
        addListener: vi.fn((listener: MatchMediaChangeListener) => {
          legacyChangeListener = listener;
        }),
        removeListener: vi.fn()
      }))
    });

    render(<OrganicFloatHarness />);

    const target = screen.getByTestId("organic-float-target");
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      rafCallback?.(500);
    });

    expect(target.style.getPropertyValue("--organic-y")).not.toBe("0px");

    act(() => {
      reducedMotion = true;
      legacyChangeListener?.({ matches: true } as MediaQueryList);
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(target.style.getPropertyValue("--organic-y")).toBe("0px");
    expect(target.style.getPropertyValue("--organic-scale")).toBe("1");
  });

  it("starts in a resting state when reduced motion is already enabled", () => {
    reducedMotion = true;

    render(<OrganicFloatHarness />);

    const target = screen.getByTestId("organic-float-target");
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(target.style.getPropertyValue("--organic-y")).toBe("0px");
    expect(target.style.getPropertyValue("--organic-scale")).toBe("1");
    expect(changeListener).toBeTypeOf("function");
  });
});
