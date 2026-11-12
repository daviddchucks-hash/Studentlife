"use strict";

const { matricLookupKey } = require("./messaging");
const { validateRegistrationMatricNumber } = require("./validation");

async function updateStudentMatricNumber(database, uid, value) {
  const matricNumber = validateRegistrationMatricNumber(value);
  const profileRef = database.ref(`users/${uid}/profile`);
  const profileSnapshot = await profileRef.get();
  const existing = profileSnapshot.val() || {};
  const previousMatric = String(existing.matricNumber || "").trim().replace(/\s+/g, "").toUpperCase();
  const usersSnapshot = await database.ref("users").get();
  const users = usersSnapshot.val() || {};

  for (const [otherUid, entry] of Object.entries(users)) {
    const profile = entry?.profile || {};
    const otherMatric = String(profile.matricNumber || "").trim().replace(/\s+/g, "").toUpperCase();
    if (otherUid !== uid && otherMatric === matricNumber) {
      throw Object.assign(new Error("This matriculation number is already registered to another student."), { statusCode: 409 });
    }
  }

  const lookupRef = database.ref(`matricLookup/${matricLookupKey(matricNumber)}`);
  const lookupResult = await lookupRef.transaction((currentUid) =>
    currentUid && currentUid !== uid ? undefined : uid
  );
  if (!lookupResult.committed) {
    throw Object.assign(new Error("This matriculation number is already registered to another student."), { statusCode: 409 });
  }

  const wasVerified = existing.matricVerified === true;
  const saved = { ...existing, matricNumber, matricVerified: true, updatedAt: Date.now() };
  try {
    await profileRef.set(saved);
  } catch (error) {
    if (!wasVerified || matricNumber !== previousMatric) {
      await lookupRef.transaction((currentUid) => currentUid === uid ? null : undefined);
    }
    throw error;
  }

  if (previousMatric && previousMatric !== matricNumber) {
    await database.ref(`matricLookup/${matricLookupKey(previousMatric)}`).transaction((currentUid) =>
      currentUid === uid ? null : undefined
    );
  }

  return saved;
}

module.exports = { updateStudentMatricNumber };
