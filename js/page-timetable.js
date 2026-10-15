import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { createSmartSaveTracker } from "./smart-save.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let timetableEntries = [];
let activeView = "weekly";
let editingTimetableId = null;
let activeTrackers = new Map();

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
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

function renderEditForm(item) {
  return `
    <div class="view-card" id="edit-tt-card-${item.id}" style="margin:8px 0;">
      <h4 style="margin-top:0; margin-bottom:12px;">Edit Class Entry</h4>
      <form class="tool-form" id="edit-tt-form-${item.id}">
        <div class="form-row">
          <label class="field">Course Name / Code<input name="course" required value="${escapeHtml(item.course)}"></label>
          <label class="field">Day of Week
            <select name="day">
              ${DAYS.map((d) => `<option ${item.day === d ? "selected" : ""}>${d}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="form-row">
          <label class="field">Start Time<input type="time" name="start" required value="${escapeHtml(item.start)}"></label>
          <label class="field">End Time<input type="time" name="end" required value="${escapeHtml(item.end)}"></label>
        </div>
        <label class="field">Venue / Lecture Hall<input name="venue" value="${escapeHtml(item.venue || "")}" placeholder="e.g. Hall 2B"></label>
        <div id="edit-tt-msg-${item.id}"></div>
        <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
          <button type="submit" class="button button-primary button-small save-button" id="save-tt-btn-${item.id}" disabled>Save Changes</button>
          <button type="button" class="button button-quiet button-small" id="cancel-tt-btn-${item.id}">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function attachSmartSaveToEditForm(item) {
  const display = document.querySelector("#timetable-display-area");
  const form = display.querySelector(`#edit-tt-form-${item.id}`);
  if (!form) return;

  const saveBtn = display.querySelector(`#save-tt-btn-${item.id}`);
  const cancelBtn = display.querySelector(`#cancel-tt-btn-${item.id}`);
  const msg = display.querySelector(`#edit-tt-msg-${item.id}`);

  const baseline = {
    course: item.course,
    day: item.day,
    start: item.start,
    end: item.end,
    venue: item.venue || ""
  };

  const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
  activeTrackers.set(item.id, tracker);

  cancelBtn.onclick = () => {
    if (tracker.hasChanged()) {
      if (!confirm("You have unsaved changes. Discard changes?")) return;
    }
    editingTimetableId = null;
    renderTimetable();
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    msg.innerHTML = "";

    const payload = {
      course: form.course.value.trim(),
      day: form.day.value,
      start: form.start.value,
      end: form.end.value,
      venue: form.venue.value.trim()
    };

    try {
      await apiRequest(`/api/records/timetable/${item.id}`, { method: "PUT", body: payload });
      editingTimetableId = null;
      await loadTimetable();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";
      msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes. Please try again.")}</div>`;
    }
  };
}

function renderTimetable() {
  const display = document.querySelector("#timetable-display-area");

  activeTrackers.forEach((tracker) => tracker.destroy());
  activeTrackers.clear();

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
                    if (editingTimetableId === item.id) {
                      return renderEditForm(item);
                    }
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
    const todayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
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
              if (editingTimetableId === item.id) {
                return renderEditForm(item);
              }
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
              if (editingTimetableId === item.id) {
                return renderEditForm(item);
              }
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

  if (editingTimetableId) {
    const item = timetableEntries.find((x) => x.id === editingTimetableId);
    if (item) attachSmartSaveToEditForm(item);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("timetable");

  const addForm = document.querySelector("#timetable-form");
  const addMsg = document.querySelector("#timetable-form-msg");

  if (addForm) {
    addForm.onsubmit = async (e) => {
      e.preventDefault();
      addMsg.innerHTML = '<p class="muted">Saving entry…</p>';
      const payload = {
        course: addForm.course.value.trim(),
        day: addForm.day.value,
        start: addForm.start.value,
        end: addForm.end.value,
        venue: addForm.venue.value.trim()
      };

      try {
        await apiRequest("/api/records/timetable", { method: "POST", body: payload });
        addMsg.innerHTML = '<div class="result-box">Class added to timetable!</div>';
        addForm.reset();
        await loadTimetable();
      } catch (err) {
        addMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  }

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
      editingTimetableId = editBtn.dataset.editId;
      renderTimetable();
    } else if (delBtn) {
      const id = delBtn.dataset.deleteId;
      if (confirm("Are you sure you want to delete this class entry?")) {
        try {
          await apiRequest(`/api/records/timetable/${id}`, { method: "DELETE" });
          if (editingTimetableId === id) editingTimetableId = null;
          await loadTimetable();
        } catch (err) {
          alert(err.message || "Could not delete class entry.");
        }
      }
    }
  };

  void loadTimetable();
});
