import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { mapActionToView } from "../../animation/mapActionToView";
import {
  getCurrentState,
  handleUserInteraction,
  sendChatMessage,
  setChatPanelOpen,
  startBehaviorLoop,
  startWindowDrag,
  stopBehaviorLoop,
  subscribeBehaviorTick,
  syncWindowToContent
} from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { LlmResponse, UserEvent } from "../../types/tokki";
import { AvatarPicker } from "./AvatarPicker";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { TokkiAvatarAsset } from "./TokkiAvatarAsset";
import { FXLayer } from "./avatars/particles/FXLayer";

function makeUserEvent(type: UserEvent["type"]): UserEvent {
  return {
    type,
    timestamp: Date.now()
  };
}

const DRAG_THRESHOLD = 4;
const CHAT_PANEL_EXIT_MS = 220;
const CHAT_IDLE_CLOSE_MS = 10_000;
const HOVER_SPARKLE_DELAY_MS = 900;
const WINDOW_MEASURE_SELECTORS = [
  ".tokki-stage",
  ".tokki-chat-panel",
  ".chat-bubble",
  ".tokki-hover-decor",
  ".fx-layer"
];

function measureWindowContent(root: HTMLElement): { width: number; height: number } {
  const bounds = root.getBoundingClientRect();
  let left = bounds.left;
  let top = bounds.top;
  let right = bounds.right;
  let bottom = bounds.bottom;

  for (const selector of WINDOW_MEASURE_SELECTORS) {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }

    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }

  return {
    width: Math.ceil(right - left),
    height: Math.ceil(bottom - top)
  };
}

function HoverSparkles(): JSX.Element {
  return (
    <div className="tokki-hover-decor tokki-hover-decor--stars" aria-hidden="true">
      <span className="tokki-sparkle tokki-sparkle--a" />
      <span className="tokki-sparkle tokki-sparkle--b" />
      <span className="tokki-sparkle tokki-sparkle--c" />
      <span className="tokki-sparkle tokki-sparkle--d" />
    </div>
  );
}

