"use strict";

const { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } = require("node:crypto");

let pushCounter = 0;

function generatePushId() {
  pushCounter = (pushCounter + 1) % 10000;
  const ts = Date.now().toString(36).padStart(9, "0");
  const seq = pushCounter.toString(36).padStart(3, "0");
  const rand = randomBytes(4).toString("hex");
  return `-${ts}${seq}${rand}`;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function readPath(root, path) {
  if (!path) return root;
  const parts = String(path).split("/").filter(Boolean);
  let node = root;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
}

function writePath(root, path, value) {
  const parts = String(path).split("/").filter(Boolean);
  if (!parts.length) {
    throw new Error("Cannot replace root directly without path.");
  }
  let node = root;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== "object") {
      node[part] = {};
    }
    node = node[part];
  }
  const leaf = parts[parts.length - 1];
  if (value === null || value === undefined) {
    delete node[leaf];
  } else {
    node[leaf] = clone(value);
  }
}

class MockSnapshot {
  constructor(value, key = null) {
    this._value = value === undefined ? null : clone(value);
    this.key = key;
  }

  val() {
    return clone(this._value);
  }

  exists() {
    return this._value !== null && this._value !== undefined;
  }
}

class MockQuery {
  constructor(database, path, options = {}) {
    this.database = database;
    this.path = path;
    this.options = options;
  }

  get key() {
    const parts = String(this.path || "").split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }

  orderByChild(field) {
    return new MockQuery(this.database, this.path, { ...this.options, orderByChild: field });
  }

  limitToLast(limit) {
    return new MockQuery(this.database, this.path, { ...this.options, limitToLast: Number(limit) });
  }

  endAt(value, key) {
    return new MockQuery(this.database, this.path, { ...this.options, endAt: { value, key } });
  }

  async get() {
    const raw = readPath(this.database.data, this.path);
    if (raw === null || raw === undefined) {
      return new MockSnapshot(null, this.key);
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return new MockSnapshot(raw, this.key);
    }

    let entries = Object.entries(raw);
    const { orderByChild, endAt, limitToLast } = this.options;

    if (orderByChild) {
      entries.sort((a, b) => {
        const va = a[1]?.[orderByChild];
        const vb = b[1]?.[orderByChild];
        if (va === vb) return a[0].localeCompare(b[0]);
        if (typeof va === "number" && typeof vb === "number") return va - vb;
        return String(va ?? "").localeCompare(String(vb ?? ""));
      });
    }

    if (endAt) {
      entries = entries.filter(([entryKey, entryVal]) => {
        const fieldVal = orderByChild ? entryVal?.[orderByChild] : entryVal;
        if (typeof endAt.value === "number" && typeof fieldVal === "number") {
          if (fieldVal < endAt.value) return true;
          if (fieldVal > endAt.value) return false;
          return endAt.key ? entryKey <= endAt.key : true;
        }
        const cmp = String(fieldVal ?? "").localeCompare(String(endAt.value ?? ""));
        if (cmp < 0) return true;
        if (cmp > 0) return false;
        return endAt.key ? entryKey <= endAt.key : true;
      });
    }

    if (Number.isInteger(limitToLast) && limitToLast > 0 && entries.length > limitToLast) {
      entries = entries.slice(-limitToLast);
    }

    return new MockSnapshot(Object.fromEntries(entries), this.key);
  }
}

class MockReference extends MockQuery {
  constructor(database, path = "") {
    super(database, path, {});
  }

  child(childPath) {
    const joined = [this.path, childPath].filter(Boolean).join("/");
    return new MockReference(this.database, joined);
  }

  async set(value) {
    if (!this.path) {
      this.database.data = value && typeof value === "object" ? clone(value) : {};
      return;
    }
    writePath(this.database.data, this.path, value);
  }

  async update(updates) {
    if (!updates || typeof updates !== "object") return;
    for (const [relPath, value] of Object.entries(updates)) {
      const targetPath = [this.path, relPath].filter(Boolean).join("/");
      if (targetPath) {
        writePath(this.database.data, targetPath, value);
      }
    }
  }

  async remove() {
    await this.set(null);
  }

  push(value) {
    const id = generatePushId();
    const childRef = this.child(id);
    if (value === undefined) {
      return childRef;
    }
    const writePromise = childRef.set(value).then(() => childRef);
    const thenable = Object.create(childRef);
    thenable.then = writePromise.then.bind(writePromise);
    thenable.catch = writePromise.catch.bind(writePromise);
    thenable.finally = writePromise.finally.bind(writePromise);
    return thenable;
  }

  async transaction(updateFn) {
    const currentRaw = readPath(this.database.data, this.path);
    const current = currentRaw === undefined ? null : clone(currentRaw);
    const next = updateFn(clone(current));
    if (next === undefined) {
      return { committed: false, snapshot: new MockSnapshot(current, this.key) };
    }
    await this.set(next);
    return { committed: true, snapshot: new MockSnapshot(next, this.key) };
  }
}

