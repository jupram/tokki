import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface TooltipProps {
  content: string | ReactNode;
  children: ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  actualPosition: "top" | "bottom" | "left" | "right";
}

const ARROW_SIZE = 6;
const TOOLTIP_MARGIN = 8;
const EDGE_PADDING = 8;

function calculatePosition(
  triggerRect: DOMRect,
  tooltipRect: { width: number; height: number },
  preferredPosition: "top" | "bottom" | "left" | "right"
): TooltipPosition {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  const positions: Record<"top" | "bottom" | "left" | "right", { top: number; left: number }> = {
    top: {
      top: triggerRect.top - tooltipRect.height - ARROW_SIZE - TOOLTIP_MARGIN,
      left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    },
    bottom: {
      top: triggerRect.bottom + ARROW_SIZE + TOOLTIP_MARGIN,
      left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
    },
    left: {
      top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.left - tooltipRect.width - ARROW_SIZE - TOOLTIP_MARGIN,
    },
    right: {
      top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.right + ARROW_SIZE + TOOLTIP_MARGIN,
    },
  };

  // Check if preferred position fits, otherwise flip
  const canFit = (pos: "top" | "bottom" | "left" | "right"): boolean => {
    const { top, left } = positions[pos];
    const right = left + tooltipRect.width;
    const bottom = top + tooltipRect.height;

    return (
      top >= EDGE_PADDING &&
      left >= EDGE_PADDING &&
      right <= viewport.width - EDGE_PADDING &&
      bottom <= viewport.height - EDGE_PADDING
    );
  };

  // Try preferred position first
  if (canFit(preferredPosition)) {
    const pos = positions[preferredPosition];
    return { ...pos, actualPosition: preferredPosition };
  }

  // Flip order based on preferred position
  const flipOrder: Record<string, Array<"top" | "bottom" | "left" | "right">> = {
    top: ["bottom", "left", "right"],
    bottom: ["top", "left", "right"],
    left: ["right", "top", "bottom"],
    right: ["left", "top", "bottom"],
  };

  for (const alt of flipOrder[preferredPosition]) {
    if (canFit(alt)) {
      const pos = positions[alt];
      return { ...pos, actualPosition: alt };
    }
  }

  // Fallback: clamp to viewport
  let { top, left } = positions[preferredPosition];
  left = Math.max(EDGE_PADDING, Math.min(left, viewport.width - tooltipRect.width - EDGE_PADDING));
  top = Math.max(EDGE_PADDING, Math.min(top, viewport.height - tooltipRect.height - EDGE_PADDING));

  return { top, left, actualPosition: preferredPosition };
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
}: TooltipProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<TooltipPosition | null>(null);
  const tooltipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const newCoords = calculatePosition(triggerRect, tooltipRect, position);
    setCoords(newCoords);
  }, [position]);

  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    showTimeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Small delay before hiding to prevent flicker
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setCoords(null);
    }, 100);
  }, []);

  // Update position when visible
  useEffect(() => {
    if (visible) {
      // Wait for render then position
      requestAnimationFrame(updatePosition);
    }
  }, [visible, updatePosition]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // Handle scroll/resize
  useEffect(() => {
    if (!visible) return;

    const handlePositionChange = (): void => {
      updatePosition();
    };

    window.addEventListener("scroll", handlePositionChange, true);
    window.addEventListener("resize", handlePositionChange);

    return () => {
      window.removeEventListener("scroll", handlePositionChange, true);
      window.removeEventListener("resize", handlePositionChange);
    };
  }, [visible, updatePosition]);

  const handleRef = (el: HTMLElement | null): void => {
    triggerRef.current = el;

    // Forward ref to child if it has one
    const childRef = (children as { ref?: React.Ref<HTMLElement> }).ref;
    if (typeof childRef === "function") {
      childRef(el);
    } else if (childRef && "current" in childRef) {
      (childRef as React.MutableRefObject<HTMLElement | null>).current = el;
    }
  };

  const trigger = cloneElement(children, {
    ref: handleRef,
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip();
      children.props.onBlur?.(e);
    },
    "aria-describedby": visible ? tooltipId : undefined,
  });

  const tooltipElement = visible ? (
    <div
      ref={tooltipRef}
      id={tooltipId}
      role="tooltip"
      className={`tooltip tooltip--${coords?.actualPosition ?? position}${coords ? " tooltip--visible" : ""}`}
      style={
        coords
          ? { top: `${coords.top}px`, left: `${coords.left}px` }
          : { visibility: "hidden", top: 0, left: 0 }
      }
    >
      <span className="tooltip__content">{content}</span>
      <span className="tooltip__arrow" aria-hidden="true" />
    </div>
  ) : null;

  return (
    <>
      {trigger}
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
}
