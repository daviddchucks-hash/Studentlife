"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const themeEngine = require("../js/theme-boot.js");
const { ValidationError, validateThemePreference, validateProfile } = require("./validation.js");

const EXPECTED_THEME_IDS = [
  "classic-light",
  "midnight-dark",
  "blossom-pink",
  "lavender-dream",
  "emerald-green",
  "multicolour-pop",
  "ocean-breeze",
  "golden-sand",
  "sunset-glow",
  "cyber-neon",
  "sky-blue",
  "royal-purple"
];

const EXPECTED_28_CSS_VARS = [
  "--bg-primary",
  "--bg-secondary",
  "--bg-tertiary",
  "--surface-primary",
  "--surface-secondary",
  "--surface-elevated",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--accent-primary",
  "--accent-secondary",
  "--accent-foreground",
  "--border-color",
  "--input-background",
  "--input-border",
  "--button-background",
  "--button-text",
  "--navigation-background",
  "--navigation-text",
  "--navigation-active",
  "--card-background",
  "--modal-background",
  "--success-color",
  "--warning-color",
  "--error-color",
  "--message-sent-background",
  "--message-received-background",
  "--focus-ring"
];

const REQUIRED_TOKENS = [
  "bgPrimary",
  "bgSecondary",
  "bgTertiary",
  "surface",
  "surfaceAlt",
  "surfaceElevated",
  "navBg",
  "modalBg",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "accentPrimary",
  "accentPrimaryHover",
  "accentSecondary",
  "accentForeground",
  "accentSoft",
  "buttonBg",
  "buttonHover",
  "buttonText",
  "border",
  "borderStrong",
  "inputBg",
  "inputBorder",
  "hoverBg",
  "navActiveBg",
  "navActiveText",
  "success",
  "successSoft",
  "warning",
  "warningSoft",
  "error",
  "errorSoft",
  "msgReceivedBg",
  "msgReceivedText",
  "msgSentBg",
  "msgSentText",
  "focusRing",
  "shadow"
];

test("All 12 predefined themes exist with unique IDs, complete token sets, and all 28 standard CSS variables", () => {
  assert.equal(themeEngine.THEMES.length, 12);
  const actualIds = themeEngine.THEMES.map((t) => t.id);
  assert.deepEqual(actualIds, EXPECTED_THEME_IDS);
  assert.deepEqual(themeEngine.REQUIRED_CSS_VAR_NAMES, EXPECTED_28_CSS_VARS);

  for (const theme of themeEngine.THEMES) {
    assert.ok(theme.mode === "light" || theme.mode === "dark", `${theme.id} mode valid`);
    assert.ok(Array.isArray(theme.swatches) && theme.swatches.length === 5, `${theme.id} has 5 swatches`);
    for (const tokenKey of REQUIRED_TOKENS) {
      assert.ok(
        typeof theme.tokens[tokenKey] === "string" && theme.tokens[tokenKey].length > 0,
        `${theme.id} missing token ${tokenKey}`
      );
    }
    const cssMap = themeEngine.buildCssVariableMap(theme);
    for (const cssVar of EXPECTED_28_CSS_VARS) {
      assert.ok(
        typeof cssMap[cssVar] === "string" && cssMap[cssVar].length > 0,
        `${theme.id} missing emitted CSS variable ${cssVar}`
      );
    }
  }

  // Verify Midnight Dark uses charcoal + purple and Cyber Neon uses electric blue + neon purple
  const midnight = themeEngine.getThemeById("midnight-dark");
  assert.equal(midnight.mode, "dark");
  assert.equal(midnight.tokens.buttonBg, "#7c3aed");
  assert.equal(midnight.tokens.accentPrimary, "#a78bfa");

  const cyber = themeEngine.getThemeById("cyber-neon");
  assert.equal(cyber.mode, "dark");
  assert.equal(cyber.tokens.accentPrimary, "#38bdf8");
  assert.equal(cyber.tokens.accentSecondary, "#c084fc");
});

