import { describe, expect, it } from "vitest";
import { getAllAvatars } from ".";

describe("avatar registry", () => {
  it("registers the full avatar lineup in picker order", () => {
    expect(getAllAvatars().map((avatar) => avatar.id)).toEqual([
      "rabbit_v2",
      "cat_v1",
      "dog_v1",
      "fox_v2",
      "dragon_v1",
      "kitsune_v1",
      "penguin_v1",
      "owl_v1",
    ]);
  });

  it("exposes metadata for active avatars", () => {
    const rabbit = getAllAvatars().find((avatar) => avatar.id === "rabbit_v2");
    const fox = getAllAvatars().find((avatar) => avatar.id === "fox_v2");

    expect(rabbit).toMatchObject({
      label: "Rabbit ❀",
      emoji: "\u{1F430}",
      accentColor: "#F5B7C5",
    });
    expect(fox).toMatchObject({
      label: "Spirit Fox",
      emoji: "\u{1F98A}",
      accentColor: "#00BCD4",
    });
  });
});
