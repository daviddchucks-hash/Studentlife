"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { rules } = require("../firebase.rules.json");

test("Realtime Database messaging reads are scoped and client writes remain denied", () => {
  const messaging = rules.messaging;
  assert.match(messaging.messages.$conversationId[".read"], /conversationAccess/);
  assert.match(messaging.messages.$conversationId[".read"], /participants/);
  assert.match(messaging.userConversations.$uid[".read"], /auth\.uid === \$uid/);
  assert.match(messaging.userRequests.$uid[".read"], /auth\.uid === \$uid/);
  assert.match(messaging.blocks.$uid[".read"], /auth\.uid === \$uid/);
  assert.equal(messaging.messages.$conversationId[".write"], false);
  assert.equal(messaging.userConversations.$uid[".write"], false);
  assert.equal(messaging.userRequests.$uid[".write"], false);
});
