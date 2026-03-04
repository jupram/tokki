import { useEffect } from "react";
import { mapActionToView } from "../../animation/mapActionToView";
import {
  getCurrentState,
  handleUserInteraction,
  startBehaviorLoop,
  stopBehaviorLoop,
  subscribeBehaviorTick
} from "../../bridge/tauri";
import { useTokkiStore } from "../../state/useTokkiStore";
import type { UserEvent } from "../../types/tokki";

function makeUserEvent(type: UserEvent["type"]): UserEvent {
  return {
    type,
    timestamp: Date.now()
  };
}

export function TokkiCharacter(): JSX.Element {
  const state = useTokkiStore((store) => store.state);
  const connected = useTokkiStore((store) => store.connected);
  const applyTick = useTokkiStore((store) => store.applyTick);
  const setState = useTokkiStore((store) => store.setState);
  const setConnected = useTokkiStore((store) => store.setConnected);

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

  const onInteract = async (type: UserEvent["type"]): Promise<void> => {
    const tick = await handleUserInteraction(makeUserEvent(type));
    applyTick(tick);
  };

  const actionView = mapActionToView(state.current_action);
  const status = connected ? "Connected" : "Disconnected";

  return (
    <section className="tokki-card" aria-label="Tokki character panel">
      <div className="tokki-stage">
        <button
          type="button"
          className={`tokki-avatar ${actionView.cssClass}`}
          onClick={() => {
            void onInteract("click");
          }}
          onMouseEnter={() => {
            void onInteract("hover");
          }}
          onMouseDown={() => {
            void onInteract("drag_start");
          }}
          onMouseUp={() => {
            void onInteract("drag_end");
          }}
          data-testid="tokki-avatar"
          aria-label="Tokki avatar"
        >
          {actionView.emoji}
        </button>
      </div>

      <div className="tokki-meta">
        <div>
          Runtime: <strong data-testid="tokki-status">{status}</strong>
        </div>
        <div>
          Action: <strong data-testid="tokki-action">{state.current_action.id}</strong>
        </div>
        <div>
          Mood: <strong data-testid="tokki-mood">{state.current_action.mood}</strong>
        </div>
        <div>
          Energy: <strong data-testid="tokki-energy">{state.energy}</strong>
        </div>
        <div>
          Animation Label: <strong>{actionView.label}</strong>
        </div>
      </div>

      <div className="tokki-controls">
        <button
          type="button"
          onClick={() => {
            void onInteract("poke");
          }}
        >
          Poke Tokki
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            void stopBehaviorLoop();
            setConnected(false);
          }}
        >
          Pause Loop
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            void startBehaviorLoop();
            setConnected(true);
          }}
        >
          Resume Loop
        </button>
      </div>
    </section>
  );
}
