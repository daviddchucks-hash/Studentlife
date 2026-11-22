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

export function isSystemDarkMode() {
  return getCore().detectSystemDarkMode();
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

function buildServerThemeBody(payload) {
  return {
    themeId: payload.themeId,
    ...(payload.themeId === "custom" && payload.customColors ? { customColors: payload.customColors } : {})
  };
}

export async function saveAndApplyTheme(preference, uid = "") {
  const core = getCore();
  const effectiveUid = uid || core.getActiveUid();
  const payload = core.normalizePreference({
    ...preference,
    updatedAt: Date.now(),
    pendingSync: true
  });

  core.applyTheme(payload, { animate: true });
  core.saveStoredPreferenceForUid(effectiveUid, payload);

  if (!effectiveUid) {
    return { ...payload, pendingSync: false, cloudSynced: false };
  }

  syncedUid = effectiveUid;
  try {
    await apiRequest("/api/profile/theme", {
      method: "PUT",
      body: buildServerThemeBody(payload),
      timeoutMs: 12000
    });
    const cleanSynced = core.saveStoredPreferenceForUid(effectiveUid, {
      ...payload,
      pendingSync: false
    });
    return { ...cleanSynced, cloudSynced: true };
  } catch (err) {
    return {
      ...payload,
      pendingSync: true,
      cloudSynced: false,
      syncError: err?.message || "Saved on this device; cloud sync will retry automatically."
    };
  }
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

async function flushPendingSync(uid, localPref) {
  const core = getCore();
  try {
    await apiRequest("/api/profile/theme", {
      method: "PUT",
      body: buildServerThemeBody(localPref),
      timeoutMs: 12000
    });
    const synced = core.saveStoredPreferenceForUid(uid, {
      ...localPref,
      pendingSync: false
    });
    return synced;
  } catch {
    return localPref;
  }
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

  // Push pending offline/local change before accepting older cloud preference
  if (localForUser?.pendingSync) {
    core.applyTheme(localForUser, { animate: false });
    syncedUid = uid;
    return flushPendingSync(uid, localForUser);
  }

  if (knownProfileTheme && typeof knownProfileTheme === "object") {
    const normalizedCloud = core.normalizePreference({
      ...knownProfileTheme,
      pendingSync: false
    });
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
        ? core.normalizePreference({ ...serverTheme, pendingSync: false })
        : (localForUser || { themeId: core.DEFAULT_THEME_ID, customColors: null, pendingSync: false });

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
