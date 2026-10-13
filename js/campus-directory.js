import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderCampusDirectoryModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Search AFIT departments, faculties, offices, services, and campus locations.</p>
    <div class="search-bar-wrap" style="width:100%; max-width:100%; margin-bottom:1rem;">
      <input type="search" id="dir-search" placeholder="Search by name, category, or location...">
    </div>
    <div id="dir-list" class="card-grid"><p class="muted">Loading directory…</p></div>
  `;

  const searchInput = container.querySelector("#dir-search");
  const list = container.querySelector("#dir-list");

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/directory${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No matching directory records found.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="module-card">
          <div class="module-card-head">
            <div>
              <h3 class="module-card-title">${escapeHtml(item.title)}</h3>
              <p class="module-card-meta">${escapeHtml(item.category || "General")} ${item.location ? `· ${escapeHtml(item.location)}` : ""}</p>
            </div>
            <span class="pill-badge">${escapeHtml(item.category || "General")}</span>
          </div>
          <div class="module-card-body">
            <p>${escapeHtml(item.description || "")}</p>
            ${item.contactEmail ? `<p class="fine-print">✉ ${escapeHtml(item.contactEmail)}</p>` : ""}
            ${item.contactPhone ? `<p class="fine-print">📞 ${escapeHtml(item.contactPhone)}</p>` : ""}
            ${item.hours ? `<p class="fine-print">🕒 ${escapeHtml(item.hours)}</p>` : ""}
          </div>
        </div>
      `).join("");
    } catch {
      list.innerHTML = '<p class="error-box">Could not load campus directory.</p>';
    }
  };

  searchInput.oninput = load;
  await load();
}
