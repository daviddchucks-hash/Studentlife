import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderAnnouncementsModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Official AFIT Campus Notices & Announcements.</p>
    <div style="margin-bottom:1rem;">
      <input type="search" id="anc-search" placeholder="Search announcements...">
    </div>
    <div id="anc-list" class="record-list"><p class="muted">Loading announcements…</p></div>
  `;

  const searchInput = container.querySelector("#anc-search");
  const list = container.querySelector("#anc-list");

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/announcements${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No campus announcements at this time.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="formula-card">
          <div class="formula-head">
            <div>
              <p class="formula-meta">${escapeHtml(item.category || "General")} · ${escapeHtml(item.date)}</p>
              <h3>${escapeHtml(item.title)}</h3>
            </div>
            <span class="pill-badge">${escapeHtml(item.author || "Admin")}</span>
          </div>
          <p class="formula-desc" style="white-space:pre-line;">${escapeHtml(item.content)}</p>
        </div>
      `).join("");
    } catch {
      list.innerHTML = '<p class="error-box">Could not load announcements.</p>';
    }
  };

  searchInput.oninput = load;
  await load();
}
