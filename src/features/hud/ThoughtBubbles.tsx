import { useEffect, useRef, useState } from "react";

const THOUGHTS = [
  "zzz", "~♪", "★", "...", "✿", "♡", ":3", "~✧", "nap...", "dream~",
];

interface Bubble {
  id: number;
  text: string;
  x: number; // 0-100 percentage
  duration: number;
}

let nextId = 0;

export function ThoughtBubbles({ active }: { active: boolean }): JSX.Element | null {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!active) {
      setBubble(null);
      return;
    }

    const spawn = (): void => {
      const nextBubble: Bubble = {
        id: nextId++,
        text: THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)],
        x: 25 + Math.random() * 50,
        duration: 4 + Math.random() * 2,
      };
      setBubble(nextBubble); // Only 1 at a time — subtle, not distracting

      if (hideTimeoutRef.current !== null) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setBubble((current) => (current?.id === nextBubble.id ? null : current));
        hideTimeoutRef.current = null;
      }, nextBubble.duration * 1000);
    };

    // First thought after 8 seconds
    const initial = setTimeout(spawn, 8000);
    // Then one every 12-20 seconds
    const id = setInterval(spawn, 12000 + Math.random() * 8000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [active]);

  if (!active || !bubble) return null;

  return (
    <div className="thought-bubbles" aria-hidden="true">
      <span
        key={bubble.id}
        className="thought-bubble"
        style={{
          left: `${bubble.x}%`,
          animationDuration: `${bubble.duration}s`,
        }}
      >
        {bubble.text}
      </span>
    </div>
  );
}
