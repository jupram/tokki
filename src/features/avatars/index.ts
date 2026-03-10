// Re-export registry API (no circular dependency — registry.ts has no avatar imports)
export { registerAvatar, registerLazyAvatar, getAvatar, getAllAvatars, preloadAvatar } from "./registry";
export type { AvatarEntry } from "./registry";

// Import all avatars to trigger self-registration side effects in roadmap order.
import "./RabbitV2";
import "./CatV1";
import "./Dog";
import "./FoxV2";
import "./Dragon";
import "./Kitsune";
import "./Penguin";
import "./CelestialOwl";
