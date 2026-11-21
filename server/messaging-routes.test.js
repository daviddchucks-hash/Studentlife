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
    if (this.database.optimisticNullFirstPass) {
      // Simulate Firebase RTDB uncached node transaction behavior:
      // Pass 1 receives `null`; returning `undefined` aborts immediately without reading server state.
      const optimistic = update(null);
      if (optimistic === undefined) {
        return Promise.resolve({ committed: false, snapshot: new Snapshot(null) });
      }
      const serverCurrent = clone(readPath(this.database.data, this.path) ?? null);
      if (serverCurrent === null) {
        if (this.path) writePath(this.database.data, this.path, optimistic);
        else this.database.data = clone(optimistic);
        return Promise.resolve({ committed: true, snapshot: new Snapshot(optimistic) });
      }
      // Server state differs from optimistic `null` baseline -> datastale retry with real server value
      const retryNext = update(clone(serverCurrent));
      if (retryNext === undefined) {
        return Promise.resolve({ committed: false, snapshot: new Snapshot(serverCurrent) });
      }
      if (this.path) writePath(this.database.data, this.path, retryNext);
      else this.database.data = clone(retryNext);
      return Promise.resolve({ committed: true, snapshot: new Snapshot(retryNext) });
    }
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
  constructor(data, options = {}) {
    this.data = clone(data);
    this.optimisticNullFirstPass = Boolean(options.optimisticNullFirstPass);
  }
  ref(path = "") { return new FakeReference(this, path); }
}

function createHarness(options = {}) {
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
  }, options);
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
  harness.database.data.users.studentC.profile.matricVerified = false;
  assert.equal((await call("studentA", "GET", "/api/messages/search?matric=C.300")).status, 404);
  harness.database.data.users.studentC.profile.matricVerified = true;

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
  const studentARequestsBefore = await call("studentA", "GET", "/api/messages/requests");
  assert.equal(studentARequestsBefore.body.items.length, 0);
  assert.equal(studentARequestsBefore.body.outgoing.length, 1);
  assert.equal(studentARequestsBefore.body.outgoing[0].status, "pending");
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
  assert.equal((await call("studentA", "GET", "/api/messages/requests")).body.outgoing[0].status, "accepted");
  assert.equal((await call("studentB", "GET", "/api/messages/requests")).body.items.length, 0);
  assert.equal((await call("studentA", "GET", "/api/messages/conversations")).body.items[0].id, id);
  assert.equal((await call("studentA", "GET", "/api/messages/conversations")).body.items[0].otherName, "Student B");
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items[0].id, id);
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items[0].otherName, "Student A");

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
  assert.equal((await call("studentA", "GET", "/api/messages/requests")).body.outgoing[0].status, "blocked");
  assert.equal((await call("studentA", "POST", `/api/messages/conversations/${id}/messages`, { text: "Blocked", messageId: "message_after_block" })).status, 403);
  assert.equal((await call("studentA", "POST", "/api/messages/requests", { recipientUid: "studentB", text: "Again", requestId: "request_two" })).status, 403);
  assert.equal((await call("studentB", "GET", "/api/messages/blocked")).body.items[0].uid, "studentA");
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items.length, 0);

  assert.equal((await call("studentB", "DELETE", "/api/messages/blocked/studentA")).status, 200);
  assert.equal((await call("studentB", "GET", "/api/messages/conversations")).body.items.length, 1);
});

