import { initNavigation } from "./nav.js";
import { renderCampusLifeModule } from "./campus-life.js";
import { renderFeedbackModule } from "./feedback.js";

async function renderTab(tab) {
  const container = document.querySelector("#comm-tab-content");
  container.innerHTML = "";

  document.querySelectorAll("#comm-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

  if (tab === "feedback") {
    await renderFeedbackModule(container);
  } else {
    renderCampusLifeModule(tab, container);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("community");

  document.querySelector("#comm-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    void renderTab(btn.dataset.tab);
  };

  void renderTab("orgs");
});
