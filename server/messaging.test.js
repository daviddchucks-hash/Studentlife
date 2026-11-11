"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REQUEST_COOLDOWN_MS,
  pairId,
  conversationId,
  isPairBlocked,
  requestDecision,
  publicMessagingProfile
} = require("./messaging");

test("direct-message IDs are stable and independent of participant order", () => {
  assert.equal(pairId("student-a", "student-b"), pairId("student-b", "student-a"));
  assert.equal(conversationId("student-a", "student-b"), conversationId("student-b", "student-a"));
  assert.match(conversationId("student-a", "student-b"), /^dm_[a-f0-9]{64}$/);
});

test("request policy rejects duplicates and enforces a decline cooldown", () => {
  const now = 10_000_000;
  assert.equal(requestDecision({ status: "pending" }, null, now), "request-pending");
  assert.equal(requestDecision(null, { status: "active" }, now), "conversation-exists");
  assert.equal(requestDecision({ status: "declined", updatedAt: now - 1 }, null, now), "cooldown");
  assert.equal(requestDecision({ status: "declined", updatedAt: now - REQUEST_COOLDOWN_MS - 1 }, null, now), "create");
  assert.equal(requestDecision({ status: "blocked" }, null, now), "create");
});

test("block checks are symmetric and public messaging profiles omit private fields", () => {
  const blocks = { "student-a": { "student-b": { createdAt: 1 } } };
  assert.equal(isPairBlocked(blocks, "student-a", "student-b"), true);
  assert.equal(isPairBlocked(blocks, "student-b", "student-a"), true);
  assert.equal(isPairBlocked({}, "student-a", "student-b"), false);
  assert.deepEqual(publicMessagingProfile("student-a", {
    name: " Ada Student ",
    department: "Computing",
    level: "100",
    profilePicture: "https://example.test/avatar.png",
    matricNumber: "PRIVATE",
    email: "private@example.test",
    phone: "000"
  }), {
    uid: "student-a",
    name: "Ada Student",
    department: "Computing",
    level: "100",
    profilePicture: "https://example.test/avatar.png"
  });
});