function createMockDatabase(initialData = {}) {
  const state = {
    data: clone(initialData) || {}
  };
  return {
    _data: state,
    ref(path = "") {
      const normalized = String(path || "").replace(/^\/+|\/+$/g, "");
      return new MockReference(state, normalized);
    }
  };
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(String(password), salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json);
    if (payload && typeof payload === "object" && (payload.user_id || payload.sub || payload.uid)) {
      return payload;
    }
  } catch {
    return null;
  }
  return null;
}

function createMockAuth(database) {
  const runtimeSecret = randomBytes(32);

  function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    })).toString("base64url");
    const sig = createHmac("sha256", runtimeSecret).update(`${header}.${body}`).digest("base64url");
    return `${header}.${body}.${sig}`;
  }

  function verifyLocalToken(token) {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = createHmac("sha256", runtimeSecret).update(`${header}.${body}`).digest("base64url");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  return {
    async registerUser({ name, email, password }) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw Object.assign(new Error("Enter a valid email address."), { code: "auth/invalid-email", statusCode: 400 });
      }
      if (typeof password !== "string" || password.length < 6) {
        throw Object.assign(new Error("Choose a stronger password with at least 6 characters."), { code: "auth/weak-password", statusCode: 400 });
      }

      const accountsSnap = await database.ref("localAuth/accounts").get();
      const accounts = accountsSnap.val() || {};
      const exists = Object.values(accounts).some((acc) => String(acc?.email || "").toLowerCase() === normalizedEmail);
      if (exists) {
        throw Object.assign(new Error("An account already uses this email. Try signing in instead."), { code: "auth/email-already-in-use", statusCode: 409 });
      }

      const uid = `stu_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      const cleanName = String(name || normalizedEmail.split("@")[0] || "Student").trim().slice(0, 80);
      const now = Date.now();
      const account = {
        uid,
        email: normalizedEmail,
        displayName: cleanName,
        passwordHash: hashPassword(password),
        disabled: false,
        createdAt: now
      };
      await database.ref(`localAuth/accounts/${uid}`).set(account);
      await database.ref(`users/${uid}/profile`).set({
        name: cleanName,
        email: normalizedEmail,
        createdAt: now,
        updatedAt: now
      });

      const idToken = signToken({ uid, sub: uid, user_id: uid, email: normalizedEmail, name: cleanName });
      return {
        user: { uid, email: normalizedEmail, displayName: cleanName },
        idToken
      };
    },

    async loginUser({ email, password }) {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      if (!normalizedEmail || typeof password !== "string") {
        throw Object.assign(new Error("That email and password combination was not recognized."), { code: "auth/invalid-credential", statusCode: 401 });
      }

      const accountsSnap = await database.ref("localAuth/accounts").get();
      const accounts = accountsSnap.val() || {};
      const account = Object.values(accounts).find((acc) => String(acc?.email || "").toLowerCase() === normalizedEmail);
      if (!account || !verifyPassword(password, account.passwordHash)) {
        throw Object.assign(new Error("That email and password combination was not recognized."), { code: "auth/invalid-credential", statusCode: 401 });
      }

      const profileSnap = await database.ref(`users/${account.uid}/profile`).get();
      const profile = profileSnap.val() || {};
      const displayName = profile.name || account.displayName || normalizedEmail.split("@")[0];
      const idToken = signToken({ uid: account.uid, sub: account.uid, user_id: account.uid, email: account.email, name: displayName });
      return {
        user: { uid: account.uid, email: account.email, displayName },
        idToken
      };
    },

    async verifyIdToken(token) {
      const local = verifyLocalToken(token);
      if (local) {
        const uid = local.uid || local.user_id || local.sub;
        const accountSnap = await database.ref(`localAuth/accounts/${uid}`).get();
        if (!accountSnap.exists() || accountSnap.val().disabled) {
          throw new Error("Session is invalid.");
        }
        const acc = accountSnap.val();
        return {
          uid,
          email: acc.email || local.email || null,
          name: acc.displayName || local.name || null,
          admin: Boolean(acc.admin)
        };
      }

      // Allow decoded Firebase JWTs when client Firebase Auth is enabled without Admin service account
      const decoded = decodeJwtPayload(token);
      if (decoded) {
        const uid = decoded.user_id || decoded.sub || decoded.uid;
        if (uid) {
          return {
            uid,
            email: decoded.email || null,
            name: decoded.name || null,
            admin: Boolean(decoded.admin)
          };
        }
      }

      throw new Error("Invalid token.");
    },

    async getUser(uid) {
      const accountSnap = await database.ref(`localAuth/accounts/${uid}`).get();
      if (accountSnap.exists()) {
        const acc = accountSnap.val();
        return {
          uid,
          email: acc.email || null,
          displayName: acc.displayName || null,
          disabled: Boolean(acc.disabled)
        };
      }
      const profileSnap = await database.ref(`users/${uid}/profile`).get();
      if (profileSnap.exists()) {
        const profile = profileSnap.val();
        return {
          uid,
          email: profile.email || null,
          displayName: profile.name || null,
          disabled: false
        };
      }
      throw Object.assign(new Error("User not found"), { code: "auth/user-not-found" });
    }
  };
}

module.exports = {
  createMockDatabase,
  createMockAuth,
  MockSnapshot,
  MockReference
};
