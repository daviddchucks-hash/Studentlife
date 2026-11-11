"use strict";

function applySubmissionReward(wallet, submissionId, rewardCoins, qualityCategory, timestamp) {
  const rewardedSubmissionIds = wallet.rewardedSubmissionIds || {};
  if (Object.prototype.hasOwnProperty.call(rewardedSubmissionIds, submissionId)) return null;

  return {
    ...wallet,
    availableCoins: (Number(wallet.availableCoins) || 0) + rewardCoins,
    totalEarned: (Number(wallet.totalEarned) || 0) + rewardCoins,
    lastUpdated: timestamp,
    rewardedSubmissionIds: {
      ...rewardedSubmissionIds,
      [submissionId]: { amount: rewardCoins, qualityCategory, issuedAt: timestamp }
    }
  };
}

function resolveWithdrawalWallet(wallet, withdrawalId, status, coins, timestamp) {
  const resolutions = wallet.withdrawalResolutions || {};
  const existing = resolutions[withdrawalId];
  if (existing) {
    return existing.status === status
      ? { wallet, applied: false, resolution: existing }
      : { wallet, applied: false, conflict: true };
  }
  if (!Number.isInteger(coins) || coins <= 0 || (Number(wallet.pendingRewards) || 0) < coins) {
    return { wallet, applied: false, conflict: true };
  }

  const resolution = { status, coins, resolvedAt: timestamp };
  const nextWallet = {
    ...wallet,
    pendingRewards: (Number(wallet.pendingRewards) || 0) - coins,
    availableCoins: (Number(wallet.availableCoins) || 0) + (status === "Rejected" ? coins : 0),
    totalRedeemed: (Number(wallet.totalRedeemed) || 0) + (status === "Paid" ? coins : 0),
    lastUpdated: timestamp,
    withdrawalResolutions: { ...resolutions, [withdrawalId]: resolution }
  };
  return { wallet: nextWallet, applied: true, resolution };
}

module.exports = { applySubmissionReward, resolveWithdrawalWallet };
