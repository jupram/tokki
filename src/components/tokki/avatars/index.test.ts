import { describe, expect, it } from "vitest";
import { getAllAvatars, getAvatar } from "./index";

describe("avatar registry", () => {
  it("registers all avatar entries during module load", () => {
    expect(getAllAvatars().map((avatar) => avatar.id)).toEqual([
      "rabbit_v1",
      "cat_v1",
      "dog_v1",
      "penguin_v1",
      "owl_v1",
    ]);
    expect(getAvatar("rabbit_v1")?.label).toBe("Rabbit");
    expect(getAvatar("owl_v1")?.label).toBe("Celestial Owl");
  });
});
