import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderJobsModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Student Jobs, Freelance Opportunities, Gigs & Internships.</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:1rem;">
      <input type="search" id="job-search" placeholder="Search opportunities or skills..." style="flex:1;">
      <button class="button button-primary button-small" type="button" id="job-post-btn">+ Post Opportunity</button>
    </div>
    <div id="job-post-form-wrap" hidden style="margin-bottom:1.5rem;" class="formula-card">
      <h3>Post Student Job or Gig</h3>
      <form class="tool-form" id="job-form">
        <div class="form-row">
          <label class="field">Title / Role<input name="title" required placeholder="Graphic Designer for Campus Event"></label>
          <label class="field">Type<select name="type"><option value="gig">Gig / Task</option><option value="freelance">Freelance</option><option value="campus-job">Campus Job</option><option value="internship">Internship</option></select></label>
        </div>
        <div class="form-row">
          <label class="field">Stipend / Pay<input name="stipend" placeholder="₦10,000 / task"></label>
          <label class="field">Contact Email / Phone<input name="contactInfo" required placeholder="contact@company.com"></label>
        </div>
        <label class="field">Deadline (optional)<input name="deadline" type="date"></label>
        <label class="field">Description & Requirements<textarea name="description" required rows="3" placeholder="Task scope, required skills, timeline..."></textarea></label>
        <button class="button button-primary" type="submit">Post Role</button>
        <div class="tool-output" id="job-output"></div>
      </form>
    </div>
    <div id="jobs-list" class="card-grid"><p class="muted">Loading opportunities…</p></div>
  `;

  const searchInput = container.querySelector("#job-search");
  const postBtn = container.querySelector("#job-post-btn");
  const formWrap = container.querySelector("#job-post-form-wrap");
  const form = container.querySelector("#job-form");
  const list = container.querySelector("#jobs-list");

  postBtn.onclick = () => { formWrap.hidden = !formWrap.hidden; };

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/jobs${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No student job postings found.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="module-card">
          <div class="module-card-head">
            <div>
              <h3 class="module-card-title">${escapeHtml(item.title)}</h3>
              <p class="module-card-meta">Type: ${escapeHtml(item.type)} ${item.stipend ? `· Pay: ${escapeHtml(item.stipend)}` : ""}</p>
            </div>
            <span class="pill-badge">${escapeHtml(item.type)}</span>
          </div>
          <div class="module-card-body">
            <p>${escapeHtml(item.description)}</p>
            ${item.deadline ? `<p class="fine-print">⏳ Deadline: ${escapeHtml(item.deadline)}</p>` : ""}
            <p class="fine-print">✉ Contact: <strong>${escapeHtml(item.contactInfo)}</strong></p>
          </div>
        </div>
      `).join("");
    } catch {
      list.innerHTML = '<p class="error-box">Could not load job postings.</p>';
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const output = form.querySelector("#job-output");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await apiRequest("/api/jobs", { method: "POST", body: payload });
      output.innerHTML = '<div class="result-box">Opportunity posted successfully!</div>';
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
