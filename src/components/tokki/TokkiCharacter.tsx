import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { mapActionToView } from "../../animation/mapActionToView";
import {
  getCurrentState,
  handleUserInteraction,
  sendChatMessage,
  setChatPanelOpen,
  startBehaviorLoop,
  startWindowDrag,
  stopBehaviorLoop,
  subscribeBehaviorTick
} from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { UserEvent } from "../../types/tokki";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { AvatarPicker } from "./AvatarPicker";
import { TokkiAvatarAsset } from "./TokkiAvatarAsset";

function makeUserEvent(type: UserEvent["type"]): UserEvent {
  return {
    type,
    timestamp: Date.now()
  };
}

const DRAG_THRESHOLD = 4;
const CHAT_PANEL_EXIT_MS = 220;

export function TokkiCharacter(): JSX.Element {
  const state = useTokkiStore((store) => store.state);
  const connected = useTokkiStore((store) => store.connected);
  const avatarId = useTokkiStore((store) => store.avatarId);
  const currentReply = useTokkiStore((store) => store.currentReply);
  const isTyping = useTokkiStore((store) => store.isTyping);
  const chatOpen = useTokkiStore((store) => store.chatOpen);

  const applyTick = useTokkiStore((store) => store.applyTick);
  const setState = useTokkiStore((store) => store.setState);
  const setConnected = useTokkiStore((store) => store.setConnected);
  const setCurrentReply = useTokkiStore((store) => store.setCurrentReply);
  const setIsTyping = useTokkiStore((store) => store.setIsTyping);
  const setChatOpen = useTokkiStore((store) => store.setChatOpen);
  const addChatMessage = useTokkiStore((store) => store.addChatMessage);

  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);
  const panelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chatPanelVisible, setChatPanelVisible] = useState(chatOpen);
  const [chatPanelClosing, setChatPanelClosing] = useState(false);

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
    },
    []
  );

  const onInteract = async (type: UserEvent["type"]): Promise<void> => {
    const tick = await handleUserInteraction(makeUserEvent(type));
    applyTick(tick);
  };

  const onAvatarMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = { startX: event.screenX, startY: event.screenY, dragging: false };
  };

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
  }, []);

  const onAvatarClick = (): void => {
    if (dragRef.current?.dragging) return;
    setChatOpen(!chatOpen);
    void onInteract("click");
  };

  const onSendMessage = useCallback(
    async (message: string): Promise<void> => {
      setIsTyping(true);
      addChatMessage({ role: "user", content: message, timestamp: Date.now() });

      try {
        const response = await sendChatMessage(message);
        applyTick(response.tick);
        setCurrentReply(response.reply);
        addChatMessage({
          role: "assistant",
          content: response.reply.line,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Chat failed", error);
        setCurrentReply({
          line: "Oops, my brain fizzled... try again?",
          mood: "sleepy",
          animation: "idle.blink",
          intent: "none"
        });
      } finally {
        setIsTyping(false);
      }
    },
    [applyTick, setCurrentReply, setIsTyping, addChatMessage]
  );

  const actionView = mapActionToView(state.current_action, avatarId);

  return (
    <section
      className={`tokki-card ${chatOpen ? "tokki-card--chat-open" : ""}`}
      aria-label="Tokki"
      data-tauri-drag-region
    >
      <ChatBubble reply={currentReply} isTyping={isTyping} />

      <div className="tokki-stage" data-tauri-drag-region>
        <button
          type="button"
          className={`tokki-avatar ${actionView.toneClass} ${actionView.stateClass}`}
          onClick={onAvatarClick}
          onMouseEnter={() => {
            void onInteract("hover");
          }}
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
      </div>

      {chatPanelVisible && (
        <div className={`tokki-chat-panel ${chatPanelClosing ? "tokki-chat-panel--closing" : "tokki-chat-panel--open"}`}>
          <AvatarPicker />
          <ChatInput
            onSend={(msg) => {
              void onSendMessage(msg);
            }}
            disabled={isTyping}
          />
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
