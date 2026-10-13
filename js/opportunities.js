import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderOpportunitiesModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Scholarships, Internships, Competitions, Fellowships & Training Opportunities.</p>
    <div style="margin-bottom:1rem;">
      <input type="search" id="opp-search" placeholder="Search scholarships and opportunities...">
    </div>
    <div id="opps-list" class="card-grid"><p class="muted">Loading opportunities…</p></div>
  `;

  const searchInput = container.querySelector("#opp-search");
  const list = container.querySelector("#opps-list");

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/opportunities${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No matching opportunities available at present.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="module-card">
          <div class="module-card-head">
            <div>
              <h3 class="module-card-title">${escapeHtml(item.title)}</h3>
              <p class="module-card-meta">Deadline: <strong>${escapeHtml(item.deadline)}</strong></p>
            </div>
            <span class="pill-badge">${escapeHtml(item.category || "Scholarship")}</span>
          </div>
          <div class="module-card-body">
            <p>${escapeHtml(item.description)}</p>
            ${item.link ? `<p><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="text-link">Apply / Learn More →</a></p>` : ""}
          </div>
        </div>
      `).join("");
    } catch {
      list.innerHTML = '<p class="error-box">Could not load opportunities.</p>';
    }
  };

  searchInput.oninput = load;
  await load();
}
