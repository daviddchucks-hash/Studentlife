import { initNavigation } from "./nav.js";
import { renderProfileModule } from "./profile.js";
import { renderThemeStudio } from "./theme-studio.js";
import { signOutUser, watchAuthState } from "./firebase-config.js";
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

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("profile");

  const profileContainer = document.querySelector("#profile-container");
  const accountBody = document.querySelector("#account-settings-body");
  const accountStatus = document.querySelector("#account-settings-status");
  const refreshAccountBtn = document.querySelector("#refresh-account-btn");
  const signoutBtn = document.querySelector("#settings-signout-btn");
  const securityBadge = document.querySelector("#security-auth-badge");
  const themesContainer = document.querySelector("#themes");
  const tabButtons = document.querySelectorAll(".settings-tab-link[data-settings-tab]");
  const sectionPanels = document.querySelectorAll(".settings-panel[data-settings-section]");

  let loadedUid = "";
  let studio = null;

  function renderAccountSummary(info, authUser = null) {
    if (!accountBody) return;
    const email = info?.email || authUser?.email || "Not available";
    const name = info?.name || authUser?.displayName || "Student";
    const uid = info?.uid || authUser?.uid || "Pending";
    const matric = info?.profile?.matricNumber || "Not added";
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
    `;

    if (securityBadge) {
      securityBadge.textContent = authUser || info?.uid ? "Verified session active" : "Checking session…";
    }
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

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTab = btn.dataset.settingsTab || "all";
      applySettingsSection(nextTab);
      if (nextTab === "themes") {
        window.history.replaceState?.(null, "", "#themes");
      } else if (nextTab === "all") {
        window.history.replaceState?.(null, "", "./profile.html");
      } else {
        window.history.replaceState?.(null, "", `#${nextTab}-section`);
      }
    });
  });

  function applyInitialHash() {
    const hash = (window.location.hash || "").toLowerCase();
    if (hash === "#themes") {
      applySettingsSection("themes");
    } else if (hash === "#account-section" || hash === "#account") {
      applySettingsSection("account");
    } else if (hash === "#security-section" || hash === "#security") {
      applySettingsSection("security");
    } else if (hash === "#profile-section" || hash === "#profile-container" || hash === "#profile") {
      applySettingsSection("profile");
    } else {
      applySettingsSection("all");
    }
  }

  applyInitialHash();
  window.addEventListener("hashchange", applyInitialHash);

  if (themesContainer) {
    studio = renderThemeStudio(themesContainer);
  }

  async function loadProfileAndAccount(authUser = null) {
    if (!profileContainer) return;
    const summary = await renderProfileModule(profileContainer, {
      onProfileLoaded: (info) => {
        renderAccountSummary(info, authUser);
      },
      onProfileUpdated: (updatedInfo) => {
        renderAccountSummary(updatedInfo, authUser);
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
  }

  if (refreshAccountBtn) {
    refreshAccountBtn.addEventListener("click", async () => {
      refreshAccountBtn.disabled = true;
      if (accountStatus) accountStatus.innerHTML = "";
      try {
        await loadProfileAndAccount();
        if (accountStatus) {
          accountStatus.innerHTML = '<div class="result-box" style="margin-top:12px;">Profile and account details refreshed.</div>';
          setTimeout(() => { if (accountStatus) accountStatus.innerHTML = ""; }, 3500);
        }
      } finally {
        refreshAccountBtn.disabled = false;
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
    if (!user) return;
    renderAccountSummary(null, user);

    if (loadedUid !== user.uid) {
      loadedUid = user.uid;
      await loadProfileAndAccount(user);
    }

    if (studio) {
      const synced = await syncStudentTheme(user).catch(() => null);
      studio.updateFromAccount({ userUid: user.uid, preference: synced });
    }
  });
});
