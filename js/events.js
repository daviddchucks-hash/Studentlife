import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderEventsModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Discover campus events, workshops, seminars, and student activities.</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:1rem;">
      <input type="search" id="event-search" placeholder="Search events..." style="flex:1;">
      <button class="button button-primary button-small" type="button" id="event-post-btn">+ Post Event</button>
    </div>
    <div id="event-post-form-wrap" hidden style="margin-bottom:1.5rem;" class="formula-card">
      <h3>Submit Campus Event</h3>
      <form class="tool-form" id="event-form">
        <div class="form-row">
          <label class="field">Event Title<input name="title" required placeholder="AFIT Tech Summit 2026"></label>
          <label class="field">Category<select name="category"><option>Academic</option><option>Sports</option><option>Social</option><option>Workshop</option><option>Seminar</option></select></label>
        </div>
        <div class="form-row">
          <label class="field">Date<input name="date" type="date" required></label>
          <label class="field">Time<input name="time" placeholder="10:00 AM"></label>
        </div>
        <div class="form-row">
          <label class="field">Location / Venue<input name="location" required placeholder="Multipurpose Hall"></label>
          <label class="field">Organizer<input name="organizer" required placeholder="Student Union / CSC Dept"></label>
        </div>
        <label class="field">Description<textarea name="description" required rows="3" placeholder="Event details, agenda, registration..."></textarea></label>
        <button class="button button-primary" type="submit">Publish Event</button>
        <div class="tool-output" id="event-output"></div>
      </form>
    </div>
    <div id="events-list" class="card-grid"><p class="muted">Loading campus events…</p></div>
  `;

  const searchInput = container.querySelector("#event-search");
  const postBtn = container.querySelector("#event-post-btn");
  const formWrap = container.querySelector("#event-post-form-wrap");
  const form = container.querySelector("#event-form");
  const list = container.querySelector("#events-list");

  postBtn.onclick = () => { formWrap.hidden = !formWrap.hidden; };

  const load = async () => {
    try {
      const q = searchInput.value.trim();
      const query = q ? `?search=${encodeURIComponent(q)}` : "";
      const res = await apiRequest(`/api/events${query}`);
      const items = res.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-state">No campus events found.</p>';
        return;
      }
      list.innerHTML = items.map((item) => `
        <div class="module-card">
          <div class="module-card-head">
            <div>
              <h3 class="module-card-title">${escapeHtml(item.title)}</h3>
              <p class="module-card-meta">📅 ${escapeHtml(item.date)} ${item.time ? `at ${escapeHtml(item.time)}` : ""}</p>
            </div>
            <span class="pill-badge">${escapeHtml(item.category || "General")}</span>
          </div>
          <div class="module-card-body">
            <p>${escapeHtml(item.description)}</p>
            <p class="fine-print">📍 Location: <strong>${escapeHtml(item.location)}</strong></p>
            <p class="fine-print">👤 Organizer: ${escapeHtml(item.organizer)}</p>
          </div>
        </div>
      `).join("");
    } catch {
      list.innerHTML = '<p class="error-box">Could not load campus events.</p>';
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const output = form.querySelector("#event-output");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await apiRequest("/api/events", { method: "POST", body: payload });
      output.innerHTML = '<div class="result-box">Event published successfully!</div>';
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