test("All 12 built-in themes satisfy WCAG AA (>= 4.5:1) contrast requirements", () => {
  for (const theme of themeEngine.THEMES) {
    const tk = theme.tokens;
    const textSurface = themeEngine.contrastRatio(tk.textPrimary, tk.surface);
    const textBg = themeEngine.contrastRatio(tk.textPrimary, tk.bgPrimary);
    const mutedSurface = themeEngine.contrastRatio(tk.textSecondary, tk.surface);
    const accentSurface = themeEngine.contrastRatio(tk.accentPrimary, tk.surface);
    const solidBtnBg = tk.buttonBg.startsWith("#") ? tk.buttonBg : tk.msgSentBg;
    const buttonText = themeEngine.contrastRatio(tk.buttonText, solidBtnBg);

    assert.ok(textSurface >= 4.5, `${theme.id} textPrimary/surface contrast ${textSurface.toFixed(2)} < 4.5`);
    assert.ok(textBg >= 4.5, `${theme.id} textPrimary/bgPrimary contrast ${textBg.toFixed(2)} < 4.5`);
    assert.ok(mutedSurface >= 4.5, `${theme.id} textSecondary/surface contrast ${mutedSurface.toFixed(2)} < 4.5`);
    assert.ok(accentSurface >= 4.5, `${theme.id} accentPrimary/surface contrast ${accentSurface.toFixed(2)} < 4.5`);
    assert.ok(buttonText >= 4.5, `${theme.id} buttonText/buttonBg contrast ${buttonText.toFixed(2)} < 4.5`);
  }
});

test("System Default dynamically resolves light/dark from OS media query and updates live on OS change", () => {
  const listeners = new Set();
  let currentMatchesDark = false;
  const prevMatchMedia = globalThis.matchMedia;
  const prevDocument = globalThis.document;

  const setProps = new Map();
  const dispatched = [];
  const docEl = {
    dataset: {},
    classList: { add() {}, remove() {} },
    style: {
      setProperty(k, v) { setProps.set(k, v); },
      colorScheme: ""
    }
  };

  globalThis.matchMedia = () => ({
    get matches() { return currentMatchesDark; },
    addEventListener(type, fn) { if (type === "change") listeners.add(fn); },
    removeEventListener(type, fn) { if (type === "change") listeners.delete(fn); }
  });
  globalThis.document = {
    documentElement: docEl,
    querySelector() { return { setAttribute() {} }; },
    dispatchEvent(evt) { dispatched.push(evt); }
  };

  try {
    const lightRes = themeEngine.applyTheme({ themeId: "system-default" });
    assert.equal(lightRes.theme.resolvedThemeId, "classic-light");
    assert.equal(docEl.dataset.themePreference, "system-default");
    assert.equal(docEl.dataset.theme, "classic-light");
    assert.equal(docEl.dataset.themeMode, "light");
    assert.equal(setProps.get("--bg-primary"), "#f4f7fa");

    // Simulate OS flipping to Dark mode
    currentMatchesDark = true;
    for (const fn of listeners) fn({ matches: true });

    assert.equal(docEl.dataset.themePreference, "system-default");
    assert.equal(docEl.dataset.theme, "midnight-dark");
    assert.equal(docEl.dataset.themeMode, "dark");
    assert.equal(setProps.get("--bg-primary"), "#0b0c10");
    assert.equal(setProps.get("--button-background"), "#7c3aed");

    // Switching to an explicit theme detaches the OS listener cleanly
    themeEngine.applyTheme({ themeId: "blossom-pink" });
    assert.equal(docEl.dataset.theme, "blossom-pink");
    assert.equal(listeners.size, 0);
  } finally {
    globalThis.matchMedia = prevMatchMedia;
    if (prevDocument === undefined) delete globalThis.document;
    else globalThis.document = prevDocument;
  }
});

test("Custom theme resolver emits all 28 variables and auto-adjusts unreadable accents", () => {
  const lightCustom = themeEngine.resolveCustomThemeDefinition({
    backgroundPreset: "light-crisp",
    primaryAccent: "#ffff99",
    secondaryAccent: "#e2e8f0",
    buttonAccent: "#fde047"
  });

  assert.equal(lightCustom.id, "custom");
  assert.equal(lightCustom.mode, "light");
  assert.equal(lightCustom.tokens.buttonText, "#111827");
  assert.ok(
    themeEngine.contrastRatio(lightCustom.tokens.accentPrimary, lightCustom.tokens.surface) >= 4.5,
    "Light custom theme must boost primary accent contrast on white card"
  );
  assert.equal(lightCustom.customMeta.adjustedAccent, true);

  const cssMap = themeEngine.buildCssVariableMap(lightCustom);
  for (const cssVar of EXPECTED_28_CSS_VARS) {
    assert.ok(typeof cssMap[cssVar] === "string" && cssMap[cssVar].length > 0, `Custom missing ${cssVar}`);
  }
});

