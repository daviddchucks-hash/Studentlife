import {
  getAllThemes,
  getBackgroundPresets,
  getAccentPresets,
  getFonts,
  getFontSizes,
  getPersonalizationPresets,
  getDefaultPersonalization,
  normalizePersonalization,
  isSystemDarkMode,
  getThemeDefinition,
  resolveCustomTheme,
  getCurrentPersonalization,
  getDefaultCustomColors,
  applyPersonalizationPreference,
  ensureGoogleFontsLoaded,
  saveAndApplyPersonalization,
  resetAllPersonalization
} from "./theme-engine.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function isValidHex(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function normalizeHexInput(raw) {
  if (typeof raw !== "string") return null;
  let cleaned = raw.trim();
  if (!cleaned.startsWith("#")) cleaned = "#" + cleaned;
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const [, a, b, c] = cleaned;
    cleaned = `#${a}${a}${b}${b}${c}${c}`;
  }
  return isValidHex(cleaned) ? cleaned.toLowerCase() : null;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isEqualJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const SECTION_LABELS = {
  quickActions: "Quick Actions Bar",
  overview: "Academic Overview (Stats & Panels)",
  platformHub: "Platform Sections Hub",
  lowerPanels: "Quick Navigation & Notes"
};

const OVERVIEW_LABELS = {
  todayClasses: "Today's Classes",
  currentCourses: "Current Courses",
  upcomingAssignments: "Upcoming Assignments",
  examCountdown: "Exam Countdown"
};

const WIDGET_LABELS = {
  quickActions: "Quick Actions Shortcuts",
  stats: "Academic Summary Counters",
  todayClasses: "Today's Classes Card",
  currentCourses: "Current Courses Card",
  upcomingAssignments: "Upcoming Assignments Card",
  examCountdown: "Exam Countdown Card",
  platformHub: "Platform Sections & Search Hub",
  quickNav: "Quick Navigation Links Panel",
  gradingNote: "Grading Scale Reminder Card"
};

const SUBTABS = [
  { id: "themes", label: "Themes & Colours" },
  { id: "fonts", label: "Fonts & Size" },
  { id: "interface", label: "Interface" },
  { id: "accessibility", label: "Accessibility" },
  { id: "dashboard", label: "Dashboard & Greeting" },
  { id: "presets", label: "Presets" }
];

const BUTTON_RADII = {
  rounded: "10px",
  "soft-square": "5px",
  pill: "999px"
};

function computeGreetingPreview(dashboardCfg, studentName = "") {
  const cleanName = String(studentName || "").trim() || "Student";
  const showName = dashboardCfg?.showGreetingName !== false;
  const style = dashboardCfg?.greetingStyle || "time-based";
  let prefix = "Welcome back";

  if (style === "time-based") {
    const hour = new Date().getHours();
    prefix = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  } else if (style === "focused") {
    prefix = "Ready to focus";
  } else if (style === "academic") {
    prefix = "Make today count";
  } else if (style === "custom") {
    const custom = String(dashboardCfg?.customGreeting || "").trim();
    prefix = custom || "Welcome back";
  }

  return showName ? `${prefix}, ${cleanName}.` : `${prefix}.`;
}

