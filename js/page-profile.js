import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { renderProfileModule } from "./profile.js";
import { renderThemeStudio } from "./theme-studio.js";
import {
  changeStudentPassword,
  getAuthStatus,
  retryAuthConnection,
  signOutUser,
  watchAuthState
} from "./firebase-config.js";
import { handleSignOutThemeReset, syncStudentTheme } from "./theme-engine.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatShortDate(timestamp) {
  const ms = Number(timestamp);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("profile");

  const profileContainer = document.querySelector("#profile-container");
  const accountBody = document.querySelector("#account-settings-body");
  const accountStatus = document.querySelector("#account-settings-status");
  const refreshAccountBtn = document.querySelector("#refresh-account-btn");
  const signoutBtn = document.querySelector("#settings-signout-btn");

  const passwordForm = document.querySelector("#password-change-form");
  const currentPasswordInput = document.querySelector("#current-password-input");
  const newPasswordInput = document.querySelector("#new-password-input");
  const confirmPasswordInput = document.querySelector("#confirm-password-input");
  const passwordStatus = document.querySelector("#password-change-status");
  const changePasswordBtn = document.querySelector("#change-password-btn");

  const securityBadge = document.querySelector("#security-auth-badge");
  const securitySessionSummary = document.querySelector("#security-session-summary");
  const refreshSecurityBtn = document.querySelector("#refresh-security-btn");
  const courseMateToggle = document.querySelector("#settings-coursemate-discoverable");
  const courseMateLabel = document.querySelector("#settings-coursemate-label");
  const courseMateStatus = document.querySelector("#coursemate-privacy-status");
  const blockedListEl = document.querySelector("#settings-blocked-list");
  const blockedStatusEl = document.querySelector("#blocked-students-status");

  const themesContainer = document.querySelector("#themes");
  const tabButtons = document.querySelectorAll(".settings-tab-link[data-settings-tab]");
  const sectionPanels = document.querySelectorAll(".settings-panel[data-settings-section]");

  let loadedUid = "";
  let activeAuthUser = null;
  let studio = null;
  let blockedStudents = [];

  function updateSessionSummary(info, authUser = null, errorMessage = "") {
    const effectiveUser = authUser || activeAuthUser || getAuthStatus().currentUser;
    const authStatus = getAuthStatus();
    const providerLabel = authStatus.firebaseEnabled
      ? "Firebase Authentication"
      : authStatus.backendAuthMode === "in-memory"
        ? "StudentLife Session Auth"
        : "Authentication Check";

    if (securityBadge) {
      if (errorMessage) {
        securityBadge.textContent = "Attention needed";
        securityBadge.className = "badge badge-warning";
      } else if (effectiveUser || info?.uid) {
        securityBadge.textContent = "Verified session active";
        securityBadge.className = "badge badge-success";
      } else {
        securityBadge.textContent = "No active session";
        securityBadge.className = "badge badge-warning";
      }
    }

    if (securitySessionSummary) {
      if (effectiveUser || info?.uid) {
        securitySessionSummary.textContent = `Signed in via ${providerLabel} as ${info?.email || effectiveUser?.email || "verified student"}. Sign out whenever using a shared computer.`;
      } else if (errorMessage) {
        securitySessionSummary.textContent = errorMessage;
      } else {
        securitySessionSummary.textContent = "Checking your active authentication session…";
      }
    }
  }

  function renderAccountSummary(info, authUser = null, { profileError = "" } = {}) {
    if (!accountBody) return;
    const effectiveUser = authUser || activeAuthUser || getAuthStatus().currentUser;

    if (!info && !effectiveUser) {
      accountBody.innerHTML = `
        <div class="error-box" role="alert" style="grid-column:1 / -1;">
          ${escapeHtml(profileError || "No active student session found. Please sign in to manage your account settings.")}
        </div>
        <div class="inline-actions" style="grid-column:1 / -1; margin-top:4px;">
          <button type="button" class="button button-outline button-small" id="retry-account-auth-btn">Retry Connection</button>
          <a href="./login.html" class="button button-primary button-small">Sign in</a>
        </div>
      `;
      const retryBtn = accountBody.querySelector("#retry-account-auth-btn");
      if (retryBtn) {
        retryBtn.addEventListener("click", async () => {
          retryBtn.disabled = true;
          retryBtn.textContent = "Reconnecting…";
          await retryAuthConnection();
          const current = getAuthStatus().currentUser;
          if (current) {
            activeAuthUser = current;
            await loadProfileAndAccount(current);
          } else {
            renderAccountSummary(null, null, { profileError: "Could not detect an active session. Sign in to continue." });
          }
        });
      }
      updateSessionSummary(null, null, profileError);
      return;
    }

    const email = info?.email || effectiveUser?.email || "Not available";
    const name = info?.name || effectiveUser?.displayName || "Student";
    const uid = info?.uid || effectiveUser?.uid || "Pending";
    const matric = info?.profile?.matricNumber || (info ? "Not added" : (profileError ? "Unavailable" : "Loading…"));
    const matricVerified = Boolean(info?.profile?.matricVerified);

    accountBody.innerHTML = `
      <div class="view-field">
        <span class="view-field-label">Account Holder</span>
        <span class="view-field-value">${escapeHtml(name)}</span>
      </div>
      <div class="view-field">
        <span class="view-field-label">Sign-in Email</span>
        <span class="view-field-value">${escapeHtml(email)}</span>
      </div>
      <div class="view-field">
        <span class="view-field-label">Matriculation Verification</span>
        <span class="view-field-value">${escapeHtml(matric)} ${matricVerified ? "(Verified Permanent ID)" : ""}</span>
      </div>
      <div class="view-field">
        <span class="view-field-label">Student Account ID</span>
        <span class="view-field-value tabular-nums">${escapeHtml(uid)}</span>
      </div>
      ${profileError ? `
        <div class="error-box" role="alert" style="grid-column:1 / -1;">
          Could not load extended profile record: ${escapeHtml(profileError)}
        </div>
      ` : ""}
    `;

    updateSessionSummary(info, effectiveUser, profileError);
  }

  function applySettingsSection(sectionKey) {
    const valid = new Set(["all", "profile", "account", "themes", "security"]);
    const activeKey = valid.has(sectionKey) ? sectionKey : "all";

    tabButtons.forEach((btn) => {
      const match = btn.dataset.settingsTab === activeKey;
      btn.classList.toggle("active", match);
      btn.setAttribute("aria-pressed", match ? "true" : "false");
    });

    sectionPanels.forEach((panel) => {
      const panelKey = panel.dataset.settingsSection;
      panel.hidden = activeKey !== "all" && panelKey !== activeKey;
    });
  }

  function resolveTabFromHash(hashValue = window.location.hash) {
    const hash = String(hashValue || "").toLowerCase();
    if (hash === "#themes") return "themes";
    if (hash === "#account-section" || hash === "#account") return "account";
    if (hash === "#security-section" || hash === "#security") return "security";
    if (hash === "#profile-section" || hash === "#profile-container" || hash === "#profile") return "profile";
    return "all";
  }

  function targetHashForTab(tabKey) {
    if (tabKey === "themes") return "#themes";
    if (tabKey === "all") return "";
    return `#${tabKey}-section`;
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTab = btn.dataset.settingsTab || "all";
      applySettingsSection(nextTab);
      const nextHash = targetHashForTab(nextTab);
      const nextUrl = nextHash ? `${window.location.pathname}${window.location.search}${nextHash}` : `${window.location.pathname}${window.location.search}`;
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
        if (typeof window.history?.pushState === "function") {
          window.history.pushState({ settingsTab: nextTab }, "", nextUrl);
        } else {
          window.location.hash = nextHash;
        }
      }
    });
  });

  function syncTabFromLocation() {
    applySettingsSection(resolveTabFromHash(window.location.hash));
  }

  syncTabFromLocation();
  window.addEventListener("hashchange", syncTabFromLocation);
  window.addEventListener("popstate", syncTabFromLocation);

  if (themesContainer) {
    studio = renderThemeStudio(themesContainer);
  }

  function renderBlockedStudentsList() {
    if (!blockedListEl) return;
    if (!blockedStudents.length) {
      blockedListEl.innerHTML = `<div class="empty-state">You have not blocked any students.</div>`;
      return;
    }

    blockedListEl.innerHTML = blockedStudents.map((item) => {
      const dateStr = formatShortDate(item.createdAt);
      return `
        <div class="blocked-student-row" data-blocked-row="${escapeHtml(item.uid)}">
          <div class="blocked-student-meta">
            <strong>${escapeHtml(item.name || "AFIT Student")}</strong>
            <small>${dateStr ? `Blocked on ${escapeHtml(dateStr)}` : "Blocked in Messaging"}</small>
          </div>
          <button
            type="button"
            class="button button-outline button-small"
            data-unblock-uid="${escapeHtml(item.uid)}"
          >Unblock</button>
        </div>
      `;
    }).join("");
  }

  async function loadCourseMateVisibility() {
    if (!courseMateToggle || !courseMateLabel) return;
    courseMateToggle.disabled = true;
    courseMateLabel.textContent = "Loading visibility setting…";
    if (courseMateStatus) courseMateStatus.innerHTML = "";

    try {
      const data = await apiRequest("/api/coursemate/profile");
      const discoverable = Boolean(data?.profile?.discoverable);
      courseMateToggle.checked = discoverable;
      courseMateLabel.textContent = discoverable
        ? "Discoverable to classmates in shared courses"
        : "Hidden from classmate discovery";
      courseMateToggle.disabled = false;
    } catch (error) {
      courseMateLabel.textContent = "Could not load visibility setting.";
      if (courseMateStatus) {
        courseMateStatus.innerHTML = `
          <div class="error-box" role="alert">${escapeHtml(error?.message || "Failed to load CourseMate visibility.")}</div>
        `;
      }
    }
  }

  async function loadBlockedStudents() {
    if (!blockedListEl) return;
    blockedListEl.innerHTML = `<p class="muted">Loading blocked students…</p>`;
    if (blockedStatusEl) blockedStatusEl.innerHTML = "";

    try {
      const data = await apiRequest("/api/messages/blocked");
      blockedStudents = Array.isArray(data?.items) ? data.items : [];
      renderBlockedStudentsList();
    } catch (error) {
      blockedStudents = [];
      blockedListEl.innerHTML = `
        <div class="error-box" role="alert">${escapeHtml(error?.message || "Could not load blocked students.")}</div>
        <div class="inline-actions" style="margin-top:8px;">
          <button type="button" class="button button-outline button-small" id="retry-blocked-load-btn">Retry Blocked List</button>
        </div>
      `;
      blockedListEl.querySelector("#retry-blocked-load-btn")?.addEventListener("click", () => {
        void loadBlockedStudents();
      });
    }
  }

  async function loadSecurityControls() {
    updateSessionSummary(null, activeAuthUser);
    await Promise.all([
      loadCourseMateVisibility(),
      loadBlockedStudents()
    ]);
  }

  if (courseMateToggle) {
    courseMateToggle.addEventListener("change", async () => {
      const nextChecked = courseMateToggle.checked;
      courseMateToggle.disabled = true;
      if (courseMateLabel) {
        courseMateLabel.textContent = nextChecked ? "Enabling classmate discovery…" : "Hiding from classmate discovery…";
      }
      if (courseMateStatus) courseMateStatus.innerHTML = "";

      try {
        const result = await apiRequest("/api/coursemate/profile", {
          method: "PUT",
          body: { discoverable: nextChecked }
        });
        const confirmed = Boolean(result?.profile?.discoverable);
        courseMateToggle.checked = confirmed;
        if (courseMateLabel) {
          courseMateLabel.textContent = confirmed
            ? "Discoverable to classmates in shared courses"
            : "Hidden from classmate discovery";
        }
        if (courseMateStatus) {
          courseMateStatus.innerHTML = `
            <div class="result-box">${confirmed ? "Classmates can now discover you in CourseMate." : "Your profile is now hidden from CourseMate discovery."}</div>
          `;
        }
      } catch (error) {
        courseMateToggle.checked = !nextChecked;
        if (courseMateLabel) {
          courseMateLabel.textContent = !nextChecked
            ? "Discoverable to classmates in shared courses"
            : "Hidden from classmate discovery";
        }
        if (courseMateStatus) {
          courseMateStatus.innerHTML = `<div class="error-box" role="alert">${escapeHtml(error?.message || "Could not update CourseMate visibility.")}</div>`;
        }
      } finally {
        courseMateToggle.disabled = false;
      }
    });
  }

  if (blockedListEl) {
    blockedListEl.addEventListener("click", async (event) => {
      const unblockBtn = event.target.closest("[data-unblock-uid]");
      if (!unblockBtn) return;

      const targetUid = unblockBtn.dataset.unblockUid;
      if (!targetUid) return;
      const targetStudent = blockedStudents.find((item) => item.uid === targetUid);
      const originalText = unblockBtn.textContent;
      unblockBtn.disabled = true;
      unblockBtn.textContent = "Unblocking…";
      if (blockedStatusEl) blockedStatusEl.innerHTML = "";

      try {
        await apiRequest(`/api/messages/blocked/${encodeURIComponent(targetUid)}`, {
          method: "DELETE"
        });
        blockedStudents = blockedStudents.filter((item) => item.uid !== targetUid);
        renderBlockedStudentsList();
        if (blockedStatusEl) {
          blockedStatusEl.innerHTML = `<div class="result-box">Unblocked ${escapeHtml(targetStudent?.name || "student")}. They can send message requests again if needed.</div>`;
        }
      } catch (error) {
        unblockBtn.disabled = false;
        unblockBtn.textContent = originalText;
        if (blockedStatusEl) {
          blockedStatusEl.innerHTML = `<div class="error-box" role="alert">${escapeHtml(error?.message || "Could not unblock student.")}</div>`;
        }
      }
    });
  }

  if (refreshSecurityBtn) {
    refreshSecurityBtn.addEventListener("click", async () => {
      refreshSecurityBtn.disabled = true;
      refreshSecurityBtn.textContent = "Refreshing…";
      try {
        await loadSecurityControls();
      } finally {
        refreshSecurityBtn.disabled = false;
        refreshSecurityBtn.textContent = "Refresh Privacy Controls";
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput || !passwordStatus || !changePasswordBtn) return;

      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmPassword = confirmPasswordInput.value;
      passwordStatus.innerHTML = "";

      if (!currentPassword) {
        passwordStatus.innerHTML = '<div class="error-box" role="alert">Enter your current password to continue.</div>';
        currentPasswordInput.focus();
        return;
      }
      if (newPassword.length < 6) {
        passwordStatus.innerHTML = '<div class="error-box" role="alert">New password must be at least 6 characters.</div>';
        newPasswordInput.focus();
        return;
      }
      if (newPassword !== confirmPassword) {
        passwordStatus.innerHTML = '<div class="error-box" role="alert">New password and confirmation do not match.</div>';
        confirmPasswordInput.focus();
        return;
      }
      if (currentPassword === newPassword) {
        passwordStatus.innerHTML = '<div class="error-box" role="alert">Choose a new password that is different from your current password.</div>';
        newPasswordInput.focus();
        return;
      }

      changePasswordBtn.disabled = true;
      changePasswordBtn.textContent = "Updating password…";

      try {
        await changeStudentPassword({ currentPassword, newPassword });
        passwordForm.reset();
        passwordStatus.innerHTML = '<div class="result-box">Your password has been updated cleanly.</div>';
      } catch (error) {
        passwordStatus.innerHTML = `<div class="error-box" role="alert">${escapeHtml(error?.message || "Could not update your password.")}</div>`;
      } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = "Update Password";
      }
    });
  }

  async function loadProfileAndAccount(authUser = null) {
    const effectiveUser = authUser || activeAuthUser || getAuthStatus().currentUser;
    if (!profileContainer) return null;
    const summary = await renderProfileModule(profileContainer, {
      onProfileLoaded: (info) => {
        renderAccountSummary(info, effectiveUser);
      },
      onProfileUpdated: (updatedInfo) => {
        renderAccountSummary(updatedInfo, effectiveUser);
      },
      onProfileError: (err) => {
        renderAccountSummary(null, effectiveUser, {
          profileError: err?.message || "Failed to load profile from the server."
        });
      }
    });

    if (summary && studio) {
      const synced = await syncStudentTheme(
        { uid: summary.uid },
        summary.themePreference || null
      ).catch(() => null);
      studio.updateFromAccount({
        userUid: summary.uid,
        preference: synced || summary.themePreference || null
      });
    }
    return summary;
  }

  if (refreshAccountBtn) {
    refreshAccountBtn.addEventListener("click", async () => {
      refreshAccountBtn.disabled = true;
      refreshAccountBtn.textContent = "Refreshing…";
      if (accountStatus) accountStatus.innerHTML = "";
      try {
        await loadProfileAndAccount(activeAuthUser);
        await loadSecurityControls();
        if (accountStatus) {
          accountStatus.innerHTML = '<div class="result-box" style="margin-top:12px;">Profile, security, and account details refreshed.</div>';
          setTimeout(() => { if (accountStatus) accountStatus.innerHTML = ""; }, 3500);
        }
      } finally {
        refreshAccountBtn.disabled = false;
        refreshAccountBtn.textContent = "Refresh Profile Data";
      }
    });
  }

  if (signoutBtn) {
    signoutBtn.addEventListener("click", async () => {
      signoutBtn.disabled = true;
      signoutBtn.textContent = "Signing out…";
      try {
        await signOutUser();
        handleSignOutThemeReset();
        window.location.replace("./login.html");
      } catch {
        signoutBtn.disabled = false;
        signoutBtn.textContent = "Sign out";
      }
    });
  }

  watchAuthState(async (user) => {
    activeAuthUser = user || null;
    if (!user) {
      loadedUid = "";
      renderAccountSummary(null, null, {
        profileError: "No active student session detected. Redirecting to sign in…"
      });
      if (profileContainer) {
        profileContainer.innerHTML = `
          <div class="view-card">
            <p class="muted" style="margin:0;">Signing in is required to view and edit your student profile.</p>
          </div>
        `;
      }
      if (blockedListEl) {
        blockedListEl.innerHTML = '<div class="empty-state">Sign in to manage blocked students.</div>';
      }
      if (courseMateLabel) {
        courseMateLabel.textContent = "Sign in to manage CourseMate visibility.";
      }
      return;
    }

    renderAccountSummary(null, user);

    if (loadedUid !== user.uid) {
      loadedUid = user.uid;
      await Promise.all([
        loadProfileAndAccount(user),
        loadSecurityControls()
      ]);
    }

    if (studio) {
      const synced = await syncStudentTheme(user).catch(() => null);
      studio.updateFromAccount({ userUid: user.uid, preference: synced });
    }
  });
});
