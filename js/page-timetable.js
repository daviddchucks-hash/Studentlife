import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let timetableEntries = [];
let activeView = "weekly";
let editingId = null;

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function detectOverlaps(entries) {
  const overlapMap = new Set();
  const byDay = {};
  DAYS.forEach((d) => { byDay[d] = []; });

  entries.forEach((item) => {
    if (byDay[item.day]) byDay[item.day].push(item);
  });

  Object.values(byDay).forEach((dayList) => {
    for (let i = 0; i < dayList.length; i++) {
      for (let j = i + 1; j < dayList.length; j++) {
        const a = dayList[i];
        const b = dayList[j];
        if (a.start < b.end && a.end > b.start) {
          overlapMap.add(a.id);
          overlapMap.add(b.id);
        }
      }
    }
  });

  return overlapMap;
}

async function loadTimetable() {
  const display = document.querySelector("#timetable-display-area");
  display.innerHTML = '<p class="muted">Loading timetable…</p>';
  try {
    const data = await apiRequest("/api/records/timetable");
    timetableEntries = data.items || [];
    renderTimetable();
  } catch (err) {
    display.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function renderTimetable() {
  const display = document.querySelector("#timetable-display-area");
  const overlaps = detectOverlaps(timetableEntries);

  if (activeView === "weekly") {
    display.innerHTML = `
      <div class="timetable-grid-wrapper">
        <div class="timetable-grid">
          ${DAYS.map((day) => {
            const dayEntries = timetableEntries
              .filter((item) => item.day === day)
              .sort((a, b) => a.start.localeCompare(b.start));

            return `
              <div class="timetable-day-col">
                <div class="timetable-day-header">${day}</div>
                <div class="timetable-slots">
                  ${dayEntries.length ? dayEntries.map((item) => {
                    const isOverlap = overlaps.has(item.id);
                    return `
                      <div class="timetable-card ${isOverlap ? "overlap-warning" : ""}">
                        <strong>${escapeHtml(item.course)}</strong>
                        <div class="time">${escapeHtml(item.start)} - ${escapeHtml(item.end)}</div>
                        ${item.venue ? `<div class="venue">📍 ${escapeHtml(item.venue)}</div>` : ""}
                        ${isOverlap ? `<div style="color:var(--danger); font-weight:700; font-size:10px; margin-top:4px;">⚠️ Overlap!</div>` : ""}
                        <div style="margin-top:6px; display:flex; gap:6px;">
                          <button class="record-update" data-edit-id="${item.id}">Edit</button>
                          <button class="record-delete" data-delete-id="${item.id}">Delete</button>
                        </div>
                      </div>
                    `;
                  }).join("") : '<div style="font-size:11px; color:var(--muted); padding:6px;">No classes</div>'}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  } else if (activeView === "today") {
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Mon...
    const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][todayIndex];
    const todayEntries = timetableEntries
      .filter((item) => item.day === todayName)
      .sort((a, b) => a.start.localeCompare(b.start));

    display.innerHTML = `
      <div class="dashboard-section">
        <h3>Today (${todayName}) Schedule</h3>
        ${todayEntries.length ? `
          <div class="record-list">
            ${todayEntries.map((item) => {
              const isOverlap = overlaps.has(item.id);
              return `
                <div class="record-item ${isOverlap ? "overlap-warning" : ""}">
                  <div>
                    <strong>${escapeHtml(item.course)}</strong>
                    <small>⏰ ${escapeHtml(item.start)} - ${escapeHtml(item.end)} ${item.venue ? `| 📍 ${escapeHtml(item.venue)}` : ""}</small>
                    ${isOverlap ? `<small style="color:var(--danger); font-weight:700;">⚠️ Overlaps with another class</small>` : ""}
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="record-update" data-edit-id="${item.id}">Edit</button>
                    <button class="record-delete" data-delete-id="${item.id}">Delete</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `<p class="empty-state">No classes scheduled for today (${todayName}). Enjoy your day!</p>`}
      </div>
    `;
  } else {
    // List View
    display.innerHTML = `
      <div class="dashboard-section">
        <h3>All Timetable Entries (${timetableEntries.length})</h3>
        ${timetableEntries.length ? `
          <div class="record-list">
            ${timetableEntries.map((item) => {
              const isOverlap = overlaps.has(item.id);
              return `
                <div class="record-item">
                  <div>
                    <strong>${escapeHtml(item.course)} (${escapeHtml(item.day)})</strong>
                    <small>⏰ ${escapeHtml(item.start)} - ${escapeHtml(item.end)} ${item.venue ? `| 📍 ${escapeHtml(item.venue)}` : ""}</small>
                    ${isOverlap ? `<small style="color:var(--danger); font-weight:700;">⚠️ Overlaps with another class</small>` : ""}
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button class="record-update" data-edit-id="${item.id}">Edit</button>
                    <button class="record-delete" data-delete-id="${item.id}">Delete</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        ` : `<p class="empty-state">Your timetable is empty. Add your first class entry above!</p>`}
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("timetable");

  const form = document.querySelector("#timetable-form");
  const formMsg = document.querySelector("#timetable-form-msg");

  form.onsubmit = async (e) => {
    e.preventDefault();
    formMsg.innerHTML = '<p class="muted">Saving entry…</p>';
    const payload = {
      course: form.course.value.trim(),
      day: form.day.value,
      start: form.start.value,
      end: form.end.value,
      venue: form.venue.value.trim()
    };

    try {
      if (editingId) {
        await apiRequest(`/api/records/timetable/${editingId}`, { method: "PUT", body: payload });
        formMsg.innerHTML = '<div class="result-box">Class updated successfully!</div>';
        editingId = null;
        form.querySelector("button[type='submit']").textContent = "Save Class";
      } else {
        await apiRequest("/api/records/timetable", { method: "POST", body: payload });
        formMsg.innerHTML = '<div class="result-box">Class added to timetable!</div>';
      }
      form.reset();
      await loadTimetable();
    } catch (err) {
      formMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };

  document.querySelector("#timetable-view-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll("#timetable-view-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeView = btn.dataset.view;
    renderTimetable();
  };

  document.querySelector("#timetable-display-area").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-id]");
    const delBtn = e.target.closest("[data-delete-id]");

    if (editBtn) {
      const id = editBtn.dataset.editId;
      const item = timetableEntries.find((x) => x.id === id);
      if (item) {
        editingId = id;
        form.course.value = item.course;
        form.day.value = item.day;
        form.start.value = item.start;
        form.end.value = item.end;
        form.venue.value = item.venue || "";
        form.querySelector("button[type='submit']").textContent = "Update Class";
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      if (confirm("Are you sure you want to delete this class entry?")) {
        try {
          await apiRequest(`/api/records/timetable/${id}`, { method: "DELETE" });
          await loadTimetable();
        } catch (err) {
          alert(err.message || "Could not delete class entry.");
        }
      }
    }
  };

  void loadTimetable();
});
