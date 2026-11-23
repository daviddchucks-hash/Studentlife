"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const themeEngine = require("../js/theme-boot.js");
const { ValidationError, validatePersonalizationPreference, validateProfile } = require("./validation.js");

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

test("All 5 extended themes pass WCAG AA contrast, accent overrides remain legible, and all 10 fonts & 5 presets exist", () => {
  const extendedIds = ["amoled-black", "warm-cream", "ocean-blue", "forest-green", "lavender-mode"];
  assert.equal(themeEngine.EXTENDED_THEMES.length, 5);
  assert.equal(themeEngine.ALL_THEMES.length, 17);
  assert.deepEqual(themeEngine.EXTENDED_THEMES.map((t) => t.id), extendedIds);

  for (const theme of themeEngine.EXTENDED_THEMES) {
    const tk = theme.tokens;
    assert.ok(themeEngine.contrastRatio(tk.textPrimary, tk.surface) >= 4.5, `${theme.id} text/surface`);
    assert.ok(themeEngine.contrastRatio(tk.textPrimary, tk.bgPrimary) >= 4.5, `${theme.id} text/bg`);
    assert.ok(themeEngine.contrastRatio(tk.textSecondary, tk.surface) >= 4.5, `${theme.id} muted/surface`);
    assert.ok(themeEngine.contrastRatio(tk.accentPrimary, tk.surface) >= 4.5, `${theme.id} accent/surface`);
    assert.ok(themeEngine.contrastRatio(tk.buttonText, tk.buttonBg) >= 4.5, `${theme.id} btnText/btnBg`);

    // Test accent color override contrast tuning on both light & dark themes
    const accented = themeEngine.getThemeById(theme.id, null, undefined, "#fef08a");
    assert.ok(
      themeEngine.contrastRatio(accented.tokens.accentPrimary, accented.tokens.surface) >= 4.5,
      `${theme.id} accented contrast must stay >= 4.5`
    );
    assert.ok(
      themeEngine.contrastRatio(accented.tokens.buttonText, accented.tokens.buttonBg) >= 4.5,
      `${theme.id} accented button contrast must stay >= 4.5`
    );
  }

  const fontIds = themeEngine.FONT_CATALOG.map((f) => f.id);
  for (const expectedFont of [
    "default", "modern-sans", "roboto-sans", "rounded", "classic-serif",
    "handwriting", "cursive-script", "decorative", "elegant-script", "monospace"
  ]) {
    assert.ok(fontIds.includes(expectedFont), `Missing font ${expectedFont}`);
  }

  assert.deepEqual(Object.keys(themeEngine.FONT_SIZE_SCALES), ["small", "medium", "large", "xlarge"]);
  assert.deepEqual(
    themeEngine.PERSONALIZATION_PRESETS.map((p) => p.id),
    ["minimalist", "student-focus", "creative", "elegant", "night-owl"]
  );
});

