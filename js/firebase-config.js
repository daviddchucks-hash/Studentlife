import { API_BASE_URL } from "./app-config.js";

const SESSION_KEY = "afit_local_session";
const localListeners = new Set();
const authSubscribers = new Map();

let firebaseEnabled = false;
let backendAuthMode = "unknown";
let firebaseConfig = null;
let app = null;
let auth = { currentUser: null };
let database = null;
let fbAuthMod = null;
let fbDbMod = null;
let initPromise = null;

function readStoredSession() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.uid || !parsed?.idToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function makeLocalUser(session) {
  if (!session?.user) return null;
  return {
    ...session.user,
    async getIdToken() {
      return session.idToken;
    }
  };
}

function writeStoredSession(session) {
  if (typeof localStorage === "undefined") return;
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  const user = makeLocalUser(session);
  if (auth && !firebaseEnabled) {
    auth.currentUser = user;
  }
  for (const cb of localListeners) {
    try {
      cb(user);
    } catch {
      // Ignore subscriber errors
    }
  }
}

async function fetchBackendConfig() {
  const baseUrl = String(API_BASE_URL || "").replace(/\/+$/, "");
  if (!baseUrl) return null;
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 25000) : null;
    try {
      const response = await fetch(`${baseUrl}/api/config`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller?.signal
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Retry once on transient cold-start or network failure
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    if (attempt + 1 < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
  }
  return null;
}

function bindQueuedFirebaseSubscribers() {
  if (!firebaseEnabled || !fbAuthMod) return;
  for (const [entry, info] of authSubscribers.entries()) {
    if (info.unsub) continue;
    localListeners.delete(info.callback);
    info.unsub = fbAuthMod.onAuthStateChanged(auth, info.callback, info.errorCallback);
    authSubscribers.set(entry, info);
  }
}

async function initializeFirebaseClient() {
  if (typeof window === "undefined") return false;
  if (firebaseEnabled && fbAuthMod) return true;

  const cfg = await fetchBackendConfig();
  if (!cfg) {
    backendAuthMode = "unknown";
    return false;
  }

  backendAuthMode = cfg.mode === "in-memory" ? "in-memory" : "firebase";

  if (cfg.firebaseEnabled && cfg.firebaseConfig?.apiKey) {
    firebaseConfig = cfg.firebaseConfig;
    const [fbApp, fbAuth, fbDb] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js")
    ]);
    fbAuthMod = fbAuth;
    fbDbMod = fbDb;
    app = fbApp.getApps?.().length ? fbApp.getApp() : fbApp.initializeApp(firebaseConfig);
    auth = fbAuth.getAuth(app);
    database = fbDb.getDatabase(app);
    firebaseEnabled = true;
    bindQueuedFirebaseSubscribers();
    return true;
  }

  if (backendAuthMode === "in-memory") {
    const initialSession = readStoredSession();
    auth = {
      currentUser: makeLocalUser(initialSession)
    };
  }
  return false;
}

export async function ensureFirebaseInitialized({ forceRetry = false } = {}) {
  if (firebaseEnabled && fbAuthMod) return true;
  if (!forceRetry && initPromise) return initPromise;
  if (!initPromise || forceRetry) {
    initPromise = initializeFirebaseClient().finally(() => {
      if (!firebaseEnabled) initPromise = null;
    });
  }
  return initPromise;
}

if (typeof window !== "undefined") {
  await ensureFirebaseInitialized();
}

export { app, auth, database, firebaseConfig, firebaseEnabled };

