export { getAllAvatars, getAvatar, registerAvatar } from "./registry";
export type { AvatarEntry } from "./registry";

// Import the retained avatars to trigger registration.
import "./RabbitV1";
import "./CatV1";
import "./Dog";
import "./Penguin";
import "./CelestialOwl";
