import { useEffect, useRef } from "react";

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 380;

const MOOD_COLORS: Record<string, string[]> = {
  idle: ["#ffe8cc", "#ffd6a0"],
  playful: ["#ffd93d", "#ffb347", "#fff0b3"],
  curious: ["#7ec8e3", "#4db3d6", "#b8e8f5"],
  sleepy: ["#d8c0e8", "#c3a6d6"],
  surprised: ["#f5a0a0", "#ff6b6b", "#ffcccc"],
};

interface Sparkle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  phase: "wait" | "fadein" | "hold" | "fadeout";
  timer: number;
  waitDur: number;
  color: string;
}

function randWait(): number {
  // Random delay 2–8 seconds before next glitter appears
  return 120 + Math.random() * 360; // frames at ~60fps
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

export function MoodSparkles({ mood }: { mood: string }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvasContext(canvas);
    if (!ctx) {
      sparklesRef.current = [];
      return;
    }

    const width = canvas.width || CANVAS_WIDTH;
    const height = canvas.height || CANVAS_HEIGHT;
    const colors = MOOD_COLORS[mood] ?? MOOD_COLORS.idle;
    // Only 3-4 sparkle slots — most are waiting at any given time
    const count = mood === "playful" ? 4 : 3;

    sparklesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1.5 + Math.random() * 2,
      opacity: 0,
      phase: "wait" as const,
      timer: Math.floor(Math.random() * 200), // stagger initial waits
      waitDur: randWait(),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const render = (): void => {
      ctx.clearRect(0, 0, width, height);

      for (const s of sparklesRef.current) {
        s.timer++;

        switch (s.phase) {
          case "wait":
            if (s.timer >= s.waitDur) {
              s.phase = "fadein";
              s.timer = 0;
              s.x = 40 + Math.random() * Math.max(0, width - 80);
              s.y = 60 + Math.random() * Math.max(0, height - 120);
              s.color = colors[Math.floor(Math.random() * colors.length)];
              s.size = 1.5 + Math.random() * 2;
            }
            break;
          case "fadein":
            s.opacity = Math.min(0.5, s.timer / 30); // fade in over ~0.5s
            if (s.timer >= 30) { s.phase = "hold"; s.timer = 0; }
            break;
          case "hold":
            s.opacity = 0.35 + Math.sin(s.timer * 0.15) * 0.15; // gentle twinkle
            if (s.timer >= 60) { s.phase = "fadeout"; s.timer = 0; } // hold ~1s
            break;
          case "fadeout":
            s.opacity = Math.max(0, 0.5 - s.timer / 25);
            if (s.timer >= 25) {
              s.phase = "wait";
              s.timer = 0;
              s.waitDur = randWait();
              s.opacity = 0;
            }
            break;
        }

        if (s.opacity > 0) {
          // Draw a small 4-point star instead of a circle for glitter effect
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.globalAlpha = s.opacity;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          const r = s.size;
          const ri = r * 0.35;
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2 - Math.PI / 4;
            const nextAngle = angle + Math.PI / 4;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            ctx.lineTo(Math.cos(nextAngle) * ri, Math.sin(nextAngle) * ri);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [mood]);

  return (
    <canvas
      ref={canvasRef}
      className="mood-sparkles"
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      aria-hidden="true"
    />
  );
}
