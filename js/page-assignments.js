import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

let assignmentsList = [];
let activeFilter = "all";
let editingId = null;

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
    const deads = (deadRes.items || []).map((x) => ({ ...x, recType: "deadlines", status: "Academic Deadline" }));

    assignmentsList = [...asgns, ...deads];
    renderAssignments();
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function renderAssignments() {
  const container = document.querySelector("#assignments-list-container");

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
        const days = daysFromToday(item.dueDate);
        const isOverdue = days !== null && days < 0 && item.status !== "Complete";
        const isDueSoon = days !== null && days >= 0 && days <= 3 && item.status !== "Complete";

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
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("courses");

  const form = document.querySelector("#assignment-form");
  const formMsg = document.querySelector("#assignment-form-msg");

  form.onsubmit = async (e) => {
    e.preventDefault();
    formMsg.innerHTML = '<p class="muted">Saving assignment…</p>';

    const payload = {
      title: form.title.value.trim(),
      course: form.course.value.trim() || undefined,
      dueDate: form.dueDate.value,
      status: form.status.value,
      notes: form.notes.value.trim() || undefined
    };

    try {
      if (editingId) {
        await apiRequest(`/api/records/assignments/${editingId}`, { method: "PUT", body: payload });
        formMsg.innerHTML = '<div class="result-box">Assignment updated!</div>';
        editingId = null;
        form.querySelector("button[type='submit']").textContent = "Save Assignment";
      } else {
        await apiRequest("/api/records/assignments", { method: "POST", body: payload });
        formMsg.innerHTML = '<div class="result-box">Assignment saved!</div>';
      }
      form.reset();
      await loadAssignments();
    } catch (err) {
      formMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelector("#assignment-filter-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll("#assignment-filter-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderAssignments();
  };

  document.querySelector("#assignments-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      const id = editBtn.dataset.editId;
      const recType = editBtn.dataset.recType;
      const item = assignmentsList.find((x) => x.id === id && x.recType === recType);
      if (item && recType === "assignments") {
        editingId = id;
        form.title.value = item.title;
        form.course.value = item.course || "";
        form.dueDate.value = item.dueDate;
        form.status.value = item.status;
        form.notes.value = item.notes || "";
        form.querySelector("button[type='submit']").textContent = "Update Assignment";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      const recType = delBtn.dataset.recType;
      if (confirm("Are you sure you want to delete this assignment/deadline?")) {
        try {
          await apiRequest(`/api/records/${recType}/${id}`, { method: "DELETE" });
          await loadAssignments();
        } catch (err) {
          alert(err.message || "Could not delete assignment.");
        }
      }
    }
  };

  void loadAssignments();
});
