"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { applySubmissionReward } = require("./notesync-rewards");

test("submission rewards update a wallet and record an idempotency marker", () => {
  const wallet = {
    studentUid: "student-1",
    availableCoins: 20,
    totalEarned: 20,
    totalRedeemed: 0
  };

  const updated = applySubmissionReward(wallet, "submission-1", 10, "Good notes", 1234);

  assert.deepEqual(updated, {
    studentUid: "student-1",
    availableCoins: 30,
    totalEarned: 30,
    totalRedeemed: 0,
    lastUpdated: 1234,
    rewardedSubmissionIds: { "submission-1": { amount: 10, qualityCategory: "Good notes", issuedAt: 1234 } }
  });
  assert.equal(wallet.availableCoins, 20);
});

test("submission rewards cannot be applied twice", () => {
  const wallet = {
    studentUid: "student-1",
    availableCoins: 30,
    totalEarned: 30,
    rewardedSubmissionIds: { "submission-1": { amount: 10, issuedAt: 1234 } }
  };

  assert.equal(applySubmissionReward(wallet, "submission-1", 10, "Good notes", 5678), null);
});
