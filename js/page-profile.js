import { initNavigation } from "./nav.js";
import { renderProfileModule } from "./profile.js";
import { renderThemeStudio } from "./theme-studio.js";
import { watchAuthState } from "./firebase-config.js";
import { syncStudentTheme } from "./theme-engine.js";

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation("profile");
  const profileContainer = document.querySelector("#profile-container");
  const themesContainer = document.querySelector("#themes");
  const tabLinks = document.querySelectorAll(".settings-tab-link");

  function setActiveTab(tabName) {
    tabLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.settingsTab === tabName);
    });
  }

  tabLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setActiveTab(link.dataset.settingsTab);
    });
  });

  if (window.location.hash === "#themes") {
    setActiveTab("themes");
  }

  const studio = themesContainer ? renderThemeStudio(themesContainer) : null;

  watchAuthState(async (user) => {
    if (!user || !studio) return;
    const synced = await syncStudentTheme(user).catch(() => null);
    studio.updateFromAccount({ userUid: user.uid, preference: synced });
  });

  if (profileContainer) {
    const accountInfo = await renderProfileModule(profileContainer);
    if (accountInfo && studio) {
      studio.updateFromAccount({
        userUid: accountInfo.uid,
        preference: accountInfo.themePreference
      });
    }
  }
});