test("Backend validateThemePreference & validateProfile enforce valid inputs including system-default", () => {
  for (const id of [...EXPECTED_THEME_IDS, "system-default"]) {
    const valid = validateThemePreference({ themeId: id });
    assert.equal(valid.themeId, id);
    assert.ok(valid.updatedAt > 0);
  }

  const validCustom = validateThemePreference({
    themeId: "custom",
    customColors: {
      backgroundPreset: "dark-midnight",
      primaryAccent: "#38BDF8",
      secondaryAccent: "#818CF8",
      buttonAccent: "#2563EB"
    }
  });
  assert.equal(validCustom.themeId, "custom");
  assert.equal(validCustom.customColors.primaryAccent, "#38bdf8");

  const validWithProfile = validateProfile({
    name: "Ada Lovelace",
    department: "Computer Science",
    themePreference: { themeId: "system-default" }
  });
  assert.equal(validWithProfile.themePreference.themeId, "system-default");

  assert.throws(() => validateThemePreference("midnight-dark"), ValidationError);
  assert.throws(() => validateThemePreference({ themeId: "nonexistent-theme" }), ValidationError);
  assert.throws(() => validateThemePreference({ themeId: "custom" }), ValidationError);
  assert.throws(() => validateThemePreference({ themeId: "classic-light", extraKey: true }), ValidationError);
});

test("Per-UID localStorage isolation resets clean on sign-out and preserves pendingSync flags per student", () => {
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  };

  try {
    themeEngine.saveStoredPreferenceForUid("student-alpha", { themeId: "midnight-dark", pendingSync: true });
    assert.equal(themeEngine.getCurrentPreference().themeId, "midnight-dark");
    assert.equal(themeEngine.getCurrentPreference().pendingSync, true);
    assert.equal(themeEngine.getActiveUid(), "student-alpha");

    themeEngine.clearActiveSessionTheme();
    assert.equal(themeEngine.getActiveUid(), "");
    assert.equal(themeEngine.getCurrentPreference().themeId, "classic-light");

    themeEngine.saveStoredPreferenceForUid("student-beta", { themeId: "system-default", pendingSync: false });
    assert.equal(themeEngine.getCurrentPreference().themeId, "system-default");

    assert.equal(themeEngine.readStoredPreferenceForUid("student-alpha").themeId, "midnight-dark");
    assert.equal(themeEngine.readStoredPreferenceForUid("student-alpha").pendingSync, true);
    assert.equal(themeEngine.readStoredPreferenceForUid("student-beta").themeId, "system-default");
    assert.equal(themeEngine.readStoredPreferenceForUid("student-beta").pendingSync, false);
  } finally {
    if (prevStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevStorage;
  }
});

test("Profile Settings repairs: decoupled from theme-engine, fixed email SmartSave bug, locked verified matriculation, 4-section Settings", () => {
  const rootDir = path.join(__dirname, "..");
  const profileJs = fs.readFileSync(path.join(rootDir, "js", "profile.js"), "utf8");
  const profileHtml = fs.readFileSync(path.join(rootDir, "profile.html"), "utf8");

  assert.ok(!profileJs.includes("theme-engine"), "profile.js must not couple to theme-engine.js");
  assert.ok(!profileJs.includes('name="email"'), "readonly disabled email input must not use name='email'");
  assert.ok(profileJs.includes("isMatricLocked"), "profile.js must check permanent matric verification lock");

  assert.ok(profileHtml.includes('data-settings-section="profile"'));
  assert.ok(profileHtml.includes('data-settings-section="account"'));
  assert.ok(profileHtml.includes('data-settings-section="themes"'));
  assert.ok(profileHtml.includes('data-settings-section="security"'));
});

test("Every HTML page loads pre-paint theme-boot.js and themes.css in <head>", () => {
  const rootDir = path.join(__dirname, "..");
  const htmlFiles = fs.readdirSync(rootDir).filter((file) => file.endsWith(".html"));
  assert.equal(htmlFiles.length, 20);

  for (const file of htmlFiles) {
    const content = fs.readFileSync(path.join(rootDir, file), "utf8");
    const headEnd = content.indexOf("</head>");
    assert.ok(headEnd > 0, `${file} must have </head>`);
    const headContent = content.slice(0, headEnd);

    const bootPos = headContent.indexOf("./js/theme-boot.js");
    const globalPos = headContent.indexOf("./css/global.css");
    const themesCssPos = headContent.indexOf("./css/themes.css");

    assert.ok(bootPos > 0, `${file} must include ./js/theme-boot.js in <head>`);
    assert.ok(themesCssPos > 0, `${file} must include ./css/themes.css in <head>`);
    assert.ok(bootPos < globalPos, `${file} must load theme-boot.js before global.css to prevent flash`);
  }
});
