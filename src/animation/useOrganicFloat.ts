import { useEffect, type RefObject } from "react";

/**
 * Drives layered sine-wave float via CSS custom properties on a target element.
 * Three frequencies produce organic, never-exactly-repeating motion.
 */
export function useOrganicFloat(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const mediaQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    let reducedMotion = mediaQuery?.matches ?? false;
    let hidden = document.visibilityState !== "visible";
    let raf = 0;
    let activeElement: HTMLElement | null = null;
    let phaseStart = 0;

    const syncElement = (): HTMLElement | null => {
      const nextElement = ref.current;
      if (activeElement && activeElement !== nextElement) {
        activeElement.style.setProperty("--organic-y", "0px");
        activeElement.style.setProperty("--organic-scale", "1");
      }
      activeElement = nextElement;
      return activeElement;
    };

    const applyRestingTransform = (): void => {
      const el = syncElement();
      if (!el) {
        return;
      }

      el.style.setProperty("--organic-y", "0px");
      el.style.setProperty("--organic-scale", "1");
    };

    const stop = (reset = false): void => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      if (reset) {
        phaseStart = 0;
        applyRestingTransform();
      }
    };

    const tick = (now: number): void => {
      if (hidden || reducedMotion) {
        stop(true);
        return;
      }
      if (phaseStart === 0) {
        phaseStart = now;
      }
      const t = (now - phaseStart) / 1000;
      // Three layered sine waves at different frequencies
      const y =
        Math.sin(t * 0.77) * 3.2 +   // slow primary sway
        Math.sin(t * 1.49) * 1.5 +    // medium secondary
        Math.sin(t * 2.31) * 0.7;     // fast shimmer
      const scale = 1 + Math.sin(t * 0.77) * 0.008; // subtle breath

      const el = syncElement();
      if (el) {
        el.style.setProperty("--organic-y", `${y.toFixed(2)}px`);
        el.style.setProperty("--organic-scale", scale.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    };

    const startIfNeeded = (): void => {
      if (raf !== 0 || hidden || reducedMotion) {
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onVisibilityChange = (): void => {
      hidden = document.visibilityState !== "visible";
      if (hidden) {
        stop(true);
      } else {
        startIfNeeded();
      }
    };

    const onReducedMotionChange = (event: MediaQueryListEvent | MediaQueryList): void => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        stop(true);
      } else {
        startIfNeeded();
      }
    };

    if (reducedMotion || hidden) {
      applyRestingTransform();
    } else {
      startIfNeeded();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    let cleanupMediaQuery = (): void => {};
    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", onReducedMotionChange);
        cleanupMediaQuery = () => {
          mediaQuery.removeEventListener("change", onReducedMotionChange);
        };
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(onReducedMotionChange);
        cleanupMediaQuery = () => {
          mediaQuery.removeListener(onReducedMotionChange);
        };
      }
    }

    return () => {
      stop(true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cleanupMediaQuery();
      activeElement = null;
    };
  }, [ref]);
}
