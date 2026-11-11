"use strict";

const { createHash } = require("node:crypto");

const REQUEST_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

function pairId(firstUid, secondUid) {
  const pair = [firstUid, secondUid].sort();
  return createHash("sha256").update(`${pair[0]}\0${pair[1]}`).digest("hex");
}

function conversationId(firstUid, secondUid) {
  return `dm_${pairId(firstUid, secondUid)}`;
}

function matricLookupKey(normalizedMatricNumber) {
  return `v2_${createHash("sha256").update(normalizedMatricNumber).digest("hex")}`;
}

function isPairBlocked(blocks, firstUid, secondUid) {
  return Boolean(blocks?.[firstUid]?.[secondUid] || blocks?.[secondUid]?.[firstUid]);
}

function requestDecision(pair, conversation, now) {
  if (conversation?.status === "active") return "conversation-exists";
  if (pair?.status === "pending") return "request-pending";
  if (pair?.status === "declined" && now - Number(pair.updatedAt || pair.createdAt || 0) < REQUEST_COOLDOWN_MS) {
    return "cooldown";
  }
  return "create";
}

function publicMessagingProfile(uid, profile = {}) {
  return {
    uid,
    name: typeof profile.name === "string" && profile.name.trim() ? profile.name.trim().slice(0, 100) : "Student",
    department: typeof profile.department === "string" ? profile.department.trim().slice(0, 120) : "",
    level: typeof profile.level === "string" ? profile.level.trim().slice(0, 30) : "",
    profilePicture: typeof profile.profilePicture === "string" && /^https:\/\/\S+$/i.test(profile.profilePicture)
      ? profile.profilePicture.slice(0, 1000)
      : ""
  };
}

module.exports = {
  REQUEST_COOLDOWN_MS,
  pairId,
  conversationId,
  matricLookupKey,
  isPairBlocked,
  requestDecision,
  publicMessagingProfile
};