export function TokkiCharacter(): JSX.Element {
  const { state, connected, avatarId, currentReply, isTyping, chatOpen } =
    useTokkiStore(
      useShallow((store) => ({
        state: store.state,
        connected: store.connected,
        avatarId: store.avatarId,
        currentReply: store.currentReply,
        isTyping: store.isTyping,
        chatOpen: store.chatOpen
      }))
    );

  const {
    applyTick,
    setState,
    setConnected,
    setCurrentReply,
    setIsTyping,
    setChatOpen
  } = useTokkiStore(
    useShallow((store) => ({
      applyTick: store.applyTick,
      setState: store.setState,
      setConnected: store.setConnected,
      setCurrentReply: store.setCurrentReply,
      setIsTyping: store.setIsTyping,
      setChatOpen: store.setChatOpen
    }))
  );

  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatPanelVisible, setChatPanelVisible] = useState(chatOpen);
  const [chatPanelClosing, setChatPanelClosing] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [showHoverSparkles, setShowHoverSparkles] = useState(false);
  const chatLayoutOpen = chatOpen || chatPanelVisible;

  useEffect(() => {
    let mounted = true;
    let teardown: (() => void) | undefined;

    (async () => {
      teardown = await subscribeBehaviorTick((tick) => {
        applyTick(tick);
      });

      await startBehaviorLoop();
      const current = await getCurrentState();
      if (!mounted) {
        return;
      }
      setState(current);
      setConnected(true);
    })().catch((error: unknown) => {
      console.error("Tokki runtime init failed", error);
      setConnected(false);
    });

    return () => {
      mounted = false;
      teardown?.();
      void stopBehaviorLoop();
    };
  }, [applyTick, setConnected, setState]);

  useEffect(() => {
    void setChatPanelOpen(chatOpen);
  }, [chatOpen]);

  useEffect(() => {
    const root = cardRef.current;
    if (!root) {
      return;
    }

    let frameId: number | null = null;
    const resizeWindow = (): void => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        frameId = null;
        void syncWindowToContent(measureWindowContent(root), {
          chatOpen: chatLayoutOpen
        });
      });
    };

    resizeWindow();

    const observer = new ResizeObserver(() => {
      resizeWindow();
    });
    const mutationObserver = new MutationObserver(() => {
      resizeWindow();
    });

    observer.observe(root);
    for (const selector of WINDOW_MEASURE_SELECTORS) {
      const element = root.querySelector<HTMLElement>(selector);
      if (element) {
        observer.observe(element);
      }
    }
    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style"]
    });

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [avatarId, chatLayoutOpen, currentReply, isTyping, showHoverSparkles]);

  useEffect(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (!chatOpen || isTyping) {
      return;
    }

    const resetIdleTimer = (): void => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        setCurrentReply(null);
        setChatOpen(false);
        idleTimerRef.current = null;
      }, CHAT_IDLE_CLOSE_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "wheel",
      "focusin",
      "touchstart"
    ];

    resetIdleTimer();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [chatOpen, isTyping, setChatOpen, setCurrentReply]);

  useEffect(() => {
    if (panelTimerRef.current) {
      clearTimeout(panelTimerRef.current);
      panelTimerRef.current = null;
    }

    if (chatOpen) {
      setChatPanelVisible(true);
      setChatPanelClosing(false);
      return;
    }

    if (chatPanelVisible) {
      setChatPanelClosing(true);
      panelTimerRef.current = setTimeout(() => {
        setChatPanelVisible(false);
        setChatPanelClosing(false);
        panelTimerRef.current = null;
      }, CHAT_PANEL_EXIT_MS);
    }
  }, [chatOpen, chatPanelVisible]);

  useEffect(
    () => () => {
      if (panelTimerRef.current) {
        clearTimeout(panelTimerRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isAvatarHovered) {
      setShowHoverSparkles(false);
      return;
    }

    const timer = setTimeout(() => {
      if (dragRef.current?.dragging) {
        return;
      }
      setShowHoverSparkles(true);
    }, HOVER_SPARKLE_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isAvatarHovered]);

  const onInteract = useCallback(
    async (type: UserEvent["type"]): Promise<void> => {
      const tick = await handleUserInteraction(makeUserEvent(type));
      applyTick(tick);
    },
    [applyTick]
  );

  const onAvatarMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return;
    }
    setIsAvatarHovered(false);
    setShowHoverSparkles(false);
    dragRef.current = { startX: event.screenX, startY: event.screenY, dragging: false };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: globalThis.MouseEvent): void => {
      const drag = dragRef.current;
      if (!drag || drag.dragging) return;
      const dx = event.screenX - drag.startX;
      const dy = event.screenY - drag.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        drag.dragging = true;
        void startWindowDrag().catch(() => {});
        void onInteract("drag_start");
      }
    };
    const onMouseUp = (): void => {
      const drag = dragRef.current;
      if (drag?.dragging) {
        void onInteract("drag_end");
      }
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onInteract]);

  const onAvatarClick = useCallback((): void => {
    if (dragRef.current?.dragging) return;
    setCurrentReply(null);
    setChatOpen(!chatOpen);
    void onInteract("click");
  }, [chatOpen, onInteract, setChatOpen, setCurrentReply]);

  const onAvatarMouseEnter = useCallback((): void => {
    setIsAvatarHovered(true);
    void onInteract("hover");
  }, [onInteract]);

  const onAvatarMouseLeave = useCallback((): void => {
    setIsAvatarHovered(false);
    setShowHoverSparkles(false);
  }, []);

  const onSendMessage = useCallback(
    async (message: string): Promise<void> => {
      setIsTyping(true);

      try {
        const response = await sendChatMessage(message);
        applyTick(response.tick);
        setCurrentReply(response.reply);
      } catch (error) {
        console.error("Chat failed", error);
        const fallbackReply: LlmResponse = {
          line: "Oops, my brain fizzled... try again?",
          mood: "sleepy",
          animation: "idle.blink",
          intent: "none"
        };
        setCurrentReply(fallbackReply);
      } finally {
        setIsTyping(false);
      }
    },
    [applyTick, setCurrentReply, setIsTyping]
  );

  const actionView = useMemo(
    () => mapActionToView(state.current_action, avatarId),
    [avatarId, state.current_action]
  );

  return (
    <section
      ref={cardRef}
      className={`tokki-card ${chatLayoutOpen ? "tokki-card--chat-open" : ""}`}
      aria-label="Tokki"
      data-tauri-drag-region
    >
      <div className="tokki-stage" data-tauri-drag-region>
        {showHoverSparkles && <HoverSparkles />}
        <button
          type="button"
          className={`tokki-avatar ${actionView.toneClass} ${actionView.stateClass}`}
          onClick={onAvatarClick}
          onMouseEnter={onAvatarMouseEnter}
          onMouseLeave={onAvatarMouseLeave}
          onMouseDown={onAvatarMouseDown}
          onContextMenu={(event) => {
            event.preventDefault();
            void onInteract("poke");
          }}
          data-testid="tokki-avatar"
          aria-label="Tokki avatar"
        >
          <TokkiAvatarAsset assetId={actionView.assetId} />
        </button>
        <FXLayer />
      </div>

      {chatPanelVisible && (
        <div
          className={`tokki-chat-panel ${chatPanelClosing ? "tokki-chat-panel--closing" : "tokki-chat-panel--open"}`}
        >
          <ChatBubble reply={currentReply} isTyping={isTyping} />
          <ChatInput
            onSend={(msg) => {
              void onSendMessage(msg);
            }}
            disabled={isTyping}
          />
          <AvatarPicker />
        </div>
      )}

      <div className="tokki-debug" aria-hidden="true">
        <span data-testid="tokki-status">{connected ? "Connected" : "Disconnected"}</span>
        <span data-testid="tokki-action">{state.current_action.id}</span>
        <span data-testid="tokki-mood">{state.current_action.mood}</span>
        <span data-testid="tokki-energy">{state.energy}</span>
        <span data-testid="tokki-label">{actionView.label}</span>
      </div>
    </section>
  );
}
