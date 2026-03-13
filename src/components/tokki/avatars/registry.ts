import type { JSX } from "react";
import type { AvatarId } from "../../../types/tokki";
import type { AvatarFXMap } from "./types";

export interface AvatarEntry {
  id: AvatarId;
  label: string;
  emoji: string;
  cssClass: string;
  Component: () => JSX.Element;
  fx: AvatarFXMap;
}

const registry = new Map<AvatarId, AvatarEntry>();

export function registerAvatar(entry: AvatarEntry): void {
  registry.set(entry.id, entry);
}

export function getAvatar(id: AvatarId): AvatarEntry | undefined {
  return registry.get(id);
}

export function getAllAvatars(): AvatarEntry[] {
  return Array.from(registry.values());
}
