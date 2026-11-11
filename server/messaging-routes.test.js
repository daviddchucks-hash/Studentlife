"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { registerMessagingRoutes } = require("./messaging-routes");
const { matricLookupKey } = require("./messaging");

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function readPath(root, path) {
  return path.split("/").filter(Boolean).reduce((value, part) => value?.[part], root);
}

function writePath(root, path, value) {
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) throw new Error("Cannot replace mock database root.");
  let node = root;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== "object") node[part] = {};
    node = node[part];
  }
  if (value === null) delete node[parts[parts.length - 1]];
  else node[parts[parts.length - 1]] = clone(value);
}

class Snapshot {
  constructor(value) { this.value = clone(value ?? null); }
  val() { return clone(this.value); }
  exists() { return this.value !== null; }
}

class FakeReference {
  constructor(database, path = "") {
    this.database = database;
    this.path = path;
  }
  get() { return Promise.resolve(new Snapshot(readPath(this.database.data, this.path))); }
  set(value) {
    if (this.path) writePath(this.database.data, this.path, value);
    else this.database.data = clone(value);
    return Promise.resolve();
  }
  update(updates) {
    for (const [path, value] of Object.entries(updates)) {
      writePath(this.database.data, [this.path, path].filter(Boolean).join("/"), value);
    }
    return Promise.resolve();
  }
  remove() { return this.set(null); }
  transaction(update) {
    const current = clone(readPath(this.database.data, this.path) ?? null);
    const next = update(current);
    if (next === undefined) return Promise.resolve({ committed: false, snapshot: new Snapshot(current) });
    if (this.path) writePath(this.database.data, this.path, next);
    else this.database.data = clone(next);
    return Promise.resolve({ committed: true, snapshot: new Snapshot(next) });
  }
  orderByChild() { return this; }
  limitToLast() { return this; }
}

class FakeDatabase {
  constructor(data) { this.data = clone(data); }
  ref(path = "") { return new FakeReference(this, path); }
}

function createHarness() {
  const users = {
    studentA: { profile: { name: "Student A", department: "Computing", level: "100", matricNumber: "A-100", matricVerified: true, email: "private-a@example.test", phone: "111" } },
    studentB: { profile: { name: "Student B", department: "Engineering", level: "200", matricNumber: "B/200", matricVerified: true, email: "private-b@example.test", phone: "222" } },
    studentC: { profile: { name: "Student C", department: "Computing", level: "100", matricNumber: "C.300", matricVerified: true } }
  };
  const database = new FakeDatabase({
    users,
    matricLookup: {
      [matricLookupKey("A-100")]: "studentA",
      [matricLookupKey("B/200")]: "studentB",
      [matricLookupKey("C.300")]: "studentC"
    }
  });
  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    const uid = String(req.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!users[uid]) return res.status(401).json({ error: "Sign in to continue." });
    req.user = { uid };
    next();
  };
  const firebaseAuth = {
    async getUser(uid) {
      if (!users[uid]) throw Object.assign(new Error("not found"), { code: "auth/user-not-found" });
      return { uid, disabled: false };
    }
  };
  let searchCount = 0;
  let actionCount = 0;
  registerMessagingRoutes(app, {
    database,
    firebaseAuth,
    requireAuth,
    validUid: (uid) => typeof uid === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(uid),
    allowMessageSearch: () => { searchCount += 1; return true; },
    allowMessageAction: () => { actionCount += 1; return true; }
  });
  app.use((error, req, res, next) => {
    res.status(error.statusCode || 500).json({ error: error.message || "Internal error." });
  });
  return { app, database, users, getCounts: () => ({ searchCount, actionCount }) };
}

