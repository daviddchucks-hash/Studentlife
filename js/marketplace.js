import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderMarketplaceModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Student Marketplace. Buy, sell, or trade used textbooks, electronics, items, and services.</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:1rem;">
      <input type="search" id="mkt-search" placeholder="Search marketplace..." style="flex:1;">
      <button class="button button-primary button-small" type="button" id="mkt-post-btn">+ Post Listing</button>
    </div>
    <div id="mkt-post-form-wrap" hidden style="margin-bottom:1.5rem;" class="formula-card">
      <h3>Create Marketplace Listing</h3>
      <form class="tool-form" id="mkt-form">
        <div class="form-row">
          <label class="field">Title<input name="title" required placeholder="Engineering Textbook (3rd Ed)"></label>
          <label class="field">Price<input name="price" required placeholder="₦5,000"></label>
        </div>
        <div class="form-row">
          <label class="field">Category<select name="category"><option>Books</option><option>Electronics</option><option>Clothing</option><option>Services</option><option>Other</option></select></label>
          <label class="field">Contact Phone / Email<input name="contactInfo" required placeholder="08012345678 or student@afit.edu.ng"></label>
        </div>
        <label class="field">Description<textarea name="description" required rows="3" placeholder="Condition, pickup location, details..."></textarea></label>
        <button class="button button-primary" type="submit">List Item</button>
        <div class="tool-output" id="mkt-output"></div>
      </form>
    </div>
    <div id="mkt-list" class="card-grid"><p class="muted">Loading listings…</p></div>
  `;

  const searchInput = container.querySelector("#mkt-search");
  const postBtn = container.querySelector("#mkt-post-btn");
  const formWrap = container.querySelector("#mkt-post-form-wrap");
  const form = container.querySelector("#mkt-form");
  const list = container.querySelector("#mkt-list");

  postBtn.onclick = () => { formWrap.hidden = !formWrap.hidden; };

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/marketplace${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No marketplace listings found.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="module-card">
          <div class="module-card-head">
            <div>
              <h3 class="module-card-title">${escapeHtml(item.title)}</h3>
              <p class="module-card-meta">Category: ${escapeHtml(item.category || "Other")}</p>
            </div>
            <span class="pill-badge ${item.status === 'sold' ? 'sold' : 'active'}">${escapeHtml(item.price)}</span>
          </div>
          <div class="module-card-body">
            <p>${escapeHtml(item.description)}</p>
            <p class="fine-print">📞 Contact: <strong>${escapeHtml(item.contactInfo)}</strong></p>
          </div>
          <div class="module-card-footer">
            <span class="muted">${item.status === 'sold' ? 'Sold' : 'Available'}</span>
            <button class="record-delete" type="button" data-report-id="${item.id}" data-report-type="marketplace">Report</button>
          </div>
        </div>
      `).join("");

      list.onclick = async (e) => {
        const reportBtn = e.target.closest("[data-report-id]");
        if (!reportBtn) return;
        const targetId = reportBtn.dataset.reportId;
        const targetType = reportBtn.dataset.reportType;
        const reason = prompt("Why are you reporting this item?");
        if (!reason) return;
        try {
          await apiRequest("/api/reports", { method: "POST", body: { targetType, targetId, reason } });
          alert("Thank you. Report submitted for administrator review.");
        } catch (err) {
          alert(err.message || "Could not submit report.");
        }
      };
    } catch {
      list.innerHTML = '<p class="error-box">Could not load marketplace listings.</p>';
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const output = form.querySelector("#mkt-output");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await apiRequest("/api/marketplace", { method: "POST", body: payload });
      output.innerHTML = '<div class="result-box">Listing posted!</div>';
      form.reset();
      formWrap.hidden = true;
      await load();
    } catch (err) {
      output.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };

  searchInput.oninput = load;
  await load();
}
