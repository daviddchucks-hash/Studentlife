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

const REQUIRED_TOKENS = [
  "bgPrimary",
  "bgSecondary",
  "surface",
  "surfaceAlt",
  "navBg",
  "modalBg",
  "textPrimary",
  "textSecondary",
  "accentPrimary",
  "accentPrimaryHover",
  "accentSecondary",
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

test("All 12 predefined themes exist with unique IDs and complete token sets", () => {
  assert.equal(themeEngine.THEMES.length, 12);
  const actualIds = themeEngine.THEMES.map((t) => t.id);
  assert.deepEqual(actualIds, EXPECTED_THEME_IDS);
  assert.equal(new Set(actualIds).size, 12);
  assert.equal(new Set(themeEngine.THEMES.map((t) => t.name)).size, 12);

  for (const theme of themeEngine.THEMES) {
    assert.ok(theme.mode === "light" || theme.mode === "dark", `${theme.id} mode valid`);
    assert.ok(Array.isArray(theme.swatches) && theme.swatches.length === 5, `${theme.id} has 5 swatches`);
    for (const tokenKey of REQUIRED_TOKENS) {
      assert.ok(
        typeof theme.tokens[tokenKey] === "string" && theme.tokens[tokenKey].length > 0,
        `${theme.id} missing token ${tokenKey}`
      );
    }
  }
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

test("Custom theme resolver auto-adjusts unreadable surface accents and picks readable button text", () => {
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

  const darkCustom = themeEngine.resolveCustomThemeDefinition({
    backgroundPreset: "dark-midnight",
    primaryAccent: "#1e1b4b",
    secondaryAccent: "#312e81",
    buttonAccent: "#2563eb"
  });

  assert.equal(darkCustom.mode, "dark");
  assert.equal(darkCustom.tokens.buttonText, "#ffffff");
  assert.ok(
    themeEngine.contrastRatio(darkCustom.tokens.accentPrimary, darkCustom.tokens.surface) >= 4.5,
    "Dark custom theme must lighten dark accent against midnight card"
  );
});

test("Backend validateThemePreference & validateProfile enforce valid inputs cleanly", () => {
  for (const id of EXPECTED_THEME_IDS) {
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
    themePreference: { themeId: "blossom-pink" }
  });
  assert.equal(validWithProfile.themePreference.themeId, "blossom-pink");

  assert.throws(() => validateThemePreference("midnight-dark"), ValidationError);
  assert.throws(() => validateThemePreference({ themeId: "nonexistent-theme" }), ValidationError);
  assert.throws(() => validateThemePreference({ themeId: "custom" }), ValidationError);
  assert.throws(() => validateThemePreference({
    themeId: "custom",
    customColors: {
      backgroundPreset: "invalid-preset",
      primaryAccent: "#112233",
      secondaryAccent: "#445566",
      buttonAccent: "#778899"
    }
  }), ValidationError);
  assert.throws(() => validateThemePreference({
    themeId: "custom",
    customColors: {
      backgroundPreset: "light-crisp",
      primaryAccent: "javascript:alert(1)",
      secondaryAccent: "#445566",
      buttonAccent: "#778899"
    }
  }), ValidationError);
  assert.throws(() => validateThemePreference({ themeId: "classic-light", extraKey: true }), ValidationError);
});

test("Per-UID localStorage isolation resets clean on sign-out and restores per student", () => {
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  };

  try {
    themeEngine.saveStoredPreferenceForUid("student-alpha", { themeId: "midnight-dark" });
    assert.equal(themeEngine.getCurrentPreference().themeId, "midnight-dark");
    assert.equal(themeEngine.getActiveUid(), "student-alpha");

    themeEngine.clearActiveSessionTheme();
    assert.equal(themeEngine.getActiveUid(), "");
    assert.equal(themeEngine.getCurrentPreference().themeId, "classic-light");

    // Student Beta sets Blossom Pink independently
    themeEngine.saveStoredPreferenceForUid("student-beta", { themeId: "blossom-pink" });
    assert.equal(themeEngine.getCurrentPreference().themeId, "blossom-pink");

    // Alpha's saved per-UID preference stays untouched
    assert.equal(themeEngine.readStoredPreferenceForUid("student-alpha").themeId, "midnight-dark");
    assert.equal(themeEngine.readStoredPreferenceForUid("student-beta").themeId, "blossom-pink");
  } finally {
    if (prevStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prevStorage;
    }
  }
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
