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

let lastInitError = null;

async function initializeFirebaseClient() {
  if (typeof window === "undefined") return false;
  if (firebaseEnabled && fbAuthMod) return true;

  lastInitError = null;
  const cfg = await fetchBackendConfig();
  if (!cfg) {
    backendAuthMode = "unknown";
    lastInitError = new Error("Could not reach the authentication server. Wait a moment and try again.");
    return false;
  }

  backendAuthMode = cfg.mode === "in-memory" ? "in-memory" : "firebase";

  if (cfg.firebaseEnabled && cfg.firebaseConfig?.apiKey) {
    firebaseConfig = cfg.firebaseConfig;
    try {
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
    } catch (err) {
      firebaseEnabled = false;
      lastInitError = err instanceof Error ? err : new Error("Failed to load Firebase authentication SDK.");
      return false;
    }
  }

  if (backendAuthMode === "in-memory") {
    const initialSession = readStoredSession();
    auth = {
      currentUser: makeLocalUser(initialSession)
    };
    return false;
  }

  lastInitError = new Error("Firebase Web configuration is unavailable on the server.");
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
  void ensureFirebaseInitialized();
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
    if (typeof errorCallback === "function") {
      errorCallback(lastInitError || new Error("Could not connect to the authentication service."));
      return;
    }
    callback(null);
  }).catch((err) => {
    if (!authSubscribers.has(token)) return;
    if (typeof errorCallback === "function") {
      errorCallback(err instanceof Error ? err : new Error("Could not connect to the authentication service."));
      return;
    }
    callback(null);
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

export async function updateStudentDisplayName(name) {
  const cleanName = typeof name === "string" ? name.trim() : "";
  if (firebaseEnabled && fbAuthMod && auth?.currentUser) {
    try {
      await fbAuthMod.updateProfile(auth.currentUser, { displayName: cleanName });
    } catch {
      // Non-fatal: server database remains authoritative for profile fields
    }
    return;
  }

  if (backendAuthMode === "in-memory") {
    const session = readStoredSession();
    if (session?.user) {
      writeStoredSession({
        ...session,
        user: {
          ...session.user,
          name: cleanName,
          displayName: cleanName
        }
      });
    }
  }
}

export function getAuthStatus() {
  return {
    firebaseEnabled,
    backendAuthMode,
    currentUser: auth?.currentUser || null
  };
}

export async function retryAuthConnection() {
  return ensureFirebaseInitialized({ forceRetry: true });
}

function mapPasswordChangeError(error) {
  const code = error?.code || "";
  if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
    return new Error("Your current password is incorrect. Please check and try again.");
  }
  if (code === "auth/weak-password") {
    return new Error("Choose a stronger new password with at least 6 characters.");
  }
  if (code === "auth/requires-recent-login") {
    return new Error("For your security, please sign out and sign back in before changing your password.");
  }
  if (code === "auth/too-many-requests") {
    return new Error("Too many attempts. Wait a few minutes before trying again.");
  }
  return new Error(error?.message || "Unable to update your password. Please try again.");
}

export async function changeStudentPassword({ currentPassword, newPassword }) {
  if (!currentPassword || typeof currentPassword !== "string") {
    throw new Error("Enter your current password to continue.");
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }
  if (currentPassword === newPassword) {
    throw new Error("Your new password must be different from your current password.");
  }

  await ensureFirebaseInitialized({ forceRetry: !firebaseEnabled && backendAuthMode !== "in-memory" });

  if (firebaseEnabled && fbAuthMod) {
    const user = auth?.currentUser;
    if (!user || !user.email) {
      throw new Error("Sign in again with your email and password before updating your password.");
    }
    try {
      const credential = fbAuthMod.EmailAuthProvider.credential(user.email, currentPassword);
      await fbAuthMod.reauthenticateWithCredential(user, credential);
      await fbAuthMod.updatePassword(user, newPassword);
      return { ok: true };
    } catch (error) {
      throw mapPasswordChangeError(error);
    }
  }

  if (backendAuthMode !== "in-memory") {
    throw new Error(
      backendAuthMode === "firebase"
        ? "Firebase Authentication is unavailable right now. Please try again shortly."
        : "Could not reach the authentication server. Wait a moment and try again."
    );
  }

  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Sign in again before updating your password.");
  }
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}/api/local-auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw mapPasswordChangeError(Object.assign(new Error(data.error || "Unable to update password."), { code: data.code }));
  }
  return { ok: true };
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

export async function dbSet(targetRef, value) {
  if (firebaseEnabled && fbDbMod && targetRef) {
    return fbDbMod.set(targetRef, value);
  }
}

export async function dbRemove(targetRef) {
  if (firebaseEnabled && fbDbMod && targetRef) {
    return fbDbMod.remove(targetRef);
  }
}

export function dbOnDisconnect(targetRef) {
  if (firebaseEnabled && fbDbMod && targetRef && typeof fbDbMod.onDisconnect === "function") {
    return fbDbMod.onDisconnect(targetRef);
  }
  return null;
}
