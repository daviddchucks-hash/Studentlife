import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { createSmartSaveTracker } from "./smart-save.js";

let assignmentsList = [];
let activeFilter = "all";
let editingAssignmentId = null;
let activeTrackers = new Map();

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
}

function daysFromToday(dateValue) {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = new Date().toISOString().slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86_400_000);
}

async function loadAssignments() {
  const container = document.querySelector("#assignments-list-container");
  container.innerHTML = '<p class="muted">Loading assignments and deadlines…</p>';
  try {
    const [asgnRes, deadRes] = await Promise.all([
      apiRequest("/api/records/assignments"),
      apiRequest("/api/records/deadlines")
    ]);

    const asgns = (asgnRes.items || []).map((x) => ({ ...x, recType: "assignments" }));
    const deads = (deadRes.items || []).map((x) => ({ ...x, recType: "deadlines", status: x.status || "Academic Deadline" }));

    assignmentsList = [...asgns, ...deads];
    renderAssignments();
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function renderEditForm(item) {
  return `
    <div class="view-card" id="edit-asgn-card-${item.id}" style="margin-bottom:12px;">
      <h4 style="margin-top:0; margin-bottom:12px;">Edit ${item.recType === "deadlines" ? "Academic Deadline" : "Assignment"}</h4>
      <form class="tool-form" id="edit-asgn-form-${item.id}">
        <div class="form-row">
          <label class="field">Title<input name="title" required value="${escapeHtml(item.title)}"></label>
          <label class="field">Course Code (optional)<input name="course" value="${escapeHtml(item.course || "")}"></label>
        </div>
        <div class="form-row">
          <label class="field">Due Date<input type="date" name="dueDate" required value="${escapeHtml(item.dueDate)}"></label>
          <label class="field">Status
            <select name="status">
              <option value="To do" ${item.status === "To do" ? "selected" : ""}>To do</option>
              <option value="In progress" ${item.status === "In progress" ? "selected" : ""}>In progress</option>
              <option value="Complete" ${item.status === "Complete" ? "selected" : ""}>Complete</option>
              ${item.recType === "deadlines" ? `<option value="Academic Deadline" ${item.status === "Academic Deadline" ? "selected" : ""}>Academic Deadline</option>` : ""}
            </select>
          </label>
        </div>
        <label class="field">Notes (optional)<textarea name="notes" rows="2">${escapeHtml(item.notes || "")}</textarea></label>
        <div id="edit-asgn-msg-${item.id}"></div>
        <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
          <button type="submit" class="button button-primary button-small save-button" id="save-asgn-btn-${item.id}" disabled>Save Changes</button>
          <button type="button" class="button button-quiet button-small" id="cancel-asgn-btn-${item.id}">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function attachSmartSaveToEditForm(item) {
  const container = document.querySelector("#assignments-list-container");
  const form = container.querySelector(`#edit-asgn-form-${item.id}`);
  if (!form) return;

  const saveBtn = container.querySelector(`#save-asgn-btn-${item.id}`);
  const cancelBtn = container.querySelector(`#cancel-asgn-btn-${item.id}`);
  const msg = container.querySelector(`#edit-asgn-msg-${item.id}`);

  const baseline = {
    title: item.title,
    course: item.course || "",
    dueDate: item.dueDate,
    status: item.status,
    notes: item.notes || ""
  };

  const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
  activeTrackers.set(item.id, tracker);

  cancelBtn.onclick = () => {
    if (tracker.hasChanged()) {
      if (!confirm("You have unsaved changes. Discard changes?")) return;
    }
    editingAssignmentId = null;
    renderAssignments();
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    msg.innerHTML = "";

    const payload = {
      title: form.title.value.trim(),
      course: form.course.value.trim() || undefined,
      dueDate: form.dueDate.value,
      status: form.status.value,
      notes: form.notes.value.trim() || undefined
    };

    try {
      await apiRequest(`/api/records/${item.recType}/${item.id}`, { method: "PUT", body: payload });
      editingAssignmentId = null;
      await loadAssignments();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
      msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes. Please try again.")}</div>`;
    }
  };
}

function renderAssignments() {
  const container = document.querySelector("#assignments-list-container");

  activeTrackers.forEach((tracker) => tracker.destroy());
  activeTrackers.clear();

  let filtered = assignmentsList;
  if (activeFilter === "todo") filtered = assignmentsList.filter((x) => x.status === "To do");
  else if (activeFilter === "in-progress") filtered = assignmentsList.filter((x) => x.status === "In progress");
  else if (activeFilter === "complete") filtered = assignmentsList.filter((x) => x.status === "Complete");

  if (!filtered.length) {
    container.innerHTML = '<p class="empty-state">No matching assignments or deadlines found.</p>';
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${filtered.map((item) => {
        if (editingAssignmentId === item.id) {
          return renderEditForm(item);
        }

        const days = daysFromToday(item.dueDate);
        const isOverdue = days !== null && days < 0 && item.status !== "Complete";

        return `
          <div class="record-item" style="${isOverdue ? "border-left:4px solid var(--danger); background:#fff5f5;" : ""}">
            <div>
              <strong>${escapeHtml(item.title)} ${item.course ? `(${escapeHtml(item.course)})` : ""}</strong>
              <small>
                Due: <strong>${escapeHtml(item.dueDate)}</strong>
                ${days !== null ? ` (${days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due Today" : `in ${days} days`})` : ""}
                | Status: <span class="pill-badge ${item.status === "Complete" ? "active" : ""}">${escapeHtml(item.status)}</span>
              </small>
              ${item.notes ? `<small style="color:var(--ink); margin-top:4px;">${escapeHtml(item.notes)}</small>` : ""}
            </div>
            <div style="display:flex; gap:6px;">
              <button class="record-update" data-edit-id="${item.id}" data-rec-type="${item.recType}">Edit</button>
              <button class="record-delete" data-delete-id="${item.id}" data-rec-type="${item.recType}">Delete</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  if (editingAssignmentId) {
    const item = assignmentsList.find((x) => x.id === editingAssignmentId);
    if (item) attachSmartSaveToEditForm(item);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("courses");

  const addForm = document.querySelector("#assignment-form");
  const addMsg = document.querySelector("#assignment-form-msg");

  if (addForm) {
    addForm.onsubmit = async (e) => {
      e.preventDefault();
      addMsg.innerHTML = '<p class="muted">Saving assignment…</p>';

      const payload = {
        title: addForm.title.value.trim(),
        course: addForm.course.value.trim() || undefined,
        dueDate: addForm.dueDate.value,
        status: addForm.status.value,
        notes: addForm.notes.value.trim() || undefined
      };

      try {
        await apiRequest("/api/records/assignments", { method: "POST", body: payload });
        addMsg.innerHTML = '<div class="result-box">Assignment saved!</div>';
        addForm.reset();
        await loadAssignments();
      } catch (err) {
        addMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  }

  const tabs = document.querySelector("#assignment-filter-tabs");
  if (tabs) {
    tabs.onclick = (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      document.querySelectorAll("#assignment-filter-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter;
      renderAssignments();
    };
  }

  document.querySelector("#assignments-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      editingAssignmentId = editBtn.dataset.editId;
      renderAssignments();
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      const recType = delBtn.dataset.recType;
      if (confirm("Are you sure you want to delete this assignment/deadline?")) {
        try {
          await apiRequest(`/api/records/${recType}/${id}`, { method: "DELETE" });
          if (editingAssignmentId === id) editingAssignmentId = null;
          await loadAssignments();
        } catch (err) {
          alert(err.message || "Could not delete assignment.");
        }
      }
    }
  };

  void loadAssignments();
});
