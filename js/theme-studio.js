import {
  getThemes,
  getBackgroundPresets,
  isSystemDarkMode,
  getThemeDefinition,
  resolveCustomTheme,
  getCurrentPreference,
  getDefaultCustomColors,
  applyThemePreference,
  saveAndApplyTheme,
  resetToDefaultTheme
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

function buildPreviewVarsStyle(tokens) {
  const safe = (v) => String(v || "").replace(/[;"<>]/g, "");
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
    `--p-msg-tx-text:${safe(tokens.msgSentText)}`
  ].join(";");
}

function renderMiniMockup(tokens, themeName) {
  return `
    <div class="theme-mini-mock" style="${buildPreviewVarsStyle(tokens)}" aria-hidden="true">
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

function renderLivePreviewStage(theme, isPreviewingDifferent, savedThemeName) {
  const vars = buildPreviewVarsStyle(theme.tokens);
  return `
    <div class="studio-block">
      <div class="studio-block-head">
        <div>
          <h3>4. Current theme preview</h3>
          <p class="muted" style="margin:2px 0 0;">Live snapshot of how cards, buttons, forms, navigation, and chat appear across AFITStudentLife.</p>
        </div>
        <span class="theme-active-indicator ${isPreviewingDifferent ? "is-preview" : ""}">
          ${isPreviewingDifferent ? `Previewing: ${escapeHtml(theme.name)}` : `✓ Active: ${escapeHtml(theme.name)}`}
        </span>
      </div>

      ${isPreviewingDifferent ? `
        <div class="info-box" style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin:0;">
          <span>You are previewing <strong>${escapeHtml(theme.name)}</strong>. Your saved theme is still <strong>${escapeHtml(savedThemeName)}</strong> until you apply.</span>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" class="button button-primary button-small" data-action="apply-preview">Apply ${escapeHtml(theme.name)}</button>
            <button type="button" class="button button-quiet button-small" data-action="cancel-preview">Cancel preview</button>
          </div>
        </div>
      ` : ""}

      <div class="live-preview-stage" style="${vars}" aria-label="Theme visual preview stage">
        <div class="live-preview-banner">
          <div class="live-preview-brand">
            <span class="live-preview-logo">A</span>
            <span>AFITStudentLife</span>
          </div>
          <div class="live-preview-nav" aria-hidden="true">
            <span class="active">Dashboard</span>
            <span>Messages</span>
            <span>Academics</span>
            <span>Settings</span>
          </div>
        </div>

        <div class="live-preview-content">
          <div class="live-preview-card">
            <div>
              <h4>Semester Overview</h4>
              <p>Track courses, calculate GPA, and study with your preferred theme across every tool.</p>
            </div>
            <div class="live-preview-input">Search courses, formulas, or classmates…</div>
            <div class="live-preview-buttons">
              <span class="live-preview-btn-primary">Primary Action</span>
              <span class="live-preview-btn-secondary">Secondary Button</span>
            </div>
          </div>

          <div class="live-preview-chat" aria-hidden="true">
            <div class="live-preview-bubble rx">Hey! Are notes for CSC 201 ready on NoteSync?</div>
            <div class="live-preview-bubble tx">Just uploaded them — check the library tab!</div>
            <div class="live-preview-bubble rx">Awesome, thanks so much.</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderThemeStudio(container, options = {}) {
  if (!container) return null;

  const themes = getThemes();
  const bgPresets = getBackgroundPresets();

  let userUid = options.userUid || "";
  let savedPref = options.initialPreference || getCurrentPreference();
  let previewPref = null;
  let modeFilter = "all";
  let statusNotice = null;
  let isSaving = false;

  let customDraft = savedPref.customColors
    ? { ...getDefaultCustomColors(), ...savedPref.customColors }
    : getDefaultCustomColors();

  function getDisplayedPref() {
    return previewPref || savedPref;
  }

  function isThemeMatch(prefA, themeId, customColors = null) {
    if (!prefA || prefA.themeId !== themeId) return false;
    if (themeId !== "custom") return true;
    const a = prefA.customColors || {};
    const b = customColors || {};
    return a.backgroundPreset === b.backgroundPreset
      && a.primaryAccent === b.primaryAccent
      && a.secondaryAccent === b.secondaryAccent
      && a.buttonAccent === b.buttonAccent;
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

  async function commitThemePreference(nextPref, successMessage) {
    if (isSaving) return;
    isSaving = true;
    statusNotice = null;
    render();

    try {
      const saved = await saveAndApplyTheme(nextPref, userUid);
      savedPref = saved;
      previewPref = null;
      if (saved.customColors) {
        customDraft = { ...getDefaultCustomColors(), ...saved.customColors };
      }
      statusNotice = saved.cloudSynced === false && saved.pendingSync
        ? { type: "info", text: `${successMessage} Saved locally and queued for account sync.` }
        : { type: "success", text: successMessage };
    } catch (error) {
      statusNotice = {
        type: "info",
        text: `${error?.message || "Saved locally on this device; cloud sync will retry automatically."}`
      };
      savedPref = nextPref;
      previewPref = null;
    } finally {
      isSaving = false;
      render();
    }
  }

  function previewTheme(pref) {
    previewPref = pref;
    applyThemePreference(pref, { animate: true });
    render();
  }

  function cancelPreview() {
    previewPref = null;
    applyThemePreference(savedPref, { animate: true });
    render();
  }

  function boostContrastHex(hex, bgMode) {
    const core = typeof window !== "undefined" ? window.AFITThemeEngine : null;
    if (!core || !isValidHex(hex)) return bgMode === "dark" ? "#38bdf8" : "#174e74";
    return core.ensureReadableAccentOnSurface(hex, bgMode === "dark" ? "#ffffff" : "#111827", 4.6);
  }

  function render() {
    const displayedPref = getDisplayedPref();
    const activeTheme = getThemeDefinition(savedPref.themeId, savedPref.customColors);
    const displayedTheme = getThemeDefinition(displayedPref.themeId, displayedPref.customColors);
    const isPreviewingDifferent = Boolean(
      previewPref && !isThemeMatch(savedPref, previewPref.themeId, previewPref.customColors)
    );
    const osDark = isSystemDarkMode();
    const isSystemActive = savedPref.themeId === "system-default";
    const isSystemPreviewing = isPreviewingDifferent && previewPref.themeId === "system-default";

    const visibleThemes = filterThemes(themes);
    const customResolved = resolveCustomTheme(customDraft);
    const buttonContrast = customResolved.customMeta?.buttonContrast || 4.5;
    const buttonContrastLow = buttonContrast < 4.5;
    const isCustomActive = savedPref.themeId === "custom" && isThemeMatch(savedPref, "custom", customDraft);

    const modeOptions = [
      { id: "all", label: `All Themes (${themes.length})` },
      { id: "light", label: "Light Themes" },
      { id: "dark", label: "Dark Themes" },
      { id: "vibrant", label: "Vibrant & Warm" }
    ];

    container.innerHTML = `
      <div class="studio-hero-head">
        <div>
          <p class="eyebrow">Personalization</p>
          <h2 id="appearance-themes-heading">Appearance &amp; Themes</h2>
          <p class="muted" style="margin:0;">Preview and personalize your visual theme across dashboards, messaging, notes, and academic tools. Saved automatically to your student account.</p>
        </div>
        <div class="studio-active-summary" aria-label="Active theme summary">
          <span class="studio-active-swatch-dot" aria-hidden="true"></span>
          <div class="studio-active-summary-text">
            <strong>${escapeHtml(activeTheme.name)}</strong>
            <span>${activeTheme.mode === "dark" ? "Dark appearance" : "Light appearance"} · ${savedPref.pendingSync ? "Saved on device (sync pending)" : "Synced to account"}</span>
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

      <!-- 1. Appearance Mode -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>1. Appearance mode</h3>
            <p class="muted" style="margin:2px 0 0;">Follow your device OS setting automatically or filter curated themes by style.</p>
          </div>
        </div>

        <div class="system-default-card ${isSystemActive ? "is-active" : ""}">
          <div>
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong>System Default</strong>
              ${isSystemActive ? `<span class="theme-active-indicator">✓ Active</span>` : ""}
              ${isSystemPreviewing ? `<span class="theme-active-indicator is-preview">Previewing</span>` : ""}
            </div>
            <p class="muted" style="margin:4px 0 0; font-size:13px;">
              Automatically switches between Classic Light and Midnight Dark based on your device settings (Currently detected: <strong>${osDark ? "Dark mode" : "Light mode"}</strong>).
            </p>
          </div>
          <div class="inline-actions" style="margin-top:0;">
            <button
              type="button"
              class="button button-quiet button-small"
              data-preview-theme="system-default"
              ${isSystemPreviewing ? "disabled" : ""}
            >${isSystemPreviewing ? "Previewing" : "Preview"}</button>
            <button
              type="button"
              class="button button-primary button-small"
              data-apply-theme="system-default"
              ${isSaving || (isSystemActive && !isPreviewingDifferent) ? "disabled" : ""}
            >${isSystemActive && !isPreviewingDifferent ? "Following System" : "Use System Default"}</button>
          </div>
        </div>

        <div class="appearance-mode-bar" role="group" aria-label="Filter themes by appearance mode">
          ${modeOptions.map((opt) => `
            <button
              type="button"
              class="mode-chip-btn"
              data-mode-filter="${opt.id}"
              aria-pressed="${modeFilter === opt.id ? "true" : "false"}"
            >${escapeHtml(opt.label)}</button>
          `).join("")}
        </div>
      </div>

      <!-- 2. Available Themes -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>2. Available themes</h3>
            <p class="muted" style="margin:2px 0 0;">Click Preview to inspect any design live before applying it to your account.</p>
          </div>
        </div>
        <div class="theme-cards-grid">
          ${visibleThemes.map((theme) => {
            const isActive = savedPref.themeId === theme.id;
            const isPreviewing = isPreviewingDifferent && previewPref.themeId === theme.id;
            return `
              <article class="theme-card ${isActive ? "is-active" : ""} ${isPreviewing ? "is-previewing" : ""}" data-theme-card="${escapeHtml(theme.id)}">
                ${renderMiniMockup(theme.tokens, theme.name)}

                <div>
                  <div class="theme-card-header">
                    <div>
                      <h4 class="theme-card-title">${escapeHtml(theme.name)}</h4>
                      <div class="theme-card-meta">${escapeHtml(formatCategoryMeta(theme))}</div>
                    </div>
                    ${isActive
                      ? `<span class="theme-active-indicator">✓ Active</span>`
                      : isPreviewing
                        ? `<span class="theme-active-indicator is-preview">Previewing</span>`
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
                    <button
                      type="button"
                      class="button button-quiet button-small"
                      data-preview-theme="${escapeHtml(theme.id)}"
                      ${isPreviewing ? "disabled" : ""}
                    >${isPreviewing ? "Previewing" : "Preview"}</button>
                    <button
                      type="button"
                      class="button button-primary button-small"
                      data-apply-theme="${escapeHtml(theme.id)}"
                      ${isSaving || (isActive && !isPreviewingDifferent) ? "disabled" : ""}
                    >${isActive && !isPreviewingDifferent ? "Applied" : "Apply Theme"}</button>
                  </div>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>

      <!-- 3. Custom Theme -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>3. Custom theme</h3>
            <p class="muted" style="margin:2px 0 0;">Build your own palette with automatic contrast checking for crisp readability.</p>
          </div>
          ${savedPref.themeId === "custom" ? `<span class="theme-active-indicator">✓ Custom Active</span>` : ""}
        </div>

        <div class="custom-theme-panel">
          <div>
            <span class="color-picker-label" style="display:block; margin-bottom:8px;">Background preference</span>
            <div class="custom-bg-presets" role="group" aria-label="Custom background preset">
              ${Object.entries(bgPresets).map(([key, preset]) => `
                <button
                  type="button"
                  class="bg-preset-btn"
                  data-bg-preset="${escapeHtml(key)}"
                  aria-pressed="${customDraft.backgroundPreset === key ? "true" : "false"}"
                >
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
            ${buttonContrastLow ? `
              <button type="button" class="button button-outline button-small" data-action="boost-contrast">Auto-fix contrast</button>
            ` : ""}
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
            <button type="button" class="button button-quiet button-small" data-action="preview-custom">Preview Custom</button>
            <button type="button" class="button button-primary button-small" data-action="apply-custom" ${isSaving || buttonContrastLow ? "disabled" : ""}>${isCustomActive ? "Custom Theme Applied" : "Apply Custom Theme"}</button>
            <button type="button" class="button button-outline button-small" data-action="reset-custom">Reset Custom</button>
          </div>
        </div>
      </div>

      <!-- 4. Current Theme Preview -->
      ${renderLivePreviewStage(displayedTheme, isPreviewingDifferent, activeTheme.name)}

      <!-- 5. Reset Appearance -->
      <div class="studio-block">
        <div class="studio-block-head">
          <div>
            <h3>5. Reset appearance</h3>
          </div>
        </div>
        <div class="reset-appearance-card">
          <div>
            <strong>Restore Default Theme</strong>
            <p>Revert immediately to <strong>Classic Light</strong> across all pages and sync with your account.</p>
          </div>
          <button
            type="button"
            class="button button-outline"
            data-action="restore-default"
            ${isSaving || (savedPref.themeId === "classic-light" && !isPreviewingDifferent) ? "disabled" : ""}
          >Restore Default Theme</button>
        </div>
      </div>
    `;

    bindEvents();
  }

  function updateCustomPreviewIfActive() {
    const customPref = { themeId: "custom", customColors: { ...customDraft } };
    if (previewPref && previewPref.themeId === "custom") {
      previewPref = customPref;
      applyThemePreference(customPref, { animate: false });
    }
    const stageWrap = container.querySelector(".live-preview-stage");
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
      const boostBtn = buttonDiag.querySelector('[data-action="boost-contrast"]');
      if (boostBtn) {
        boostBtn.addEventListener("click", () => {
          customDraft.buttonAccent = boostContrastHex(customDraft.buttonAccent, customResolved.mode);
          render();
        });
      }
    }

    if (applyCustomBtn) {
      applyCustomBtn.disabled = isSaving || low;
    }

    if (stageWrap && previewPref?.themeId === "custom") {
      stageWrap.setAttribute("style", buildPreviewVarsStyle(customResolved.tokens));
    }
  }

  function bindEvents() {
    container.querySelectorAll("[data-mode-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        modeFilter = btn.dataset.modeFilter || "all";
        render();
      });
    });

    container.querySelectorAll("[data-preview-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.previewTheme;
        previewTheme({ themeId, customColors: null });
      });
    });

    container.querySelectorAll("[data-apply-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const themeId = btn.dataset.applyTheme;
        const def = getThemeDefinition(themeId);
        void commitThemePreference(
          { themeId, customColors: null },
          `${def.name} applied across AFITStudentLife.`
        );
      });
    });

    container.querySelector('[data-action="apply-preview"]')?.addEventListener("click", () => {
      if (!previewPref) return;
      const def = getThemeDefinition(previewPref.themeId, previewPref.customColors);
      void commitThemePreference(previewPref, `${def.name} applied and saved to your account.`);
    });

    container.querySelector('[data-action="cancel-preview"]')?.addEventListener("click", cancelPreview);

    container.querySelectorAll("[data-bg-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        customDraft.backgroundPreset = btn.dataset.bgPreset || "light-crisp";
        if (previewPref?.themeId === "custom") {
          previewPref = { themeId: "custom", customColors: { ...customDraft } };
          applyThemePreference(previewPref, { animate: false });
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
      render();
    });

    container.querySelector('[data-action="preview-custom"]')?.addEventListener("click", () => {
      previewTheme({ themeId: "custom", customColors: { ...customDraft } });
    });

    container.querySelector('[data-action="apply-custom"]')?.addEventListener("click", () => {
      const customResolved = resolveCustomTheme(customDraft);
      if ((customResolved.customMeta?.buttonContrast || 0) < 4.5) return;
      void commitThemePreference(
        { themeId: "custom", customColors: { ...customDraft } },
        "Custom theme applied and saved to your account."
      );
    });

    container.querySelector('[data-action="reset-custom"]')?.addEventListener("click", () => {
      customDraft = getDefaultCustomColors();
      if (previewPref?.themeId === "custom") {
        previewTheme({ themeId: "custom", customColors: { ...customDraft } });
      }
      statusNotice = { type: "info", text: "Custom colour pickers reset to default AFIT palette." };
      render();
    });

    container.querySelector('[data-action="restore-default"]')?.addEventListener("click", async () => {
      if (isSaving) return;
      isSaving = true;
      statusNotice = null;
      render();
      try {
        const saved = await resetToDefaultTheme(userUid);
        savedPref = saved;
        previewPref = null;
        customDraft = getDefaultCustomColors();
        statusNotice = saved.cloudSynced === false && saved.pendingSync
          ? { type: "info", text: "Classic Light restored on this device and queued for sync." }
          : { type: "success", text: "Default Classic Light theme restored." };
      } catch (error) {
        savedPref = { themeId: "classic-light", customColors: null };
        previewPref = null;
        statusNotice = { type: "info", text: error?.message || "Classic Light restored locally." };
      } finally {
        isSaving = false;
        render();
      }
    });
  }

  document.addEventListener("afit-theme-changed", () => {
    if (savedPref.themeId === "system-default" || previewPref?.themeId === "system-default") {
      render();
    }
  });

  render();

  return {
    updateFromAccount({ userUid: nextUid, preference }) {
      if (nextUid) userUid = nextUid;
      if (preference && !previewPref && !isSaving) {
        savedPref = preference;
        if (preference.customColors) {
          customDraft = { ...getDefaultCustomColors(), ...preference.customColors };
        }
        render();
      }
    }
  };
}
