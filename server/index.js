"use strict";

const { createHash } = require("node:crypto");
const express = require("express");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const { registerCourseMateRoutes, refreshCourseIndex } = require("./coursemate");
const { registerMessagingRoutes } = require("./messaging-routes");
const { matricLookupKey } = require("./messaging");
const { applySubmissionReward, resolveWithdrawalWallet } = require("./notesync-rewards");
const { isPublicLostFoundItem, publicLostFoundItem } = require("./public-data");
const {
  definitions,
  getDefinition,
  snapshotToList,
  validRecordId,
  validateMatricNumber,
  validateRecord,
  validateFormula,
  validateProfile,
  validateDirectoryItem,
  validateEvent,
  validateMarketplaceListing,
  validateJobListing,
  validateOpportunity,
  validateLostFoundItem,
  validateLostFoundClaim,
  validateAnnouncement,
  validateFeedback,
  validateReport,
  validateNoteSyncCourse,
  validateNoteSyncSubmission,
  validateNoteSyncApplication,
  validateNoteSyncWithdrawal,
  validateNoteSyncNotification,
  validateLectureTrackReminder,
  validateLectureTrackAttendance,
  NOTE_SYNC_SUBMISSION_STATUSES,
  NOTE_SYNC_APPLICATION_STATUSES,
  NOTE_SYNC_REWARD_CATEGORIES
} = require("./validation");

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!serviceAccountJson || !databaseURL) {
  throw new Error("Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL in the Render environment.");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
}
const projectId = serviceAccount.projectId || serviceAccount.project_id;
const clientEmail = serviceAccount.clientEmail || serviceAccount.client_email;
const privateKey = serviceAccount.privateKey || serviceAccount.private_key;
if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase service account JSON is missing required fields.");
}
try {
  if (new URL(databaseURL).protocol !== "https:") throw new Error();
} catch {
  throw new Error("FIREBASE_DATABASE_URL must be the HTTPS URL shown in Firebase Console.");
}

const adminApp = getApps()[0] || initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey: String(privateKey).replace(/\\n/g, "\n")
  }),
  databaseURL
});
const firebaseAuth = getAuth(adminApp);
const database = getDatabase(adminApp);
const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "https://daviddchucks-hash.github.io")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Vary", "Origin");
  const origin = req.headers.origin;
  if (origin) {
    if (!allowedOrigins.includes(origin)) return res.status(403).json({ error: "This website is not allowed to use the API." });
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "32kb", strict: true }));

const rateWindows = new Map();
app.use("/api", (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  let windowState = rateWindows.get(key);
  if (!windowState || now - windowState.startedAt >= 60_000) {
    if (!windowState && rateWindows.size >= 5000) {
      for (const [ip, item] of rateWindows) {
        if (now - item.startedAt >= 60_000) rateWindows.delete(ip);
      }
      if (rateWindows.size >= 5000) return res.status(503).json({ error: "The API is temporarily busy. Try again shortly." });
    }
    windowState = { startedAt: now, count: 0 };
    rateWindows.set(key, windowState);
  }
  windowState.count += 1;
  res.set("X-RateLimit-Limit", "120");
  res.set("X-RateLimit-Remaining", String(Math.max(0, 120 - windowState.count)));
  if (windowState.count > 120) return res.status(429).json({ error: "Too many requests. Please wait and try again." });
  next();
});

async function requireAuth(req, res, next) {
  res.set("Cache-Control", "no-store");
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Sign in to continue." });
  try {
    req.user = await firebaseAuth.verifyIdToken(match[1], true);
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or expired. Sign in again." });
  }
}

function checkIsAdmin(user) {
  if (!user) return false;
  if (user.admin === true) return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && adminEmails.includes(user.email.toLowerCase())) return true;
  const adminUids = (process.env.ADMIN_UIDS || "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  if (user.uid && adminUids.includes(user.uid)) return true;
  return false;
}

function requireAdmin(req, res, next) {
  if (!checkIsAdmin(req.user)) {
    return res.status(403).json({ error: "Administrator access required." });
  }
  next();
}

function userRef(uid, path) {
  return database.ref(`users/${uid}/${path}`);
}

async function readRecords(uid, path) {
  const snapshot = await userRef(uid, path).get();
  return snapshotToList(snapshot.val());
}

function validUid(uid) {
  return typeof uid === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
}

const messageSearchWindows = new Map();
const messageActionWindows = new Map();

function allowMessageSearch(key) {
  const now = Date.now();
  const state = messageSearchWindows.get(key) || { startedAt: now, count: 0 };
  if (now - state.startedAt >= 60_000) {
    state.startedAt = now;
    state.count = 0;
  }
  state.count += 1;
  messageSearchWindows.set(key, state);
  return state.count <= 10;
}

function allowMessageAction(key, limit, windowMs = 60_000) {
  const now = Date.now();
  const state = messageActionWindows.get(key);
  if (!state || now - state.startedAt >= windowMs) {
    messageActionWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  state.count += 1;
  return state.count <= limit;
}

function sortByDate(items, key) {
  return items.sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || "")));
}

function daysFromToday(dateValue) {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = new Date().toISOString().slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86_400_000);
}

app.get("/api/health", (req, res) => res.json({ ok: true, service: "afitstudentlife-api" }));

async function getProfileSnapshot(uid) {
  const snap = await database.ref(`users/${uid}/profile`).get();
  return snap.val() || {};
}

function isNoteSyncEligible(profile = {}) {
  const level = String(profile.level || "").trim();
  return level === "100";
}

function coinsForQuality(category) {
  const reward = {
    "Basic acceptable notes": 5,
    "Good notes": 10,
    "Very good notes": 15,
    "Excellent notes": 20
  };
  return reward[category] ?? 0;
}

async function ensureNoteSyncWallet(uid) {
  const walletRef = database.ref(`notesync/wallets/${uid}`);
  const empty = {
    studentUid: uid,
    availableCoins: 0,
    pendingRewards: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    totalAvailableValue: 0,
    lastUpdated: Date.now(),
    withdrawnThisPeriod: 0
  };
  const result = await walletRef.transaction((current) => current || empty);
  return result.snapshot.val();
}

async function appendNotification(userUid, title, message, destination = "notesync") {
  const ref = await database.ref("notesync/notifications").push({
    userUid,
    title,
    message,
    destination,
    read: false,
    createdAt: Date.now()
  });
  return ref.key;
}

