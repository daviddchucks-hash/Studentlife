"use strict";

const express = require("express");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getDatabase } = require("firebase-admin/database");
const { definitions, getDefinition, snapshotToList, validRecordId, validateRecord } = require("./validation");

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

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ uid: req.user.uid, email: req.user.email || null, name: req.user.name || null });
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
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

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
