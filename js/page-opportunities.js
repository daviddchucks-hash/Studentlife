import { initNavigation } from "./nav.js";
import { renderMarketplaceModule } from "./marketplace.js";
import { renderJobsModule } from "./jobs.js";
import { renderOpportunitiesModule } from "./opportunities.js";
import { renderLostFoundModule } from "./lost-found.js";

async function renderTab(tab) {
  const container = document.querySelector("#opps-tab-content");
  container.innerHTML = "";

  document.querySelectorAll("#opps-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

  if (tab === "marketplace") {
    await renderMarketplaceModule(container);
  } else if (tab === "jobs") {
    await renderJobsModule(container);
  } else if (tab === "scholarships") {
    await renderOpportunitiesModule(container);
  } else if (tab === "lost-found") {
    await renderLostFoundModule(container);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("opportunities");

  document.querySelector("#opps-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    void renderTab(btn.dataset.tab);
  };

  void renderTab("marketplace");
});
