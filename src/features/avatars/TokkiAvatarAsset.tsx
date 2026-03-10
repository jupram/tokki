import { memo } from "react";
import { getAvatar } from ".";
import type { TokkiAssetId } from "../../animation/mapActionToView";

export type AvatarPreviewState = "idle" | "hover" | "selected";

interface TokkiAvatarAssetProps {
  assetId: TokkiAssetId;
  /** 
   * Enable preview mode for compact rendering in selection grids.
   * When true, renders at reduced scale with simplified animations.
   */
  preview?: boolean;
  /**
   * Preview animation state. Only used when preview=true.
   * - "idle": breathing/blinking animation
   * - "hover": wave/happy animation  
   * - "selected": celebration bounce animation
   */
  previewState?: AvatarPreviewState;
}

// Memoized avatar component to prevent re-renders when parent state changes
export const TokkiAvatarAsset = memo(function TokkiAvatarAsset({ 
  assetId,
  preview = false,
  previewState = "idle",
}: TokkiAvatarAssetProps): JSX.Element {
  const entry = getAvatar(assetId);
  const Component = entry?.Component ?? getAvatar("rabbit_v2")?.Component;
  
  if (!Component) {
    return <div />;
  }

  if (preview) {
    const stateClass = previewState === "selected" 
      ? "avatar-preview--selected" 
      : previewState === "hover" 
        ? "avatar-preview--hover" 
        : "";
    
    return (
      <div className={`avatar-preview ${stateClass}`}>
        <Component />
      </div>
    );
  }

  return <Component />;
});