test("Firebase optimistic null-first-pass transactions complete acceptance, sync both accounts, handle duplicate accepts, decline, block, and reject unauthorized actors", async (t) => {
  const harness = createHarness({ optimisticNullFirstPass: true });
  const server = harness.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function call(uid, method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  // Scenario G: unauthenticated request rejected
  assert.equal((await call("", "POST", "/api/messages/requests", { recipientUid: "studentB", text: "Hi", requestId: "unauth_1" })).status, 401);

  // Scenario A: Send + Accept with optimistic null-first-pass transactions
  const sendRes = await call("studentA", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hey Student B, let's study together", requestId: "req_opt_1"
  });
  assert.equal(sendRes.status, 201);

  // Scenario G: Unauthorized third student cannot accept/decline/block
  assert.equal((await call("studentC", "PUT", "/api/messages/requests/req_opt_1", { status: "accepted" })).status, 403);
  assert.equal((await call("studentC", "PUT", "/api/messages/requests/req_opt_1", { status: "declined" })).status, 403);
  assert.equal((await call("studentC", "PUT", "/api/messages/requests/req_opt_1", { status: "blocked" })).status, 403);

  // Scenario D: Concurrent / duplicate accept calls
  const [accept1, accept2] = await Promise.all([
    call("studentB", "PUT", "/api/messages/requests/req_opt_1", { status: "accepted" }),
    call("studentB", "PUT", "/api/messages/requests/req_opt_1", { status: "accepted" })
  ]);
  assert.equal(accept1.status, 200);
  assert.equal(accept2.status, 200);
  assert.equal(accept1.body.status, "accepted");
  assert.equal(accept2.body.status, "accepted");
  assert.equal(accept1.body.conversation.id, accept2.body.conversation.id);
  const convId = accept1.body.conversation.id;

  // Scenario F: Verify real-time RTDB nodes are synchronized on both accounts without refresh
  const rtdb = harness.database.data.messaging;
  assert.equal(rtdb.userRequests?.studentB?.req_opt_1, undefined);
  assert.equal(rtdb.outgoingRequests.studentA.req_opt_1.status, "accepted");
  assert.equal(rtdb.outgoingRequests.studentA.req_opt_1.conversationId, convId);
  assert.equal(rtdb.userConversations.studentA[convId].otherName, "Student B");
  assert.equal(rtdb.userConversations.studentB[convId].otherName, "Student A");
  assert.equal(rtdb.conversationAccess.studentA[convId], true);
  assert.equal(rtdb.conversationAccess.studentB[convId], true);
  assert.equal(rtdb.notifications.studentA["accepted-req_opt_1"].type, "message-request-accepted");
  assert.equal(rtdb.notifications.studentA["accepted-req_opt_1"].conversationId, convId);

  // Trying to decline or block an already accepted request returns accurate message
  const lateDecline = await call("studentB", "PUT", "/api/messages/requests/req_opt_1", { status: "declined" });
  assert.equal(lateDecline.status, 409);
  assert.equal(lateDecline.body.error, "This message request was already accepted.");

  // Two-way messaging works with optimistic null-first-pass transactions & unread counts update cleanly
  assert.equal((await call("studentA", "POST", `/api/messages/conversations/${convId}/messages`, {
    text: "Glad you accepted!", messageId: "msg_opt_1"
  })).status, 201);
  assert.equal((await call("studentB", "POST", `/api/messages/conversations/${convId}/messages`, {
    text: "Happy to connect!", messageId: "msg_opt_2"
  })).status, 201);
  assert.equal((await call("studentB", "POST", `/api/messages/conversations/${convId}/read`)).status, 200);
  assert.equal(rtdb.userConversations.studentB[convId].unreadCount, 0);

  // Scenario E: Fresh reads simulating reload/re-login preserve single conversation and full history
  const connsA = await call("studentA", "GET", "/api/messages/conversations");
  const connsB = await call("studentB", "GET", "/api/messages/conversations");
  assert.equal(connsA.body.items.length, 1);
  assert.equal(connsB.body.items.length, 1);
  const msgs = await call("studentA", "GET", `/api/messages/conversations/${convId}/messages`);
  assert.deepEqual(msgs.body.messages.map((m) => m.text), [
    "Hey Student B, let's study together",
    "Glad you accepted!",
    "Happy to connect!"
  ]);

  // Scenario B: Decline syncs outgoingRequests and removes userRequests, does not create conversation
  assert.equal((await call("studentC", "POST", "/api/messages/requests", {
    recipientUid: "studentA", text: "Hi A", requestId: "req_decline_1"
  })).status, 201);
  const declined = await call("studentA", "PUT", "/api/messages/requests/req_decline_1", { status: "declined" });
  assert.equal(declined.status, 200);
  assert.equal(declined.body.status, "declined");
  assert.equal(rtdb.userRequests?.studentA?.req_decline_1, undefined);
  assert.equal(rtdb.outgoingRequests.studentC.req_decline_1.status, "declined");
  assert.equal(rtdb.notifications.studentC["declined-req_decline_1"].type, "message-request-declined");
  assert.equal((await call("studentC", "GET", "/api/messages/conversations")).body.items.length, 0);
  const acceptAfterDecline = await call("studentA", "PUT", "/api/messages/requests/req_decline_1", { status: "accepted" });
  assert.equal(acceptAfterDecline.status, 409);
  assert.equal(acceptAfterDecline.body.error, "This message request was already declined.");

  // Scenario C: Blocking from incoming request blocks search, future requests, and syncs outgoingRequests
  assert.equal((await call("studentC", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Hi B", requestId: "req_block_1"
  })).status, 201);
  const blocked = await call("studentB", "PUT", "/api/messages/requests/req_block_1", { status: "blocked" });
  assert.equal(blocked.status, 200);
  assert.equal(rtdb.outgoingRequests.studentC.req_block_1.status, "blocked");
  assert.equal((await call("studentC", "GET", "/api/messages/search?matric=B%2F200")).status, 403);
  assert.equal((await call("studentC", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Ping", requestId: "req_block_2"
  })).status, 403);
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