function buildPreviewVarsStyle(tokens, pers, fonts, sizes) {
  const safe = (v) => String(v || "").replace(/[;"<>]/g, "");
  const hFont = fonts.find((f) => f.id === pers.typography.headingFont) || fonts[0];
  const bFont = fonts.find((f) => f.id === pers.typography.bodyFont) || fonts[0];
  const sizeObj = sizes[pers.typography.fontSize] || sizes.medium || { scale: "1" };
  const btnRadius = BUTTON_RADII[pers.appearance.buttonStyle] || "10px";

  return [
    `--p-bg:${safe(tokens.bgPrimary)}`,
    `--p-bg-alt:${safe(tokens.bgSecondary)}`,
    `--p-surface:${safe(tokens.surface)}`,
    `--p-text:${safe(tokens.textPrimary)}`,
    `--p-muted:${safe(tokens.textSecondary)}`,
    `--p-accent:${safe(tokens.accentPrimary)}`,
    `--p-soft:${safe(tokens.accentSoft)}`,
    `--p-btn-bg:${safe(tokens.buttonBg)}`,
    `--p-btn-text:${safe(tokens.buttonText)}`,
    `--p-border:${safe(tokens.border)}`,
    `--p-input-bg:${safe(tokens.inputBg)}`,
    `--p-msg-rx:${safe(tokens.msgReceivedBg)}`,
    `--p-msg-tx:${safe(tokens.msgSentBg)}`,
    `--p-msg-tx-text:${safe(tokens.msgSentText)}`,
    `--p-font-heading:${safe(hFont.stack)}`,
    `--p-font-body:${safe(bFont.stack)}`,
    `--p-font-scale:${safe(sizeObj.scale)}`,
    `--p-btn-radius:${safe(btnRadius)}`
  ].join(";");
}

function renderMiniMockup(tokens, themeName) {
  const safe = (v) => String(v || "").replace(/[;"<>]/g, "");
  const vars = [
    `--p-bg:${safe(tokens.bgPrimary)}`,
    `--p-bg-alt:${safe(tokens.bgSecondary)}`,
    `--p-surface:${safe(tokens.surface)}`,
    `--p-text:${safe(tokens.textPrimary)}`,
    `--p-muted:${safe(tokens.textSecondary)}`,
    `--p-accent:${safe(tokens.accentPrimary)}`,
    `--p-soft:${safe(tokens.accentSoft)}`,
    `--p-btn-bg:${safe(tokens.buttonBg)}`,
    `--p-btn-text:${safe(tokens.buttonText)}`,
    `--p-border:${safe(tokens.border)}`,
    `--p-msg-rx:${safe(tokens.msgReceivedBg)}`,
    `--p-msg-tx:${safe(tokens.msgSentBg)}`,
    `--p-msg-tx-text:${safe(tokens.msgSentText)}`
  ].join(";");

  return `
    <div class="theme-mini-mock" style="${vars}" aria-hidden="true">
      <div class="theme-mini-topbar">
        <span class="theme-mini-brand"><span class="theme-mini-dot"></span>AFIT</span>
        <div class="theme-mini-nav-bars"><span></span><span></span><span></span></div>
      </div>
      <div class="theme-mini-body">
        <div class="theme-mini-card">
          <span class="theme-mini-line"></span>
          <span class="theme-mini-line sub"></span>
          <div class="theme-mini-btn-bar">${escapeHtml(themeName)}</div>
        </div>
        <div class="theme-mini-chat">
          <span class="theme-mini-bubble rx">Ready?</span>
          <span class="theme-mini-bubble tx">Let’s go!</span>
        </div>
      </div>
    </div>
  `;
}

export function renderThemeStudio(container, options = {}) {
  if (!container) return null;

  ensureGoogleFontsLoaded(true);

  const themes = getAllThemes();
  const bgPresets = getBackgroundPresets();
  const accentPresets = getAccentPresets();
  const fonts = getFonts();
  const fontSizes = getFontSizes();
  const presets = getPersonalizationPresets();

  let userUid = options.userUid || "";
  let studentName = options.studentName || "";
  let savedPers = normalizePersonalization(options.initialPersonalization || options.initialPreference || getCurrentPersonalization());
  let draftPers = deepClone(savedPers);
  let activeSubtab = "themes";
  let modeFilter = "all";
  let statusNotice = null;
  let confirmResetAll = false;
  let isSaving = false;

  let customDraft = draftPers.customColors
    ? { ...getDefaultCustomColors(), ...draftPers.customColors }
    : getDefaultCustomColors();

  function comparablePers(pers) {
    const clean = normalizePersonalization(pers);
    return {
      themeId: clean.themeId,
      customColors: clean.customColors,
      accentColor: clean.accentColor,
      typography: clean.typography,
      appearance: clean.appearance,
      accessibility: clean.accessibility,
      dashboard: clean.dashboard,
      presetId: clean.presetId || ""
    };
  }

  function hasUnsavedChanges() {
    return !isEqualJson(comparablePers(draftPers), comparablePers(savedPers));
  }

  function filterThemes(list) {
    if (modeFilter === "light") return list.filter((t) => t.mode === "light");
    if (modeFilter === "dark") return list.filter((t) => t.mode === "dark");
    if (modeFilter === "vibrant") return list.filter((t) => t.category === "vibrant" || t.category === "warm");
    return list;
  }

  function formatCategoryMeta(theme) {
    const modeLabel = theme.mode === "dark" ? "Dark" : "Light";
    if (theme.id === "classic-light") return "Light · Default";
    if (theme.category === "warm") return `${modeLabel} · Warm`;
    if (theme.category === "vibrant") return `${modeLabel} · Vibrant`;
    return `${modeLabel} UI`;
  }

  function applyDraftPreview(animate = false) {
    applyPersonalizationPreference(draftPers, { animate, preloadAllFonts: true });
  }

  async function commitPersonalization(nextPers, successMessage) {
    if (isSaving) return;
    isSaving = true;
    confirmResetAll = false;
    statusNotice = null;
    render();

    try {
      const saved = await saveAndApplyPersonalization(nextPers, userUid);
      savedPers = normalizePersonalization(saved);
      draftPers = deepClone(savedPers);
      if (savedPers.customColors) {
        customDraft = { ...getDefaultCustomColors(), ...savedPers.customColors };
      }
      statusNotice = saved.cloudSynced === false && saved.pendingSync
        ? { type: "info", text: `${successMessage} Saved locally and queued for account sync.` }
        : { type: "success", text: successMessage };
    } catch (error) {
      statusNotice = {
        type: "info",
        text: error?.message || "Saved locally on this device; cloud sync will retry automatically."
      };
      savedPers = normalizePersonalization(nextPers);
      draftPers = deepClone(savedPers);
    } finally {
      isSaving = false;
      render();
    }
  }

  function boostContrastHex(hex, bgMode) {
    const core = typeof window !== "undefined" ? window.AFITThemeEngine : null;
    if (!core || !isValidHex(hex)) return bgMode === "dark" ? "#38bdf8" : "#174e74";
    return core.ensureReadableAccentOnSurface(hex, bgMode === "dark" ? "#ffffff" : "#111827", 4.6);
  }

  function renderPreviewPane() {
    const displayedTheme = getThemeDefinition(draftPers.themeId, draftPers.customColors, draftPers.accentColor);
    const savedTheme = getThemeDefinition(savedPers.themeId, savedPers.customColors, savedPers.accentColor);
    const isDirty = hasUnsavedChanges();
    const vars = buildPreviewVarsStyle(displayedTheme.tokens, draftPers, fonts, fontSizes);
    const greetingText = computeGreetingPreview(draftPers.dashboard, studentName);
    const hFont = fonts.find((f) => f.id === draftPers.typography.headingFont) || fonts[0];
    const bFont = fonts.find((f) => f.id === draftPers.typography.bodyFont) || fonts[0];
    const sizeLabel = (fontSizes[draftPers.typography.fontSize] || fontSizes.medium || { label: "Medium" }).label;

    const cardSurfaceStyle = draftPers.appearance.cardStyle === "tinted"
      ? "background:var(--p-bg-alt); border:1px solid var(--p-border);"
      : draftPers.appearance.cardStyle === "elevated"
        ? "background:var(--p-surface); border:1px solid var(--p-border); box-shadow:0 8px 20px rgba(0,0,0,0.12);"
        : "background:var(--p-surface); border:1px solid var(--p-border);";

    return `
      <aside class="studio-preview-pane" aria-label="Live Personalization Preview">
        <div class="studio-block" style="gap:10px;">
          <div class="studio-block-head">
            <div>
              <h3 style="margin:0;">Live Preview</h3>
              <p class="muted" style="margin:2px 0 0; font-size:12.5px;">Updates instantly across cards, typography, accents &amp; layout.</p>
            </div>
            <span class="theme-active-indicator ${isDirty ? "is-preview" : ""}" id="studio-preview-badge">
              ${isDirty ? "Unsaved Preview" : "✓ Active"}
            </span>
          </div>

          <div class="live-preview-stage" id="studio-live-preview-stage" style="${vars}">
            <div class="live-preview-banner">
              <div class="live-preview-brand">
                <span class="live-preview-logo">A</span>
                <span>AFITStudentLife</span>
              </div>
              <div class="live-preview-nav" aria-hidden="true">
                <span class="active">${draftPers.appearance.sidebarStyle === "sidebar" ? "Sidebar" : "Dashboard"}</span>
                <span>Courses</span>
                <span>Notes</span>
              </div>
            </div>

            <div class="live-preview-greeting">
              <div class="live-preview-greeting-eyebrow">Dashboard Greeting</div>
              <h3 id="studio-preview-greeting">${escapeHtml(greetingText)}</h3>
            </div>

            <div class="live-preview-content" style="grid-template-columns:1fr; gap:12px;">
              <div class="live-preview-card" style="${cardSurfaceStyle}">
                <div>
                  <h4>Academic Overview</h4>
                  <p>Track courses, calculate GPA, and study with custom typography and high-contrast clarity.</p>
                </div>
                <div class="live-preview-input">Search courses, formulas, or classmates…</div>
                <div class="live-preview-buttons">
                  <span class="live-preview-btn-primary">Primary Action</span>
                  <span class="live-preview-btn-secondary">Secondary Button</span>
                </div>
              </div>

              <div class="live-preview-chat" aria-hidden="true">
                <div class="live-preview-bubble rx">Hey! Are CSC 201 notes ready?</div>
                <div class="live-preview-bubble tx">Just synced them on NoteSync!</div>
              </div>
            </div>
          </div>

          <div style="font-size:12px; color:var(--text-secondary); display:grid; gap:4px; padding:4px 2px;" id="studio-preview-meta">
            <div><strong>Theme:</strong> ${escapeHtml(displayedTheme.name)}${draftPers.accentColor && draftPers.themeId !== "custom" ? ` · Custom Accent (${escapeHtml(draftPers.accentColor.toUpperCase())})` : ""}</div>
            <div><strong>Fonts:</strong> ${escapeHtml(hFont.name.split(" (")[0])} / ${escapeHtml(bFont.name.split(" (")[0])} · <strong>Size:</strong> ${escapeHtml(sizeLabel)}</div>
            <div><strong>Layout:</strong> ${escapeHtml(draftPers.appearance.buttonStyle)} buttons · ${escapeHtml(draftPers.appearance.cardStyle)} cards · ${escapeHtml(draftPers.appearance.sidebarStyle)}</div>
          </div>

          ${isDirty ? `
            <div class="info-box" style="margin:0; font-size:12.5px;" id="studio-dirty-note">
              Previewing changes over saved <strong>${escapeHtml(savedTheme.name)}</strong>. Click <strong>Apply Changes</strong> below to save to your account.
            </div>
          ` : ""}
        </div>
      </aside>
    `;
  }

  function renderThemesTab() {
    const osDark = isSystemDarkMode();
    const isSystemDraft = draftPers.themeId === "system-default";
    const isSystemSaved = savedPers.themeId === "system-default";
    const visibleThemes = filterThemes(themes);
    const customResolved = resolveCustomTheme(customDraft);
    const buttonContrast = customResolved.customMeta?.buttonContrast || 4.5;
    const buttonContrastLow = buttonContrast < 4.5;
    const isCustomActive = savedPers.themeId === "custom" && isEqualJson(savedPers.customColors, customDraft);

    const modeOptions = [
      { id: "all", label: `All Themes (${themes.length})` },
      { id: "light", label: "Light Modes" },
      { id: "dark", label: "Dark & AMOLED" },
      { id: "vibrant", label: "Warm & Vibrant" }
    ];

    const effectiveAccentHex = draftPers.accentColor || getThemeDefinition(draftPers.themeId, draftPers.customColors).tokens.accentPrimary;

    return `
      <!-- 1. System Mode & Filter -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>1. Theme Mode</h3>
            <p class="muted" style="margin:2px 0 0;">Follow your device appearance automatically or browse all ${themes.length} light, dark, AMOLED, warm &amp; colourful modes.</p>
          </div>
        </div>

        <div class="system-default-card ${isSystemDraft ? "is-active" : ""}">
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong>System Default</strong>
              ${isSystemSaved ? `<span class="theme-active-indicator">✓ Active</span>` : ""}
              ${!isSystemSaved && isSystemDraft ? `<span class="theme-active-indicator is-preview">Previewing</span>` : ""}
            </div>
            <p class="muted" style="margin:4px 0 0; font-size:13px;">
              Automatically switches between Classic Light and Midnight Dark based on your OS setting (Detected: <strong>${osDark ? "Dark mode" : "Light mode"}</strong>).
            </p>
          </div>
          <div class="inline-actions" style="margin-top:0;">
            <button type="button" class="button button-quiet button-small" data-preview-theme="system-default" ${isSystemDraft ? "disabled" : ""}>${isSystemDraft ? "Selected" : "Preview"}</button>
            <button type="button" class="button button-primary button-small" data-apply-theme="system-default" ${isSaving || (isSystemSaved && !hasUnsavedChanges()) ? "disabled" : ""}>${isSystemSaved && !hasUnsavedChanges() ? "Following System" : "Use System Default"}</button>
          </div>
        </div>

        <div class="appearance-mode-bar" role="group" aria-label="Filter themes by appearance mode">
          ${modeOptions.map((opt) => `
            <button type="button" class="mode-chip-btn" data-mode-filter="${opt.id}" aria-pressed="${modeFilter === opt.id ? "true" : "false"}">${escapeHtml(opt.label)}</button>
          `).join("")}
        </div>
      </div>

      <!-- 2. Theme Library -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>2. Curated &amp; Extended Themes</h3>
            <p class="muted" style="margin:2px 0 0;">Preview any theme live or apply directly to your account.</p>
          </div>
        </div>
        <div class="theme-cards-grid">
          ${visibleThemes.map((theme) => {
            const isSelected = draftPers.themeId === theme.id;
            const isSaved = savedPers.themeId === theme.id;
            return `
              <article class="theme-card ${isSelected ? "is-active" : ""}" data-theme-card="${escapeHtml(theme.id)}">
                ${renderMiniMockup(theme.tokens, theme.name)}
                <div>
                  <div class="theme-card-header">
                    <div>
                      <h4 class="theme-card-title">${escapeHtml(theme.name)}</h4>
                      <div class="theme-card-meta">${escapeHtml(formatCategoryMeta(theme))}</div>
                    </div>
                    ${isSaved
                      ? `<span class="theme-active-indicator">✓ Active</span>`
                      : isSelected
                        ? `<span class="theme-active-indicator is-preview">Preview</span>`
                        : ""
                    }
                  </div>
                  <p class="theme-card-desc" style="margin-top:8px;">${escapeHtml(theme.description)}</p>
                </div>
                <div>
                  <div class="theme-swatches" aria-label="Colour swatches for ${escapeHtml(theme.name)}" style="margin-bottom:10px;">
                    ${theme.swatches.map((hex) => `
                      <span class="theme-swatch" style="background:${escapeHtml(hex)};" title="${escapeHtml(hex)}"></span>
                    `).join("")}
                  </div>
                  <div class="theme-card-actions">
                    <button type="button" class="button button-quiet button-small" data-preview-theme="${escapeHtml(theme.id)}" ${isSelected ? "disabled" : ""}>${isSelected ? "Selected" : "Preview"}</button>
                    <button type="button" class="button button-primary button-small" data-apply-theme="${escapeHtml(theme.id)}" ${isSaving || (isSaved && !hasUnsavedChanges()) ? "disabled" : ""}>${isSaved && !hasUnsavedChanges() ? "Applied" : "Apply Theme"}</button>
                  </div>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>

      <!-- 3. Accent Colour Picker -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>3. Accent Colour</h3>
            <p class="muted" style="margin:2px 0 0;">Override links, highlights, and primary buttons on top of any theme—or pick any custom hex colour.</p>
          </div>
          ${draftPers.accentColor ? `<span class="theme-active-indicator is-preview">Custom Accent Active</span>` : ""}
        </div>

        <div class="accent-bar-card">
          <div class="accent-swatch-row" role="group" aria-label="Accent colour presets">
            <button type="button" class="accent-swatch-btn" data-accent-preset="" aria-pressed="${!draftPers.accentColor ? "true" : "false"}">
              <span>Theme Default</span>
            </button>
            ${accentPresets.map((preset) => `
              <button type="button" class="accent-swatch-btn" data-accent-preset="${escapeHtml(preset.hex)}" aria-pressed="${draftPers.accentColor === preset.hex ? "true" : "false"}">
                <span class="accent-dot" style="background:${escapeHtml(preset.hex)};"></span>
                <span>${escapeHtml(preset.label)}</span>
              </button>
            `).join("")}
          </div>

          <div class="accent-custom-inline">
            <label for="studio-accent-picker" class="studio-control-label">Custom Accent Colour:</label>
            <input id="studio-accent-picker" type="color" value="${escapeHtml(isValidHex(effectiveAccentHex) ? effectiveAccentHex : "#174e74")}" data-accent-picker aria-label="Custom accent colour picker">
            <input type="text" value="${escapeHtml(draftPers.accentColor || effectiveAccentHex || "#174e74")}" maxlength="7" data-accent-hex aria-label="Custom accent hex code">
            ${draftPers.themeId === "custom" ? `<span class="muted" style="font-size:12px;">Using Custom Palette colours below.</span>` : `<span class="muted" style="font-size:12px;">Automatically contrast-tuned for crisp text readability.</span>`}
          </div>
        </div>
      </div>

      <!-- 4. Custom Palette Builder -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>4. Custom Palette Builder</h3>
            <p class="muted" style="margin:2px 0 0;">Choose a background canvas preset and tune primary, secondary, and button colours manually.</p>
          </div>
          ${draftPers.themeId === "custom" ? `<span class="theme-active-indicator">✓ Custom Selected</span>` : ""}
        </div>

        <div class="custom-theme-panel">
          <div>
            <span class="color-picker-label" style="display:block; margin-bottom:8px;">Background canvas preset</span>
            <div class="custom-bg-presets" role="group" aria-label="Custom background preset">
              ${Object.entries(bgPresets).map(([key, preset]) => `
                <button type="button" class="bg-preset-btn" data-bg-preset="${escapeHtml(key)}" aria-pressed="${customDraft.backgroundPreset === key ? "true" : "false"}">
                  <span class="bg-preset-chip" style="background:${escapeHtml(preset.bgPrimary)};"></span>
                  <span>${escapeHtml(preset.label)} (${preset.mode === "dark" ? "Dark" : "Light"})</span>
                </button>
              `).join("")}
            </div>
          </div>

          <div class="custom-pickers-grid">
            <div class="color-picker-field">
              <label class="color-picker-label" for="custom-primary-color">Primary accent colour</label>
              <div class="color-picker-controls">
                <input id="custom-primary-color" type="color" value="${escapeHtml(customDraft.primaryAccent)}" data-color-picker="primaryAccent">
                <input type="text" value="${escapeHtml(customDraft.primaryAccent)}" maxlength="7" aria-label="Primary accent hex code" data-hex-input="primaryAccent">
              </div>
            </div>
            <div class="color-picker-field">
              <label class="color-picker-label" for="custom-secondary-color">Secondary accent colour</label>
              <div class="color-picker-controls">
                <input id="custom-secondary-color" type="color" value="${escapeHtml(customDraft.secondaryAccent)}" data-color-picker="secondaryAccent">
                <input type="text" value="${escapeHtml(customDraft.secondaryAccent)}" maxlength="7" aria-label="Secondary accent hex code" data-hex-input="secondaryAccent">
              </div>
            </div>
            <div class="color-picker-field">
              <label class="color-picker-label" for="custom-button-color">Button accent colour</label>
              <div class="color-picker-controls">
                <input id="custom-button-color" type="color" value="${escapeHtml(customDraft.buttonAccent)}" data-color-picker="buttonAccent">
                <input type="text" value="${escapeHtml(customDraft.buttonAccent)}" maxlength="7" aria-label="Button accent hex code" data-hex-input="buttonAccent">
              </div>
            </div>
          </div>

          <div class="contrast-diagnostics ${buttonContrastLow ? "is-warning" : "is-ok"}">
            <div>
              <strong>${buttonContrastLow ? "Low button text contrast detected" : "Readability check passed"}</strong>
              <span style="display:block; font-size:12px; color:var(--muted); margin-top:2px;">
                Button text ratio: ${buttonContrast}:1 · Text on cards: ${customResolved.customMeta.textContrast}:1
                ${customResolved.customMeta.adjustedAccent ? " · Accent shade tuned for surface legibility." : ""}
              </span>
            </div>
            ${buttonContrastLow ? `<button type="button" class="button button-outline button-small" data-action="boost-contrast">Auto-fix contrast</button>` : ""}
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
            <button type="button" class="button button-quiet button-small" data-action="preview-custom">Preview Custom</button>
            <button type="button" class="button button-primary button-small" data-action="apply-custom" ${isSaving || buttonContrastLow ? "disabled" : ""}>${isCustomActive ? "Custom Theme Applied" : "Apply Custom Theme"}</button>
            <button type="button" class="button button-outline button-small" data-action="reset-custom">Reset Pickers</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderFontGrid(targetRole, activeId) {
    return `
      <div class="font-cards-grid" role="group" aria-label="${targetRole === "headingFont" ? "Heading fonts" : "Body text fonts"}">
        ${fonts.map((font) => `
          <button
            type="button"
            class="font-option-card"
            data-font-role="${escapeHtml(targetRole)}"
            data-font-id="${escapeHtml(font.id)}"
            aria-pressed="${activeId === font.id ? "true" : "false"}"
          >
            <div class="font-option-top">
              <span class="font-option-name">${escapeHtml(font.name)}</span>
              <span class="font-option-cat">${escapeHtml(font.category)}</span>
            </div>
            <div class="font-option-specimen" style="font-family:${escapeHtml(font.stack)};">
              ${escapeHtml(font.specimen)}
            </div>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderFontsTab() {
    const typo = draftPers.typography;
    const bodyDef = fonts.find((f) => f.id === typo.bodyFont);
    const sizeEntries = Object.values(fontSizes);

    return `
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Font Size</h3>
            <p class="muted" style="margin:2px 0 0;">Scale reading size comfortably across phones, tablets, and desktops.</p>
          </div>
          <button type="button" class="button button-outline button-small" data-action="reset-typography">Reset Fonts to Default</button>
        </div>

        <div class="studio-control-group">
          <div class="seg-option-group" role="group" aria-label="Font size scale">
            ${sizeEntries.map((sz) => `
              <button
                type="button"
                class="seg-option-btn"
                data-font-size="${escapeHtml(sz.id)}"
                aria-pressed="${typo.fontSize === sz.id ? "true" : "false"}"
              >${escapeHtml(sz.label)} (${escapeHtml(sz.px)})</button>
            `).join("")}
          </div>

          <label class="settings-toggle-row" style="margin-top:4px; background:var(--surface-primary);">
            <input type="checkbox" class="settings-switch-input" data-typo-toggle="protectAcademicReadability" ${typo.protectAcademicReadability ? "checked" : ""}>
            <span class="settings-switch-track" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <strong>Academic Readability Protection</strong>
              <small>Keep tables, GPA calculations, formulas, inputs, and study notes in a clean sans-serif font when decorative or handwriting styles are selected.</small>
            </span>
          </label>
          ${bodyDef?.decorative && !typo.protectAcademicReadability ? `
            <div class="info-box" style="margin:0; font-size:12.5px;">Tip: Decorative handwriting body fonts can make dense numeric tables harder to scan. You can re-enable Academic Readability Protection anytime above.</div>
          ` : ""}
        </div>
      </div>

      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Heading &amp; Greeting Font</h3>
            <p class="muted" style="margin:2px 0 0;">Applied to page titles, section headers, and your dashboard greeting.</p>
          </div>
        </div>
        ${renderFontGrid("headingFont", typo.headingFont)}
      </div>

      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Body Text Font</h3>
            <p class="muted" style="margin:2px 0 0;">Applied to descriptions, navigation links, cards, and UI labels.</p>
          </div>
        </div>
        ${renderFontGrid("bodyFont", typo.bodyFont)}
      </div>
    `;
  }

  function renderSegmentedControl(label, help, fieldName, optionsList, currentValue) {
    return `
      <div class="studio-control-row">
        <span class="studio-control-label">${escapeHtml(label)}</span>
        ${help ? `<p class="studio-control-help">${escapeHtml(help)}</p>` : ""}
        <div class="seg-option-group" role="group" aria-label="${escapeHtml(label)}">
          ${optionsList.map((opt) => `
            <button
              type="button"
              class="seg-option-btn"
              data-appearance-field="${escapeHtml(fieldName)}"
              data-appearance-value="${escapeHtml(opt.value)}"
              aria-pressed="${currentValue === opt.value ? "true" : "false"}"
            >${escapeHtml(opt.label)}</button>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderInterfaceTab() {
    const ap = draftPers.appearance;
    return `
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Buttons, Cards &amp; Density</h3>
            <p class="muted" style="margin:2px 0 0;">Adjust geometry, spacing, and visual elevation across every tool.</p>
          </div>
        </div>

        <div class="studio-control-group">
          ${renderSegmentedControl("Button Shape", "Controls corner roundness on buttons, chips, and tabs.", "buttonStyle", [
            { value: "rounded", label: "Rounded" },
            { value: "soft-square", label: "Soft Square" },
            { value: "pill", label: "Pill" }
          ], ap.buttonStyle)}

          ${renderSegmentedControl("Interface Spacing", "Adjusts card padding and grid gaps.", "spacing", [
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
            { value: "spacious", label: "Spacious" }
          ], ap.spacing)}

          ${renderSegmentedControl("Card Style", "Choose hairline borders, soft shadows, or subtle surface tinting.", "cardStyle", [
            { value: "bordered", label: "Bordered" },
            { value: "elevated", label: "Elevated" },
            { value: "tinted", label: "Tinted" }
          ], ap.cardStyle)}

          ${renderSegmentedControl("Control Density", "Tunes button and table row heights.", "density", [
            { value: "compact", label: "Compact" },
            { value: "balanced", label: "Balanced" },
            { value: "relaxed", label: "Relaxed" }
          ], ap.density)}

          ${renderSegmentedControl("Motion & Transitions", "Smooth transitions or immediate zero-distraction changes.", "motionMode", [
            { value: "smooth", label: "Smooth Animations" },
            { value: "reduced", label: "Reduced Animations" }
          ], ap.motionMode)}
        </div>
      </div>

      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Navigation &amp; Sidebar Appearance</h3>
            <p class="muted" style="margin:2px 0 0;">Customize how the navigation bar and desktop dashboard sidebar appear.</p>
          </div>
        </div>

        <div class="studio-control-group">
          ${renderSegmentedControl("Navigation Layout", "Desktop Sidebar transforms the Dashboard navigation into a left rail on wide screens (980px+).", "sidebarStyle", [
            { value: "topbar", label: "Standard Top Bar" },
            { value: "compact", label: "Compact Top Bar" },
            { value: "sidebar", label: "Desktop Sidebar" }
          ], ap.sidebarStyle)}

          ${renderSegmentedControl("Sidebar Surface Tone", "Applies when Desktop Sidebar layout is active.", "sidebarTone", [
            { value: "neutral", label: "Neutral Surface" },
            { value: "tinted", label: "Subtle Tinted" },
            { value: "accent", label: "Accent Highlighted" }
          ], ap.sidebarTone)}
        </div>
      </div>
    `;
  }

  function renderAccessibilityTab() {
    const ac = draftPers.accessibility;
    const sizeEntries = Object.values(fontSizes);

    return `
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Accessibility &amp; Visual Comfort</h3>
            <p class="muted" style="margin:2px 0 0;">Fine-tune contrast, text size, keyboard focus outlines, and reading rhythm.</p>
          </div>
        </div>

        <div class="studio-control-group">
          <div class="studio-control-row">
            <span class="studio-control-label">Text Size</span>
            <p class="studio-control-help">Synced with Font Size in the Fonts &amp; Size tab.</p>
            <div class="seg-option-group" role="group" aria-label="Accessible text size">
              ${sizeEntries.map((sz) => `
                <button
                  type="button"
                  class="seg-option-btn"
                  data-font-size="${escapeHtml(sz.id)}"
                  aria-pressed="${draftPers.typography.fontSize === sz.id ? "true" : "false"}"
                >${escapeHtml(sz.label)}</button>
              `).join("")}
            </div>
          </div>

          <label class="settings-toggle-row" style="background:var(--surface-primary);">
            <input type="checkbox" class="settings-switch-input" data-access-toggle="highContrast" ${ac.highContrast ? "checked" : ""}>
            <span class="settings-switch-track" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <strong>High Contrast Mode</strong>
              <small>Boosts foreground text contrast and strengthens card, input, and button borders.</small>
            </span>
          </label>

          <label class="settings-toggle-row" style="background:var(--surface-primary);">
            <input type="checkbox" class="settings-switch-input" data-access-toggle="reducedMotion" ${ac.reducedMotion ? "checked" : ""}>
            <span class="settings-switch-track" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <strong>Reduce Motion</strong>
              <small>Disables animated transitions and hover transforms across all pages.</small>
            </span>
          </label>

          <label class="settings-toggle-row" style="background:var(--surface-primary);">
            <input type="checkbox" class="settings-switch-input" data-access-toggle="readableSpacing" ${ac.readableSpacing ? "checked" : ""}>
            <span class="settings-switch-track" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <strong>Readable Line &amp; Letter Spacing</strong>
              <small>Increases line height and word spacing on study notes, profiles, and descriptions.</small>
            </span>
          </label>

          <div class="studio-control-row" style="margin-top:4px;">
            <span class="studio-control-label">Keyboard Focus Indicators</span>
            <div class="seg-option-group" role="group" aria-label="Focus ring style">
              <button type="button" class="seg-option-btn" data-access-focus="standard" aria-pressed="${ac.focusMode === "standard" ? "true" : "false"}">Standard Focus Ring</button>
              <button type="button" class="seg-option-btn" data-access-focus="enhanced" aria-pressed="${ac.focusMode === "enhanced" ? "true" : "false"}">Enhanced High-Visibility Focus</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderDashboardTab() {
    const db = draftPers.dashboard;
    return `
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Greeting Customization</h3>
            <p class="muted" style="margin:2px 0 0;">Personalize how your Student Dashboard greets you when you sign in.</p>
          </div>
          <button type="button" class="button button-outline button-small" data-action="reset-dashboard-layout">Restore Default Layout</button>
        </div>

        <div class="studio-control-group">
          <div class="studio-control-row">
            <span class="studio-control-label">Greeting Style</span>
            <div class="seg-option-group" role="group" aria-label="Dashboard greeting style">
              ${[
                { id: "time-based", label: "Time-Based" },
                { id: "welcome", label: "Welcome Back" },
                { id: "focused", label: "Ready to Focus" },
                { id: "academic", label: "Academic Drive" },
                { id: "custom", label: "Custom Text" }
              ].map((g) => `
                <button
                  type="button"
                  class="seg-option-btn"
                  data-greeting-style="${escapeHtml(g.id)}"
                  aria-pressed="${db.greetingStyle === g.id ? "true" : "false"}"
                >${escapeHtml(g.label)}</button>
              `).join("")}
            </div>
          </div>

          ${db.greetingStyle === "custom" ? `
            <label class="field" for="custom-greeting-input" style="margin:0;">Custom greeting phrase
              <input
                id="custom-greeting-input"
                type="text"
                maxlength="80"
                value="${escapeHtml(db.customGreeting || "")}"
                placeholder="e.g. Stay sharp"
                data-custom-greeting-input
              >
            </label>
          ` : ""}

          <label class="settings-toggle-row" style="background:var(--surface-primary);">
            <input type="checkbox" class="settings-switch-input" data-greeting-show-name ${db.showGreetingName ? "checked" : ""}>
            <span class="settings-switch-track" aria-hidden="true"></span>
            <span class="settings-toggle-text">
              <strong>Include my name in the greeting</strong>
              <small>Preview: "${escapeHtml(computeGreetingPreview(db, studentName))}"</small>
            </span>
          </label>
        </div>
      </div>

      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Dashboard Section Order</h3>
            <p class="muted" style="margin:2px 0 0;">Move primary dashboard areas up or down to match your workflow.</p>
          </div>
        </div>
        <div class="widget-order-list">
          ${db.sectionOrder.map((key, idx) => `
            <div class="widget-order-row">
              <div class="widget-order-info">
                <span class="badge">${idx + 1}</span>
                <strong>${escapeHtml(SECTION_LABELS[key] || key)}</strong>
              </div>
              <div class="widget-order-controls">
                <button type="button" class="widget-move-btn" data-move-section="${escapeHtml(key)}" data-move-dir="-1" ${idx === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(SECTION_LABELS[key] || key)} up">↑ Up</button>
                <button type="button" class="widget-move-btn" data-move-section="${escapeHtml(key)}" data-move-dir="1" ${idx === db.sectionOrder.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(SECTION_LABELS[key] || key)} down">↓ Down</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Overview Cards Order</h3>
            <p class="muted" style="margin:2px 0 0;">Arrange your academic overview panels in preferred order.</p>
          </div>
        </div>
        <div class="widget-order-list">
          ${db.overviewOrder.map((key, idx) => `
            <div class="widget-order-row">
              <div class="widget-order-info">
                <span class="badge">${idx + 1}</span>
                <strong>${escapeHtml(OVERVIEW_LABELS[key] || key)}</strong>
              </div>
              <div class="widget-order-controls">
                <button type="button" class="widget-move-btn" data-move-overview="${escapeHtml(key)}" data-move-dir="-1" ${idx === 0 ? "disabled" : ""} aria-label="Move ${escapeHtml(OVERVIEW_LABELS[key] || key)} up">↑ Up</button>
                <button type="button" class="widget-move-btn" data-move-overview="${escapeHtml(key)}" data-move-dir="1" ${idx === db.overviewOrder.length - 1 ? "disabled" : ""} aria-label="Move ${escapeHtml(OVERVIEW_LABELS[key] || key)} down">↓ Down</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Visible Dashboard Widgets</h3>
            <p class="muted" style="margin:2px 0 0;">Hide panels you rarely check or keep everything visible.</p>
          </div>
        </div>
        <div class="widget-order-list">
          ${Object.entries(WIDGET_LABELS).map(([key, label]) => `
            <label class="settings-toggle-row" style="background:var(--surface-primary);">
              <input type="checkbox" class="settings-switch-input" data-widget-toggle="${escapeHtml(key)}" ${db.widgets[key] !== false ? "checked" : ""}>
              <span class="settings-switch-track" aria-hidden="true"></span>
              <span class="settings-toggle-text">
                <strong>${escapeHtml(label)}</strong>
              </span>
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderPresetsTab() {
    return `
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>Quick Personalization Presets</h3>
            <p class="muted" style="margin:2px 0 0;">Apply a coordinated theme, typography, layout, and accessibility setup in one click—then fine-tune anything afterwards.</p>
          </div>
        </div>

        <div class="preset-cards-grid">
          ${presets.map((preset) => {
            const isSelected = draftPers.presetId === preset.id;
            const isSaved = savedPers.presetId === preset.id && !hasUnsavedChanges();
            return `
              <article class="preset-card ${isSelected ? "is-selected" : ""}">
                <div>
                  <div class="preset-card-title">
                    <strong>${escapeHtml(preset.name)}</strong>
                    ${isSaved
                      ? `<span class="theme-active-indicator">✓ Active</span>`
                      : isSelected
                        ? `<span class="theme-active-indicator is-preview">Preview</span>`
                        : ""
                    }
                  </div>
                  <p style="margin-top:6px;">${escapeHtml(preset.summary)}</p>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <button type="button" class="button button-quiet button-small" data-preview-preset="${escapeHtml(preset.id)}">Preview</button>
                  <button type="button" class="button button-primary button-small" data-apply-preset="${escapeHtml(preset.id)}" ${isSaving ? "disabled" : ""}>Apply Preset</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderActionFooter() {
    const isDirty = hasUnsavedChanges();
    const isDefaultAll = isEqualJson(comparablePers(savedPers), comparablePers(getDefaultPersonalization())) && !isDirty;

    return `
      <div class="studio-action-footer">
        <div style="font-size:13px; color:var(--text-secondary);">
          ${isDirty
            ? `<strong>Unsaved preview active</strong> — apply changes to save across your account.`
            : `<strong>Preferences synced</strong> — active across all AFITStudentLife pages.`
          }
        </div>
        <div class="studio-action-buttons">
          <button type="button" class="button button-quiet button-small" data-action="revert-draft" ${isSaving || !isDirty ? "disabled" : ""}>Reset Changes</button>
          <button type="button" class="button button-primary button-small" data-action="apply-all" ${isSaving || !isDirty ? "disabled" : ""}>${isSaving ? "Saving…" : "Apply Changes"}</button>
          ${confirmResetAll ? `
            <button type="button" class="button button-primary button-small" data-action="confirm-reset-all" ${isSaving ? "disabled" : ""}>Confirm Reset All</button>
            <button type="button" class="button button-quiet button-small" data-action="cancel-reset-all" ${isSaving ? "disabled" : ""}>Cancel</button>
          ` : `
            <button type="button" class="button button-outline button-small" data-action="request-reset-all" ${isSaving || isDefaultAll ? "disabled" : ""}>Reset All Appearance Settings</button>
          `}
        </div>
      </div>
    `;
  }

  function renderActiveSubtabPanel() {
    if (activeSubtab === "fonts") return renderFontsTab();
    if (activeSubtab === "interface") return renderInterfaceTab();
    if (activeSubtab === "accessibility") return renderAccessibilityTab();
    if (activeSubtab === "dashboard") return renderDashboardTab();
    if (activeSubtab === "presets") return renderPresetsTab();
    return renderThemesTab();
  }

  function refreshLivePreviewDOMOnly() {
    const stageEl = container.querySelector("#studio-live-preview-stage");
    const greetingEl = container.querySelector("#studio-preview-greeting");
    const badgeEl = container.querySelector("#studio-preview-badge");
    const metaEl = container.querySelector("#studio-preview-meta");
    const revertBtn = container.querySelector('[data-action="revert-draft"]');
    const applyAllBtn = container.querySelector('[data-action="apply-all"]');
    const displayedTheme = getThemeDefinition(draftPers.themeId, draftPers.customColors, draftPers.accentColor);
    const isDirty = hasUnsavedChanges();

    if (stageEl) {
      stageEl.setAttribute("style", buildPreviewVarsStyle(displayedTheme.tokens, draftPers, fonts, fontSizes));
    }
    if (greetingEl) {
      greetingEl.textContent = computeGreetingPreview(draftPers.dashboard, studentName);
    }
    if (badgeEl) {
      badgeEl.className = `theme-active-indicator ${isDirty ? "is-preview" : ""}`;
      badgeEl.textContent = isDirty ? "Unsaved Preview" : "✓ Active";
    }
    if (metaEl) {
      const hFont = fonts.find((f) => f.id === draftPers.typography.headingFont) || fonts[0];
      const bFont = fonts.find((f) => f.id === draftPers.typography.bodyFont) || fonts[0];
      const sizeLabel = (fontSizes[draftPers.typography.fontSize] || fontSizes.medium || { label: "Medium" }).label;
      metaEl.innerHTML = `
        <div><strong>Theme:</strong> ${escapeHtml(displayedTheme.name)}${draftPers.accentColor && draftPers.themeId !== "custom" ? ` · Custom Accent (${escapeHtml(draftPers.accentColor.toUpperCase())})` : ""}</div>
        <div><strong>Fonts:</strong> ${escapeHtml(hFont.name.split(" (")[0])} / ${escapeHtml(bFont.name.split(" (")[0])} · <strong>Size:</strong> ${escapeHtml(sizeLabel)}</div>
        <div><strong>Layout:</strong> ${escapeHtml(draftPers.appearance.buttonStyle)} buttons · ${escapeHtml(draftPers.appearance.cardStyle)} cards · ${escapeHtml(draftPers.appearance.sidebarStyle)}</div>
      `;
    }
    if (revertBtn) revertBtn.disabled = isSaving || !isDirty;
    if (applyAllBtn) applyAllBtn.disabled = isSaving || !isDirty;
  }

  function render() {
    const activeTheme = getThemeDefinition(savedPers.themeId, savedPers.customColors, savedPers.accentColor);

    container.innerHTML = `
      <div class="studio-hero-head">
        <div>
          <p class="eyebrow">Personalization Center</p>
          <h2 id="appearance-themes-heading">Appearance, Fonts &amp; Experience</h2>
          <p class="muted" style="margin:0;">Customize themes, colours, typography, interface layout, accessibility, and dashboard greetings across AFITStudentLife.</p>
        </div>
        <div class="studio-active-summary" aria-label="Active theme summary">
          <span class="studio-active-swatch-dot" aria-hidden="true"></span>
          <div class="studio-active-summary-text">
            <strong>${escapeHtml(activeTheme.name)}</strong>
            <span>${activeTheme.mode === "dark" ? "Dark appearance" : "Light appearance"} · ${savedPers.pendingSync ? "Saved on device (sync pending)" : "Synced to account"}</span>
          </div>
        </div>
      </div>

      <div id="theme-studio-status" role="status" aria-live="polite">
        ${statusNotice ? `
          <div class="${statusNotice.type === "success" ? "result-box" : "info-box"}" style="margin:0;">
            ${escapeHtml(statusNotice.text)}
          </div>
        ` : ""}
      </div>

      <div class="studio-subtabs" role="tablist" aria-label="Personalization categories">
        ${SUBTABS.map((tab) => `
          <button
            type="button"
            role="tab"
            class="studio-subtab-btn"
            data-studio-subtab="${escapeHtml(tab.id)}"
            aria-selected="${activeSubtab === tab.id ? "true" : "false"}"
          >${escapeHtml(tab.label)}</button>
        `).join("")}
      </div>

      <div class="studio-workbench">
        <div class="studio-controls-pane">
          ${renderActiveSubtabPanel()}
          ${renderActionFooter()}
        </div>
        ${renderPreviewPane()}
      </div>
    `;

    bindEvents();
  }

  function updateCustomPreviewIfActive() {
    if (draftPers.themeId === "custom") {
      draftPers.customColors = { ...customDraft };
      draftPers.accentColor = null;
      applyDraftPreview(false);
    }
    const buttonDiag = container.querySelector(".contrast-diagnostics");
    const applyCustomBtn = container.querySelector('[data-action="apply-custom"]');
    const customResolved = resolveCustomTheme(customDraft);
    const ratio = customResolved.customMeta?.buttonContrast || 4.5;
    const low = ratio < 4.5;

    if (buttonDiag) {
      buttonDiag.className = `contrast-diagnostics ${low ? "is-warning" : "is-ok"}`;
      buttonDiag.innerHTML = `
        <div>
          <strong>${low ? "Low button text contrast detected" : "Readability check passed"}</strong>
          <span style="display:block; font-size:12px; color:var(--muted); margin-top:2px;">
            Button text ratio: ${ratio}:1 · Text on cards: ${customResolved.customMeta.textContrast}:1
            ${customResolved.customMeta.adjustedAccent ? " · Accent shade tuned for surface legibility." : ""}
          </span>
        </div>
        ${low ? `<button type="button" class="button button-outline button-small" data-action="boost-contrast">Auto-fix contrast</button>` : ""}
      `;
      buttonDiag.querySelector('[data-action="boost-contrast"]')?.addEventListener("click", () => {
        customDraft.buttonAccent = boostContrastHex(customDraft.buttonAccent, customResolved.mode);
        if (draftPers.themeId === "custom") {
          draftPers.customColors = { ...customDraft };
          applyDraftPreview(false);
        }
        render();
      });
    }

    if (applyCustomBtn) {
      applyCustomBtn.disabled = isSaving || low;
    }
    refreshLivePreviewDOMOnly();
  }

  function bindEvents() {
    container.querySelectorAll("[data-studio-subtab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSubtab = btn.dataset.studioSubtab || "themes";
        statusNotice = null;
        render();
      });
    });

    // Themes & Colours tab
    container.querySelectorAll("[data-mode-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        modeFilter = btn.dataset.modeFilter || "all";
        render();
      });
    });

    container.querySelectorAll("[data-preview-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.previewTheme;
        draftPers.themeId = themeId;
        draftPers.customColors = null;
        draftPers.presetId = "";
        confirmResetAll = false;
        applyDraftPreview(true);
        render();
      });
    });

    container.querySelectorAll("[data-apply-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.applyTheme;
        draftPers.themeId = themeId;
        draftPers.customColors = null;
        draftPers.presetId = "";
        const def = getThemeDefinition(themeId, null, draftPers.accentColor);
        void commitPersonalization(draftPers, `${def.name} applied across AFITStudentLife.`);
      });
    });

    container.querySelectorAll("[data-accent-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const hex = btn.dataset.accentPreset || "";
        draftPers.accentColor = isValidHex(hex) ? hex.toLowerCase() : null;
        if (draftPers.themeId === "custom") {
          draftPers.themeId = "classic-light";
          draftPers.customColors = null;
        }
        draftPers.presetId = "";
        applyDraftPreview(true);
        render();
      });
    });

    const accentPicker = container.querySelector("[data-accent-picker]");
    const accentHex = container.querySelector("[data-accent-hex]");
    if (accentPicker) {
      accentPicker.addEventListener("input", () => {
        const hex = accentPicker.value.toLowerCase();
        draftPers.accentColor = hex;
        if (draftPers.themeId === "custom") {
          draftPers.themeId = "classic-light";
          draftPers.customColors = null;
        }
        draftPers.presetId = "";
        if (accentHex) accentHex.value = hex;
        applyDraftPreview(false);
        refreshLivePreviewDOMOnly();
      });
    }
    if (accentHex) {
      accentHex.addEventListener("input", () => {
        const norm = normalizeHexInput(accentHex.value);
        if (!norm) return;
        draftPers.accentColor = norm;
        if (draftPers.themeId === "custom") {
          draftPers.themeId = "classic-light";
          draftPers.customColors = null;
        }
        draftPers.presetId = "";
        if (accentPicker) accentPicker.value = norm;
        applyDraftPreview(false);
        refreshLivePreviewDOMOnly();
      });
    }

    container.querySelectorAll("[data-bg-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        customDraft.backgroundPreset = btn.dataset.bgPreset || "light-crisp";
        if (draftPers.themeId === "custom") {
          draftPers.customColors = { ...customDraft };
          applyDraftPreview(false);
        }
        render();
      });
    });

    container.querySelectorAll("[data-color-picker]").forEach((picker) => {
      picker.addEventListener("input", () => {
        const key = picker.dataset.colorPicker;
        if (!key) return;
        customDraft[key] = picker.value.toLowerCase();
        const pairedHex = container.querySelector(`[data-hex-input="${key}"]`);
        if (pairedHex) pairedHex.value = customDraft[key];
        updateCustomPreviewIfActive();
      });
    });

    container.querySelectorAll("[data-hex-input]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.hexInput;
        const normalized = normalizeHexInput(input.value);
        if (!key || !normalized) return;
        customDraft[key] = normalized;
        const pairedPicker = container.querySelector(`[data-color-picker="${key}"]`);
        if (pairedPicker) pairedPicker.value = normalized;
        updateCustomPreviewIfActive();
      });
      input.addEventListener("blur", () => {
        const key = input.dataset.hexInput;
        if (!key) return;
        const normalized = normalizeHexInput(input.value);
        input.value = normalized || customDraft[key];
      });
    });

    container.querySelector('[data-action="boost-contrast"]')?.addEventListener("click", () => {
      const resolved = resolveCustomTheme(customDraft);
      customDraft.buttonAccent = boostContrastHex(customDraft.buttonAccent, resolved.mode);
      if (draftPers.themeId === "custom") {
        draftPers.customColors = { ...customDraft };
        applyDraftPreview(false);
      }
      render();
    });

    container.querySelector('[data-action="preview-custom"]')?.addEventListener("click", () => {
      draftPers.themeId = "custom";
      draftPers.customColors = { ...customDraft };
      draftPers.accentColor = null;
      draftPers.presetId = "";
      applyDraftPreview(true);
      render();
    });

    container.querySelector('[data-action="apply-custom"]')?.addEventListener("click", () => {
      const customResolved = resolveCustomTheme(customDraft);
      if ((customResolved.customMeta?.buttonContrast || 0) < 4.5) return;
      draftPers.themeId = "custom";
      draftPers.customColors = { ...customDraft };
      draftPers.accentColor = null;
      draftPers.presetId = "";
      void commitPersonalization(draftPers, "Custom palette applied and saved to your account.");
    });

    container.querySelector('[data-action="reset-custom"]')?.addEventListener("click", () => {
      customDraft = getDefaultCustomColors();
      if (draftPers.themeId === "custom") {
        draftPers.customColors = { ...customDraft };
        applyDraftPreview(true);
      }
      statusNotice = { type: "info", text: "Custom colour pickers reset to default AFIT palette." };
      render();
    });

    // Fonts & Size tab
    container.querySelectorAll("[data-font-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const role = btn.dataset.fontRole;
        const fontId = btn.dataset.fontId;
        if (!role || !fontId) return;
        draftPers.typography[role] = fontId;
        draftPers.presetId = "";
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelectorAll("[data-font-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sizeId = btn.dataset.fontSize;
        if (!sizeId) return;
        draftPers.typography.fontSize = sizeId;
        draftPers.presetId = "";
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelector('[data-typo-toggle="protectAcademicReadability"]')?.addEventListener("change", (event) => {
      draftPers.typography.protectAcademicReadability = Boolean(event.target.checked);
      applyDraftPreview(false);
      render();
    });

    container.querySelector('[data-action="reset-typography"]')?.addEventListener("click", () => {
      const defaults = getDefaultPersonalization().typography;
      draftPers.typography = { ...defaults };
      draftPers.presetId = "";
      applyDraftPreview(false);
      statusNotice = { type: "info", text: "Fonts & text size reset to default preview. Click Apply Changes to save." };
      render();
    });

    // Interface tab
    container.querySelectorAll("[data-appearance-field]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.appearanceField;
        const value = btn.dataset.appearanceValue;
        if (!field || !value) return;
        draftPers.appearance[field] = value;
        if (field === "motionMode") {
          draftPers.accessibility.reducedMotion = value === "reduced";
        }
        draftPers.presetId = "";
        applyDraftPreview(false);
        render();
      });
    });

    // Accessibility tab
    container.querySelectorAll("[data-access-toggle]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const key = checkbox.dataset.accessToggle;
        if (!key) return;
        draftPers.accessibility[key] = Boolean(checkbox.checked);
        if (key === "reducedMotion") {
          draftPers.appearance.motionMode = checkbox.checked ? "reduced" : "smooth";
        }
        draftPers.presetId = "";
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelectorAll("[data-access-focus]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.accessFocus || "standard";
        draftPers.accessibility.focusMode = mode;
        draftPers.presetId = "";
        applyDraftPreview(false);
        render();
      });
    });

    // Dashboard & Greeting tab
    container.querySelectorAll("[data-greeting-style]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const style = btn.dataset.greetingStyle || "time-based";
        draftPers.dashboard.greetingStyle = style;
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelector("[data-custom-greeting-input]")?.addEventListener("input", (event) => {
      draftPers.dashboard.customGreeting = event.target.value.slice(0, 80);
      applyDraftPreview(false);
      refreshLivePreviewDOMOnly();
    });

    container.querySelector("[data-greeting-show-name]")?.addEventListener("change", (event) => {
      draftPers.dashboard.showGreetingName = Boolean(event.target.checked);
      applyDraftPreview(false);
      render();
    });

    container.querySelectorAll("[data-move-section]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.moveSection;
        const dir = Number(btn.dataset.moveDir);
        const order = [...draftPers.dashboard.sectionOrder];
        const idx = order.indexOf(key);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return;
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        draftPers.dashboard.sectionOrder = order;
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelectorAll("[data-move-overview]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.moveOverview;
        const dir = Number(btn.dataset.moveDir);
        const order = [...draftPers.dashboard.overviewOrder];
        const idx = order.indexOf(key);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return;
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        draftPers.dashboard.overviewOrder = order;
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelectorAll("[data-widget-toggle]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const key = checkbox.dataset.widgetToggle;
        if (!key) return;
        draftPers.dashboard.widgets[key] = Boolean(checkbox.checked);
        applyDraftPreview(false);
        render();
      });
    });

    container.querySelector('[data-action="reset-dashboard-layout"]')?.addEventListener("click", () => {
      draftPers.dashboard = getDefaultPersonalization().dashboard;
      applyDraftPreview(false);
      statusNotice = { type: "info", text: "Dashboard layout & greeting restored to default preview. Click Apply Changes to save." };
      render();
    });

    // Presets tab
    container.querySelectorAll("[data-preview-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = presets.find((p) => p.id === btn.dataset.previewPreset);
        if (!preset) return;
        draftPers = normalizePersonalization({
          ...draftPers,
          ...preset.patch,
          dashboard: draftPers.dashboard,
          presetId: preset.id
        });
        applyDraftPreview(true);
        render();
      });
    });

    container.querySelectorAll("[data-apply-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = presets.find((p) => p.id === btn.dataset.applyPreset);
        if (!preset) return;
        draftPers = normalizePersonalization({
          ...draftPers,
          ...preset.patch,
          dashboard: draftPers.dashboard,
          presetId: preset.id
        });
        void commitPersonalization(draftPers, `${preset.name} preset applied and saved to your account.`);
      });
    });

    // Action Footer
    container.querySelector('[data-action="apply-all"]')?.addEventListener("click", () => {
      void commitPersonalization(draftPers, "Personalization settings saved and applied across AFITStudentLife.");
    });

    container.querySelector('[data-action="revert-draft"]')?.addEventListener("click", () => {
      draftPers = deepClone(savedPers);
      customDraft = draftPers.customColors
        ? { ...getDefaultCustomColors(), ...draftPers.customColors }
        : getDefaultCustomColors();
      confirmResetAll = false;
      applyDraftPreview(true);
      statusNotice = { type: "info", text: "Unsaved preview changes reverted to your saved preferences." };
      render();
    });

    container.querySelector('[data-action="request-reset-all"]')?.addEventListener("click", () => {
      confirmResetAll = true;
      render();
    });

    container.querySelector('[data-action="cancel-reset-all"]')?.addEventListener("click", () => {
      confirmResetAll = false;
      render();
    });

    container.querySelector('[data-action="confirm-reset-all"]')?.addEventListener("click", async () => {
      if (isSaving) return;
      isSaving = true;
      confirmResetAll = false;
      statusNotice = null;
      render();
      try {
        const saved = await resetAllPersonalization(userUid);
        savedPers = normalizePersonalization(saved);
        draftPers = deepClone(savedPers);
        customDraft = getDefaultCustomColors();
        statusNotice = saved.cloudSynced === false && saved.pendingSync
          ? { type: "info", text: "All appearance settings reset locally and queued for sync." }
          : { type: "success", text: "All appearance, font, accessibility, and dashboard settings restored to default." };
      } catch (error) {
        savedPers = getDefaultPersonalization();
        draftPers = deepClone(savedPers);
        customDraft = getDefaultCustomColors();
        statusNotice = { type: "info", text: error?.message || "Settings restored to default locally." };
      } finally {
        isSaving = false;
        render();
      }
    });
  }

  document.addEventListener("afit-theme-changed", () => {
    if (draftPers.themeId === "system-default" || savedPers.themeId === "system-default") {
      refreshLivePreviewDOMOnly();
    }
  });

  render();

  return {
    updateFromAccount({ userUid: nextUid, preference, personalization, studentName: nextName }) {
      let shouldRender = false;
      if (nextUid && nextUid !== userUid) {
        userUid = nextUid;
      }
      if (typeof nextName === "string" && nextName.trim() && nextName.trim() !== studentName) {
        studentName = nextName.trim();
        shouldRender = true;
      }
      const incomingRaw = personalization || preference;
      if (incomingRaw && !isSaving) {
        const normalizedIncoming = normalizePersonalization(incomingRaw);
        const wasDirty = hasUnsavedChanges();
        savedPers = normalizedIncoming;
        if (!wasDirty) {
          draftPers = deepClone(normalizedIncoming);
          if (normalizedIncoming.customColors) {
            customDraft = { ...getDefaultCustomColors(), ...normalizedIncoming.customColors };
          }
        }
        shouldRender = true;
      }
      if (shouldRender) {
        render();
      }
    }
  };
}
