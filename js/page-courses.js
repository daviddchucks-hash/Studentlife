import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

let coursesList = [];
let editingId = null;

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

async function loadCourses() {
  const container = document.querySelector("#courses-list-container");
  container.innerHTML = '<p class="muted">Loading courses…</p>';
  try {
    const [personalRes, regRes] = await Promise.all([
      apiRequest("/api/records/courses"),
      apiRequest("/api/records/registration")
    ]);
    const personal = (personalRes.items || []).map((x) => ({ ...x, recType: "courses" }));
    const registration = (regRes.items || []).map((x) => ({ ...x, recType: "registration" }));
    coursesList = [...personal, ...regRes ? registration : []];
    renderCourses();
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function renderCourses() {
  const container = document.querySelector("#courses-list-container");
  const totalBadge = document.querySelector("#total-units-badge");

  const totalUnits = coursesList.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
  totalBadge.textContent = `Total Credit Units: ${totalUnits}`;

  if (!coursesList.length) {
    container.innerHTML = `<p class="empty-state">No registered courses saved yet. Add your first course above!</p>`;
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${coursesList.map((item) => `
        <div class="record-item">
          <div>
            <strong>${escapeHtml(item.code)} — ${escapeHtml(item.name)}</strong>
            <small>Units: ${escapeHtml(item.units)} | Category: ${item.recType === "registration" ? "Semester Registration Draft" : "Personal Course List"}</small>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="record-update" data-edit-id="${item.id}" data-rec-type="${item.recType}">Edit</button>
            <button class="record-delete" data-delete-id="${item.id}" data-rec-type="${item.recType}">Delete</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("courses");

  const form = document.querySelector("#course-form");
  const formMsg = document.querySelector("#course-form-msg");

  form.onsubmit = async (e) => {
    e.preventDefault();
    formMsg.innerHTML = '<p class="muted">Saving course…</p>';
    const recType = form.type.value === "registration" ? "registration" : "courses";
    const payload = {
      code: form.code.value.trim().toUpperCase(),
      name: form.name.value.trim(),
      units: Number(form.units.value)
    };

    try {
      if (editingId) {
        await apiRequest(`/api/records/${recType}/${editingId}`, { method: "PUT", body: payload });
        formMsg.innerHTML = '<div class="result-box">Course updated successfully!</div>';
        editingId = null;
        form.querySelector("button[type='submit']").textContent = "Save Course";
      } else {
        await apiRequest(`/api/records/${recType}`, { method: "POST", body: payload });
        formMsg.innerHTML = '<div class="result-box">Course added successfully!</div>';
      }
      form.reset();
      await loadCourses();
    } catch (err) {
      formMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelector("#courses-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      const id = editBtn.dataset.editId;
      const recType = editBtn.dataset.recType;
      const item = coursesList.find((x) => x.id === id && x.recType === recType);
      if (item) {
        editingId = id;
        form.code.value = item.code;
        form.name.value = item.name;
        form.units.value = item.units;
        form.type.value = recType;
        form.querySelector("button[type='submit']").textContent = "Update Course";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      const recType = delBtn.dataset.recType;
      if (confirm("Are you sure you want to delete this course?")) {
        try {
          await apiRequest(`/api/records/${recType}/${id}`, { method: "DELETE" });
          await loadCourses();
        } catch (err) {
          alert(err.message || "Could not delete course.");
        }
      }
    }
  };

  void loadCourses();
});
