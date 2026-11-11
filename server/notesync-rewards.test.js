"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { applySubmissionReward, resolveWithdrawalWallet } = require("./notesync-rewards");

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

test("rejected withdrawals restore coins and repeated resolution is idempotent", () => {
  const wallet = { availableCoins: 20, pendingRewards: 200, totalRedeemed: 0 };
  const result = resolveWithdrawalWallet(wallet, "withdrawal-1", "Rejected", 200, 1234);

  assert.equal(result.applied, true);
  assert.equal(result.wallet.availableCoins, 220);
  assert.equal(result.wallet.pendingRewards, 0);
  assert.equal(result.wallet.totalRedeemed, 0);
  assert.equal(resolveWithdrawalWallet(result.wallet, "withdrawal-1", "Rejected", 200, 5678).applied, false);
  assert.equal(resolveWithdrawalWallet(result.wallet, "withdrawal-1", "Paid", 200, 5678).conflict, true);
});

test("paid withdrawals reduce pending coins and increase redeemed totals once", () => {
  const wallet = { availableCoins: 0, pendingRewards: 400, totalRedeemed: 100 };
  const result = resolveWithdrawalWallet(wallet, "withdrawal-2", "Paid", 200, 1234);

  assert.equal(result.wallet.pendingRewards, 200);
  assert.equal(result.wallet.totalRedeemed, 300);
  assert.equal(resolveWithdrawalWallet(result.wallet, "withdrawal-2", "Paid", 200, 5678).applied, false);
});
