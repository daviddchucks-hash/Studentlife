import { apiRequest } from "./api.js";

function getCore() {
  if (typeof window !== "undefined" && window.AFITThemeEngine) {
    return window.AFITThemeEngine;
  }
  throw new Error("Theme boot engine is not loaded.");
}

const DEFAULT_CUSTOM_COLORS = {
  backgroundPreset: "light-crisp",
  primaryAccent: "#174e74",
  secondaryAccent: "#0e7490",
  buttonAccent: "#174e74"
};

let syncedUid = "";
let syncPromise = null;

export function getThemes() {
  return getCore().THEMES;
}

export function getBackgroundPresets() {
  return getCore().BACKGROUND_PRESETS;
}

export function getThemeDefinition(themeId, customColors) {
  return getCore().getThemeById(themeId, customColors);
}

export function resolveCustomTheme(customColors) {
  return getCore().resolveCustomThemeDefinition(customColors);
}

export function getContrastRatio(hexA, hexB) {
  return getCore().contrastRatio(hexA, hexB);
}

export function getCurrentPreference() {
  return getCore().getCurrentPreference();
}

export function getDefaultCustomColors() {
  return { ...DEFAULT_CUSTOM_COLORS };
}

export function applyThemePreference(preference, options = {}) {
  return getCore().applyTheme(preference, options);
}

export async function saveAndApplyTheme(preference, uid = "") {
  const core = getCore();
  const effectiveUid = uid || core.getActiveUid();
  const payload = core.normalizePreference({
    ...preference,
    updatedAt: Date.now()
  });

  core.applyTheme(payload, { animate: true });
  core.saveStoredPreferenceForUid(effectiveUid, payload);

  if (effectiveUid) {
    syncedUid = effectiveUid;
    await apiRequest("/api/profile/theme", {
      method: "PUT",
      body: {
        themeId: payload.themeId,
        ...(payload.customColors ? { customColors: payload.customColors } : {})
      }
    });
  }
  return payload;
}

export async function resetToDefaultTheme(uid = "") {
  const core = getCore();
  return saveAndApplyTheme({ themeId: core.DEFAULT_THEME_ID, customColors: null }, uid);
}

export function handleSignOutThemeReset() {
  syncedUid = "";
  syncPromise = null;
  getCore().clearActiveSessionTheme();
}

export async function syncStudentTheme(user, knownProfileTheme = null) {
  const core = getCore();
  if (!user || !user.uid) {
    handleSignOutThemeReset();
    return null;
  }

  const uid = user.uid;
  const localForUser = core.readStoredPreferenceForUid(uid);

  if (core.getActiveUid() !== uid) {
    const immediatePref = localForUser || { themeId: core.DEFAULT_THEME_ID, customColors: null };
    core.applyTheme(immediatePref, { animate: false });
    if (localForUser) {
      core.saveStoredPreferenceForUid(uid, localForUser);
    } else {
      try {
        window.localStorage?.setItem("afit_theme_active_uid", uid);
        window.localStorage?.removeItem("afit_theme_active_pref");
      } catch {}
    }
  }

  if (knownProfileTheme && typeof knownProfileTheme === "object") {
    const normalizedCloud = core.normalizePreference(knownProfileTheme);
    core.saveStoredPreferenceForUid(uid, normalizedCloud);
    core.applyTheme(normalizedCloud, { animate: false });
    syncedUid = uid;
    return normalizedCloud;
  }

  if (syncedUid === uid) {
    return core.readStoredPreferenceForUid(uid) || { themeId: core.DEFAULT_THEME_ID, customColors: null };
  }

  if (syncPromise) return syncPromise;

  syncPromise = apiRequest("/api/me")
    .then((me) => {
      const serverTheme = me?.profile?.themePreference;
      const effective = serverTheme
        ? core.normalizePreference(serverTheme)
        : (localForUser || { themeId: core.DEFAULT_THEME_ID, customColors: null });

      core.saveStoredPreferenceForUid(uid, effective);
      core.applyTheme(effective, { animate: false });
      syncedUid = uid;
      return effective;
    })
    .catch(() => localForUser || { themeId: core.DEFAULT_THEME_ID, customColors: null })
    .finally(() => {
      syncPromise = null;
    });

  return syncPromise;
}
