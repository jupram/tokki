import { lazy, Suspense, type ComponentType, type JSX } from "react";
import { FRONTEND_AVATAR_IDS, type AvatarId } from "../../types/tokki";
import type { AvatarFXMap } from "./types";

export interface AvatarEntry {
  id: AvatarId;
  label: string;
  emoji: string;
  cssClass: string;
  accentColor: string;
  Component: () => JSX.Element;
  fx: AvatarFXMap;
}

// Internal type that supports both eager and lazy-loaded avatars
interface InternalAvatarEntry extends Omit<AvatarEntry, "Component"> {
  Component: ComponentType | (() => JSX.Element);
  LazyComponent?: ComponentType;
}

const registry = new Map<AvatarId, InternalAvatarEntry>();

export function registerAvatar(entry: AvatarEntry): void {
  registry.set(entry.id, entry);
}

// Register a lazy-loaded avatar (for future avatar additions that can be code-split)
export function registerLazyAvatar(
  metadata: Omit<AvatarEntry, "Component">,
  loader: () => Promise<{ default: ComponentType }>
): void {
  const LazyComponent = lazy(loader);
  const WrappedComponent = (): JSX.Element => (
    <Suspense fallback={<div className="avatar-loading" aria-hidden="true" />}>
      <LazyComponent />
    </Suspense>
  );
  registry.set(metadata.id, {
    ...metadata,
    Component: WrappedComponent,
    LazyComponent,
  });
}

export function getAvatar(id: AvatarId): AvatarEntry | undefined {
  const entry = registry.get(id);
  if (!entry) return undefined;
  // Cast is safe because both eager and wrapped lazy components satisfy () => JSX.Element
  return entry as AvatarEntry;
}

export function getAllAvatars(): AvatarEntry[] {
  return FRONTEND_AVATAR_IDS.flatMap((id) => {
    const entry = registry.get(id);
    // Cast is safe because both eager and wrapped lazy components satisfy () => JSX.Element
    return entry ? [entry as AvatarEntry] : [];
  });
}

// Preload an avatar component (useful for warming cache before user selects it)
export function preloadAvatar(id: AvatarId): void {
  const entry = registry.get(id);
  if (entry?.LazyComponent) {
    // Trigger the lazy load by referencing the component
    void Promise.resolve(entry.LazyComponent);
  }
}
