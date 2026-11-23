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
let localChangeSeq = 0;

export function getThemes() {
  return getCore().THEMES;
}

export function getAllThemes() {
  const core = getCore();
  return core.ALL_THEMES || core.THEMES;
}

export function getBackgroundPresets() {
  return getCore().BACKGROUND_PRESETS;
}

export function getAccentPresets() {
  return getCore().ACCENT_PRESETS || [];
}

export function getFonts() {
  return getCore().FONT_CATALOG || [];
}

export function getFontSizes() {
  return getCore().FONT_SIZE_SCALES || {};
}

export function getPersonalizationPresets() {
  return getCore().PERSONALIZATION_PRESETS || [];
}

export function getDefaultPersonalization() {
  return getCore().getDefaultPersonalization();
}

export function normalizePersonalization(raw) {
  return getCore().normalizePersonalization(raw);
}

export function isSystemDarkMode() {
  return getCore().detectSystemDarkMode();
}

export function getThemeDefinition(themeId, customColors, accentColor = null) {
  return getCore().getThemeById(themeId, customColors, undefined, accentColor);
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

export function getCurrentPersonalization() {
  return getCore().getCurrentPersonalization();
}

export function getDefaultCustomColors() {
  return { ...DEFAULT_CUSTOM_COLORS };
}

export function applyThemePreference(preference, options = {}) {
  return getCore().applyTheme(preference, options);
}

export function applyPersonalizationPreference(personalization, options = {}) {
  return getCore().applyPersonalization(personalization, options);
}

export function ensureGoogleFontsLoaded(forceAll = false) {
  return getCore().ensureGoogleFontsLoaded(forceAll);
}

function buildServerThemeBody(payload) {
  return {
    themeId: payload.themeId,
    ...(payload.themeId === "custom" && payload.customColors ? { customColors: payload.customColors } : {}),
    ...(payload.themeId !== "custom" && payload.accentColor ? { accentColor: payload.accentColor } : {})
  };
}

function buildServerPersonalizationBody(payload) {
  return {
    themeId: payload.themeId,
    ...(payload.themeId === "custom" && payload.customColors ? { customColors: payload.customColors } : {}),
    ...(payload.themeId !== "custom" && payload.accentColor ? { accentColor: payload.accentColor } : {}),
    typography: payload.typography,
    appearance: payload.appearance,
    accessibility: payload.accessibility,
    dashboard: payload.dashboard,
    presetId: payload.presetId || ""
  };
}

export async function saveAndApplyTheme(preference, uid = "") {
  const core = getCore();
  const effectiveUid = uid || core.getActiveUid();
  localChangeSeq += 1;

  const currentPers = core.getCurrentPersonalization();
  const normTheme = core.normalizePreference({
    ...preference,
    updatedAt: Date.now(),
    pendingSync: true
  });

  const mergedPers = core.normalizePersonalization({
    ...currentPers,
    themeId: normTheme.themeId,
    customColors: normTheme.customColors,
    accentColor: normTheme.accentColor,
    updatedAt: normTheme.updatedAt,
    pendingSync: true
  });

  core.applyPersonalization(mergedPers, { animate: true });
  core.saveStoredPersonalizationForUid(effectiveUid, mergedPers);

  if (!effectiveUid) {
    return { ...normTheme, pendingSync: false, cloudSynced: false };
  }

  syncedUid = effectiveUid;
  try {
    await apiRequest("/api/profile/theme", {
      method: "PUT",
      body: buildServerThemeBody(normTheme),
      timeoutMs: 12000
    });
    const cleanPers = core.saveStoredPersonalizationForUid(effectiveUid, {
      ...mergedPers,
      pendingSync: false
    });
    return {
      themeId: cleanPers.themeId,
      customColors: cleanPers.customColors,
      accentColor: cleanPers.accentColor,
      updatedAt: cleanPers.updatedAt,
      pendingSync: false,
      cloudSynced: true
    };
  } catch (err) {
    return {
      ...normTheme,
      pendingSync: true,
      cloudSynced: false,
      syncError: err?.message || "Saved on this device; cloud sync will retry automatically."
    };
  }
}

export async function saveAndApplyPersonalization(personalization, uid = "") {
  const core = getCore();
  const effectiveUid = uid || core.getActiveUid();
  localChangeSeq += 1;

  const payload = core.normalizePersonalization({
    ...personalization,
    updatedAt: Date.now(),
    pendingSync: true
  });

  core.applyPersonalization(payload, { animate: true });
  core.saveStoredPersonalizationForUid(effectiveUid, payload);

  if (!effectiveUid) {
    return { ...payload, pendingSync: false, cloudSynced: false };
  }

  syncedUid = effectiveUid;
  try {
    const res = await apiRequest("/api/profile/personalization", {
      method: "PUT",
      body: buildServerPersonalizationBody(payload),
      timeoutMs: 12000
    });
    const serverSaved = res?.personalization
      ? core.normalizePersonalization({ ...res.personalization, pendingSync: false })
      : { ...payload, pendingSync: false };
    const cleanSaved = core.saveStoredPersonalizationForUid(effectiveUid, serverSaved);
    return { ...cleanSaved, cloudSynced: true };
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
  return saveAndApplyTheme({ themeId: core.DEFAULT_THEME_ID, customColors: null, accentColor: null }, uid);
}

export async function resetAllPersonalization(uid = "") {
  const core = getCore();
  const defaults = core.getDefaultPersonalization();
  return saveAndApplyPersonalization(defaults, uid);
}

export function handleSignOutThemeReset() {
  localChangeSeq += 1;
  syncedUid = "";
  syncPromise = null;
  getCore().clearActiveSessionTheme();
}

async function flushPendingSync(uid, localPers) {
  const core = getCore();
  try {
    await apiRequest("/api/profile/personalization", {
      method: "PUT",
      body: buildServerPersonalizationBody(localPers),
      timeoutMs: 12000
    });
    return core.saveStoredPersonalizationForUid(uid, {
      ...localPers,
      pendingSync: false
    });
  } catch {
    return localPers;
  }
}

function resolveCloudPersonalizationFromProfile(core, profileOrTheme) {
  if (!profileOrTheme || typeof profileOrTheme !== "object") return null;
  if (profileOrTheme.personalization && typeof profileOrTheme.personalization === "object") {
    return core.normalizePersonalization({ ...profileOrTheme.personalization, pendingSync: false });
  }
  if (profileOrTheme.themePreference && typeof profileOrTheme.themePreference === "object") {
    return core.normalizePersonalization({ ...profileOrTheme.themePreference, pendingSync: false });
  }
  if (profileOrTheme.typography || profileOrTheme.appearance || profileOrTheme.accessibility || profileOrTheme.dashboard || profileOrTheme.themeId) {
    return core.normalizePersonalization({ ...profileOrTheme, pendingSync: false });
  }
  return null;
}

export async function syncStudentTheme(user, knownProfileTheme = null) {
  const core = getCore();
  if (!user || !user.uid) {
    handleSignOutThemeReset();
    return null;
  }

  const uid = user.uid;
  const localForUser = core.readStoredPersonalizationForUid(uid);

  if (core.getActiveUid() !== uid) {
    const immediatePers = localForUser || core.getDefaultPersonalization();
    core.applyPersonalization(immediatePers, { animate: false });
    if (localForUser) {
      core.saveStoredPersonalizationForUid(uid, localForUser);
    } else {
      try {
        window.localStorage?.setItem("afit_theme_active_uid", uid);
        window.localStorage?.removeItem("afit_theme_active_pref");
        window.localStorage?.removeItem("afit_personalization_active_pref");
      } catch {}
    }
  }

  // Push pending offline/local change before accepting older cloud preference
  if (localForUser?.pendingSync) {
    core.applyPersonalization(localForUser, { animate: false });
    syncedUid = uid;
    return flushPendingSync(uid, localForUser);
  }

  const knownCloud = resolveCloudPersonalizationFromProfile(core, knownProfileTheme);
  if (knownCloud) {
    core.saveStoredPersonalizationForUid(uid, knownCloud);
    core.applyPersonalization(knownCloud, { animate: false });
    syncedUid = uid;
    return knownCloud;
  }

  if (syncedUid === uid) {
    return core.readStoredPersonalizationForUid(uid) || core.getDefaultPersonalization();
  }

  if (syncPromise) return syncPromise;

  const seqAtStart = localChangeSeq;
  syncPromise = apiRequest("/api/me")
    .then((me) => {
      const latestLocal = core.readStoredPersonalizationForUid(uid);
      if (seqAtStart !== localChangeSeq || latestLocal?.pendingSync) {
        return latestLocal || core.getCurrentPersonalization();
      }
      const cloudPref = resolveCloudPersonalizationFromProfile(core, me?.profile);
      const effective = cloudPref || latestLocal || core.getDefaultPersonalization();

      core.saveStoredPersonalizationForUid(uid, effective);
      core.applyPersonalization(effective, { animate: false });
      syncedUid = uid;
      return effective;
    })
    .catch(() => core.readStoredPersonalizationForUid(uid) || localForUser || core.getDefaultPersonalization())
    .finally(() => {
      syncPromise = null;
    });

  return syncPromise;
}
