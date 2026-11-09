"use strict";

const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { refreshCourseIndex } = require("./coursemate");

async function main() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!serviceAccountJson || !databaseURL) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL before running this migration.");
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  const app = getApps()[0] || initializeApp({
    credential: cert(serviceAccount),
    databaseURL
  });
  const database = getDatabase(app);
  const usersSnap = await database.ref("users").get();
  const users = usersSnap.val() || {};
  const userIds = Object.keys(users);
  for (const uid of userIds) await refreshCourseIndex(database, uid);
  console.log(`Indexed registered courses for ${userIds.length} existing users.`);
  await app.delete();
}

main().catch((error) => {
  console.error("CourseMate course-index migration failed:", error.message);
  process.exitCode = 1;
});
