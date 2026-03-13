import { getAvatar } from "./avatars";
import type { TokkiAssetId } from "../../animation/mapActionToView";

interface TokkiAvatarAssetProps {
  assetId: TokkiAssetId;
}

export function TokkiAvatarAsset({ assetId }: TokkiAvatarAssetProps): JSX.Element {
  const entry = getAvatar(assetId);
  if (entry) {
    return <entry.Component />;
  }
  const fallback = getAvatar("rabbit_v1");
  return fallback ? <fallback.Component /> : <div />;
}
