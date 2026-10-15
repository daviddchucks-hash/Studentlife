import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

let examsList = [];
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

function renderExams() {
  const container = document.querySelector("#exams-list-container");

  if (!examsList.length) {
    container.innerHTML = '<p class="empty-state">No upcoming exams saved yet. Add your exam schedule above!</p>';
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${examsList.map((item) => {
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
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("courses");

  const form = document.querySelector("#exam-form");
  const formMsg = document.querySelector("#exam-form-msg");

  form.onsubmit = async (e) => {
    e.preventDefault();
    formMsg.innerHTML = '<p class="muted">Saving exam…</p>';

    const payload = {
      course: form.course.value.trim(),
      date: form.date.value,
      time: form.time.value || undefined,
      venue: form.venue.value.trim() || undefined
    };

    try {
      if (editingId) {
        await apiRequest(`/api/records/exams/${editingId}`, { method: "PUT", body: payload });
        formMsg.innerHTML = '<div class="result-box">Exam updated!</div>';
        editingId = null;
        form.querySelector("button[type='submit']").textContent = "Save Exam";
      } else {
        await apiRequest("/api/records/exams", { method: "POST", body: payload });
        formMsg.innerHTML = '<div class="result-box">Exam added to schedule!</div>';
      }
      form.reset();
      await loadExams();
    } catch (err) {
      formMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelector("#exams-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      const id = editBtn.dataset.editId;
      const item = examsList.find((x) => x.id === id);
      if (item) {
        editingId = id;
        form.course.value = item.course;
        form.date.value = item.date;
        form.time.value = item.time || "";
        form.venue.value = item.venue || "";
        form.querySelector("button[type='submit']").textContent = "Update Exam";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      if (confirm("Are you sure you want to delete this exam entry?")) {
        try {
          await apiRequest(`/api/records/exams/${id}`, { method: "DELETE" });
          await loadExams();
        } catch (err) {
          alert(err.message || "Could not delete exam entry.");
        }
      }
    }
  };

  void loadExams();
});
