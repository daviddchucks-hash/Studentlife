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
        <button class="admin-tab-btn" type="button" data-tab="verification">Student Verification</button>
        <button class="admin-tab-btn" type="button" data-tab="feedback">Feedback & Complaints</button>
        <button class="admin-tab-btn" type="button" data-tab="reports">Reports & Moderation</button>
        <button class="admin-tab-btn" type="button" data-tab="lost-found">Lost & Found</button>
        <button class="admin-tab-btn" type="button" data-tab="coursemate">CourseMate Moderation</button>
        <button class="admin-tab-btn" type="button" data-tab="notesync">NoteSync & Withdrawals</button>
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

      if (tabName === "verification") {
        try {
          const res = await apiRequest("/api/admin/matric-verification");
          const items = res.items || [];
          contentArea.innerHTML = items.length ? `
            <div class="record-list">
              ${items.map((student) => `
                <div class="record-item">
                  <div>
                    <strong>${escapeHtml(student.name || "Student")}</strong>
                    <small>${escapeHtml(student.department || "Department not set")} · ${escapeHtml(student.level || "Level not set")} · ${escapeHtml(student.matricNumber || "No matric number")}</small>
                  </div>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <span class="pill-badge">${student.matricVerified ? "Verified" : "Unverified"}</span>
                    <button class="record-update" type="button" data-verify-uid="${escapeHtml(student.uid)}" data-verify-state="${student.matricVerified ? "false" : "true"}">${student.matricVerified ? "Unverify" : "Verify"}</button>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : '<p class="empty-state">No students have registered a matriculation number yet.</p>';

          contentArea.onclick = async (e) => {
            const button = e.target.closest("[data-verify-uid]");
            if (!button) return;
            const uid = button.dataset.verifyUid;
            const verified = button.dataset.verifyState === "true";
            await apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/matric-verification`, {
              method: "PUT",
              body: { verified }
            });
            await loadTab("verification");
          };
        } catch (err) {
          contentArea.innerHTML = `<p class="error-box">${escapeHtml(err.message || "Could not load student verification records.")}</p>`;
        }
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

      if (tabName === "lost-found") {
        try {
          const [listingResult, claimResult] = await Promise.all([
            apiRequest("/api/admin/lost-found"),
            apiRequest("/api/admin/lost-found/claims")
          ]);
          contentArea.innerHTML = `
            <h3>Lost-and-found listings</h3>
            ${(listingResult.items || []).length ? (listingResult.items || []).map((item) => `
              <form class="formula-card" data-lost-found-review="${escapeHtml(item.id)}">
                <strong>${escapeHtml(item.type || "item")} · ${escapeHtml(item.title || "Untitled item")}</strong>
                <p>${escapeHtml(item.location || "")} · ${escapeHtml(item.reporterEmail || item.reporterUid || "")} · ${escapeHtml(item.status || "")}</p>
                <details><summary>View private report details</summary>
                  <p>${escapeHtml(item.description || "")}</p>
                  <p>${escapeHtml(item.identifyingCharacteristics || "")}</p>
                  <p>${escapeHtml(item.contactInfo || "")}</p>
                </details>
                <label class="field">Status<select name="status">
                  ${["pending_review", "published", "match_found", "claim_pending", "returned", "recovered", "closed", "rejected", "resolved"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select></label>
                <label class="field">Review notes<textarea name="reviewNotes" maxlength="2000" rows="2">${escapeHtml(item.reviewNotes || "")}</textarea></label>
                <div data-review-message></div><button class="button button-primary button-small" type="submit">Save listing review</button>
              </form>
            `).join("") : '<p class="empty-state">No lost-and-found listings.</p>'}
            <h3>Claims (private identifying details)</h3>
            ${(claimResult.items || []).length ? (claimResult.items || []).map((claim) => `
              <form class="formula-card" data-lost-claim-review="${escapeHtml(claim.id)}">
                <strong>${escapeHtml(claim.itemTitle || "Item")} · ${escapeHtml(claim.claimantName || "Claimant")}</strong>
                <p>${escapeHtml(claim.claimantEmail || claim.claimantUid || "")} · ${escapeHtml(claim.status || "pending")}</p>
                <p>${escapeHtml(claim.reason || "")}</p>
                <details><summary>View private ownership details</summary><p>${escapeHtml(claim.identifyingDetails || "")}</p></details>
                <label class="field">Status<select name="status">
                  ${["pending", "under_review", "approved", "rejected", "completed"].map((status) => `<option ${claim.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select></label>
                <label class="field">Review notes<textarea name="reviewNotes" maxlength="2000" rows="2">${escapeHtml(claim.reviewNotes || "")}</textarea></label>
                <div data-review-message></div><button class="button button-primary button-small" type="submit">Save claim review</button>
              </form>
            `).join("") : '<p class="empty-state">No claims have been submitted.</p>'}
          `;
          contentArea.onsubmit = async (event) => {
            const form = event.target;
            const listingId = form.dataset.lostFoundReview;
            const claimId = form.dataset.lostClaimReview;
            if (!listingId && !claimId) return;
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            const message = form.querySelector("[data-review-message]");
            button.disabled = true;
            try {
              const values = Object.fromEntries(new FormData(form).entries());
              if (listingId) {
                await apiRequest(`/api/admin/lost-found/${encodeURIComponent(listingId)}`, { method: "PUT", body: values });
              } else {
                await apiRequest(`/api/lost-found/claims/${encodeURIComponent(claimId)}`, { method: "PUT", body: values });
              }
              await loadTab("lost-found");
            } catch (error) {
              message.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not save this review.")}</div>`;
              button.disabled = false;
            }
          };
        } catch (error) {
          contentArea.innerHTML = `<p class="error-box">${escapeHtml(error.message || "Could not load lost-and-found moderation.")}</p>`;
        }
        return;
      }

      if (tabName === "coursemate") {
        try {
          const res = await apiRequest("/api/admin/coursemate/reports");
          const items = res.items || [];
          contentArea.innerHTML = items.length ? items.map((report) => `
            <article class="record-item">
              <div>
                <strong>${escapeHtml(report.targetType)} report${report.target?.title ? ` · ${escapeHtml(report.target.title)}` : ""}</strong>
                <small>${escapeHtml(report.target?.authorName || "Student")} · ${new Date(report.createdAt).toLocaleString()}</small>
                <p>${escapeHtml(report.reason)}</p>
                ${report.target?.content ? `<p class="muted">${escapeHtml(report.target.content)}</p>` : ""}
              </div>
              <div class="inline-actions">
                <button class="button button-quiet button-small" type="button" data-coursemate-report="${escapeHtml(report.id)}" data-action="dismiss">Dismiss</button>
                <button class="record-delete" type="button" data-coursemate-report="${escapeHtml(report.id)}" data-action="remove-content">Remove content</button>
              </div>
            </article>
          `).join("") : '<p class="empty-state">No CourseMate reports pending review.</p>';
          contentArea.onclick = async (event) => {
            const button = event.target.closest("[data-coursemate-report]");
            if (!button) return;
            if (button.dataset.action === "remove-content" && !confirm("Remove this reported content from CourseMate?")) return;
            try {
              await apiRequest(`/api/admin/coursemate/reports/${button.dataset.coursemateReport}`, {
                method: "PUT",
                body: { action: button.dataset.action }
              });
              await loadTab("coursemate");
            } catch (error) {
              contentArea.insertAdjacentHTML("afterbegin", `<div class="error-box">${escapeHtml(error.message || "Could not process this report.")}</div>`);
            }
          };
        } catch (error) {
          contentArea.innerHTML = `<p class="error-box">${escapeHtml(error.message || "Could not load CourseMate reports.")}</p>`;
        }
        return;
      }

      if (tabName === "notesync") {
        try {
          const [overview, submissions, applications, withdrawals] = await Promise.all([
            apiRequest("/api/admin/notesync/overview"),
            apiRequest("/api/admin/notesync/submissions"),
            apiRequest("/api/admin/notesync/applications"),
            apiRequest("/api/admin/notesync/withdrawals")
          ]);
          contentArea.innerHTML = `
            <div class="result-box"><strong>NoteSync administration</strong><p>Mark a withdrawal as paid only after sending payment outside this application. No payment provider is connected.</p></div>
            <div class="card-grid">
              <div class="summary-stat"><span>Pending notes</span><strong>${Number(overview.stats?.pendingSubmissions || 0)}</strong></div>
              <div class="summary-stat"><span>Approved notes</span><strong>${Number(overview.stats?.approvedNotes || 0)}</strong></div>
              <div class="summary-stat"><span>Pending withdrawals</span><strong>${Number(overview.stats?.pendingWithdrawalRequests || 0)}</strong></div>
              <div class="summary-stat"><span>Applications</span><strong>${Number(overview.stats?.activeApplications || 0)}</strong></div>
            </div>
            <h3>Note submissions</h3>
            ${(submissions.items || []).length ? (submissions.items || []).map((item) => `
              <form class="formula-card" data-note-review="${escapeHtml(item.id)}">
                <strong>${escapeHtml(item.courseCode)} — ${escapeHtml(item.lectureTopic)}</strong>
                <p>${escapeHtml(item.studentName)} · ${escapeHtml(item.department)} · ${escapeHtml(item.status)}</p>
                <label class="field">Review status<select name="status">
                    <option value="" selected disabled>Choose a status</option>
                    ${["Under Review", "Approved", "Rejected", "Requires Correction"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                  </select></label>
                <label class="field">Quality<select name="qualityCategory">
                  ${["Basic acceptable notes", "Good notes", "Very good notes", "Excellent notes"].map((quality) => `<option ${item.qualityCategory === quality ? "selected" : ""}>${quality}</option>`).join("")}
                </select></label>
                <label class="field">Review notes<textarea name="reviewNotes" maxlength="2000" rows="2">${escapeHtml(item.reviewNotes || "")}</textarea></label>
                <label class="field">Rejection reason<input name="rejectionReason" maxlength="500" value="${escapeHtml(item.rejectionReason || "")}"></label>
                <div data-review-message></div><button class="button button-primary button-small" type="submit">Save review</button>
              </form>
            `).join("") : '<p class="empty-state">No note submissions.</p>'}
            <h3>Level applications</h3>
            ${(applications.items || []).length ? (applications.items || []).map((item) => `
              <form class="formula-card" data-application-review="${escapeHtml(item.id)}">
                <strong>${escapeHtml(item.fullName)} · ${escapeHtml(item.department)} · ${escapeHtml(item.currentLevel)} level</strong>
                <p>${escapeHtml(item.email)} · ${escapeHtml(item.status)}</p>
                <label class="field">Status<select name="status">
                  <option value="" selected disabled>Choose a status</option>
                  ${["Submitted", "Under Review", "Approved", "Rejected"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select></label>
                <label class="field">Administrator notes<textarea name="adminNotes" maxlength="2000" rows="2">${escapeHtml(item.adminNotes || "")}</textarea></label>
                <div data-review-message></div><button class="button button-primary button-small" type="submit">Save application review</button>
              </form>
            `).join("") : '<p class="empty-state">No level applications.</p>'}
            <h3>Withdrawal requests</h3>
            ${(withdrawals.items || []).length ? (withdrawals.items || []).map((item) => `
              <form class="formula-card" data-withdrawal-review="${escapeHtml(item.id)}">
                <strong>${Number(item.coins || 0)} AFT Coins · ₦${Number(item.nairaAmount || 0).toLocaleString()}</strong>
                <p>${escapeHtml(item.studentUid)} · ${escapeHtml(item.status)}</p>
                <details><summary>View private bank details</summary><p>${escapeHtml(item.bankInfo || "No bank details recorded.")}</p></details>
                <label class="field">Action<select name="status">
                  <option value="" selected disabled>Choose an action</option>
                  ${["Processing", "Paid", "Rejected"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select></label>
                <label class="field">Payment reference<input name="paymentReference" maxlength="200" value="${escapeHtml(item.paymentReference || "")}"></label>
                <label class="field">Rejection reason<input name="rejectionReason" maxlength="500" value="${escapeHtml(item.rejectionReason || "")}"></label>
                <div data-review-message></div><button class="button button-primary button-small" type="submit">Save withdrawal status</button>
              </form>
            `).join("") : '<p class="empty-state">No withdrawal requests.</p>'}
          `;
          contentArea.onsubmit = async (event) => {
            const form = event.target;
            const noteId = form.dataset.noteReview;
            const applicationId = form.dataset.applicationReview;
            const withdrawalId = form.dataset.withdrawalReview;
            if (!noteId && !applicationId && !withdrawalId) return;
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            const message = form.querySelector("[data-review-message]");
            button.disabled = true;
            try {
              const values = Object.fromEntries(new FormData(form).entries());
              if (noteId) await apiRequest(`/api/admin/notesync/submissions/${encodeURIComponent(noteId)}`, { method: "PUT", body: values });
              if (applicationId) await apiRequest(`/api/admin/notesync/applications/${encodeURIComponent(applicationId)}`, { method: "PUT", body: values });
              if (withdrawalId) await apiRequest(`/api/admin/notesync/withdrawals/${encodeURIComponent(withdrawalId)}`, { method: "PUT", body: values });
              await loadTab("notesync");
            } catch (error) {
              message.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not save this review.")}</div>`;
              button.disabled = false;
            }
          };
        } catch (error) {
          contentArea.innerHTML = `<p class="error-box">${escapeHtml(error.message || "Could not load NoteSync administration.")}</p>`;
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