app.get("/api/notesync/eligibility", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    const eligible = isNoteSyncEligible(profile);
    res.json({
      eligible,
      level: String(profile.level || "").trim(),
      department: String(profile.department || "").trim(),
      noteSyncEnabled: true,
      applicationOpen: !eligible,
      message: eligible
        ? "Eligible 100-level students can contribute and earn AFT Coins."
        : "NoteSync is currently operating for 100-level students only. Other levels may apply for future integration."
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/course-catalog", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "NoteSync is restricted to 100-level students in this version." });
    const snap = await database.ref("notesync/courses").get();
    const items = snapshotToList(snap.val()).filter((course) => {
      const matchesDepartment = !req.query.department || String(course.department || "").toLowerCase() === String(req.query.department).toLowerCase();
      const matchesLevel = !req.query.level || String(course.level || "").toLowerCase() === String(req.query.level).toLowerCase();
      const matchesSemester = !req.query.semester || String(course.semester || "").toLowerCase() === String(req.query.semester).toLowerCase();
      const matchesSession = !req.query.session || String(course.session || "").toLowerCase() === String(req.query.session).toLowerCase();
      return matchesDepartment && matchesLevel && matchesSemester && matchesSession && course.active !== false;
    });
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/notesync/applications", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    const payload = validateNoteSyncApplication({
      ...req.body,
      studentUid: req.user.uid,
      fullName: req.body.fullName || profile.name || req.user.name || req.user.email || "",
      department: req.body.department || profile.department || "",
      currentLevel: req.body.currentLevel || profile.level || "",
      email: req.body.email || req.user.email || "",
      studentNumber: req.body.studentNumber || profile.studentNumber || ""
    });
    const ref = await database.ref("notesync/levelApplications").push({
      ...payload,
      studentUid: req.user.uid,
      submittedAt: Date.now(),
      updatedAt: Date.now()
    });
    await appendNotification(req.user.uid, "Level application received", "Your NoteSync integration request has been submitted for review.");
    res.status(201).json({ id: ref.key, record: { ...payload, studentUid: req.user.uid, submittedAt: Date.now(), updatedAt: Date.now() } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/submissions", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "Only 100-level students can access NoteSync submissions." });
    const snap = await database.ref("notesync/submissions").get();
    const items = snapshotToList(snap.val()).filter((submission) => submission.studentUid === req.user.uid);
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/library", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "NoteSync library access is restricted to 100-level students." });

    const search = String(req.query.search || "").trim().toLowerCase();
    const department = String(req.query.department || profile.department || "").trim();
    const level = String(req.query.level || profile.level || "").trim();
    const semester = String(req.query.semester || "").trim();
    const academicSession = String(req.query.academicSession || "").trim();

    const snap = await database.ref("notesync/submissions").get();
    const items = snapshotToList(snap.val())
      .filter((submission) => submission.status === "Approved")
      .filter((submission) => !department || String(submission.department || "").toLowerCase() === department.toLowerCase())
      .filter((submission) => !level || String(submission.level || "").toLowerCase() === level.toLowerCase())
      .filter((submission) => !semester || String(submission.semester || "").toLowerCase() === semester.toLowerCase())
      .filter((submission) => !academicSession || String(submission.academicSession || "").toLowerCase() === academicSession.toLowerCase())
      .filter((submission) => {
        if (!search) return true;
        const haystack = [
          submission.courseCode,
          submission.courseTitle,
          submission.lectureTopic,
          submission.department,
          submission.level,
          submission.semester,
          submission.academicSession
        ].join(" ").toLowerCase();
        return haystack.includes(search);
      })
      .map((submission) => ({
        id: submission.id,
        courseCode: submission.courseCode,
        courseTitle: submission.courseTitle,
        lectureTopic: submission.lectureTopic,
        department: submission.department,
        level: submission.level,
        semester: submission.semester,
        academicSession: submission.academicSession,
        lectureWeek: submission.lectureWeek,
        lectureDate: submission.lectureDate,
        studentName: submission.studentName,
        qualityCategory: submission.qualityCategory,
        createdAt: submission.createdAt
      }));

    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/library/:id", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "NoteSync library access is restricted to 100-level students." });

    const ref = database.ref(`notesync/submissions/${req.params.id}`);
    const snap = await ref.get();
    if (!snap.exists()) return res.status(404).json({ error: "Note not found." });
    const item = snap.val();
    if (item.status !== "Approved") return res.status(403).json({ error: "This note is not approved for the public library." });

    res.json({
      item: {
        id: req.params.id,
        courseCode: item.courseCode,
        courseTitle: item.courseTitle,
        lectureTopic: item.lectureTopic,
        department: item.department,
        level: item.level,
        semester: item.semester,
        academicSession: item.academicSession,
        lectureWeek: item.lectureWeek,
        lectureDate: item.lectureDate,
        studentName: item.studentName,
        qualityCategory: item.qualityCategory,
        notesText: item.notesText,
        noteType: "typed",
        downloadUrl: null,
        fileType: "typed",
        createdAtLabel: item.createdAt ? new Date(Number(item.createdAt)).toISOString() : null
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/library/:id/download", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "NoteSync library access is restricted to 100-level students." });

    const ref = database.ref(`notesync/submissions/${req.params.id}`);
    const snap = await ref.get();
    if (!snap.exists()) return res.status(404).json({ error: "Note not found." });
    const item = snap.val();
    if (item.status !== "Approved") return res.status(403).json({ error: "This note is not approved for download." });

    const fileName = `${String(item.courseCode || "note").replace(/\s+/g, "-")}.txt`;
    res.json({
      downloadUrl: null,
      fileName,
      contentType: "text/plain",
      preview: String(item.notesText || "")
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/lecture-track", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "LectureTrack is available only to eligible 100-level students." });

    const [remindersSnap, attendanceSnap] = await Promise.all([
      database.ref("notesync/lectureTrack/reminders").get(),
      database.ref("notesync/lectureTrack/attendance").get()
    ]);

    res.json({
      reminders: snapshotToList(remindersSnap.val()).filter((item) => item.userUid === req.user.uid),
      attendance: snapshotToList(attendanceSnap.val()).filter((item) => item.userUid === req.user.uid)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/notesync/lecture-track/reminders", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "LectureTrack is available only to eligible 100-level students." });

    const payload = validateLectureTrackReminder({ ...req.body, userUid: req.user.uid });
    const ref = await database.ref("notesync/lectureTrack/reminders").push({
      ...payload,
      userUid: req.user.uid,
      createdAt: Date.now()
    });
    res.status(201).json({ id: ref.key, record: { ...payload, userUid: req.user.uid, createdAt: Date.now() } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/notesync/lecture-track/attendance", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "LectureTrack is available only to eligible 100-level students." });

    const payload = validateLectureTrackAttendance({ ...req.body, userUid: req.user.uid });
    const ref = await database.ref("notesync/lectureTrack/attendance").push({
      ...payload,
      userUid: req.user.uid,
      createdAt: Date.now()
    });
    res.status(201).json({ id: ref.key, record: { ...payload, userUid: req.user.uid, createdAt: Date.now() } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/notesync/submissions", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "Only eligible 100-level students can upload NoteSync submissions." });
    const payload = validateNoteSyncSubmission({
      ...req.body,
      studentUid: req.user.uid,
      studentName: req.body.studentName || profile.name || req.user.name || req.user.email || "",
      department: req.body.department || profile.department || "",
      level: req.body.level || profile.level || "100",
      attachmentCount: Number(req.body.attachmentCount || 0),
      attachmentRefs: Array.isArray(req.body.attachmentRefs) ? req.body.attachmentRefs : [],
      status: "Pending Review"
    });
    const duplicateKey = [req.user.uid, payload.courseCode, payload.lectureDate, payload.lectureWeek, payload.lectureTopic].join("|");
    const duplicateHash = createHash("sha256").update(duplicateKey).digest("hex");
    const existing = await database.ref("notesync/submissions").get();
    const duplicates = snapshotToList(existing.val()).filter((item) => item.studentUid === req.user.uid && item.duplicateHash === duplicateKey);
    if (duplicates.length > 0) {
      return res.status(409).json({ error: "A matching note submission already exists for this course, lecture date, and topic." });
    }
    const submissionRef = database.ref("notesync/submissions").push();
    const keyRef = database.ref(`notesync/submissionKeys/${duplicateHash}`);
    const reservation = await keyRef.transaction((current) =>
      current ? undefined : { studentUid: req.user.uid, submissionId: submissionRef.key }
    );
    if (!reservation.committed) {
      return res.status(409).json({ error: "A matching note submission already exists for this course, lecture date, and topic." });
    }
    const now = Date.now();
    const saved = {
      ...payload,
      duplicateHash: duplicateKey,
      createdAt: now,
      updatedAt: now,
      reviewNotes: "",
      rejectionReason: "",
      qualityCategory: "",
      rewardCoins: 0
    };
    try {
      await database.ref().update({
        [`notesync/submissions/${submissionRef.key}`]: saved,
        [`notesync/submissionKeys/${duplicateHash}`]: { studentUid: req.user.uid, submissionId: submissionRef.key },
        [`notesync/notifications/submission-${submissionRef.key}`]: {
          userUid: req.user.uid,
          title: "Submission received",
          message: "Your lecture note has been submitted and is now awaiting review.",
          destination: "notesync",
          read: false,
          createdAt: now
        }
      });
    } catch (error) {
      await keyRef.transaction((current) => current?.submissionId === submissionRef.key ? null : undefined);
      throw error;
    }
    res.status(201).json({ id: submissionRef.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/wallet", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "Only 100-level students have NoteSync rewards access." });
    const wallet = await ensureNoteSyncWallet(req.user.uid);
    const transactionsSnap = await database.ref("notesync/transactions").get();
    const transactions = snapshotToList(transactionsSnap.val()).filter((tx) => tx.studentUid === req.user.uid);
    transactions.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
    res.json({ wallet, transactions: transactions.slice(0, 20), conversionRate: { base: 200, naira: 1000, label: "200 AFT Coins = ₦1,000" } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/notesync/withdrawals", requireAuth, async (req, res, next) => {
  try {
    const profile = await getProfileSnapshot(req.user.uid);
    if (!isNoteSyncEligible(profile)) return res.status(403).json({ error: "Only 100-level students can request withdrawals." });
    const wallet = await ensureNoteSyncWallet(req.user.uid);
    const requestId = String(req.body?.requestId || "").trim();
    if (!validRecordId(requestId)) return res.status(400).json({ error: "A valid withdrawal request ID is required." });
    const payload = validateNoteSyncWithdrawal({
      ...req.body,
      nairaAmount: Math.round(((Number(req.body.coins) || 0) / 200) * 1000)
    });
    const now = Date.now();
    const withdrawal = {
      id: requestId,
      studentUid: req.user.uid,
      coins: payload.coins,
      nairaAmount: payload.nairaAmount,
      bankInfo: payload.bankInfo,
      status: "Pending",
      rejectionReason: "",
      requestDate: now,
      processedAt: "",
      paymentReference: ""
    };
    withdrawal.bankInfo = payload.bankInfo;
    const walletRef = database.ref(`notesync/wallets/${req.user.uid}`);
    let requestAlreadyExisted = false;
    let requestConflict = false;
    const result = await walletRef.transaction((current) => {
      requestAlreadyExisted = false;
      requestConflict = false;
      const currentWallet = current || wallet;
      const priorRequest = currentWallet.withdrawalRequests?.[requestId];
      if (priorRequest) {
        const matches = priorRequest.studentUid === req.user.uid &&
          priorRequest.coins === payload.coins &&
          priorRequest.bankInfo === payload.bankInfo;
        if (!matches) {
          requestConflict = true;
          return undefined;
        }
        requestAlreadyExisted = true;
        return currentWallet;
      }
      if ((Number(currentWallet.availableCoins) || 0) < payload.coins) return undefined;
      return {
        ...currentWallet,
        availableCoins: currentWallet.availableCoins - payload.coins,
        pendingRewards: (Number(currentWallet.pendingRewards) || 0) + payload.coins,
        lastUpdated: now,
        withdrawalRequests: {
          ...(currentWallet.withdrawalRequests || {}),
          [requestId]: withdrawal
        }
      };
    });
    if (requestConflict) {
      return res.status(409).json({ error: "This withdrawal request ID has already been used with different details." });
    }
    const reservedRequest = result.snapshot.val()?.withdrawalRequests?.[requestId];
    if (!reservedRequest) {
      return res.status(409).json({ error: "Insufficient available AFT Coins or conflicting withdrawal request." });
    }

    if (requestAlreadyExisted && (await database.ref(`notesync/withdrawals/${requestId}`).get()).exists()) {
      return res.status(200).json({
        id: requestId,
        record: {
          id: requestId,
          studentUid: req.user.uid,
          coins: reservedRequest.coins,
          nairaAmount: reservedRequest.nairaAmount,
          status: reservedRequest.status,
          requestDate: reservedRequest.requestDate,
          processedAt: reservedRequest.processedAt,
          paymentReference: reservedRequest.paymentReference
        }
      });
    }

    const transactionType = reservedRequest.status === "Paid"
      ? "withdrawal-paid"
      : reservedRequest.status === "Rejected"
        ? "withdrawal-refund"
        : "withdrawal-request";
    const notification = reservedRequest.status === "Paid"
      ? { title: "Withdrawal paid", message: "Your withdrawal has been marked paid by an administrator." }
      : reservedRequest.status === "Rejected"
        ? { title: "Withdrawal rejected", message: `Your withdrawal was rejected: ${reservedRequest.rejectionReason || "Contact an administrator for details."}` }
        : { title: "Withdrawal request submitted", message: `A withdrawal request for ${payload.coins} AFT Coins is pending administrator review.` };
    await database.ref().update({
      [`notesync/withdrawals/${requestId}`]: reservedRequest,
      [`notesync/transactions/withdrawal-${requestId}`]: {
        studentUid: req.user.uid,
        type: transactionType,
        amount: payload.coins,
        status: reservedRequest.status,
        timestamp: reservedRequest.requestDate,
        reference: requestId,
        note: reservedRequest.paymentReference || reservedRequest.rejectionReason || "Withdrawal request submitted"
      },
      [`notesync/notifications/withdrawal-${requestId}`]: {
        userUid: req.user.uid,
        ...notification,
        destination: "notesync",
        read: false,
        createdAt: reservedRequest.processedAt || reservedRequest.requestDate
      }
    });
    const safeWithdrawal = {
      id: requestId,
      studentUid: req.user.uid,
      coins: payload.coins,
      nairaAmount: payload.nairaAmount,
      status: reservedRequest.status,
      requestDate: reservedRequest.requestDate,
      processedAt: reservedRequest.processedAt,
      paymentReference: reservedRequest.paymentReference
    };
    res.status(requestAlreadyExisted ? 200 : 201).json({ id: requestId, record: safeWithdrawal });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notesync/withdrawals", requireAuth, async (req, res, next) => {
  try {
    const snapshot = await database.ref(`notesync/wallets/${req.user.uid}/withdrawalRequests`).get();
    const items = snapshotToList(snapshot.val())
      .sort((a, b) => (Number(b.requestDate) || 0) - (Number(a.requestDate) || 0))
      .map((item) => ({
        id: item.id,
        coins: item.coins,
        nairaAmount: item.nairaAmount,
        status: item.status,
        requestDate: item.requestDate,
        processedAt: item.processedAt,
        paymentReference: item.paymentReference
      }));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/notesync/withdrawals", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [withdrawalsSnapshot, walletsSnapshot] = await Promise.all([
      database.ref("notesync/withdrawals").get(),
      database.ref("notesync/wallets").get()
    ]);
    const byId = new Map(snapshotToList(withdrawalsSnapshot.val()).map((item) => [item.id, item]));
    for (const [uid, wallet] of Object.entries(walletsSnapshot.val() || {})) {
      for (const [id, request] of Object.entries(wallet.withdrawalRequests || {})) {
        if (!byId.has(id)) byId.set(id, { ...request, id, studentUid: uid });
      }
    }
    const items = [...byId.values()].sort((a, b) => (Number(b.requestDate) || 0) - (Number(a.requestDate) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/notesync/withdrawals/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!validRecordId(id)) return res.status(400).json({ error: "Invalid withdrawal ID." });
    const requestedStatus = String(req.body?.status || "");
    if (!["Processing", "Paid", "Rejected"].includes(requestedStatus)) {
      return res.status(400).json({ error: "Withdrawal status must be Processing, Paid, or Rejected." });
    }
    const withdrawalRef = database.ref(`notesync/withdrawals/${id}`);
    const [withdrawalSnapshot, walletsSnapshot] = await Promise.all([
      withdrawalRef.get(),
      database.ref("notesync/wallets").get()
    ]);
    let withdrawal = withdrawalSnapshot.val();
    if (!withdrawal) {
      for (const [uid, wallet] of Object.entries(walletsSnapshot.val() || {})) {
        if (wallet.withdrawalRequests?.[id]) {
          withdrawal = { ...wallet.withdrawalRequests[id], id, studentUid: uid };
          break;
        }
      }
    }
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal request not found." });
    if (requestedStatus === "Processing") {
      if (withdrawal.status === "Processing") return res.json({ id, record: withdrawal });
      if (withdrawal.status !== "Pending") return res.status(409).json({ error: "Only pending withdrawals can be marked as processing." });
      const walletRef = database.ref(`notesync/wallets/${withdrawal.studentUid}`);
      const result = await walletRef.transaction((current) => {
        const request = current?.withdrawalRequests?.[id];
        if (!request) return undefined;
        if (request.status === "Processing") return current;
        if (request.status !== "Pending") return undefined;
        return {
          ...current,
          withdrawalRequests: {
            ...current.withdrawalRequests,
            [id]: { ...request, status: "Processing", processedAt: Date.now(), reviewedByUid: req.user.uid }
          }
        };
      });
      const updatedRequest = result.snapshot.val()?.withdrawalRequests?.[id];
      if (!updatedRequest || updatedRequest.status !== "Processing") {
        return res.status(409).json({ error: "This withdrawal was already changed by another administrator." });
      }
      await database.ref().update({
        [`notesync/withdrawals/${id}`]: updatedRequest,
        [`notesync/wallets/${withdrawal.studentUid}/withdrawalRequests/${id}`]: updatedRequest,
        [`notesync/transactions/withdrawal-${id}/status`]: "Processing",
        [`notesync/transactions/withdrawal-${id}/timestamp`]: updatedRequest.processedAt,
        [`notesync/transactions/withdrawal-${id}/note`]: "Withdrawal request is being processed."
      });
      return res.json({ id, record: updatedRequest });
    }
    const paymentReference = String(req.body?.paymentReference || "").trim().slice(0, 200);
    const rejectionReason = String(req.body?.rejectionReason || "").trim().slice(0, 500);
    if (requestedStatus === "Paid" && !paymentReference) {
      return res.status(400).json({ error: "A payment reference is required after the payment has been made." });
    }
    if (requestedStatus === "Rejected" && !rejectionReason) {
      return res.status(400).json({ error: "A rejection reason is required." });
    }
    if (!["Pending", "Processing"].includes(withdrawal.status)) {
      if (withdrawal.status === requestedStatus) return res.json({ id, record: withdrawal });
      return res.status(409).json({ error: "This withdrawal has already been resolved." });
    }

    const walletRef = database.ref(`notesync/wallets/${withdrawal.studentUid}`);
    const result = await walletRef.transaction((current) => {
      if (!current) return undefined;
      const resolution = resolveWithdrawalWallet(current, id, requestedStatus, Number(withdrawal.coins), Date.now());
      return resolution.conflict ? undefined : resolution.wallet;
    });
    const wallet = result.snapshot.val();
    const resolution = wallet?.withdrawalResolutions?.[id];
    if (!resolution || resolution.status !== requestedStatus) {
      return res.status(409).json({ error: "Withdrawal balance could not be reconciled; no status change was made." });
    }
    const processedAt = resolution.resolvedAt;
    const updated = {
      ...withdrawal,
      id,
      status: requestedStatus,
      processedAt,
      reviewedByUid: req.user.uid,
      paymentReference: requestedStatus === "Paid" ? paymentReference : "",
      rejectionReason: requestedStatus === "Rejected" ? rejectionReason : ""
    };
    await database.ref().update({
      [`notesync/withdrawals/${id}`]: updated,
      [`notesync/wallets/${withdrawal.studentUid}/withdrawalRequests/${id}`]: updated,
      [`notesync/transactions/withdrawal-${id}`]: {
        studentUid: withdrawal.studentUid,
        type: requestedStatus === "Paid" ? "withdrawal-paid" : "withdrawal-refund",
        amount: withdrawal.coins,
        status: requestedStatus,
        timestamp: processedAt,
        reference: id,
        note: requestedStatus === "Paid" ? paymentReference : rejectionReason
      },
      [`notesync/notifications/withdrawal-${id}`]: {
        userUid: withdrawal.studentUid,
        title: requestedStatus === "Paid" ? "Withdrawal paid" : "Withdrawal rejected",
        message: requestedStatus === "Paid"
          ? "Your withdrawal has been marked paid by an administrator."
          : `Your withdrawal was rejected: ${rejectionReason}`,
        destination: "notesync",
        read: false,
        createdAt: processedAt
      }
    });
    res.json({ id, record: updated });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/notesync/overview", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [submissions, wallets, applications, withdrawals] = await Promise.all([
      database.ref("notesync/submissions").get(),
      database.ref("notesync/wallets").get(),
      database.ref("notesync/levelApplications").get(),
      database.ref("notesync/withdrawals").get()
    ]);
    const stats = {
      contributors: new Set(snapshotToList(wallets.val()).map((item) => item.studentUid)).size,
      totalSubmissions: snapshotToList(submissions.val()).length,
      pendingSubmissions: snapshotToList(submissions.val()).filter((item) => item.status === "Pending Review").length,
      approvedNotes: snapshotToList(submissions.val()).filter((item) => item.status === "Approved").length,
      rejectedSubmissions: snapshotToList(submissions.val()).filter((item) => item.status === "Rejected").length,
      totalCoinsIssued: snapshotToList(wallets.val()).reduce((sum, item) => sum + (Number(item.totalEarned) || 0), 0),
      pendingWithdrawalRequests: snapshotToList(withdrawals.val()).filter((item) => item.status === "Pending" || item.status === "Processing").length,
      activeApplications: snapshotToList(applications.val()).filter((item) => item.status === "Submitted" || item.status === "Under Review").length
    };
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/notesync/submissions", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snap = await database.ref("notesync/submissions").get();
    const items = snapshotToList(snap.val());
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/notesync/submissions/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    const ref = database.ref(`notesync/submissions/${id}`);
    const existing = await ref.get();
    if (!existing.exists()) return res.status(404).json({ error: "Submission not found." });

    const submission = existing.val();
    const nextStatus = String(req.body.status || submission.status || "Pending Review");
    const qualityCategory = String(req.body.qualityCategory || submission.qualityCategory || "");
    if (!NOTE_SYNC_SUBMISSION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid NoteSync submission status." });
    }
    if (qualityCategory && !Object.prototype.hasOwnProperty.call(NOTE_SYNC_REWARD_CATEGORIES, qualityCategory)) {
      return res.status(400).json({ error: "Select a valid note quality category." });
    }
    if (["Approved", "Rejected"].includes(submission.status) && nextStatus !== submission.status) {
      return res.status(409).json({ error: "A reviewed submission cannot be moved to another status." });
    }
    if (nextStatus === "Rejected" && !String(req.body.rejectionReason || submission.rejectionReason || "").trim()) {
      return res.status(400).json({ error: "A rejection reason is required." });
    }
    if (nextStatus === "Requires Correction" && !String(req.body.reviewNotes || submission.reviewNotes || "").trim()) {
      return res.status(400).json({ error: "Review notes are required when requesting a correction." });
    }
    if (nextStatus === submission.status && ["Approved", "Rejected"].includes(submission.status)) {
      return res.json({ id, record: submission });
    }
    const rewardCategory = qualityCategory || "Basic acceptable notes";
    const rewardCoins = coinsForQuality(rewardCategory);
    const reviewNotes = String(req.body.reviewNotes || submission.reviewNotes || "");
    const rejectionReason = String(req.body.rejectionReason || submission.rejectionReason || "");
    let rewardCommitted = false;
    let rewardMarkerPresent = submission.rewardIssued === true;
    let rewardRecorded = rewardMarkerPresent || (
      submission.status === "Approved" && Number(submission.rewardCoins) > 0
    );
    let issuedRewardCoins = Number(submission.rewardCoins) || 0;
    let issuedRewardCategory = submission.rewardQualityCategory || submission.qualityCategory || "";
    if (nextStatus === "Approved" && !rewardRecorded) {
      const walletRef = database.ref(`notesync/wallets/${submission.studentUid}`);
      const wallet = await ensureNoteSyncWallet(submission.studentUid);
      const now = Date.now();
      const result = await walletRef.transaction((current) =>
        applySubmissionReward(current || wallet, id, rewardCoins, rewardCategory, now)
      );
      rewardCommitted = result.committed;
      const rewardMarker = result.snapshot.val()?.rewardedSubmissionIds?.[id];
      rewardMarkerPresent = Boolean(rewardMarker);
      rewardRecorded = rewardMarkerPresent;
      issuedRewardCoins = Number(rewardMarker?.amount) || 0;
      issuedRewardCategory = rewardMarker?.qualityCategory || rewardCategory;
    }

    const updated = {
      ...submission,
      status: nextStatus,
      qualityCategory: qualityCategory || submission.qualityCategory || "",
      reviewNotes,
      rejectionReason,
      rewardCoins: rewardRecorded ? issuedRewardCoins : 0,
      rewardQualityCategory: rewardRecorded ? issuedRewardCategory : submission.rewardQualityCategory || "",
      rewardIssued: rewardRecorded,
      updatedAt: Date.now()
    };
    await ref.set(updated);

    if (rewardMarkerPresent) {
      await database.ref(`notesync/transactions/submission-${id}`).set({
        studentUid: submission.studentUid,
        type: "note-submission-reward",
        amount: issuedRewardCoins,
        submissionId: id,
        status: "Completed",
        timestamp: Date.now(),
        reference: `submission:${id}`,
        note: issuedRewardCategory || "Basic acceptable notes"
      });
    }

    if (rewardCommitted) {
      await database.ref(`notesync/notifications/reward-${submission.studentUid}-${id}`).set({
        userUid: submission.studentUid,
        title: "Submission approved",
        message: `Your note for ${submission.courseCode} was approved and ${issuedRewardCoins} AFT Coins were awarded.`,
        destination: "notesync",
        read: false,
        createdAt: Date.now()
      });
    }

    if (nextStatus === "Rejected") {
      await appendNotification(submission.studentUid, "Submission rejected", rejectionReason || "Your submission was rejected after review.");
    }

    if (nextStatus === "Requires Correction") {
      await appendNotification(submission.studentUid, "Submission needs correction", reviewNotes || "Please update the note to match the course and lecture details.");
    }

    res.json({ id, record: updated });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/notesync/applications", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snap = await database.ref("notesync/levelApplications").get();
    const items = snapshotToList(snap.val());
    items.sort((a, b) => (Number(b.submittedAt) || 0) - (Number(a.submittedAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/notesync/applications/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    const ref = database.ref(`notesync/levelApplications/${id}`);
    const existing = await ref.get();
    if (!existing.exists()) return res.status(404).json({ error: "Application not found." });
    const application = existing.val();
    const status = String(req.body.status || application.status || "Submitted");
    if (!NOTE_SYNC_APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid NoteSync application status." });
    }
    if (["Approved", "Rejected"].includes(application.status) && status !== application.status) {
      return res.status(409).json({ error: "A reviewed application cannot be moved to another status." });
    }
    if (status === application.status && ["Approved", "Rejected"].includes(application.status)) {
      return res.json({ id, record: application });
    }
    const adminNotes = String(req.body.adminNotes || application.adminNotes || "").trim().slice(0, 2000);
    const updated = { ...application, status, adminNotes, updatedAt: Date.now() };
    await ref.set(updated);
    await appendNotification(application.studentUid, "Level application updated", `Your NoteSync level application status is now ${status}.`);
    res.json({ id, record: updated });
  } catch (error) {
    next(error);
  }
});

app.get("/api/content/:section", async (req, res, next) => {
  const allowed = new Set(["academicContent", "formulas", "courses", "departments"]);
  if (!allowed.has(req.params.section)) return res.status(404).json({ error: "Content section not found." });
  try {
    const snapshot = await database.ref(req.params.section).get();
    res.json({ content: snapshot.val() || {} });
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", requireAuth, async (req, res, next) => {
  try {
    const isAdmin = checkIsAdmin(req.user);
    const profileSnap = await database.ref(`users/${req.user.uid}/profile`).get();
    const profile = profileSnap.val() || {};
    res.json({
      uid: req.user.uid,
      email: req.user.email || null,
      name: profile.name || req.user.name || null,
      isAdmin,
      profile
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/profile", requireAuth, async (req, res, next) => {
  try {
    const profileSnap = await database.ref(`users/${req.user.uid}/profile`).get();
    res.json({ profile: profileSnap.val() || {} });
  } catch (error) {
    next(error);
  }
});

async function findUsersByMatricNumber(matricNumber) {
  const normalized = String(matricNumber || "").trim().replace(/\s+/g, "").toUpperCase();
  if (!normalized) return [];
  const snapshot = await database.ref("users").get();
  const users = snapshot.val() || {};
  const matches = [];
  for (const [uid, entry] of Object.entries(users)) {
    const profile = entry && entry.profile ? entry.profile : {};
    const value = String(profile.matricNumber || "").trim().replace(/\s+/g, "").toUpperCase();
    if (value === normalized) matches.push({ uid, profile });
  }
  return matches;
}

app.get("/api/profile/matric", requireAuth, async (req, res, next) => {
  try {
    const profileSnap = await database.ref(`users/${req.user.uid}/profile`).get();
    const profile = profileSnap.val() || {};
    res.json({ matricNumber: profile.matricNumber || "", matricVerified: Boolean(profile.matricVerified) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/profile/matric", requireAuth, async (req, res, next) => {
  try {
    const payload = req.body || {};
    const newMatric = payload.matricNumber === undefined ? null : String(payload.matricNumber || "").trim();
    const requestedVerified = typeof payload.verified === "boolean" ? payload.verified : false;
    const isAdmin = checkIsAdmin(req.user);
    if (requestedVerified && !isAdmin) {
      return res.status(403).json({ error: "Only an administrator can verify a student's matriculation number." });
    }
    const normalized = newMatric ? validateMatricNumber(newMatric) : "";
    const profileRef = database.ref(`users/${req.user.uid}/profile`);
    const existingSnap = await profileRef.get();
    const existing = existingSnap.val() || {};
    const previousMatric = String(existing.matricNumber || "").trim().replace(/\s+/g, "").toUpperCase();
    const nextVerified = isAdmin
      ? requestedVerified
      : Boolean(existing.matricVerified && normalized && normalized === previousMatric);
    if (normalized) {
      const matches = await findUsersByMatricNumber(normalized);
      if (matches.some((match) => match.uid !== req.user.uid)) {
        return res.status(409).json({ error: "This matriculation number is already registered to another student." });
      }
    }
    const saved = { ...existing, matricNumber: normalized, matricVerified: nextVerified, updatedAt: Date.now() };
    let reservedLookup = false;
    if (normalized && nextVerified) {
      const lookupRef = database.ref(`matricLookup/${matricLookupKey(normalized)}`);
      const lookupResult = await lookupRef.transaction((uid) => uid && uid !== req.user.uid ? undefined : req.user.uid);
      if (!lookupResult.committed) {
        return res.status(409).json({ error: "This matriculation number is already verified for another student." });
      }
      reservedLookup = true;
    }
    try {
      await profileRef.set(saved);
    } catch (error) {
      if (reservedLookup && normalized !== previousMatric) {
        await database.ref(`matricLookup/${matricLookupKey(normalized)}`).transaction((uid) => uid === req.user.uid ? null : undefined);
      }
      throw error;
    }
    if (previousMatric && previousMatric !== normalized) {
      await database.ref(`matricLookup/${matricLookupKey(previousMatric)}`).transaction((uid) => uid === req.user.uid ? null : undefined);
    }
    if (normalized && !nextVerified) {
      await database.ref(`matricLookup/${matricLookupKey(normalized)}`).transaction((uid) => uid === req.user.uid ? null : undefined);
    }
    res.json({ profile: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/profile", requireAuth, async (req, res, next) => {
  try {
    const clean = validateProfile(req.body);
    const now = Date.now();
    const profileRef = database.ref(`users/${req.user.uid}/profile`);
    const existingSnap = await profileRef.get();
    const existing = existingSnap.val() || {};
    const saved = { ...existing, ...clean, updatedAt: now, createdAt: existing.createdAt || now };
    await profileRef.set(saved);
    await refreshCourseIndex(database, req.user.uid);
    res.json({ profile: saved });
  } catch (error) {
    next(error);
  }
});

registerMessagingRoutes(app, {
  database,
  firebaseAuth,
  requireAuth,
  validUid,
  allowMessageSearch,
  allowMessageAction
});

app.get("/api/admin/matric-verification", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snapshot = await database.ref("users").get();
    const items = [];
    const users = snapshot.val() || {};
    for (const [uid, value] of Object.entries(users)) {
      const profile = value && value.profile ? value.profile : {};
      if (!profile.matricNumber) continue;
      items.push({ uid, name: profile.name || "Student", matricNumber: profile.matricNumber, matricVerified: Boolean(profile.matricVerified), department: profile.department || "", level: profile.level || "" });
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/users/:uid/matric-verification", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const uid = String(req.params.uid || "").trim();
    if (!uid) return res.status(400).json({ error: "A valid student UID is required." });
    if (typeof req.body?.verified !== "boolean") {
      return res.status(400).json({ error: "Verification status must be true or false." });
    }
    const verified = req.body.verified;
    const profileRef = database.ref(`users/${uid}/profile`);
    const existingSnap = await profileRef.get();
    const existing = existingSnap.val() || {};
    if (!existing.matricNumber) return res.status(400).json({ error: "This student has no matriculation number to verify." });
    const matricNumber = validateMatricNumber(existing.matricNumber);
    const lookupRef = database.ref(`matricLookup/${matricLookupKey(matricNumber)}`);
    if (verified) {
      const reservation = await lookupRef.transaction((current) =>
        current && current !== uid ? undefined : uid
      );
      if (!reservation.committed) {
        return res.status(409).json({ error: "This matriculation number is already verified for another student." });
      }
    }
    const updated = { ...existing, matricVerified: verified, updatedAt: Date.now() };
    try {
      await profileRef.set(updated);
    } catch (error) {
      if (verified && existing.matricVerified !== true) {
        await lookupRef.transaction((current) => current === uid ? null : undefined);
      }
      throw error;
    }
    if (!verified) {
      await lookupRef.transaction((current) => current === uid ? null : undefined);
    }
    res.json({ profile: updated });
  } catch (error) {
    next(error);
  }
});

app.get("/api/directory", async (req, res, next) => {
  try {
    const snap = await database.ref("directory").get();
    let items = snapshotToList(snap.val());
    const { category, search } = req.query;
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q) ||
        String(i.location || "").toLowerCase().includes(q)
      );
    }
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/directory", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const validated = validateDirectoryItem(req.body);
    const now = Date.now();
    const saved = { ...validated, createdAt: now, updatedAt: now };
    const ref = await database.ref("directory").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/directory/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid item ID." });
    const itemRef = database.ref(`directory/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Directory item not found." });
    const validated = validateDirectoryItem(req.body);
    const now = Date.now();
    const saved = { ...validated, createdAt: Number(existing.val().createdAt) || now, updatedAt: now };
    await itemRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/directory/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid item ID." });
    await database.ref(`directory/${req.params.id}`).remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/api/events", async (req, res, next) => {
  try {
    const snap = await database.ref("events").get();
    let items = snapshotToList(snap.val());
    const { category, search } = req.query;
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q) ||
        String(i.location || "").toLowerCase().includes(q) ||
        String(i.organizer || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/events", requireAuth, async (req, res, next) => {
  try {
    const validated = validateEvent(req.body);
    const now = Date.now();
    const saved = { ...validated, creatorUid: req.user.uid, creatorEmail: req.user.email || null, createdAt: now, updatedAt: now };
    const ref = await database.ref("events").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/events/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid event ID." });
    const eventRef = database.ref(`events/${req.params.id}`);
    const existing = await eventRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Event not found." });
    const existingVal = existing.val();
    if (existingVal.creatorUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to edit this event." });
    }
    const validated = validateEvent(req.body);
    const now = Date.now();
    const saved = { ...existingVal, ...validated, updatedAt: now };
    await eventRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/events/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid event ID." });
    const eventRef = database.ref(`events/${req.params.id}`);
    const existing = await eventRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Event not found." });
    const existingVal = existing.val();
    if (existingVal.creatorUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to delete this event." });
    }
    await eventRef.remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/api/marketplace", async (req, res, next) => {
  try {
    const snap = await database.ref("marketplace").get();
    let items = snapshotToList(snap.val());
    const { category, search, status } = req.query;
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (status) items = items.filter((i) => String(i.status || "active").toLowerCase() === String(status).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/marketplace", requireAuth, async (req, res, next) => {
  try {
    const validated = validateMarketplaceListing(req.body);
    const now = Date.now();
    const saved = { ...validated, sellerUid: req.user.uid, sellerEmail: req.user.email || null, createdAt: now, updatedAt: now };
    const ref = await database.ref("marketplace").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/marketplace/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid listing ID." });
    const itemRef = database.ref(`marketplace/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Listing not found." });
    const existingVal = existing.val();
    if (existingVal.sellerUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to edit this listing." });
    }
    const validated = validateMarketplaceListing(req.body);
    const now = Date.now();
    const saved = { ...existingVal, ...validated, updatedAt: now };
    await itemRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/marketplace/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid listing ID." });
    const itemRef = database.ref(`marketplace/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Listing not found." });
    const existingVal = existing.val();
    if (existingVal.sellerUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to delete this listing." });
    }
    await itemRef.remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/api/jobs", async (req, res, next) => {
  try {
    const snap = await database.ref("jobs").get();
    let items = snapshotToList(snap.val());
    const { type, search } = req.query;
    if (type) items = items.filter((i) => String(i.type || "").toLowerCase() === String(type).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/jobs", requireAuth, async (req, res, next) => {
  try {
    const validated = validateJobListing(req.body);
    const now = Date.now();
    const saved = { ...validated, postedByUid: req.user.uid, postedByEmail: req.user.email || null, createdAt: now, updatedAt: now };
    const ref = await database.ref("jobs").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid job ID." });
    const jobRef = database.ref(`jobs/${req.params.id}`);
    const existing = await jobRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Job listing not found." });
    const existingVal = existing.val();
    if (existingVal.postedByUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to edit this job." });
    }
    const validated = validateJobListing(req.body);
    const now = Date.now();
    const saved = { ...existingVal, ...validated, updatedAt: now };
    await jobRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/jobs/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid job ID." });
    const jobRef = database.ref(`jobs/${req.params.id}`);
    const existing = await jobRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Job listing not found." });
    const existingVal = existing.val();
    if (existingVal.postedByUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to delete this job." });
    }
    await jobRef.remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/api/opportunities", async (req, res, next) => {
  try {
    const snap = await database.ref("opportunities").get();
    let items = snapshotToList(snap.val());
    const { category, search } = req.query;
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => String(a.deadline || "").localeCompare(String(b.deadline || "")));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/opportunities", requireAuth, async (req, res, next) => {
  try {
    const validated = validateOpportunity(req.body);
    const now = Date.now();
    const saved = { ...validated, postedByUid: req.user.uid, createdAt: now, updatedAt: now };
    const ref = await database.ref("opportunities").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/opportunities/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid ID." });
    const itemRef = database.ref(`opportunities/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Opportunity not found." });
    const existingVal = existing.val();
    if (existingVal.postedByUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "Not authorized." });
    }
    const validated = validateOpportunity(req.body);
    const now = Date.now();
    const saved = { ...existingVal, ...validated, updatedAt: now };
    await itemRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/opportunities/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid ID." });
    const itemRef = database.ref(`opportunities/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Opportunity not found." });
    const existingVal = existing.val();
    if (existingVal.postedByUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "Not authorized." });
    }
    await itemRef.remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/api/lost-found", async (req, res, next) => {
  try {
    const snap = await database.ref("lostFound").get();
    let items = snapshotToList(snap.val()).filter(isPublicLostFoundItem);
    const { type, category, status, search, location } = req.query;
    if (type) items = items.filter((i) => String(i.type || "").toLowerCase() === String(type).toLowerCase());
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (status) items = items.filter((i) => String(i.status || "published").toLowerCase() === String(status).toLowerCase());
    if (location) items = items.filter((i) => String(i.location || "").toLowerCase().includes(String(location).toLowerCase()));
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q) ||
        String(i.location || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items: items.map(publicLostFoundItem) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/lost-found", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snap = await database.ref("lostFound").get();
    const items = snapshotToList(snap.val());
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/lost-found/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid item ID." });
    const itemRef = database.ref(`lostFound/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Lost/found item not found." });
    const current = existing.val();
    const nextStatus = ["pending_review", "published", "match_found", "claim_pending", "returned", "recovered", "closed", "rejected", "resolved"].includes(req.body?.status)
      ? req.body.status
      : current.status;
    const saved = {
      ...current,
      status: nextStatus,
      reviewNotes: String(req.body?.reviewNotes || current.reviewNotes || "").slice(0, 2000),
      reviewedByUid: req.user.uid,
      reviewedAt: Date.now(),
      updatedAt: Date.now()
    };
    await itemRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/lost-found/claims", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snap = await database.ref("lostFoundClaims").get();
    const items = snapshotToList(snap.val());
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/lost-found/claims/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid claim ID." });
    const claimRef = database.ref(`lostFoundClaims/${req.params.id}`);
    const existing = await claimRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Claim not found." });
    const current = existing.val();
    const allowed = ["pending", "under_review", "approved", "rejected", "completed"];
    const nextStatus = allowed.includes(req.body?.status) ? req.body.status : current.status;
    const saved = {
      ...current,
      status: nextStatus,
      reviewNotes: String(req.body?.reviewNotes || current.reviewNotes || "").slice(0, 2000),
      reviewedAt: Date.now(),
      reviewerUid: req.user.uid
    };
    await claimRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/lost-found/my-reports", requireAuth, async (req, res, next) => {
  try {
    const snap = await database.ref("lostFound").get();
    const items = snapshotToList(snap.val()).filter((item) => item.reporterUid === req.user.uid);
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.get("/api/lost-found/matches/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid item ID." });
    const itemSnap = await database.ref(`lostFound/${req.params.id}`).get();
    if (!itemSnap.exists()) return res.status(404).json({ error: "Lost or found item not found." });
    const target = itemSnap.val();
    if (target.reporterUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You can only view matches for your own item records." });
    }
    const snap = await database.ref("lostFound").get();
    const allItems = snapshotToList(snap.val()).filter((entry) =>
      entry.id !== req.params.id && isPublicLostFoundItem(entry)
    );
    const matches = allItems.filter((entry) => {
      if (entry.type === target.type) return false;
      if (String(entry.category || "").toLowerCase() !== String(target.category || "").toLowerCase()) return false;
      const q = [String(target.title || ""), String(target.description || ""), String(target.identifyingCharacteristics || "")].join(" ").toLowerCase();
      const other = [String(entry.title || ""), String(entry.description || ""), String(entry.identifyingCharacteristics || "")].join(" ").toLowerCase();
      if (!q || !other) return false;
      const ratio = q.split(/\s+/).filter(Boolean).filter((word) => other.includes(word)).length;
      return ratio >= 2 || other.includes(String(target.location || "").toLowerCase()) || q.includes(String(entry.location || "").toLowerCase());
    }).slice(0, 10);
    res.json({ matches: matches.map(publicLostFoundItem) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/lost-found", requireAuth, async (req, res, next) => {
  try {
    const validated = validateLostFoundItem(req.body);
    const now = Date.now();
    const saved = {
      ...validated,
      reporterUid: req.user.uid,
      reporterEmail: req.user.email || null,
      createdAt: now,
      updatedAt: now,
      status: "pending_review"
    };
    const ref = await database.ref("lostFound").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/lost-found/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid item ID." });
    const itemRef = database.ref(`lostFound/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Listing not found." });
    const existingVal = existing.val();
    if (existingVal.reporterUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to edit this listing." });
    }
    const validated = validateLostFoundItem(req.body);
    const now = Date.now();
    const saved = {
      ...existingVal,
      ...validated,
      status: checkIsAdmin(req.user) ? validated.status : existingVal.status,
      updatedAt: now
    };
    await itemRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/lost-found/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid item ID." });
    const itemRef = database.ref(`lostFound/${req.params.id}`);
    const existing = await itemRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Listing not found." });
    const existingVal = existing.val();
    if (existingVal.reporterUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to delete this listing." });
    }
    await itemRef.remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.post("/api/lost-found/claims", requireAuth, async (req, res, next) => {
  try {
    const payload = validateLostFoundClaim(req.body);
    const itemSnap = await database.ref(`lostFound/${payload.targetId}`).get();
    if (!itemSnap.exists()) return res.status(404).json({ error: "Lost or found listing not found." });
    const item = itemSnap.val();
    if (item.visibility === "private" || !["published", "match_found", "claim_pending"].includes(item.status || "published")) {
      return res.status(404).json({ error: "This item is not available for claims." });
    }
    if (item.reporterUid === req.user.uid) return res.status(400).json({ error: "You cannot submit a claim on your own listing." });
    const claimRef = await database.ref("lostFoundClaims").push({
      ...payload,
      status: "pending",
      itemTitle: item.title,
      itemType: item.type,
      itemReporterUid: item.reporterUid,
      claimantUid: req.user.uid,
      claimantEmail: req.user.email || null,
      createdAt: Date.now(),
      reviewedAt: null,
      reviewerUid: null,
      reviewNotes: "",
      status: "pending"
    });
    res.status(201).json({ id: claimRef.key, record: { ...payload, status: "pending", id: claimRef.key, itemTitle: item.title, itemType: item.type } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/lost-found/claims", requireAuth, async (req, res, next) => {
  try {
    const snap = await database.ref("lostFoundClaims").get();
    let claims = snapshotToList(snap.val());
    claims = claims.filter((claim) => claim.claimantUid === req.user.uid || claim.itemReporterUid === req.user.uid || checkIsAdmin(req.user));
    claims.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items: claims });
  } catch (error) {
    next(error);
  }
});

app.put("/api/lost-found/claims/:id", requireAuth, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid claim ID." });
    const claimRef = database.ref(`lostFoundClaims/${req.params.id}`);
    const existing = await claimRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Claim not found." });
    const claim = existing.val();
    if (claim.claimantUid !== req.user.uid && claim.itemReporterUid !== req.user.uid && !checkIsAdmin(req.user)) {
      return res.status(403).json({ error: "You are not authorized to review this claim." });
    }
    const nextStatus = String(req.body?.status || "");
    const admin = checkIsAdmin(req.user);
    const itemOwner = claim.itemReporterUid === req.user.uid;
    const claimant = claim.claimantUid === req.user.uid;
    const allowedTransitions = admin || itemOwner
      ? {
          pending: ["under_review", "approved", "rejected"],
          under_review: ["approved", "rejected"],
          approved: ["completed"]
        }
      : claimant
        ? { pending: ["cancelled"] }
        : {};
    if (!allowedTransitions[claim.status]?.includes(nextStatus)) {
      return res.status(400).json({ error: "This claim status transition is not allowed." });
    }
    const saved = claimant && !admin
      ? { ...claim, status: nextStatus, cancelledAt: Date.now() }
      : {
          ...claim,
          status: nextStatus,
          reviewNotes: String(req.body?.reviewNotes || claim.reviewNotes || "").trim().slice(0, 2000),
          reviewedAt: Date.now(),
          reviewerUid: req.user.uid
        };
    await claimRef.set(saved);
    if (itemOwner || admin) {
      const itemRef = database.ref(`lostFound/${claim.targetId}`);
      if (nextStatus === "approved") await itemRef.update({ status: "claim_pending", updatedAt: Date.now() });
      if (nextStatus === "completed") await itemRef.update({ status: "returned", updatedAt: Date.now() });
    }
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/announcements", async (req, res, next) => {
  try {
    const snap = await database.ref("announcements").get();
    let items = snapshotToList(snap.val());
    const { category, search } = req.query;
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.content || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/announcements", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const validated = validateAnnouncement(req.body);
    const now = Date.now();
    const saved = { ...validated, createdAt: now, updatedAt: now };
    const ref = await database.ref("announcements").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/announcements/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid announcement ID." });
    const ref = database.ref(`announcements/${req.params.id}`);
    const existing = await ref.get();
    if (!existing.exists()) return res.status(404).json({ error: "Announcement not found." });
    const validated = validateAnnouncement(req.body);
    const now = Date.now();
    const saved = { ...validated, createdAt: Number(existing.val().createdAt) || now, updatedAt: now };
    await ref.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/announcements/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid announcement ID." });
    await database.ref(`announcements/${req.params.id}`).remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.post("/api/feedback", requireAuth, async (req, res, next) => {
  try {
    const validated = validateFeedback(req.body);
    const now = Date.now();
    const saved = { ...validated, submittedByUid: req.user.uid, userEmail: req.user.email || null, createdAt: now };
    const ref = await database.ref("feedback").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/feedback", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snap = await database.ref("feedback").get();
    const items = snapshotToList(snap.val());
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/feedback/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid feedback ID." });
    const ref = database.ref(`feedback/${req.params.id}`);
    const existing = await ref.get();
    if (!existing.exists()) return res.status(404).json({ error: "Feedback item not found." });
    const existingVal = existing.val();
    const validated = validateFeedback(req.body);
    const saved = { ...existingVal, ...validated, updatedAt: Date.now() };
    await ref.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/feedback/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid feedback ID." });
    await database.ref(`feedback/${req.params.id}`).remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.post("/api/reports", requireAuth, async (req, res, next) => {
  try {
    const validated = validateReport(req.body);
    const now = Date.now();
    const saved = { ...validated, reportedByUid: req.user.uid, userEmail: req.user.email || null, createdAt: now, status: "pending" };
    const ref = await database.ref("reports").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/reports", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snap = await database.ref("reports").get();
    const items = snapshotToList(snap.val());
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/reports/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid report ID." });
    await database.ref(`reports/${req.params.id}`).remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [formulas, directory, events, marketplace, jobs, opportunities, lostFound, announcements, feedback, reports] = await Promise.all([
      database.ref("formulas").get(),
      database.ref("directory").get(),
      database.ref("events").get(),
      database.ref("marketplace").get(),
      database.ref("jobs").get(),
      database.ref("opportunities").get(),
      database.ref("lostFound").get(),
      database.ref("announcements").get(),
      database.ref("feedback").get(),
      database.ref("reports").get()
    ]);
    res.json({
      stats: {
        formulas: snapshotToList(formulas.val()).length,
        directory: snapshotToList(directory.val()).length,
        events: snapshotToList(events.val()).length,
        marketplace: snapshotToList(marketplace.val()).length,
        jobs: snapshotToList(jobs.val()).length,
        opportunities: snapshotToList(opportunities.val()).length,
        lostFound: snapshotToList(lostFound.val()).length,
        announcements: snapshotToList(announcements.val()).length,
        feedback: snapshotToList(feedback.val()).length,
        reports: snapshotToList(reports.val()).length
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/formulas", async (req, res, next) => {
  try {
    const snapshot = await database.ref("formulas").get();
    let formulas = snapshotToList(snapshot.val());

    const { subject, level, topic, search } = req.query;
    if (subject) {
      formulas = formulas.filter((f) => String(f.subject || "").toLowerCase() === String(subject).toLowerCase());
    }
    if (level) {
      formulas = formulas.filter((f) => String(f.level || "").toLowerCase() === String(level).toLowerCase());
    }
    if (topic) {
      formulas = formulas.filter((f) => String(f.topic || "").toLowerCase() === String(topic).toLowerCase());
    }
    if (search) {
      const q = String(search).toLowerCase().trim();
      formulas = formulas.filter((f) =>
        String(f.name || "").toLowerCase().includes(q) ||
        String(f.description || "").toLowerCase().includes(q) ||
        String(f.formula || "").toLowerCase().includes(q) ||
        String(f.tags || "").toLowerCase().includes(q) ||
        String(f.topic || "").toLowerCase().includes(q)
      );
    }

    res.json({ items: formulas });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/formulas/export", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snapshot = await database.ref("formulas").get();
    const items = snapshotToList(snapshot.val());
    res.json({ items, exportedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/formulas", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const validated = validateFormula(req.body);
    const now = Date.now();
    const saved = { ...validated, createdAt: now, updatedAt: now };
    const ref = await database.ref("formulas").push(saved);
    res.status(201).json({ id: ref.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/formulas/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid formula ID." });
    const formulaRef = database.ref(`formulas/${req.params.id}`);
    const existing = await formulaRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Formula not found." });
    const validated = validateFormula(req.body);
    const now = Date.now();
    const saved = { ...validated, createdAt: Number(existing.val().createdAt) || now, updatedAt: now };
    await formulaRef.set(saved);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/formulas/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Invalid formula ID." });
    await database.ref(`formulas/${req.params.id}`).remove();
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/formulas/import", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { items, overwrite } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Import payload must include a non-empty array of formula items." });
    }
    if (items.length > 500) {
      return res.status(400).json({ error: "Import batch size cannot exceed 500 formulas at once." });
    }

    const existingSnapshot = await database.ref("formulas").get();
    const existingList = snapshotToList(existingSnapshot.val());
    const existingMap = new Map();
    for (const item of existingList) {
      const key = `${String(item.name || "").toLowerCase()}|${String(item.subject || "").toLowerCase()}|${String(item.level || "").toLowerCase()}`;
      existingMap.set(key, item.id);
    }

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors = [];
    const now = Date.now();
    const updates = {};

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      try {
        const validated = validateFormula(raw);
        const dupKey = `${validated.name.toLowerCase()}|${validated.subject.toLowerCase()}|${validated.level.toLowerCase()}`;
        const existingId = existingMap.get(dupKey);

        if (existingId && !overwrite) {
          skippedCount++;
          continue;
        }

        const id = existingId || database.ref("formulas").push().key;
        updates[`formulas/${id}`] = {
          ...validated,
          createdAt: existingId ? Number(existingList.find((x) => x.id === existingId)?.createdAt) || now : now,
          updatedAt: now
        };
        existingMap.set(dupKey, id);
        importedCount++;
      } catch (err) {
        failedCount++;
        errors.push({ index: i + 1, name: raw?.name || "Unknown", error: err.message });
      }
    }

    if (Object.keys(updates).length > 0) {
      await database.ref().update(updates);
    }

    res.json({
      importedCount,
      skippedCount,
      failedCount,
      errors
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/dashboard", requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const [personalCourses, registration, assignments, deadlines, exams, sessions] = await Promise.all([
      readRecords(uid, definitions.courses.path),
      readRecords(uid, definitions.registration.path),
      readRecords(uid, definitions.assignments.path),
      readRecords(uid, definitions.deadlines.path),
      readRecords(uid, definitions.exams.path),
      readRecords(uid, definitions["study-sessions"].path)
    ]);
    const courses = personalCourses.length ? personalCourses : registration;
    const upcomingAssignments = sortByDate(
      assignments.filter((item) => item.status !== "Complete"),
      "dueDate"
    ).slice(0, 4);
    const upcomingDeadlines = sortByDate(deadlines, "dueDate").filter((item) => {
      const days = daysFromToday(item.dueDate);
      return days !== null && days >= 0;
    }).slice(0, 4);
    const upcomingExams = sortByDate(exams, "date").filter((item) => {
      const days = daysFromToday(item.date);
      return days !== null && days >= 0;
    }).slice(0, 4);
    res.json({
      student: { email: req.user.email || null, name: req.user.name || null },
      stats: {
        courseCount: courses.length,
        openAssignments: assignments.filter((item) => item.status !== "Complete").length,
        studyMinutes: sessions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0)
      },
      courses: courses.slice(0, 5),
      assignments: upcomingAssignments,
      deadlines: upcomingDeadlines,
      exams: upcomingExams.map((exam) => ({ ...exam, daysUntil: daysFromToday(exam.date) }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/records/:type", requireAuth, async (req, res, next) => {
  try {
    const definition = getDefinition(req.params.type);
    const items = await readRecords(req.user.uid, definition.path);
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items: items.slice(0, 500) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/records/:type", requireAuth, async (req, res, next) => {
  try {
    const definition = getDefinition(req.params.type);
    const record = validateRecord(req.params.type, req.body);
    const now = Date.now();
    const saved = { ...record, createdAt: now, updatedAt: now };
    const created = await userRef(req.user.uid, definition.path).push(saved);
    if (["courses", "registration"].includes(req.params.type)) await refreshCourseIndex(database, req.user.uid);
    res.status(201).json({ id: created.key, record: saved });
  } catch (error) {
    next(error);
  }
});

app.put("/api/records/:type/:id", requireAuth, async (req, res, next) => {
  try {
    const definition = getDefinition(req.params.type);
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Record ID is invalid." });
    const recordRef = userRef(req.user.uid, `${definition.path}/${req.params.id}`);
    const existing = await recordRef.get();
    if (!existing.exists()) return res.status(404).json({ error: "Record not found." });
    const clean = validateRecord(req.params.type, req.body);
    const now = Date.now();
    const saved = { ...clean, createdAt: Number(existing.val().createdAt) || now, updatedAt: now };
    await recordRef.set(saved);
    if (["courses", "registration"].includes(req.params.type)) await refreshCourseIndex(database, req.user.uid);
    res.json({ id: req.params.id, record: saved });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/records/:type/:id", requireAuth, async (req, res, next) => {
  try {
    const definition = getDefinition(req.params.type);
    if (!validRecordId(req.params.id)) return res.status(400).json({ error: "Record ID is invalid." });
    await userRef(req.user.uid, `${definition.path}/${req.params.id}`).remove();
    if (["courses", "registration"].includes(req.params.type)) await refreshCourseIndex(database, req.user.uid);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

registerCourseMateRoutes(app, { database, requireAuth, requireAdmin });

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found." }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (error.status === 413 || error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request is too large." });
  }
  if ([400, 403, 404, 409, 429].includes(error.statusCode)) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error("API request failed:", error.message);
  res.status(500).json({ error: "The request could not be completed. Try again shortly." });
});

const port = Number(process.env.PORT) || 10000;
app.listen(port, "0.0.0.0", () => console.log(`AFITStudentLife API listening on port ${port}`));
