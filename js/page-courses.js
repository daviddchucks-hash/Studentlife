import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { createSmartSaveTracker } from "./smart-save.js";

let coursesList = [];
let editingCourseId = null;
let activeTrackers = new Map();

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
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

  // Destroy previous trackers
  activeTrackers.forEach((tracker) => tracker.destroy());
  activeTrackers.clear();

  const totalUnits = coursesList.reduce((sum, item) => sum + (Number(item.units) || 0), 0);
  totalBadge.textContent = `Total Credit Units: ${totalUnits}`;

  if (!coursesList.length) {
    container.innerHTML = `<p class="empty-state">No registered courses saved yet. Add your first course above!</p>`;
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${coursesList.map((item) => {
        const isEditing = editingCourseId === item.id;
        if (isEditing) {
          return `
            <div class="view-card" id="edit-course-card-${item.id}" style="margin-bottom:12px;">
              <h4 style="margin-top:0; margin-bottom:12px;">Edit Course</h4>
              <form class="tool-form" id="edit-course-form-${item.id}">
                <div class="form-row">
                  <label class="field">Course Code<input name="code" required value="${escapeHtml(item.code)}"></label>
                  <label class="field">Course Title<input name="name" required value="${escapeHtml(item.name)}"></label>
                </div>
                <div class="form-row">
                  <label class="field">Credit Units<input type="number" step="0.5" min="0.5" max="60" name="units" required value="${escapeHtml(item.units)}"></label>
                  <label class="field">Category
                    <select name="type">
                      <option value="personal" ${item.recType === "courses" ? "selected" : ""}>Personal Course List</option>
                      <option value="registration" ${item.recType === "registration" ? "selected" : ""}>Semester Registration Draft</option>
                    </select>
                  </label>
                </div>
                <div id="edit-course-msg-${item.id}"></div>
                <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                  <button type="submit" class="button button-primary button-small save-button" id="save-course-btn-${item.id}" disabled>Save Changes</button>
                  <button type="button" class="button button-quiet button-small" id="cancel-course-btn-${item.id}">Cancel</button>
                </div>
              </form>
            </div>
          `;
        }

        return `
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
        `;
      }).join("")}
    </div>
  `;

  // Attach smart save tracker if an item is being edited
  if (editingCourseId) {
    const item = coursesList.find((x) => x.id === editingCourseId);
    if (item) {
      const form = container.querySelector(`#edit-course-form-${item.id}`);
      const saveBtn = container.querySelector(`#save-course-btn-${item.id}`);
      const cancelBtn = container.querySelector(`#cancel-course-btn-${item.id}`);
      const msg = container.querySelector(`#edit-course-msg-${item.id}`);

      const baseline = {
        code: item.code,
        name: item.name,
        units: String(item.units),
        type: item.recType === "registration" ? "registration" : "personal"
      };

      const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
      activeTrackers.set(item.id, tracker);

      cancelBtn.onclick = () => {
        if (tracker.hasChanged()) {
          if (!confirm("You have unsaved changes. Discard changes?")) return;
        }
        editingCourseId = null;
        renderCourses();
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        msg.innerHTML = "";

        const newRecType = form.type.value === "registration" ? "registration" : "courses";
        const payload = {
          code: form.code.value.trim().toUpperCase(),
          name: form.name.value.trim(),
          units: Number(form.units.value)
        };

        try {
          if (newRecType !== item.recType) {
            await apiRequest(`/api/records/${item.recType}/${item.id}`, { method: "DELETE" });
            await apiRequest(`/api/records/${newRecType}`, { method: "POST", body: payload });
          } else {
            await apiRequest(`/api/records/${item.recType}/${item.id}`, { method: "PUT", body: payload });
          }
          editingCourseId = null;
          await loadCourses();
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Changes";
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes. Please try again.")}</div>`;
        }
      };
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("courses");

  const addForm = document.querySelector("#course-form");
  const addMsg = document.querySelector("#course-form-msg");

  if (addForm) {
    addForm.onsubmit = async (e) => {
      e.preventDefault();
      addMsg.innerHTML = '<p class="muted">Saving course…</p>';
      const recType = addForm.type.value === "registration" ? "registration" : "courses";
      const payload = {
        code: addForm.code.value.trim().toUpperCase(),
        name: addForm.name.value.trim(),
        units: Number(addForm.units.value)
      };

      try {
        await apiRequest(`/api/records/${recType}`, { method: "POST", body: payload });
        addMsg.innerHTML = '<div class="result-box">Course added successfully!</div>';
        addForm.reset();
        await loadCourses();
      } catch (err) {
        addMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  }

  document.querySelector("#courses-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      editingCourseId = editBtn.dataset.editId;
      renderCourses();
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      const recType = delBtn.dataset.recType;
      if (confirm("Are you sure you want to delete this course?")) {
        try {
          await apiRequest(`/api/records/${recType}/${id}`, { method: "DELETE" });
          if (editingCourseId === id) editingCourseId = null;
          await loadCourses();
        } catch (err) {
          alert(err.message || "Could not delete course.");
        }
      }
    }
  };

  void loadCourses();
});