test("Messaging V6 features: replies, pagination, delivery/read states, delete-for-me/everyone, typing, and presence", async (t) => {
  const harness = createHarness();
  const server = harness.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  async function call(uid, method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${uid}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  }

  // Establish active conversation between studentA and studentB
  assert.equal((await call("studentA", "POST", "/api/messages/requests", {
    recipientUid: "studentB", text: "Initial study question", requestId: "v6_req_1"
  })).status, 201);
  const acceptRes = await call("studentB", "PUT", "/api/messages/requests/v6_req_1", { status: "accepted" });
  assert.equal(acceptRes.status, 200);
  const convId = acceptRes.body.conversation.id;

  // Send two messages and verify server-stored deliveryStatus === "sent"
  const m1 = await call("studentA", "POST", `/api/messages/conversations/${convId}/messages`, {
    text: "Meet at the library?", messageId: "v6_msg_1"
  });
  assert.equal(m1.status, 201);
  assert.equal(m1.body.message.deliveryStatus, "sent");

  // Wait 2ms so timestamps are strictly ordered for pagination tests
  await new Promise((r) => setTimeout(r, 3));
  const m2 = await call("studentB", "POST", `/api/messages/conversations/${convId}/messages`, {
    text: "Yes, 4pm works great!", messageId: "v6_msg_2", replyToMessageId: "v6_msg_1"
  });
  assert.equal(m2.status, 201);
  assert.equal(m2.body.message.replyToMessageId, "v6_msg_1");
  assert.equal(m2.body.message.replyToSenderUid, "studentA");
  assert.equal(m2.body.message.replyToSenderName, "Student A");
  assert.equal(m2.body.message.replyToText, "Meet at the library?");

  // Reject invalid reply target
  const badReply = await call("studentA", "POST", `/api/messages/conversations/${convId}/messages`, {
    text: "Bad quote", messageId: "v6_msg_bad_reply", replyToMessageId: "nonexistent_id"
  });
  assert.equal(badReply.status, 400);

  // Delivery and read status lifecycle on studentA's message v6_msg_1
  const deliveredRes = await call("studentB", "POST", `/api/messages/conversations/${convId}/delivered`);
  assert.equal(deliveredRes.status, 200);
  const afterDelivered = (await call("studentA", "GET", `/api/messages/conversations/${convId}/messages`)).body.messages;
  const v6Msg1Delivered = afterDelivered.find((m) => m.id === "v6_msg_1");
  assert.equal(v6Msg1Delivered.deliveryStatus, "delivered");
  assert.ok(v6Msg1Delivered.deliveredAt > 0);

  const readRes = await call("studentB", "POST", `/api/messages/conversations/${convId}/read`);
  assert.equal(readRes.status, 200);
  const afterRead = (await call("studentA", "GET", `/api/messages/conversations/${convId}/messages`)).body.messages;
  const v6Msg1Read = afterRead.find((m) => m.id === "v6_msg_1");
  assert.equal(v6Msg1Read.deliveryStatus, "read");
  assert.equal(v6Msg1Read.readBy.studentB, true);
  assert.ok(v6Msg1Read.readAt > 0);

  // Typing & Presence endpoints + payload validation
  assert.equal((await call("studentA", "PUT", `/api/messages/conversations/${convId}/typing`, { isTyping: true, extra: 1 })).status, 400);
  assert.equal((await call("studentA", "PUT", `/api/messages/conversations/${convId}/typing`, { isTyping: true })).status, 200);
  assert.equal((await call("studentA", "PUT", "/api/messages/presence", { online: true, spoof: 1 })).status, 400);
  assert.equal((await call("studentA", "PUT", "/api/messages/presence", { online: true })).status, 200);

  const bView = await call("studentB", "GET", `/api/messages/conversations/${convId}/messages?limit=2`);
  assert.equal(bView.status, 200);
  assert.equal(bView.body.otherTyping, true);
  assert.equal(bView.body.otherPresence.online, true);
  assert.equal(bView.body.hasMore, true);
  assert.equal(bView.body.messages.length, 2);

  // Pagination: load older messages before oldest loaded timestamp
  const oldestLoadedTs = bView.body.messages[0].createdAt;
  const olderView = await call("studentB", "GET", `/api/messages/conversations/${convId}/messages?limit=2&before=${oldestLoadedTs}`);
  assert.equal(olderView.status, 200);
  assert.equal(olderView.body.hasMore, false);
  assert.equal(olderView.body.messages.length, 1);
  assert.equal(olderView.body.messages[0].id, "request_v6_req_1");

  // Delete for me hides only for caller
  const delMe = await call("studentA", "DELETE", `/api/messages/conversations/${convId}/messages/v6_msg_2?scope=me`);
  assert.equal(delMe.status, 200);
  const aMessagesAfterDelMe = (await call("studentA", "GET", `/api/messages/conversations/${convId}/messages`)).body.messages;
  const bMessagesAfterDelMe = (await call("studentB", "GET", `/api/messages/conversations/${convId}/messages`)).body.messages;
  assert.equal(aMessagesAfterDelMe.some((m) => m.id === "v6_msg_2"), false);
  assert.equal(bMessagesAfterDelMe.some((m) => m.id === "v6_msg_2"), true);

  // Unauthorized delete-for-everyone rejected (studentB cannot delete studentA's message for everyone)
  const unauthDelAll = await call("studentB", "DELETE", `/api/messages/conversations/${convId}/messages/v6_msg_1?scope=everyone`);
  assert.equal(unauthDelAll.status, 403);

  // Authorized sender delete-for-everyone wipes message text for both and blocks future replies to it
  const authDelAll = await call("studentA", "DELETE", `/api/messages/conversations/${convId}/messages/v6_msg_1?scope=everyone`);
  assert.equal(authDelAll.status, 200);
  const bAfterDelAll = (await call("studentB", "GET", `/api/messages/conversations/${convId}/messages`)).body.messages;
  const wiped = bAfterDelAll.find((m) => m.id === "v6_msg_1");
  assert.equal(wiped.deletedForEveryone, true);
  assert.equal(wiped.text, "");

  const replyDeleted = await call("studentB", "POST", `/api/messages/conversations/${convId}/messages`, {
    text: "Replying to wiped", messageId: "v6_msg_reply_wiped", replyToMessageId: "v6_msg_1"
  });
  assert.equal(replyDeleted.status, 400);
});