test("applyPersonalization emits CSS custom properties, typography attributes, accessibility flags, and Google Fonts link cleanly", () => {
  const prevDocument = globalThis.document;
  const props = new Map();
  const appendedHeadChildren = [];
  const dispatched = [];

  const docEl = {
    dataset: {},
    classList: { add() {}, remove() {} },
    style: {
      setProperty(k, v) { props.set(k, v); },
      colorScheme: ""
    }
  };

  globalThis.document = {
    documentElement: docEl,
    head: {
      appendChild(node) { appendedHeadChildren.push(node); }
    },
    getElementById(id) {
      return appendedHeadChildren.find((n) => n.id === id) || null;
    },
    createElement(tag) {
      return { tagName: tag.toUpperCase(), id: "", rel: "", href: "" };
    },
    querySelector() {
      return { setAttribute() {} };
    },
    dispatchEvent(evt) {
      dispatched.push(evt);
    }
  };

  try {
    const result = themeEngine.applyPersonalization({
      themeId: "amoled-black",
      accentColor: "#ec4899",
      typography: {
        headingFont: "classic-serif",
        bodyFont: "handwriting",
        fontSize: "xlarge",
        protectAcademicReadability: true
      },
      appearance: {
        buttonStyle: "pill",
        spacing: "spacious",
        cardStyle: "elevated",
        density: "relaxed",
        motionMode: "reduced",
        sidebarStyle: "sidebar",
        sidebarTone: "tinted"
      },
      accessibility: {
        highContrast: true,
        reducedMotion: true,
        focusMode: "enhanced",
        readableSpacing: true
      },
      dashboard: {
        greetingStyle: "academic",
        showGreetingName: false,
        sectionOrder: ["overview", "quickActions", "platformHub", "lowerPanels"],
        overviewOrder: ["examCountdown", "todayClasses", "currentCourses", "upcomingAssignments"],
        widgets: { gradingNote: false }
      },
      presetId: ""
    });

    assert.equal(result.theme.id, "amoled-black");
    assert.equal(props.get("--bg-primary"), "#000000");
    assert.ok(props.get("--font-heading").includes("Playfair Display"));
    assert.ok(props.get("--font-body").includes("Caveat"));
    assert.equal(props.get("--font-scale"), "1.18");
    assert.equal(props.get("--ui-button-radius"), "999px");

    assert.equal(docEl.dataset.fontHeading, "classic-serif");
    assert.equal(docEl.dataset.fontBody, "handwriting");
    assert.equal(docEl.dataset.fontSize, "xlarge");
    assert.equal(docEl.dataset.decorativeBody, "true");
    assert.equal(docEl.dataset.readabilityGuard, "true");
    assert.equal(docEl.dataset.buttonStyle, "pill");
    assert.equal(docEl.dataset.uiSpacing, "spacious");
    assert.equal(docEl.dataset.cardStyle, "elevated");
    assert.equal(docEl.dataset.uiDensity, "relaxed");
    assert.equal(docEl.dataset.navLayout, "sidebar");
    assert.equal(docEl.dataset.sidebarTone, "tinted");
    assert.equal(docEl.dataset.highContrast, "true");
    assert.equal(docEl.dataset.reducedMotion, "true");
    assert.equal(docEl.dataset.focusRing, "enhanced");
    assert.equal(docEl.dataset.readableSpacing, "true");

    assert.equal(appendedHeadChildren.length, 1);
    assert.ok(appendedHeadChildren[0].href.includes("fonts.googleapis.com"));
  } finally {
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
  }
});

test("validatePersonalizationPreference & /api/profile/personalization persist per-student settings across logout & re-login", async () => {
  // Unit validation checks
  assert.throws(() => validatePersonalizationPreference("invalid"), ValidationError);
  assert.throws(() => validatePersonalizationPreference({ typography: { fontSize: "gigantic" } }), ValidationError);
  assert.throws(() => validatePersonalizationPreference({ appearance: { buttonStyle: "triangle" } }), ValidationError);
  assert.throws(() => validatePersonalizationPreference({ dashboard: { widgets: { unknownWidget: true } } }), ValidationError);
  assert.throws(() => validateProfile({ name: "Test", personalization: { themeId: "fake-theme" } }), ValidationError);

  const validFull = validatePersonalizationPreference({
    themeId: "ocean-blue",
    accentColor: "#7c3aed",
    typography: {
      headingFont: "classic-serif",
      bodyFont: "modern-sans",
      fontSize: "large",
      protectAcademicReadability: true
    },
    appearance: {
      buttonStyle: "pill",
      spacing: "spacious",
      cardStyle: "elevated",
      density: "relaxed",
      motionMode: "reduced",
      sidebarStyle: "sidebar",
      sidebarTone: "accent"
    },
    accessibility: {
      highContrast: true,
      reducedMotion: true,
      focusMode: "enhanced",
      readableSpacing: true
    },
    dashboard: {
      greetingStyle: "custom",
      customGreeting: "Stay sharp",
      showGreetingName: true,
      sectionOrder: ["overview", "platformHub", "quickActions", "lowerPanels"],
      overviewOrder: ["examCountdown", "upcomingAssignments", "todayClasses", "currentCourses"],
      widgets: { gradingNote: false, quickActions: true }
    },
    presetId: ""
  });
  assert.equal(validFull.themeId, "ocean-blue");
  assert.equal(validFull.accentColor, "#7c3aed");
  assert.equal(validFull.typography.headingFont, "classic-serif");
  assert.equal(validFull.dashboard.widgets.gradingNote, false);

  const port = 3989;
  const baseUrl = `http://127.0.0.1:${port}`;
  const serverProc = await startTestServer(port);

  try {
    const signupA = await httpJson(baseUrl, "/api/local-auth/signup", {
      method: "POST",
      body: { name: "Ngozi Student", email: "ngozi@afit.edu.ng", password: "Password123!" }
    });
    assert.equal(signupA.status, 201);
    const tokenA = signupA.body.idToken;

    const signupB = await httpJson(baseUrl, "/api/local-auth/signup", {
      method: "POST",
      body: { name: "Musa Student", email: "musa@afit.edu.ng", password: "Password123!" }
    });
    assert.equal(signupB.status, 201);
    const tokenB = signupB.body.idToken;

    // Save personalization for Student A
    const putRes = await httpJson(baseUrl, "/api/profile/personalization", {
      method: "PUT",
      token: tokenA,
      body: validFull
    });
    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.personalization.themeId, "ocean-blue");
    assert.equal(putRes.body.personalization.typography.headingFont, "classic-serif");
    assert.equal(putRes.body.personalization.dashboard.customGreeting, "Stay sharp");
    assert.equal(putRes.body.themePreference.themeId, "ocean-blue");

    // Verify Student B stays isolated
    const getB = await httpJson(baseUrl, "/api/profile/personalization", { token: tokenB });
    assert.equal(getB.status, 200);
    assert.equal(getB.body.personalization, null);

    // Simulate logout & fresh login for Student A
    const reloginA = await httpJson(baseUrl, "/api/local-auth/login", {
      method: "POST",
      body: { email: "ngozi@afit.edu.ng", password: "Password123!" }
    });
    assert.equal(reloginA.status, 200);
    const freshMeA = await httpJson(baseUrl, "/api/me", { token: reloginA.body.idToken });
    assert.equal(freshMeA.status, 200);
    assert.equal(freshMeA.body.profile.personalization.themeId, "ocean-blue");
    assert.equal(freshMeA.body.profile.personalization.accentColor, "#7c3aed");
    assert.equal(freshMeA.body.profile.personalization.typography.headingFont, "classic-serif");
    assert.equal(freshMeA.body.profile.personalization.appearance.buttonStyle, "pill");
    assert.equal(freshMeA.body.profile.personalization.accessibility.highContrast, true);
    assert.deepEqual(
      freshMeA.body.profile.personalization.dashboard.sectionOrder,
      ["overview", "platformHub", "quickActions", "lowerPanels"]
    );
    assert.equal(freshMeA.body.profile.personalization.dashboard.widgets.gradingNote, false);
  } finally {
    serverProc.kill("SIGTERM");
  }
});

