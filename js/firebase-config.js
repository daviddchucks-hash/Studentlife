import { API_BASE_URL } from "./app-config.js";

const SESSION_KEY = "afit_local_session";
const listeners = new Set();

let firebaseEnabled = false;
let firebaseConfig = null;
let app = null;
let auth = null;
let database = null;
let fbAuthMod = null;
let fbDbMod = null;

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
  for (const cb of listeners) {
    try {
      cb(user);
    } catch {
      // Ignore subscriber errors
    }
  }
}

if (typeof window !== "undefined") {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config`, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const cfg = await res.json();
      if (cfg?.firebaseEnabled && cfg?.firebaseConfig?.apiKey) {
        firebaseConfig = cfg.firebaseConfig;
        const [fbApp, fbAuth, fbDb] = await Promise.all([
          import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
          import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js")
        ]);
        fbAuthMod = fbAuth;
        fbDbMod = fbDb;
        app = fbApp.initializeApp(firebaseConfig);
        auth = fbAuth.getAuth(app);
        database = fbDb.getDatabase(app);
        firebaseEnabled = true;
      }
    }
  } catch {
    firebaseEnabled = false;
  }
}

if (!firebaseEnabled) {
  const initialSession = readStoredSession();
  auth = {
    currentUser: makeLocalUser(initialSession)
  };
}

export { app, auth, database, firebaseConfig, firebaseEnabled };

export function watchAuthState(callback, errorCallback) {
  if (firebaseEnabled && fbAuthMod) {
    return fbAuthMod.onAuthStateChanged(auth, callback, errorCallback);
  }
  listeners.add(callback);
  const current = makeLocalUser(readStoredSession());
  auth.currentUser = current;
  queueMicrotask(() => {
    if (listeners.has(callback)) callback(current);
  });
  return () => {
    listeners.delete(callback);
  };
}

export async function setAuthPersistence() {
  if (firebaseEnabled && fbAuthMod) {
    await fbAuthMod.setPersistence(auth, fbAuthMod.browserLocalPersistence);
  }
}

export async function signUpWithEmail({ name, email, password }) {
  if (firebaseEnabled && fbAuthMod) {
    const credential = await fbAuthMod.createUserWithEmailAndPassword(auth, email, password);
    if (name) await fbAuthMod.updateProfile(credential.user, { displayName: name });
    return credential;
  }
  const response = await fetch(`${API_BASE_URL}/api/local-auth/signup`, {
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
  if (firebaseEnabled && fbAuthMod) {
    return fbAuthMod.signInWithEmailAndPassword(auth, email, password);
  }
  const response = await fetch(`${API_BASE_URL}/api/local-auth/login`, {
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
