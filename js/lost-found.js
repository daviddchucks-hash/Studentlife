import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderLostFoundModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Report lost or found items on campus, or search listings to reclaim items safely.</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:1rem;">
      <input type="search" id="lf-search" placeholder="Search lost or found items..." style="flex:1;">
      <button class="button button-primary button-small" type="button" id="lf-post-btn">+ Report Item</button>
    </div>
    <div id="lf-post-form-wrap" hidden style="margin-bottom:1.5rem;" class="formula-card">
      <h3>Report Lost or Found Item</h3>
      <form class="tool-form" id="lf-form">
        <div class="form-row">
          <label class="field">Listing Type<select name="type"><option value="lost">Lost Item</option><option value="found">Found Item</option></select></label>
          <label class="field">Item Name / Title<input name="title" required placeholder="Black Wallet / Student ID Card"></label>
        </div>
        <div class="form-row">
          <label class="field">Category<select name="category"><option>Personal</option><option>Electronics</option><option>Documents</option><option>Keys</option><option>Clothing</option><option>Other</option></select></label>
          <label class="field">Location<input name="location" required placeholder="Library / Lecture Hall 2"></label>
        </div>
        <div class="form-row">
          <label class="field">Date<input name="date" type="date" required></label>
          <label class="field">Contact Phone / Email<input name="contactInfo" required placeholder="08000000000 or student@afit.edu.ng"></label>
        </div>
        <label class="field">Public description<textarea name="description" rows="3" placeholder="Do not include unique proof of ownership here."></textarea></label>
        <label class="field">Private identifying characteristics<textarea name="identifyingCharacteristics" rows="2" placeholder="Only the reviewer will see these details."></textarea></label>
        <button class="button button-primary" type="submit">Submit Listing</button>
        <div class="tool-output" id="lf-output"></div>
      </form>
    </div>
    <div id="lf-list" class="card-grid"><p class="muted">Loading lost and found listings…</p></div>
    <div id="lf-claims" class="record-list" aria-live="polite"></div>
  `;

  const searchInput = container.querySelector("#lf-search");
  const postBtn = container.querySelector("#lf-post-btn");
  const formWrap = container.querySelector("#lf-post-form-wrap");
  const form = container.querySelector("#lf-form");
  const list = container.querySelector("#lf-list");

  postBtn.onclick = () => { formWrap.hidden = !formWrap.hidden; };

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/lost-found${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No lost & found listings found.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="module-card">
          <div class="module-card-head">
            <div>
              <h3 class="module-card-title">${escapeHtml(item.title)}</h3>
              <p class="module-card-meta">📍 ${escapeHtml(item.location)} · 📅 ${escapeHtml(item.date)}</p>
            </div>
            <span class="pill-badge ${item.type === 'found' ? 'active' : ''}">${escapeHtml(item.type.toUpperCase())}</span>
          </div>
          <div class="module-card-body">
            <p>${escapeHtml(item.description || "No description provided.")}</p>
            <p class="fine-print">Contact details and private identifying characteristics are withheld from public listings. Claims are reviewed by an administrator.</p>
            <details>
              <summary>Submit a claim</summary>
              <form class="tool-form" data-claim-item="${escapeHtml(item.id)}" style="margin-top:12px;">
                <label class="field">Your name<input name="claimantName" required maxlength="120"></label>
                <label class="field">Why do you believe this item is yours?<textarea name="reason" required maxlength="2000" rows="2"></textarea></label>
                <label class="field">Private identifying details<textarea name="identifyingDetails" required maxlength="1000" rows="2" placeholder="Describe a detail not shown in the public listing."></textarea></label>
                <div class="tool-output" data-claim-message></div>
                <button class="button button-primary button-small" type="submit">Submit claim</button>
              </form>
            </details>
          </div>
        </div>
      `).join("");
    } catch {
      list.innerHTML = '<p class="error-box">Could not load lost & found items. Please try again.</p>';
    }
  };

  list.addEventListener("submit", async (event) => {
    const claimForm = event.target.closest("[data-claim-item]");
    if (!claimForm) return;
    event.preventDefault();
    const output = claimForm.querySelector("[data-claim-message]");
    const submitButton = claimForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    output.innerHTML = '<p class="muted">Submitting claim…</p>';
    try {
      await apiRequest("/api/lost-found/claims", {
        method: "POST",
        body: {
          ...Object.fromEntries(new FormData(claimForm).entries()),
          targetId: claimForm.dataset.claimItem
        }
      });
      output.innerHTML = '<div class="result-box">Claim submitted for review.</div>';
      claimForm.reset();
    } catch (error) {
      output.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not submit claim.")}</div>`;
      submitButton.disabled = false;
    }
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const output = form.querySelector("#lf-output");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await apiRequest("/api/lost-found", { method: "POST", body: payload });
      output.innerHTML = '<div class="result-box">Item reported!</div>';
      form.reset();
      formWrap.hidden = true;
      await load();
    } catch (err) {
      output.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };

  let searchTimer;
  searchInput.oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  };
  await load();
}