test("Frontend personalization contracts: Personalization Center controls, toggle switches, dashboard markers, and API sync", () => {
  const rootDir = path.join(__dirname, "..");
  const studioJs = fs.readFileSync(path.join(rootDir, "js", "theme-studio.js"), "utf8");
  const engineJs = fs.readFileSync(path.join(rootDir, "js", "theme-engine.js"), "utf8");
  const dashboardHtml = fs.readFileSync(path.join(rootDir, "dashboard.html"), "utf8");
  const dashboardJs = fs.readFileSync(path.join(rootDir, "js", "dashboard.js"), "utf8");
  const pageProfileJs = fs.readFileSync(path.join(rootDir, "js", "page-profile.js"), "utf8");

  // All 6 subtabs + preview + action buttons in Personalization Center
  for (const token of [
    'data-studio-subtab="',
    'data-font-role="',
    'data-font-size="',
    'data-accent-picker',
    'data-accent-hex',
    'data-appearance-field="',
    'data-access-toggle="',
    'data-greeting-style="',
    'data-move-section="',
    'data-move-overview="',
    'data-widget-toggle="',
    'data-apply-preset="',
    'data-action="apply-all"',
    'data-action="revert-draft"',
    'data-action="confirm-reset-all"',
    "settings-switch-input"
  ]) {
    assert.ok(studioJs.includes(token), `theme-studio.js must include ${token}`);
  }

  // Never use window.alert / window.confirm / window.open
  assert.ok(!studioJs.includes("window.alert") && !studioJs.includes("window.confirm") && !studioJs.includes("confirm("));

  // Theme engine calls real backend endpoint & guards loading overwrites
  assert.ok(engineJs.includes("/api/profile/personalization"));
  assert.ok(engineJs.includes("seqAtStart !== localChangeSeq"));

  // Dashboard markup & controller support widget toggles + section/card reordering + greetings
  for (const attr of [
    'data-dashboard-section="quickActions"',
    'data-dashboard-section="overview"',
    'data-dashboard-section="platformHub"',
    'data-dashboard-section="lowerPanels"',
    'data-overview-card="todayClasses"',
    'data-overview-card="examCountdown"',
    'data-dashboard-widget="gradingNote"'
  ]) {
    assert.ok(dashboardHtml.includes(attr), `dashboard.html must include ${attr}`);
  }
  assert.ok(dashboardJs.includes("formatDashboardGreeting"));
  assert.ok(dashboardJs.includes("afit-personalization-changed"));
  assert.ok(pageProfileJs.includes("studentName"));
});
