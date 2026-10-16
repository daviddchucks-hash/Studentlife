import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { createSmartSaveTracker } from "./smart-save.js";

let examsList = [];
let editingExamId = null;
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

async function loadExams() {
  const container = document.querySelector("#exams-list-container");
  container.innerHTML = '<p class="muted">Loading exam schedule…</p>';
  try {
    const res = await apiRequest("/api/records/exams");
    examsList = res.items || [];
    examsList.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
    renderExams();
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function renderEditForm(item) {
  return `
    <div class="view-card" id="edit-exam-card-${item.id}" style="margin-bottom:12px;">
      <h4 style="margin-top:0; margin-bottom:12px;">Edit Exam Entry</h4>
      <form class="tool-form" id="edit-exam-form-${item.id}">
        <div class="form-row">
          <label class="field">Course Code / Name<input name="course" required value="${escapeHtml(item.course)}"></label>
          <label class="field">Exam Date<input type="date" name="date" required value="${escapeHtml(item.date)}"></label>
        </div>
        <div class="form-row">
          <label class="field">Time (optional)<input type="time" name="time" value="${escapeHtml(item.time || "")}"></label>
          <label class="field">Venue / Hall (optional)<input name="venue" value="${escapeHtml(item.venue || "")}"></label>
        </div>
        <div id="edit-exam-msg-${item.id}"></div>
        <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
          <button type="submit" class="button button-primary button-small save-button" id="save-exam-btn-${item.id}" disabled>Save Changes</button>
          <button type="button" class="button button-quiet button-small" id="cancel-exam-btn-${item.id}">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function attachSmartSaveToEditForm(item) {
  const container = document.querySelector("#exams-list-container");
  const form = container.querySelector(`#edit-exam-form-${item.id}`);
  if (!form) return;

  const saveBtn = container.querySelector(`#save-exam-btn-${item.id}`);
  const cancelBtn = container.querySelector(`#cancel-exam-btn-${item.id}`);
  const msg = container.querySelector(`#edit-exam-msg-${item.id}`);

  const baseline = {
    course: item.course,
    date: item.date,
    time: item.time || "",
    venue: item.venue || ""
  };

  const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
  activeTrackers.set(item.id, tracker);

  cancelBtn.onclick = () => {
    if (tracker.hasChanged()) {
      if (!confirm("You have unsaved changes. Discard changes?")) return;
    }
    editingExamId = null;
    renderExams();
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    msg.innerHTML = "";

    const payload = {
      course: form.course.value.trim(),
      date: form.date.value,
      time: form.time.value || undefined,
      venue: form.venue.value.trim() || undefined
    };

    try {
      await apiRequest(`/api/records/exams/${item.id}`, { method: "PUT", body: payload });
      editingExamId = null;
      await loadExams();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
      msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes. Please try again.")}</div>`;
    }
  };
}

function renderExams() {
  const container = document.querySelector("#exams-list-container");

  activeTrackers.forEach((tracker) => tracker.destroy());
  activeTrackers.clear();

  if (!examsList.length) {
    container.innerHTML = '<p class="empty-state">No upcoming exams saved yet. Add your exam schedule above!</p>';
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${examsList.map((item) => {
        if (editingExamId === item.id) {
          return renderEditForm(item);
        }

        const days = daysFromToday(item.date);
        const isToday = days === 0;
        const isPast = days !== null && days < 0;

        return `
          <div class="record-item" style="${isToday ? "border-left:4px solid var(--blue); background:#eaf2f7;" : isPast ? "opacity:0.6;" : ""}">
            <div>
              <strong>${escapeHtml(item.course)}</strong>
              <small>
                📅 Date: <strong>${escapeHtml(item.date)}</strong>
                ${item.time ? ` | ⏰ ${escapeHtml(item.time)}` : ""}
                ${item.venue ? ` | 📍 ${escapeHtml(item.venue)}` : ""}
              </small>
              <div style="margin-top:4px;">
                <span class="pill-badge ${isToday ? "active" : ""}">
                  ${isPast ? "Exam Completed" : isToday ? "Exam Today!" : `In ${days} days`}
                </span>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="record-update" data-edit-id="${item.id}">Edit</button>
              <button class="record-delete" data-delete-id="${item.id}">Delete</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  if (editingExamId) {
    const item = examsList.find((x) => x.id === editingExamId);
    if (item) attachSmartSaveToEditForm(item);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("courses");

  const addForm = document.querySelector("#exam-form");
  const addMsg = document.querySelector("#exam-form-msg");

  if (addForm) {
    addForm.onsubmit = async (e) => {
      e.preventDefault();
      addMsg.innerHTML = '<p class="muted">Saving exam…</p>';

      const payload = {
        course: addForm.course.value.trim(),
        date: addForm.date.value,
        time: addForm.time.value || undefined,
        venue: addForm.venue.value.trim() || undefined
      };

      try {
        await apiRequest("/api/records/exams", { method: "POST", body: payload });
        addMsg.innerHTML = '<div class="result-box">Exam added to schedule!</div>';
        addForm.reset();
        await loadExams();
      } catch (err) {
        addMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  }

  document.querySelector("#exams-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      editingExamId = editBtn.dataset.editId;
      renderExams();
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      if (confirm("Are you sure you want to delete this exam entry?")) {
        try {
          await apiRequest(`/api/records/exams/${id}`, { method: "DELETE" });
          if (editingExamId === id) editingExamId = null;
          await loadExams();
        } catch (err) {
          alert(err.message || "Could not delete exam entry.");
        }
      }
    }
  };

  void loadExams();
});
