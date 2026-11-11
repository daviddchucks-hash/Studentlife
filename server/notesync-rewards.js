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

module.exports = { applySubmissionReward };