test("authenticated messaging routes enforce request, acceptance, messaging, block, and unblock workflow", async (t) => {
  const harness = createHarness();
  const server = harness.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function call(uid, method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${uid}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  const search = await call("studentA", "GET", "/api/messages/search?matric=b%20%2F200");
  assert.equal(search.status, 200);
  assert.deepEqual(Object.keys(search.body.user).sort(), ["department", "level", "name", "profilePicture", "uid"]);
  assert.equal(search.body.user.name, "Student B");
  assert.equal("matricNumber" in search.body.user, false);
  assert.equal("email" in search.body.user, false);
  assert.equal((await call("studentA", "GET", "/api/messages/search?matric=bad%21")).status, 400);
  assert.equal((await call("studentA", "GET", "/api/messages/search?matric=missing")).status, 404);

  const badPayload = await call("studentA", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hello", requestId: "request_bad", attachment: "file"
  });
  assert.equal(badPayload.status, 400);

  const created = await call("studentA", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hello, can we connect?", requestId: "request_one"
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "pending");
  assert.equal((await call("studentB", "GET", "/api/messages/requests")).body.items.length, 1);
  assert.equal((await call("studentA", "GET", "/api/messages/requests")).body.items.length, 0);
  assert.equal((await call("studentB", "GET", "/api/messages/notifications")).body.items.length, 1);
  assert.equal((await call("studentC", "POST", "/api/messages/notifications/request-request_one/read")).status, 404);
  assert.equal((await call("studentA", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hello, can we connect?", requestId: "request_one"
  })).status, 200);
  assert.equal((await call("studentC", "PUT", "/api/messages/requests/request_one", { status: "accepted" })).status, 403);

  const accepted = await call("studentB", "PUT", "/api/messages/requests/request_one", { status: "accepted" });
  assert.equal(accepted.status, 200);
  const id = accepted.body.conversation.id;
  assert.equal(accepted.body.conversation.otherUid, "studentA");
  assert.equal((await call("studentA", "GET", "/api/messages/notifications")).body.items[0].type, "message-request-accepted");
  assert.equal((await call("studentA", "GET", "/api/messages/conversations")).body.items[0].id, id);
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items[0].id, id);

  const messagePayload = { text: "A private text message", messageId: "message_one" };
  assert.equal((await call("studentA", "POST", `/api/messages/conversations/${id}/messages`, messagePayload)).status, 201);
  assert.equal((await call("studentA", "POST", `/api/messages/conversations/${id}/messages`, messagePayload)).status, 200);
  const history = await call("studentB", "GET", `/api/messages/conversations/${id}/messages`);
  assert.deepEqual(history.body.messages.map((item) => item.text), ["Hello, can we connect?", "A private text message"]);
  const messageAlert = (await call("studentB", "GET", "/api/messages/notifications")).body.items
    .find((item) => item.type === "message");
  assert.ok(messageAlert);
  assert.equal((await call("studentB", "POST", `/api/messages/notifications/${messageAlert.id}/read`)).status, 200);
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items[0].unreadCount, 1);
  assert.equal((await call("studentC", "GET", `/api/messages/conversations/${id}/messages`)).status, 403);
  assert.equal((await call("studentA", "POST", `/api/messages/conversations/${id}/messages`, { ...messagePayload, text: "x", attachment: {} })).status, 400);

  assert.equal((await call("studentB", "POST", "/api/messages/blocked", { otherUid: "studentA" })).status, 200);
  assert.equal((await call("studentA", "POST", `/api/messages/conversations/${id}/messages`, { text: "Blocked", messageId: "message_after_block" })).status, 403);
  assert.equal((await call("studentA", "POST", "/api/messages/requests", { recipientUid: "studentB", text: "Again", requestId: "request_two" })).status, 403);
  assert.equal((await call("studentB", "GET", "/api/messages/blocked")).body.items[0].uid, "studentA");
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items.length, 0);

  assert.equal((await call("studentB", "DELETE", "/api/messages/blocked/studentA")).status, 200);
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items.length, 1);
});

test("declined requests cannot be continued or resent during the cooldown", async (t) => {
  const harness = createHarness();
  const server = harness.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function call(uid, method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${uid}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  assert.equal((await call("studentC", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hello", requestId: "request_decline"
  })).status, 201);
  assert.equal((await call("studentB", "PUT", "/api/messages/requests/request_decline", { status: "declined" })).status, 200);
  assert.equal((await call("studentC", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hello again", requestId: "request_decline_two"
  })).status, 429);
  assert.equal((await call("studentC", "PUT", "/api/messages/requests/request_decline", { status: "accepted" })).status, 403);
});
