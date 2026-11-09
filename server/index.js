"use strict";

const express = require("express");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const { registerCourseMateRoutes, refreshCourseIndex } = require("./coursemate");
const {
  definitions,
  getDefinition,
  snapshotToList,
  validRecordId,
  validateRecord,
  validateFormula,
  validateProfile,
  validateDirectoryItem,
  validateEvent,
  validateMarketplaceListing,
  validateJobListing,
  validateOpportunity,
  validateLostFoundItem,
  validateAnnouncement,
  validateFeedback,
  validateReport,
  validateNoteSyncCourse,
  validateNoteSyncSubmission,
  validateNoteSyncApplication,
  validateNoteSyncWithdrawal,
  validateNoteSyncNotification,
  validateLectureTrackReminder,
  validateLectureTrackAttendance
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
  const snap = await walletRef.get();
  if (snap.exists()) return snap.val();
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
  await walletRef.set(empty);
  return empty;
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
      });

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

    const downloadUrl = Array.isArray(item.attachmentRefs) && item.attachmentRefs.length > 0
      ? item.attachmentRefs[0]
      : null;

    res.json({
      item: {
        id: req.params.id,
        ...item,
        downloadUrl,
        fileType: item.noteType || "typed",
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

    const downloadUrl = Array.isArray(item.attachmentRefs) && item.attachmentRefs.length > 0
      ? item.attachmentRefs[0]
      : null;

    if (downloadUrl) {
      return res.json({
        downloadUrl,
        fileName: `${String(item.courseCode || "note").replace(/\s+/g, "-")}.bin`,
        contentType: item.noteType === "pdf" ? "application/pdf" : item.noteType === "image" ? "image/jpeg" : "text/plain"
      });
    }

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
    const existing = await database.ref("notesync/submissions").get();
    const duplicates = snapshotToList(existing.val()).filter((item) => item.studentUid === req.user.uid && item.duplicateHash === duplicateKey);
    if (duplicates.length > 0) {
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
    const ref = await database.ref("notesync/submissions").push(saved);
    await appendNotification(req.user.uid, "Submission received", "Your lecture note has been submitted and is now awaiting review.");
    res.status(201).json({ id: ref.key, record: saved });
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
    const payload = validateNoteSyncWithdrawal({
      ...req.body,
      nairaAmount: Math.round(((Number(req.body.coins) || 0) / 200) * 1000)
    });
    if (wallet.availableCoins < payload.coins) return res.status(400).json({ error: "Insufficient available AFT Coins for this withdrawal." });
    const now = Date.now();
    const withdrawal = {
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
    const ref = await database.ref("notesync/withdrawals").push(withdrawal);
    const nextWallet = {
      ...wallet,
      availableCoins: wallet.availableCoins - payload.coins,
      pendingRewards: (wallet.pendingRewards || 0) + payload.coins,
      lastUpdated: now
    };
    await database.ref(`notesync/wallets/${req.user.uid}`).set(nextWallet);
    await database.ref("notesync/transactions").push({
      studentUid: req.user.uid,
      type: "withdrawal-request",
      amount: payload.coins,
      status: "Pending",
      timestamp: now,
      reference: ref.key,
      note: "Withdrawal request submitted"
    });
    await appendNotification(req.user.uid, "Withdrawal request submitted", `A withdrawal request for ${payload.coins} AFT Coins is pending administrator review.`);
    res.status(201).json({ id: ref.key, record: withdrawal });
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
    const rewardCoins = coinsForQuality(qualityCategory || "Basic acceptable notes");
    const reviewNotes = String(req.body.reviewNotes || submission.reviewNotes || "");
    const rejectionReason = String(req.body.rejectionReason || submission.rejectionReason || "");
    const updated = {
      ...submission,
      status: nextStatus,
      qualityCategory: qualityCategory || submission.qualityCategory || "",
      reviewNotes,
      rejectionReason,
      rewardCoins: nextStatus === "Approved" ? rewardCoins : 0,
      updatedAt: Date.now()
    };
    await ref.set(updated);

    if (nextStatus === "Approved") {
      const walletRef = database.ref(`notesync/wallets/${submission.studentUid}`);
      const wallet = await ensureNoteSyncWallet(submission.studentUid);
      const nextWallet = {
        ...wallet,
        availableCoins: (wallet.availableCoins || 0) + rewardCoins,
        totalEarned: (wallet.totalEarned || 0) + rewardCoins,
        lastUpdated: Date.now()
      };
      await walletRef.set(nextWallet);
      await database.ref("notesync/transactions").push({
        studentUid: submission.studentUid,
        type: "note-submission-reward",
        amount: rewardCoins,
        submissionId: id,
        status: "Completed",
        timestamp: Date.now(),
        reference: `submission:${id}`,
        note: `${qualityCategory || "Basic acceptable notes"}`
      });
      await appendNotification(submission.studentUid, "Submission approved", `Your note for ${submission.courseCode} was approved and ${rewardCoins} AFT Coins were awarded.`);
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
    const adminNotes = String(req.body.adminNotes || application.adminNotes || "");
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

app.put("/api/profile", requireAuth, async (req, res, next) => {
  try {
    const clean = validateProfile(req.body);
    const now = Date.now();
    const profileRef = database.ref(`users/${req.user.uid}/profile`);
    const existingSnap = await profileRef.get();
    const existing = existingSnap.val() || {};
    const saved = { ...clean, updatedAt: now, createdAt: existing.createdAt || now };
    await profileRef.set(saved);
    await refreshCourseIndex(database, req.user.uid);
    res.json({ profile: saved });
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
    let items = snapshotToList(snap.val());
    const { type, category, status, search } = req.query;
    if (type) items = items.filter((i) => String(i.type || "").toLowerCase() === String(type).toLowerCase());
    if (category) items = items.filter((i) => String(i.category || "").toLowerCase() === String(category).toLowerCase());
    if (status) items = items.filter((i) => String(i.status || "open").toLowerCase() === String(status).toLowerCase());
    if (search) {
      const q = String(search).toLowerCase().trim();
      items = items.filter((i) =>
        String(i.title || "").toLowerCase().includes(q) ||
        String(i.description || "").toLowerCase().includes(q) ||
        String(i.location || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

app.post("/api/lost-found", requireAuth, async (req, res, next) => {
  try {
    const validated = validateLostFoundItem(req.body);
    const now = Date.now();
    const saved = { ...validated, reporterUid: req.user.uid, reporterEmail: req.user.email || null, createdAt: now, updatedAt: now };
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
    const saved = { ...existingVal, ...validated, updatedAt: now };
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
  if (error.statusCode === 400 || error.statusCode === 404) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error("API request failed:", error.message);
  res.status(500).json({ error: "The request could not be completed. Try again shortly." });
});

const port = Number(process.env.PORT) || 10000;
app.listen(port, "0.0.0.0", () => console.log(`AFITStudentLife API listening on port ${port}`));
