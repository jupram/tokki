import type { AvatarId } from "../../../types/tokki";
import type { AvatarFXMap } from "./types";
import type { JSX } from "react";

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

// Import all avatars to trigger registration
import "./RabbitV1";
import "./RabbitV2";
import "./CatV1";
import "./CatV2";
import "./FoxV1";
import "./FoxV2";
import "./Dog";
import "./Penguin";
import "./Serpent";
import "./Turtle";
import "./Kitsune";
import "./Dragon";
import "./Phoenix";
import "./CelestialOwl";
