import { beforeEach, describe, expect, it } from "vitest";
import {
  ONBOARDING_PROFILE_KEY,
  createOnboardingProfile,
  getAvatarNameSuggestions,
  getDefaultPersonalityForAvatar,
  isOnboardingComplete,
  loadOnboardingProfile,
  normalizeAvatarId,
  saveOnboardingProfile,
} from "./onboardingProfile";

describe("onboardingProfile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("roundtrips a saved onboarding profile and keeps legacy keys in sync", () => {
    const profile = createOnboardingProfile({
      avatarId: "cat_v1",
      name: "Luna",
      userName: "Saket",
    });

    saveOnboardingProfile(profile);

    expect(loadOnboardingProfile()).toEqual(profile);
    expect(localStorage.getItem("tokki_onboarded")).toBe("1");
    expect(localStorage.getItem("tokki_avatar_id")).toBe("cat_v1");
    expect(localStorage.getItem("tokki_pet_name")).toBe("Luna");
    expect(localStorage.getItem("tokki_user_name")).toBe("Saket");
    expect(isOnboardingComplete(profile)).toBe(true);
  });

  it("migrates legacy onboarding keys into a complete local profile", () => {
    localStorage.setItem("tokki_onboarded", "1");
    localStorage.setItem("tokki_avatar_id", "cat_v2");
    localStorage.setItem("tokki_pet_name", "Luna");
    localStorage.setItem("tokki_user_name", "Alex");

    const profile = loadOnboardingProfile();

    expect(profile).toMatchObject({
      avatarId: "cat_v1",
      userName: "Alex",
      personality: {
        name: "Luna",
        preset: "aloof",
        humor: 55,
        reaction_intensity: 40,
        chattiness: 25,
      },
    });
    expect(localStorage.getItem("tokki_onboarding_profile")).not.toBeNull();
  });

  it("normalizes removed avatar ids from stored profiles to supported avatars", () => {
    localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify({
      version: 1,
      avatarId: "fox_v1",
      personality: {
        name: "Ember",
        preset: "clever",
        humor: 70,
        reaction_intensity: 65,
        chattiness: 55,
      },
      completedAt: "2026-01-01T00:00:00.000Z",
    }));

    const profile = loadOnboardingProfile();

    expect(profile).toMatchObject({
      avatarId: "fox_v2",
      personality: {
        name: "Ember",
        preset: "clever",
      },
    });
    expect(localStorage.getItem("tokki_avatar_id")).toBe("fox_v2");
  });

  it("falls back removed standalone avatars to the default current avatar", () => {
    localStorage.setItem("tokki_onboarded", "1");
    localStorage.setItem("tokki_avatar_id", "phoenix_v1");
    localStorage.setItem("tokki_pet_name", "Sol");

    const profile = loadOnboardingProfile();

    expect(profile).toMatchObject({
      avatarId: "rabbit_v2",
      personality: {
        name: "Sol",
      },
    });
    expect(localStorage.getItem("tokki_avatar_id")).toBe("rabbit_v2");
  });

  it("passes through all currently supported avatar ids unchanged", () => {
    expect(normalizeAvatarId("dog_v1")).toBe("dog_v1");
    expect(normalizeAvatarId("dragon_v1")).toBe("dragon_v1");
    expect(normalizeAvatarId("kitsune_v1")).toBe("kitsune_v1");
    expect(normalizeAvatarId("penguin_v1")).toBe("penguin_v1");
    expect(normalizeAvatarId("owl_v1")).toBe("owl_v1");
  });

  it("loads stored onboarding profiles that predate userName support", () => {
    localStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify({
      version: 1,
      avatarId: "rabbit_v2",
      personality: getDefaultPersonalityForAvatar("rabbit_v2"),
      completedAt: "2026-01-01T00:00:00.000Z",
    }));

    const profile = loadOnboardingProfile();

    expect(profile).toMatchObject({
      avatarId: "rabbit_v2",
      userName: null,
      personality: getDefaultPersonalityForAvatar("rabbit_v2"),
    });
  });

  it("returns avatar-driven defaults and suggestions", () => {
    expect(getAvatarNameSuggestions("rabbit_v2")).toEqual(["Bun", "Thumper", "Clover"]);
    expect(getAvatarNameSuggestions("cat_v1")).toEqual(["Mochi", "Whiskers", "Luna"]);
    expect(getAvatarNameSuggestions("fox_v2")).toEqual(["Ember", "Scout", "Rusty"]);
    expect(getDefaultPersonalityForAvatar("fox_v2")).toEqual({
      name: "Ember",
      preset: "clever",
      humor: 70,
      reaction_intensity: 65,
      chattiness: 55,
    });
    expect(getDefaultPersonalityForAvatar("owl_v1")).toEqual({
      name: "Athena",
      preset: "wise",
      humor: 50,
      reaction_intensity: 50,
      chattiness: 30,
    });
  });
});
