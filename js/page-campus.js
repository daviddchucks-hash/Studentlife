import { initNavigation } from "./nav.js";
import { renderCampusDirectoryModule } from "./campus-directory.js";
import { renderAnnouncementsModule } from "./announcements.js";
import { renderEventsModule } from "./events.js";
import { renderCampusLifeModule } from "./campus-life.js";

async function renderTab(tab) {
  const container = document.querySelector("#campus-tab-content");
  container.innerHTML = "";

  document.querySelectorAll("#campus-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

  if (tab === "directory") {
    await renderCampusDirectoryModule(container);
  } else if (tab === "announcements") {
    await renderAnnouncementsModule(container);
  } else if (tab === "events") {
    await renderEventsModule(container);
  } else {
    renderCampusLifeModule(tab, container);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("campus-life");

  document.querySelector("#campus-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    void renderTab(btn.dataset.tab);
  };

  void renderTab("directory");
});
