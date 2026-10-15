import { apiRequest } from "./api.js";
import { createSmartSaveTracker } from "./smart-save.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[char]);
}

let editingAncId = null;
let editingDirId = null;
let activeTrackers = new Map();

export async function renderAdminModule(container) {
  container.innerHTML = '<p class="muted">Checking administrator access…</p>';
  try {
    const me = await apiRequest("/api/me");
    if (!me.isAdmin) {
      container.innerHTML = `
        <div class="db-missing">
          <strong>Administrator Access Required</strong>
          <p>Your signed-in account (${escapeHtml(me.email)}) does not have administrative privileges.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="result-box" style="margin-bottom:1rem;">
        <strong>Admin Control Center (${escapeHtml(me.email)})</strong>
        <p>Server-enforced platform management for content, announcements, moderation, directory, and statistics.</p>
      </div>

      <div class="admin-tabs" id="admin-tabs">
        <button class="admin-tab-btn active" type="button" data-tab="stats">Statistics</button>
        <button class="admin-tab-btn" type="button" data-tab="announcements">Announcements</button>
        <button class="admin-tab-btn" type="button" data-tab="directory">Directory</button>
        <button class="admin-tab-btn" type="button" data-tab="feedback">Feedback & Complaints</button>
        <button class="admin-tab-btn" type="button" data-tab="reports">Reports & Moderation</button>
      </div>

      <div id="admin-tab-content"></div>
    `;

    const tabsNav = container.querySelector("#admin-tabs");
    const contentArea = container.querySelector("#admin-tab-content");

    const loadTab = async (tabName) => {
      activeTrackers.forEach((t) => t.destroy());
      activeTrackers.clear();

      tabsNav.querySelectorAll(".admin-tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
      });
      contentArea.innerHTML = '<p class="muted">Loading administrative records…</p>';

      if (tabName === "stats") {
        try {
          const res = await apiRequest("/api/admin/stats");
          const s = res.stats || {};
          contentArea.innerHTML = `
            <div class="card-grid">
              <div class="summary-stat"><span>Shared Formulas</span><strong>${s.formulas || 0}</strong></div>
              <div class="summary-stat"><span>Directory Items</span><strong>${s.directory || 0}</strong></div>
              <div class="summary-stat"><span>Active Events</span><strong>${s.events || 0}</strong></div>
              <div class="summary-stat"><span>Marketplace Listings</span><strong>${s.marketplace || 0}</strong></div>
              <div class="summary-stat"><span>Job Postings</span><strong>${s.jobs || 0}</strong></div>
              <div class="summary-stat"><span>Opportunities</span><strong>${s.opportunities || 0}</strong></div>
              <div class="summary-stat"><span>Lost & Found Items</span><strong>${s.lostFound || 0}</strong></div>
              <div class="summary-stat"><span>Announcements</span><strong>${s.announcements || 0}</strong></div>
              <div class="summary-stat"><span>Submitted Feedback</span><strong>${s.feedback || 0}</strong></div>
              <div class="summary-stat"><span>Pending Reports</span><strong>${s.reports || 0}</strong></div>
            </div>
          `;
        } catch {
          contentArea.innerHTML = '<p class="error-box">Could not load statistics.</p>';
        }
        return;
      }

      if (tabName === "announcements") {
        contentArea.innerHTML = `
          <form class="tool-form" id="admin-anc-form" style="margin-bottom:1.5rem;">
            <h3>Create Official Announcement</h3>
            <div class="form-row">
              <label class="field">Title<input name="title" required placeholder="Semester Registration Deadline Extension"></label>
              <label class="field">Category<select name="category"><option>General</option><option>Academic</option><option>Exams</option><option>Hostels</option></select></label>
            </div>
            <label class="field">Content<textarea name="content" required rows="3" placeholder="Announcement details..."></textarea></label>
            <button class="button button-primary" type="submit">Publish Announcement</button>
            <div id="admin-anc-out"></div>
          </form>
          <div id="admin-anc-list" class="record-list"></div>
        `;
        const form = contentArea.querySelector("#admin-anc-form");
        const list = contentArea.querySelector("#admin-anc-list");

        const loadAnc = async () => {
          activeTrackers.forEach((t) => t.destroy());
          activeTrackers.clear();

          const res = await apiRequest("/api/announcements");
          const items = res.items || [];

          if (!items.length) {
            list.innerHTML = '<p class="muted">No announcements.</p>';
            return;
          }

          list.innerHTML = items.map((i) => {
            if (editingAncId === i.id) {
              return `
                <div class="view-card" id="edit-anc-card-${i.id}" style="margin-bottom:12px;">
                  <h4 style="margin-top:0; margin-bottom:12px;">Edit Announcement</h4>
                  <form class="tool-form" id="edit-anc-form-${i.id}">
                    <div class="form-row">
                      <label class="field">Title<input name="title" required value="${escapeHtml(i.title)}"></label>
                      <label class="field">Category
                        <select name="category">
                          <option ${i.category === "General" ? "selected" : ""}>General</option>
                          <option ${i.category === "Academic" ? "selected" : ""}>Academic</option>
                          <option ${i.category === "Exams" ? "selected" : ""}>Exams</option>
                          <option ${i.category === "Hostels" ? "selected" : ""}>Hostels</option>
                        </select>
                      </label>
                    </div>
                    <label class="field">Content<textarea name="content" required rows="3">${escapeHtml(i.content)}</textarea></label>
                    <div id="edit-anc-msg-${i.id}"></div>
                    <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                      <button type="submit" class="button button-primary button-small save-button" id="save-anc-btn-${i.id}" disabled>Save Changes</button>
                      <button type="button" class="button button-quiet button-small" id="cancel-anc-btn-${i.id}">Cancel</button>
                    </div>
                  </form>
                </div>
              `;
            }

            return `
              <div class="record-item">
                <div><strong>${escapeHtml(i.title)} (${escapeHtml(i.category || "General")})</strong><small>${escapeHtml(i.date)} · ${escapeHtml(i.content)}</small></div>
                <div style="display:flex; gap:6px;">
                  <button class="record-update" type="button" data-edit-anc="${i.id}">Edit</button>
                  <button class="record-delete" type="button" data-del-anc="${i.id}">Delete</button>
                </div>
              </div>
            `;
          }).join("");

          if (editingAncId) {
            const item = items.find((x) => x.id === editingAncId);
            if (item) {
              const eForm = list.querySelector(`#edit-anc-form-${item.id}`);
              const saveBtn = list.querySelector(`#save-anc-btn-${item.id}`);
              const cancelBtn = list.querySelector(`#cancel-anc-btn-${item.id}`);
              const msg = list.querySelector(`#edit-anc-msg-${item.id}`);

              const baseline = { title: item.title, category: item.category || "General", content: item.content };
              const tracker = createSmartSaveTracker(eForm, saveBtn, { initialSnapshot: baseline });
              activeTrackers.set(item.id, tracker);

              cancelBtn.onclick = () => {
                if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
                editingAncId = null;
                loadAnc();
              };

              eForm.onsubmit = async (e) => {
                e.preventDefault();
                saveBtn.disabled = true;
                saveBtn.textContent = "Saving...";
                try {
                  await apiRequest(`/api/admin/announcements/${item.id}`, {
                    method: "PUT",
                    body: {
                      title: eForm.title.value.trim(),
                      category: eForm.category.value,
                      content: eForm.content.value.trim(),
                      author: item.author || me.email || "Admin"
                    }
                  });
                  editingAncId = null;
                  await loadAnc();
                } catch (err) {
                  saveBtn.disabled = false;
                  saveBtn.textContent = "Save Changes";
                  msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save announcement.")}</div>`;
                }
              };
            }
          }

          list.onclick = async (e) => {
            const editBtn = e.target.closest("[data-edit-anc]");
            const delBtn = e.target.closest("[data-del-anc]");

            if (editBtn) {
              editingAncId = editBtn.dataset.editAnc;
              loadAnc();
            } else if (delBtn && confirm("Delete this announcement?")) {
              await apiRequest(`/api/admin/announcements/${delBtn.dataset.delAnc}`, { method: "DELETE" });
              if (editingAncId === delBtn.dataset.delAnc) editingAncId = null;
              await loadAnc();
            }
          };
        };

        form.onsubmit = async (e) => {
          e.preventDefault();
          const out = form.querySelector("#admin-anc-out");
          try {
            const payload = Object.fromEntries(new FormData(form).entries());
            payload.author = me.email || "Admin";
            await apiRequest("/api/admin/announcements", { method: "POST", body: payload });
            out.innerHTML = '<div class="result-box">Announcement published!</div>';
            form.reset();
            await loadAnc();
          } catch (err) {
            out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
          }
        };
        await loadAnc();
        return;
      }

      if (tabName === "directory") {
        contentArea.innerHTML = `
          <form class="tool-form" id="admin-dir-form" style="margin-bottom:1.5rem;">
            <h3>Add Directory Item</h3>
            <div class="form-row">
              <label class="field">Title / Office<input name="title" required placeholder="Department of Cyber Security"></label>
              <label class="field">Category<select name="category"><option>department</option><option>faculty</option><option>office</option><option>service</option><option>location</option></select></label>
            </div>
            <div class="form-row">
              <label class="field">Location<input name="location" placeholder="Faculty of Computing, Ground Floor"></label>
              <label class="field">Contact Email<input name="contactEmail" placeholder="cybersec@afit.edu.ng"></label>
            </div>
            <label class="field">Description<textarea name="description" rows="2" placeholder="Overview of department or office..."></textarea></label>
            <button class="button button-primary" type="submit">Save Directory Item</button>
            <div id="admin-dir-out"></div>
          </form>
          <div id="admin-dir-list" class="record-list"></div>
        `;
        const form = contentArea.querySelector("#admin-dir-form");
        const list = contentArea.querySelector("#admin-dir-list");

        const loadDir = async () => {
          activeTrackers.forEach((t) => t.destroy());
          activeTrackers.clear();

          const res = await apiRequest("/api/directory");
          const items = res.items || [];

          if (!items.length) {
            list.innerHTML = '<p class="muted">No directory entries.</p>';
            return;
          }

          list.innerHTML = items.map((i) => {
            if (editingDirId === i.id) {
              return `
                <div class="view-card" id="edit-dir-card-${i.id}" style="margin-bottom:12px;">
                  <h4 style="margin-top:0; margin-bottom:12px;">Edit Directory Entry</h4>
                  <form class="tool-form" id="edit-dir-form-${i.id}">
                    <div class="form-row">
                      <label class="field">Title / Office<input name="title" required value="${escapeHtml(i.title)}"></label>
                      <label class="field">Category
                        <select name="category">
                          <option ${i.category === "department" ? "selected" : ""}>department</option>
                          <option ${i.category === "faculty" ? "selected" : ""}>faculty</option>
                          <option ${i.category === "office" ? "selected" : ""}>office</option>
                          <option ${i.category === "service" ? "selected" : ""}>service</option>
                          <option ${i.category === "location" ? "selected" : ""}>location</option>
                        </select>
                      </label>
                    </div>
                    <div class="form-row">
                      <label class="field">Location<input name="location" value="${escapeHtml(i.location || "")}"></label>
                      <label class="field">Contact Email<input name="contactEmail" value="${escapeHtml(i.contactEmail || "")}"></label>
                    </div>
                    <label class="field">Description<textarea name="description" rows="2">${escapeHtml(i.description || "")}</textarea></label>
                    <div id="edit-dir-msg-${i.id}"></div>
                    <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                      <button type="submit" class="button button-primary button-small save-button" id="save-dir-btn-${i.id}" disabled>Save Changes</button>
                      <button type="button" class="button button-quiet button-small" id="cancel-dir-btn-${i.id}">Cancel</button>
                    </div>
                  </form>
                </div>
              `;
            }

            return `
              <div class="record-item">
                <div><strong>${escapeHtml(i.title)} (${escapeHtml(i.category)})</strong><small>${escapeHtml(i.description || "")}</small></div>
                <div style="display:flex; gap:6px;">
                  <button class="record-update" type="button" data-edit-dir="${i.id}">Edit</button>
                  <button class="record-delete" type="button" data-del-dir="${i.id}">Delete</button>
                </div>
              </div>
            `;
          }).join("");

          if (editingDirId) {
            const item = items.find((x) => x.id === editingDirId);
            if (item) {
              const eForm = list.querySelector(`#edit-dir-form-${item.id}`);
              const saveBtn = list.querySelector(`#save-dir-btn-${item.id}`);
              const cancelBtn = list.querySelector(`#cancel-dir-btn-${item.id}`);
              const msg = list.querySelector(`#edit-dir-msg-${item.id}`);

              const baseline = {
                title: item.title,
                category: item.category,
                location: item.location || "",
                contactEmail: item.contactEmail || "",
                description: item.description || ""
              };

              const tracker = createSmartSaveTracker(eForm, saveBtn, { initialSnapshot: baseline });
              activeTrackers.set(item.id, tracker);

              cancelBtn.onclick = () => {
                if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
                editingDirId = null;
                loadDir();
              };

              eForm.onsubmit = async (e) => {
                e.preventDefault();
                saveBtn.disabled = true;
                saveBtn.textContent = "Saving...";
                try {
                  await apiRequest(`/api/admin/directory/${item.id}`, {
                    method: "PUT",
                    body: {
                      title: eForm.title.value.trim(),
                      category: eForm.category.value,
                      location: eForm.location.value.trim() || undefined,
                      contactEmail: eForm.contactEmail.value.trim() || undefined,
                      description: eForm.description.value.trim() || undefined
                    }
                  });
                  editingDirId = null;
                  await loadDir();
                } catch (err) {
                  saveBtn.disabled = false;
                  saveBtn.textContent = "Save Changes";
                  msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save directory item.")}</div>`;
                }
              };
            }
          }

          list.onclick = async (e) => {
            const editBtn = e.target.closest("[data-edit-dir]");
            const delBtn = e.target.closest("[data-del-dir]");

            if (editBtn) {
              editingDirId = editBtn.dataset.editDir;
              loadDir();
            } else if (delBtn && confirm("Delete directory item?")) {
              await apiRequest(`/api/admin/directory/${delBtn.dataset.delDir}`, { method: "DELETE" });
              if (editingDirId === delBtn.dataset.delDir) editingDirId = null;
              await loadDir();
            }
          };
        };

        form.onsubmit = async (e) => {
          e.preventDefault();
          const out = form.querySelector("#admin-dir-out");
          try {
            const payload = Object.fromEntries(new FormData(form).entries());
            await apiRequest("/api/admin/directory", { method: "POST", body: payload });
            out.innerHTML = '<div class="result-box">Directory item saved!</div>';
            form.reset();
            await loadDir();
          } catch (err) {
            out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
          }
        };
        await loadDir();
        return;
      }

      if (tabName === "feedback") {
        try {
          const res = await apiRequest("/api/admin/feedback");
          const items = res.items || [];
          contentArea.innerHTML = items.length ? items.map((f) => `
            <div class="formula-card">
              <div class="formula-head">
                <div>
                  <p class="formula-meta">${escapeHtml(f.type.toUpperCase())} · From: ${escapeHtml(f.userEmail || f.submittedByUid)}</p>
                  <h3>${escapeHtml(f.subject)}</h3>
                </div>
                <span class="pill-badge">${escapeHtml(f.status || 'new')}</span>
              </div>
              <p class="formula-desc">${escapeHtml(f.message)}</p>
            </div>
          `).join("") : '<p class="empty-state">No feedback submissions.</p>';
        } catch {
          contentArea.innerHTML = '<p class="error-box">Could not load feedback.</p>';
        }
        return;
      }

      if (tabName === "reports") {
        try {
          const res = await apiRequest("/api/admin/reports");
          const items = res.items || [];
          contentArea.innerHTML = items.length ? items.map((r) => `
            <div class="record-item">
              <div>
                <strong>Report against ${escapeHtml(r.targetType)} (ID: ${escapeHtml(r.targetId)})</strong>
                <small>Reason: ${escapeHtml(r.reason)} · Reported by: ${escapeHtml(r.userEmail || r.reportedByUid)}</small>
              </div>
              <button class="record-delete" type="button" data-del-rep="${r.id}">Dismiss</button>
            </div>
          `).join("") : '<p class="empty-state">No moderation reports pending.</p>';

          contentArea.onclick = async (e) => {
            const delBtn = e.target.closest("[data-del-rep]");
            if (delBtn) {
              await apiRequest(`/api/admin/reports/${delBtn.dataset.delRep}`, { method: "DELETE" });
              await loadTab("reports");
            }
          };
        } catch {
          contentArea.innerHTML = '<p class="error-box">Could not load reports.</p>';
        }
        return;
      }
    };

    tabsNav.onclick = (e) => {
      const btn = e.target.closest(".admin-tab-btn");
      if (btn) loadTab(btn.dataset.tab);
    };

    await loadTab("stats");
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Failed to load admin module.")}</div>`;
  }
}
