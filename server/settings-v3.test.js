"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function startTestServer(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["server/index.js"], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        PORT: String(port),
        FIREBASE_SERVICE_ACCOUNT_JSON: "",
        FIREBASE_DATABASE_URL: ""
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let settled = false;
    let logs = "";
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGKILL");
        reject(new Error(`Server failed to start in time. Logs:\n${logs}`));
      }
    }, 10000);

    child.stdout.on("data", (chunk) => {
      logs += chunk.toString();
      if (!settled && logs.includes(`listening on port ${port}`)) {
        settled = true;
        clearTimeout(timer);
        resolve(child);
      }
    });
    child.stderr.on("data", (chunk) => {
      logs += chunk.toString();
    });
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Server exited early with code ${code}. Logs:\n${logs}`));
      }
    });
  });
}

async function httpJson(baseUrl, pathname, { method = "GET", token = "", body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, body: json };
}

test("Settings V3 End-to-End Integration: Profile, Account & Password, Themes, Security Privacy", async () => {
  const port = 3987;
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverProc = await startTestServer(port);

  try {
    // 1. Register Student A & Student B
    const signupA = await httpJson(baseUrl, "/api/local-auth/signup", {
      method: "POST",
      body: { name: "Ada Student", email: "ada@afit.edu.ng", password: "Password123!" }
    });
    assert.equal(signupA.status, 201);
    const tokenA = signupA.body.idToken;
    const uidA = signupA.body.user.uid;

    const signupB = await httpJson(baseUrl, "/api/local-auth/signup", {
      method: "POST",
      body: { name: "Bola Classmate", email: "bola@afit.edu.ng", password: "Password123!" }
    });
    assert.equal(signupB.status, 201);
    const tokenB = signupB.body.idToken;
    const uidB = signupB.body.user.uid;

    // 2. Profile load, update & permanent matric verification lock
    const initialMe = await httpJson(baseUrl, "/api/me", { token: tokenA });
    assert.equal(initialMe.status, 200);
    assert.equal(initialMe.body.uid, uidA);
    assert.equal(initialMe.body.email, "ada@afit.edu.ng");

    const updatedProfile = await httpJson(baseUrl, "/api/profile", {
      method: "PUT",
      token: tokenA,
      body: {
        name: "Ada Lovelace",
        department: "Aerospace Engineering",
        level: "300",
        interests: "Propulsion, Robotics",
        skills: "MATLAB, C++",
        bio: "AFIT 300L aerospace researcher."
      }
    });
    assert.equal(updatedProfile.status, 200);
    assert.equal(updatedProfile.body.profile.name, "Ada Lovelace");
    assert.equal(updatedProfile.body.profile.department, "Aerospace Engineering");
    assert.equal(updatedProfile.body.profile.level, "300");

    const matricSave = await httpJson(baseUrl, "/api/profile/matric", {
      method: "PUT",
      token: tokenA,
      body: { matricNumber: "AFIT22001" }
    });
    assert.equal(matricSave.status, 200);
    assert.equal(matricSave.body.profile.matricNumber, "AFIT22001");
    assert.equal(matricSave.body.profile.matricVerified, true);

    const profileMatricTamper = await httpJson(baseUrl, "/api/profile", {
      method: "PUT",
      token: tokenA,
      body: { name: "Ada Lovelace", matricNumber: "AFIT22999" }
    });
    assert.equal(profileMatricTamper.status, 400, "PUT /api/profile must reject direct matricNumber tampering");

    const duplicateMatricB = await httpJson(baseUrl, "/api/profile/matric", {
      method: "PUT",
      token: tokenB,
      body: { matricNumber: "AFIT22001" }
    });
    assert.equal(duplicateMatricB.status, 409, "Verified matriculation number cannot be claimed by another student");

    // 3. Password change lifecycle: reject wrong current password, reject weak, succeed on valid, verify login switch
    const badCurrent = await httpJson(baseUrl, "/api/local-auth/change-password", {
      method: "POST",
      token: tokenA,
      body: { currentPassword: "WrongPassword!", newPassword: "NewPassword456!" }
    });
    assert.equal(badCurrent.status, 400);

    const weakNew = await httpJson(baseUrl, "/api/local-auth/change-password", {
      method: "POST",
      token: tokenA,
      body: { currentPassword: "Password123!", newPassword: "123" }
    });
    assert.equal(weakNew.status, 400);

    const changed = await httpJson(baseUrl, "/api/local-auth/change-password", {
      method: "POST",
      token: tokenA,
      body: { currentPassword: "Password123!", newPassword: "NewPassword456!" }
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.ok, true);

    const oldLoginFail = await httpJson(baseUrl, "/api/local-auth/login", {
      method: "POST",
      body: { email: "ada@afit.edu.ng", password: "Password123!" }
    });
    assert.equal(oldLoginFail.status, 401);

    const newLoginOk = await httpJson(baseUrl, "/api/local-auth/login", {
      method: "POST",
      body: { email: "ada@afit.edu.ng", password: "NewPassword456!" }
    });
    assert.equal(newLoginOk.status, 200);

    // 4. Theme V3 persistence per UID
    const saveThemeA = await httpJson(baseUrl, "/api/profile/theme", {
      method: "PUT",
      token: tokenA,
      body: { themeId: "midnight-dark" }
    });
    assert.equal(saveThemeA.status, 200);
    assert.equal(saveThemeA.body.themePreference.themeId, "midnight-dark");

    const meA = await httpJson(baseUrl, "/api/me", { token: tokenA });
    assert.equal(meA.body.profile.themePreference.themeId, "midnight-dark");
    const meB = await httpJson(baseUrl, "/api/me", { token: tokenB });
    assert.equal(meB.body.profile.themePreference, undefined);

    // 5. Security & Privacy: CourseMate visibility toggle & Blocked Students unblock
    const cmInit = await httpJson(baseUrl, "/api/coursemate/profile", { token: tokenA });
    assert.equal(cmInit.status, 200);
    assert.equal(cmInit.body.profile.discoverable, false);

    const cmShow = await httpJson(baseUrl, "/api/coursemate/profile", {
      method: "PUT",
      token: tokenA,
      body: { discoverable: true }
    });
    assert.equal(cmShow.status, 200);
    assert.equal(cmShow.body.profile.discoverable, true);

    const cmReloadShown = await httpJson(baseUrl, "/api/coursemate/profile", { token: tokenA });
    assert.equal(cmReloadShown.status, 200);
    assert.equal(cmReloadShown.body.profile.discoverable, true);

    const cmHide = await httpJson(baseUrl, "/api/coursemate/profile", {
      method: "PUT",
      token: tokenA,
      body: { discoverable: false }
    });
    assert.equal(cmHide.status, 200);
    assert.equal(cmHide.body.profile.discoverable, false);

    const cmReload = await httpJson(baseUrl, "/api/coursemate/profile", { token: tokenA });
    assert.equal(cmReload.status, 200);
    assert.equal(cmReload.body.profile.discoverable, false);

    const blockB = await httpJson(baseUrl, "/api/messages/blocked", {
      method: "POST",
      token: tokenA,
      body: { otherUid: uidB }
    });
    assert.equal(blockB.status, 200);

    const blockedList = await httpJson(baseUrl, "/api/messages/blocked", { token: tokenA });
    assert.equal(blockedList.status, 200);
    assert.equal(blockedList.body.items.length, 1);
    assert.equal(blockedList.body.items[0].uid, uidB);
    assert.equal(blockedList.body.items[0].name, "Bola Classmate");

    const unblockB = await httpJson(baseUrl, `/api/messages/blocked/${encodeURIComponent(uidB)}`, {
      method: "DELETE",
      token: tokenA
    });
    assert.equal(unblockB.status, 200);

    const blockedAfter = await httpJson(baseUrl, "/api/messages/blocked", { token: tokenA });
    assert.equal(blockedAfter.status, 200);
    assert.equal(blockedAfter.body.items.length, 0);
  } finally {
    serverProc.kill("SIGTERM");
  }
});

test("Settings V3 Frontend Contracts: No static link-only privacy placeholders, working password/privacy/history bindings", () => {
  const rootDir = path.join(__dirname, "..");
  const profileHtml = fs.readFileSync(path.join(rootDir, "profile.html"), "utf8");
  const pageProfileJs = fs.readFileSync(path.join(rootDir, "js", "page-profile.js"), "utf8");
  const profileJs = fs.readFileSync(path.join(rootDir, "js", "profile.js"), "utf8");
  const firebaseConfigJs = fs.readFileSync(path.join(rootDir, "js", "firebase-config.js"), "utf8");

  // No static link-only privacy buttons or eternal "Loading account details…" text
  assert.ok(!profileHtml.includes("Open Messaging Privacy"));
  assert.ok(!profileHtml.includes("Manage CourseMate Privacy"));
  assert.ok(!profileHtml.includes("Loading account details…"));

  // Interactive controls exist in profile.html
  assert.ok(profileHtml.includes('id="password-change-form"'));
  assert.ok(profileHtml.includes('id="settings-coursemate-discoverable"'));
  assert.ok(profileHtml.includes('id="settings-blocked-list"'));

  // Event wiring in page-profile.js
  assert.ok(pageProfileJs.includes("changeStudentPassword"));
  assert.ok(pageProfileJs.includes("/api/coursemate/profile"));
  assert.ok(pageProfileJs.includes("/api/messages/blocked"));
  assert.ok(pageProfileJs.includes("pushState"));
  assert.ok(pageProfileJs.includes("popstate"));
  assert.ok(pageProfileJs.includes("onProfileError"));
  assert.ok(profileJs.includes("onProfileError"));

  // Firebase Auth real reauthentication + updatePassword present
  assert.ok(firebaseConfigJs.includes("reauthenticateWithCredential"));
  assert.ok(firebaseConfigJs.includes("updatePassword"));
  assert.ok(firebaseConfigJs.includes("EmailAuthProvider.credential"));
});