export function watchAuthState(callback, errorCallback) {
  if (firebaseEnabled && fbAuthMod) {
    return fbAuthMod.onAuthStateChanged(auth, callback, errorCallback);
  }

  if (backendAuthMode === "in-memory") {
    localListeners.add(callback);
    const current = makeLocalUser(readStoredSession());
    auth.currentUser = current;
    queueMicrotask(() => {
      if (localListeners.has(callback)) callback(current);
    });
    return () => {
      localListeners.delete(callback);
    };
  }

  // Backend config may still be waking up on initial page load; subscribe once Firebase initializes
  const token = Symbol("auth-subscriber");
  const entry = { callback, errorCallback, unsub: null };
  authSubscribers.set(token, entry);

  ensureFirebaseInitialized().then((ready) => {
    const active = authSubscribers.get(token);
    if (!active) return;
    if (ready && firebaseEnabled && fbAuthMod) {
      if (!active.unsub) {
        active.unsub = fbAuthMod.onAuthStateChanged(auth, callback, errorCallback);
      }
      return;
    }
    if (backendAuthMode === "in-memory") {
      localListeners.add(callback);
      const current = makeLocalUser(readStoredSession());
      auth.currentUser = current;
      callback(current);
      return;
    }
    callback(null);
  }).catch(() => {
    if (authSubscribers.has(token)) callback(null);
  });

  return () => {
    const existing = authSubscribers.get(token);
    authSubscribers.delete(token);
    localListeners.delete(callback);
    if (existing?.unsub) existing.unsub();
  };
}

export async function setAuthPersistence() {
  await ensureFirebaseInitialized({ forceRetry: !firebaseEnabled && backendAuthMode !== "in-memory" });
  if (firebaseEnabled && fbAuthMod) {
    await fbAuthMod.setPersistence(auth, fbAuthMod.browserLocalPersistence);
  }
}

export async function signUpWithEmail({ name, email, password }) {
  await ensureFirebaseInitialized({ forceRetry: !firebaseEnabled && backendAuthMode !== "in-memory" });
  if (firebaseEnabled && fbAuthMod) {
    const credential = await fbAuthMod.createUserWithEmailAndPassword(auth, email, password);
    if (name) await fbAuthMod.updateProfile(credential.user, { displayName: name });
    return credential;
  }

  if (backendAuthMode !== "in-memory") {
    throw new Error(
      backendAuthMode === "firebase"
        ? "Firebase Web configuration is unavailable on the server. Set FIREBASE_API_KEY in the Render environment variables and try again."
        : "Could not reach the authentication server. Wait a moment and try again."
    );
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}/api/local-auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name, email, password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.error || "Sign up failed."), { code: data.code });
  }
  writeStoredSession({ user: data.user, idToken: data.idToken });
  return { user: auth.currentUser };
}

export async function signInWithEmail({ email, password }) {
  await ensureFirebaseInitialized({ forceRetry: !firebaseEnabled && backendAuthMode !== "in-memory" });
  if (firebaseEnabled && fbAuthMod) {
    return fbAuthMod.signInWithEmailAndPassword(auth, email, password);
  }

  if (backendAuthMode !== "in-memory") {
    throw new Error(
      backendAuthMode === "firebase"
        ? "Firebase Web configuration is unavailable on the server. Set FIREBASE_API_KEY in the Render environment variables and try again."
        : "Could not reach the authentication server. Wait a moment and try again."
    );
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}/api/local-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.error || "Sign in failed."), { code: data.code });
  }
  writeStoredSession({ user: data.user, idToken: data.idToken });
  return { user: auth.currentUser };
}

export async function signOutUser() {
  if (firebaseEnabled && fbAuthMod) {
    return fbAuthMod.signOut(auth);
  }
  writeStoredSession(null);
}

export function dbRef(path) {
  if (firebaseEnabled && fbDbMod) return fbDbMod.ref(database, path);
  return { __localPath: path };
}

export function dbOrderByChild(field) {
  if (firebaseEnabled && fbDbMod) return fbDbMod.orderByChild(field);
  return { type: "orderByChild", field };
}

export function dbLimitToLast(limit) {
  if (firebaseEnabled && fbDbMod) return fbDbMod.limitToLast(limit);
  return { type: "limitToLast", limit };
}

export function dbQuery(targetRef, ...constraints) {
  if (firebaseEnabled && fbDbMod) return fbDbMod.query(targetRef, ...constraints);
  return { ...targetRef, constraints };
}

export function dbOnValue(targetQuery, callback, errorCallback) {
  if (firebaseEnabled && fbDbMod) {
    return fbDbMod.onValue(targetQuery, callback, errorCallback);
  }
  return () => {};
}

export function dbOff(targetQuery, eventType, listener) {
  if (firebaseEnabled && fbDbMod && targetQuery && listener) {
    fbDbMod.off(targetQuery, eventType, listener);
  }
}
