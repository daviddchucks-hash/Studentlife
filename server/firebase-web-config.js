"use strict";

function buildBaseConfig({ projectId, databaseURL, env = process.env } = {}) {
  const resolvedProjectId = String(env.FIREBASE_PROJECT_ID || projectId || "student-life-643be").trim();
  return {
    authDomain: String(env.FIREBASE_AUTH_DOMAIN || `${resolvedProjectId}.firebaseapp.com`).trim(),
    projectId: resolvedProjectId,
    storageBucket: String(env.FIREBASE_STORAGE_BUCKET || `${resolvedProjectId}.firebasestorage.app`).trim(),
    messagingSenderId: String(env.FIREBASE_MESSAGING_SENDER_ID || "703601899893").trim(),
    appId: String(env.FIREBASE_WEB_APP_ID || "1:703601899893:web:fbe9cf5b4f4df1dc54fb3c").trim(),
    databaseURL: env.FIREBASE_DATABASE_URL || databaseURL || undefined
  };
}

function createFirebaseWebConfigResolver({
  adminApp = null,
  projectId = "",
  databaseURL = "",
  env = process.env,
  fetchImpl = globalThis.fetch
} = {}) {
  let cachedConfig = null;
  let inFlightPromise = null;
  let lastFailureAt = 0;

  async function fetchJsonWithBearer(url, accessToken) {
    if (typeof fetchImpl !== "function") return null;
    try {
      const response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        },
        signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(5000) : undefined
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function resolveFromGoogleApis(baseConfig) {
    const credential = adminApp?.options?.credential;
    if (!credential || typeof credential.getAccessToken !== "function") return null;
    let tokenData;
    try {
      tokenData = await credential.getAccessToken();
    } catch {
      return null;
    }
    const accessToken = tokenData?.access_token;
    if (!accessToken) return null;

    const encodedProject = encodeURIComponent(baseConfig.projectId);
    if (baseConfig.appId) {
      const direct = await fetchJsonWithBearer(
        `https://firebase.googleapis.com/v1beta1/projects/${encodedProject}/webApps/${encodeURIComponent(baseConfig.appId)}/config`,
        accessToken
      );
      if (direct?.apiKey) {
        return {
          ...baseConfig,
          ...direct,
          databaseURL: direct.databaseURL || baseConfig.databaseURL
        };
      }
    }

    const listed = await fetchJsonWithBearer(
      `https://firebase.googleapis.com/v1beta1/projects/${encodedProject}/webApps`,
      accessToken
    );
    const firstApp = Array.isArray(listed?.apps) ? listed.apps[0] : null;
    if (firstApp?.appId) {
      const appCfg = await fetchJsonWithBearer(
        `https://firebase.googleapis.com/v1beta1/projects/${encodedProject}/webApps/${encodeURIComponent(firstApp.appId)}/config`,
        accessToken
      );
      if (appCfg?.apiKey) {
        return {
          ...baseConfig,
          ...appCfg,
          databaseURL: appCfg.databaseURL || baseConfig.databaseURL
        };
      }
    }

    const keysList = await fetchJsonWithBearer(
      `https://apikeys.googleapis.com/v2/projects/${encodedProject}/locations/global/keys`,
      accessToken
    );
    const keys = Array.isArray(keysList?.keys) ? keysList.keys : [];
    const browserKey = keys.find((item) => /browser|firebase/i.test(String(item?.displayName || ""))) || keys[0];
    if (browserKey?.name) {
      const keyData = await fetchJsonWithBearer(
        `https://apikeys.googleapis.com/v2/${browserKey.name}/keyString`,
        accessToken
      );
      if (keyData?.keyString) {
        return {
          ...baseConfig,
          apiKey: keyData.keyString
        };
      }
    }

    return null;
  }

  return async function resolveFirebaseWebConfig() {
    const baseConfig = buildBaseConfig({ projectId, databaseURL, env });
    const explicitApiKey = String(env.FIREBASE_API_KEY || "").trim();
    if (explicitApiKey) {
      return {
        ...baseConfig,
        apiKey: explicitApiKey
      };
    }
    if (cachedConfig?.apiKey) return cachedConfig;
    if (lastFailureAt && Date.now() - lastFailureAt < 30_000) return null;
    if (!inFlightPromise) {
      inFlightPromise = resolveFromGoogleApis(baseConfig)
        .then((resolved) => {
          if (resolved?.apiKey) {
            cachedConfig = resolved;
            lastFailureAt = 0;
            return resolved;
          }
          lastFailureAt = Date.now();
          return null;
        })
        .catch(() => {
          lastFailureAt = Date.now();
          return null;
        })
        .finally(() => {
          inFlightPromise = null;
        });
    }
    return inFlightPromise;
  };
}

module.exports = {
  buildBaseConfig,
  createFirebaseWebConfigResolver
};
