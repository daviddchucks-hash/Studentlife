import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { TimerManager, calculateStudyStreak } from "./study-tools.js";
import { generateStudyPlan } from "./calculations.js";
import { createSmartSaveTracker } from "./smart-save.js";

let sessionsList = [];
let activeTimer = null;
let activeTab = "timer";
let editingSessionId = null;
let activeTrackers = new Map();

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
}

async function loadStudyData() {
  try {
    const res = await apiRequest("/api/records/study-sessions");
    sessionsList = res.items || [];
    updateStats();
    if (activeTab === "log") renderLogTab();
  } catch (err) {
    console.error("Could not load study sessions:", err);
  }
}

function updateStats() {
  const streakInfo = calculateStudyStreak(sessionsList);
  document.querySelector("#streak-count").textContent = `${streakInfo.currentStreak} days`;
  document.querySelector("#total-study-mins").textContent = `${streakInfo.totalMinutes} mins`;
  document.querySelector("#total-sessions-count").textContent = `${sessionsList.length}`;
}

function renderTab(tab) {
  activeTab = tab;
  activeTrackers.forEach((t) => t.destroy());
  activeTrackers.clear();

  document.querySelectorAll("#study-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  const container = document.querySelector("#study-tab-content");

  if (tab === "timer") {
    container.innerHTML = `
      <div class="timer-card" style="max-width:500px; margin:0 auto;">
        <h3>Pomodoro & Focus Timer</h3>
        <p class="muted">Set your study interval and start a focus session.</p>
        <div class="timer-display" id="page-timer-display">25:00</div>
        <div class="timer-controls">
          <button class="button button-primary" type="button" id="start-timer-btn">Start</button>
          <button class="button button-secondary" type="button" id="pause-timer-btn">Pause</button>
          <button class="button button-quiet" type="button" id="reset-timer-btn">Reset</button>
        </div>
        <div class="form-row" style="margin-top:1.5rem; text-align:left;">
          <label class="field">Preset Interval
            <select id="timer-preset">
              <option value="25">Pomodoro (25 mins focus)</option>
              <option value="5">Short Break (5 mins)</option>
              <option value="15">Long Break (15 mins)</option>
              <option value="45">Deep Study (45 mins)</option>
              <option value="60">1 Hour Session</option>
            </select>
          </label>
        </div>
      </div>
    `;

    const display = container.querySelector("#page-timer-display");
    if (activeTimer) activeTimer.pause();
    activeTimer = new TimerManager(display, () => alert("Study session timer finished! Take a break."));
    activeTimer.set(25);

    container.querySelector("#start-timer-btn").onclick = () => activeTimer.start();
    container.querySelector("#pause-timer-btn").onclick = () => activeTimer.pause();
    container.querySelector("#reset-timer-btn").onclick = () => {
      const mins = Number(container.querySelector("#timer-preset").value) || 25;
      activeTimer.set(mins);
    };
    container.querySelector("#timer-preset").onchange = (e) => {
      activeTimer.set(Number(e.target.value) || 25);
    };

  } else if (tab === "log") {
    renderLogTab();
  } else if (tab === "plan") {
    container.innerHTML = `
      <div class="dashboard-section">
        <h3>Study Timetable Generator</h3>
        <p class="muted">Generate a balanced repeating study schedule across your courses.</p>
        <form id="study-plan-form" class="tool-form">
          <label class="field">Subjects / Courses (one per line)
            <textarea name="subjects" rows="3" required placeholder="MTH 101&#10;PHY 101&#10;CSC 101"></textarea>
          </label>
          <label class="field">Study Days (comma separated)
            <input name="days" required value="Monday, Tuesday, Wednesday, Thursday, Friday">
          </label>
          <div class="form-row">
            <label class="field">Sessions Per Day<input type="number" min="1" max="8" name="sessions" required value="2"></label>
            <label class="field">Session Duration (minutes)<input type="number" min="15" max="180" name="minutes" required value="45"></label>
          </div>
          <label class="field">First Session Start Time<input type="time" name="start" required value="16:00"></label>
          <div id="plan-form-msg"></div>
          <button type="submit" class="button button-primary">Generate Schedule</button>
        </form>
        <div id="generated-plan-output" style="margin-top:20px;"></div>
      </div>
    `;

    const planForm = container.querySelector("#study-plan-form");
    const planMsg = container.querySelector("#plan-form-msg");
    const planOut = container.querySelector("#generated-plan-output");

    planForm.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const entries = generateStudyPlan({
          subjects: planForm.subjects.value,
          days: planForm.days.value,
          sessions: planForm.sessions.value,
          minutes: planForm.minutes.value,
          start: planForm.start.value
        });

        planOut.innerHTML = `
          <h4>Generated Study Schedule (${entries.length} sessions)</h4>
          <div class="record-list">
            ${entries.map((item) => `
              <div class="record-item">
                <div>
                  <strong>${escapeHtml(item.subject)} (${escapeHtml(item.day)})</strong>
                  <small>⏰ ${escapeHtml(item.time)} | Duration: ${item.minutes} mins</small>
                </div>
              </div>
            `).join("")}
          </div>
          <button type="button" class="button button-primary button-small" id="save-study-plan-btn" style="margin-top:14px;">Save Plan to Account</button>
        `;

        planOut.querySelector("#save-study-plan-btn").onclick = async () => {
          try {
            await apiRequest("/api/records/study-plans", {
              method: "POST",
              body: { title: `Study Plan (${new Date().toLocaleDateString()})`, entries }
            });
            alert("Study plan saved to your account!");
          } catch (err) {
            alert(err.message || "Failed to save study plan.");
          }
        };

        planMsg.innerHTML = "";
      } catch (err) {
        planMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  }
}

function renderLogTab() {
  const container = document.querySelector("#study-tab-content");
  const todayStr = new Date().toISOString().slice(0, 10);

  activeTrackers.forEach((t) => t.destroy());
  activeTrackers.clear();

  container.innerHTML = `
    <div class="dashboard-section" style="margin-bottom:20px;">
      <h3>Log Completed Study Session</h3>
      <form id="study-log-form" class="tool-form">
        <div class="form-row">
          <label class="field">Subject / Course<input name="subject" required placeholder="e.g. PHY 101"></label>
          <label class="field">Minutes Studied<input type="number" min="1" max="600" name="minutes" required value="45"></label>
        </div>
        <label class="field">Date Studied<input type="date" name="date" required value="${todayStr}"></label>
        <div id="log-form-msg"></div>
        <button type="submit" class="button button-primary">Log Session</button>
      </form>
    </div>

    <h3>Logged Study Sessions (${sessionsList.length})</h3>
    <div id="sessions-list-container">
      ${sessionsList.length ? `
        <div class="record-list">
          ${sessionsList.map((item) => {
            if (editingSessionId === item.id) {
              return `
                <div class="view-card" id="edit-session-card-${item.id}" style="margin-bottom:12px;">
                  <h4 style="margin-top:0; margin-bottom:12px;">Edit Study Session</h4>
                  <form class="tool-form" id="edit-session-form-${item.id}">
                    <div class="form-row">
                      <label class="field">Subject / Course<input name="subject" required value="${escapeHtml(item.subject)}"></label>
                      <label class="field">Minutes Studied<input type="number" min="1" max="600" name="minutes" required value="${escapeHtml(item.minutes)}"></label>
                    </div>
                    <label class="field">Date Studied<input type="date" name="date" required value="${escapeHtml(item.date)}"></label>
                    <div id="edit-session-msg-${item.id}"></div>
                    <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                      <button type="submit" class="button button-primary button-small save-button" id="save-session-btn-${item.id}" disabled>Save Changes</button>
                      <button type="button" class="button button-quiet button-small" id="cancel-session-btn-${item.id}">Cancel</button>
                    </div>
                  </form>
                </div>
              `;
            }

            return `
              <div class="record-item">
                <div>
                  <strong>${escapeHtml(item.subject)}</strong>
                  <small>⏱️ ${escapeHtml(item.minutes)} minutes studied on 📅 ${escapeHtml(item.date)}</small>
                </div>
                <div style="display:flex; gap:6px;">
                  <button class="record-update" data-edit-session-id="${item.id}">Edit</button>
                  <button class="record-delete" data-delete-session-id="${item.id}">Delete</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      ` : `<p class="empty-state">No study sessions logged yet. Log your first session above!</p>`}
    </div>
  `;

  if (editingSessionId) {
    const item = sessionsList.find((x) => x.id === editingSessionId);
    if (item) {
      const form = container.querySelector(`#edit-session-form-${item.id}`);
      const saveBtn = container.querySelector(`#save-session-btn-${item.id}`);
      const cancelBtn = container.querySelector(`#cancel-session-btn-${item.id}`);
      const msg = container.querySelector(`#edit-session-msg-${item.id}`);

      const baseline = { subject: item.subject, minutes: String(item.minutes), date: item.date };
      const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
      activeTrackers.set(item.id, tracker);

      cancelBtn.onclick = () => {
        if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
        editingSessionId = null;
        renderLogTab();
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        try {
          await apiRequest(`/api/records/study-sessions/${item.id}`, {
            method: "PUT",
            body: {
              subject: form.subject.value.trim(),
              minutes: Number(form.minutes.value),
              date: form.date.value
            }
          });
          editingSessionId = null;
          await loadStudyData();
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Changes";
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes.")}</div>`;
        }
      };
    }
  }

  const logForm = container.querySelector("#study-log-form");
  const logMsg = container.querySelector("#log-form-msg");

  if (logForm) {
    logForm.onsubmit = async (e) => {
      e.preventDefault();
      logMsg.innerHTML = '<p class="muted">Saving session…</p>';
      const payload = {
        subject: logForm.subject.value.trim(),
        minutes: Number(logForm.minutes.value),
        date: logForm.date.value
      };

      try {
        await apiRequest("/api/records/study-sessions", { method: "POST", body: payload });
        logMsg.innerHTML = '<div class="result-box">Study session logged!</div>';
        logForm.reset();
        await loadStudyData();
      } catch (err) {
        logMsg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  }

  container.querySelector("#sessions-list-container").onclick = async (e) => {
    const editBtn = e.target.closest("[data-edit-session-id]");
    const delBtn = e.target.closest("[data-delete-session-id]");

    if (editBtn) {
      editingSessionId = editBtn.dataset.editSessionId;
      renderLogTab();
    } else if (delBtn) {
      const id = delBtn.dataset.deleteSessionId;
      if (confirm("Delete this logged study session?")) {
        try {
          await apiRequest(`/api/records/study-sessions/${id}`, { method: "DELETE" });
          if (editingSessionId === id) editingSessionId = null;
          await loadStudyData();
        } catch (err) {
          alert(err.message || "Failed to delete study session.");
        }
      }
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("study");

  document.querySelector("#study-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    renderTab(btn.dataset.tab);
  };

  renderTab("timer");
  void loadStudyData();
});
