import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

const statusRoot = document.querySelector("#notesync-status");
const contentRoot = document.querySelector("#notesync-content");

function renderStatus(message, type = "info") {
  if (!statusRoot) return;
  const tone = type === "error" ? "error-box" : type === "success" ? "result-box" : "info-box";
  statusRoot.innerHTML = `<div class="${tone}">${message}</div>`;
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function renderEligibilityCard(eligibility) {
  const message = eligibility.eligible
    ? "You are currently eligible to contribute and earn AFT Coins."
    : "NoteSync is restricted to 100-level students in this Version 1 release.";
  const tone = eligibility.eligible ? "result-box" : "info-box";
  statusRoot.innerHTML = `
    <div class="${tone}">
      <strong>Eligibility:</strong> ${escapeHtml(eligibility.eligible ? "Eligible" : "Not eligible")}
      <div style="margin-top: 8px;">${escapeHtml(message)}</div>
      <div style="margin-top: 8px; color: #3f4d64;">Level: ${escapeHtml(eligibility.level || "Not set")}</div>
    </div>
  `;
}

function renderCourseCatalog(courses) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return `<div class="empty-state">No active course catalog entries are available yet.</div>`;
  }

  return `
    <div class="dashboard-section" style="grid-column: 1 / -1;">
      <h3>Course catalog</h3>
      <div class="card-grid">
        ${courses.map((course) => `
          <article class="module-card">
            <div class="module-card-head">
              <h4 class="module-card-title">${escapeHtml(course.code || "Course")}</h4>
              <span class="pill-badge">${escapeHtml(course.level || "100")}</span>
            </div>
            <p>${escapeHtml(course.title || "Untitled course")}</p>
            <p class="muted">${escapeHtml(course.department || "Department")} • ${escapeHtml(course.semester || "Semester")}</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLibrary(items) {
  const list = Array.isArray(items) ? items : [];
  const wrapperId = "notesync-library-root";

  if (list.length === 0) {
    return `
      <div id="${wrapperId}" class="dashboard-section" style="grid-column: 1 / -1;">
        <h3>Approved note library</h3>
        <div class="empty-state">No approved notes are available yet.</div>
      </div>
    `;
  }

  return `
    <div id="${wrapperId}" class="dashboard-section" style="grid-column: 1 / -1;">
      <h3>Approved note library</h3>
      <form id="notesync-library-search" class="tool-form" style="margin-bottom: 12px;">
        <div class="form-row">
          <label class="field">Search<input name="search" placeholder="Course, topic, department"></label>
          <label class="field">Department<input name="department" placeholder="Computer Science"></label>
        </div>
        <div class="form-row">
          <label class="field">Level<input name="level" placeholder="100"></label>
          <label class="field">Semester<select name="semester"><option value="">Any</option><option>First Semester</option><option>Second Semester</option></select></label>
        </div>
        <button type="submit" class="button button-primary button-small">Filter library</button>
      </form>
      <div id="notesync-library-preview" class="result-box" style="margin-bottom: 12px;">Preview the latest approved notes below.</div>
      <div class="card-grid">
        ${list.map((item) => `
          <article class="module-card">
            <div class="module-card-head">
              <h4 class="module-card-title">${escapeHtml(item.courseCode || "Course")}</h4>
              <span class="pill-badge">${escapeHtml(item.level || "100")}</span>
            </div>
            <p>${escapeHtml(item.lectureTopic || "Lecture topic")}</p>
            <p class="muted">${escapeHtml(item.courseTitle || "")}</p>
            <p class="muted">${escapeHtml(item.department || "Department")} • ${escapeHtml(item.semester || "Semester")} • ${escapeHtml(item.academicSession || "")}</p>
            <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
              <button type="button" class="button button-small button-primary" data-view-note="${escapeHtml(item.id || "")}">Preview</button>
              <button type="button" class="button button-small button-quiet" data-download-note="${escapeHtml(item.id || "")}">Download</button>
            </div>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLectureTrack(data = {}) {
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  const attendance = Array.isArray(data.attendance) ? data.attendance : [];

  return `
    <div class="dashboard-section" style="grid-column: 1 / -1;">
      <h3>LectureTrack</h3>
      <div class="card-grid">
        <div class="module-card">
          <h4>Upcoming reminders</h4>
          ${reminders.length ? reminders.map((item) => `
            <p class="muted">${escapeHtml(item.title || "Reminder")} • ${escapeHtml(item.day || "")}, ${escapeHtml(item.time || "")}</p>
          `).join("") : '<p class="muted">No reminders yet. Save one below.</p>'}
        </div>
        <div class="module-card">
          <h4>Attendance log</h4>
          ${attendance.length ? attendance.map((item) => `
            <p class="muted">${escapeHtml(item.course || "Course")} • ${escapeHtml(item.status || "Pending")} • ${escapeHtml(item.date || "")}</p>
          `).join("") : '<p class="muted">No attendance entries yet.</p>'}
        </div>
      </div>

      <div class="form-row" style="margin-top: 16px;">
        <form id="notesync-reminder-form" class="tool-form" style="width: 100%;">
          <h4 style="margin-bottom: 8px;">Create a reminder</h4>
          <div class="form-row">
            <label class="field">Title<input name="title" required placeholder="CIT 101 lecture"></label>
            <label class="field">Lecture<input name="lecture" required placeholder="Database lecture"></label>
          </div>
          <div class="form-row">
            <label class="field">Day<select name="day" required><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option></select></label>
            <label class="field">Time<input type="time" name="time" required></label>
          </div>
          <label class="field">Venue<input name="venue" placeholder="Hall 3"></label>
          <div id="notesync-reminder-message"></div>
          <button type="submit" class="button button-primary button-small">Save reminder</button>
        </form>
      </div>

      <div class="form-row" style="margin-top: 16px;">
        <form id="notesync-attendance-form" class="tool-form" style="width: 100%;">
          <h4 style="margin-bottom: 8px;">Log attendance</h4>
          <div class="form-row">
            <label class="field">Course<input name="course" required placeholder="CSC 101"></label>
            <label class="field">Lecture<input name="lecture" required placeholder="Intro to Programming"></label>
          </div>
          <div class="form-row">
            <label class="field">Date<input type="date" name="date" required></label>
            <label class="field">Status<select name="status"><option>Present</option><option>Absent</option><option>Excused</option><option>Pending</option></select></label>
          </div>
          <label class="field">Notes<textarea name="notes" rows="3" placeholder="Optional notes"></textarea></label>
          <div id="notesync-attendance-message"></div>
          <button type="submit" class="button button-primary button-small">Save attendance</button>
        </form>
      </div>
    </div>
  `;
}

function renderSubmissionForm() {
  return `
    <div class="dashboard-section">
      <h3>Submit a lecture note</h3>
      <form id="notesync-submit-form" class="tool-form">
        <div class="form-row">
          <label class="field">Course code<input name="courseCode" required placeholder="PHY 101"></label>
          <label class="field">Course title<input name="courseTitle" required placeholder="General Physics"></label>
        </div>
        <div class="form-row">
          <label class="field">Academic session<input name="academicSession" required placeholder="2025/2026"></label>
          <label class="field">Semester<select name="semester"><option>First Semester</option><option>Second Semester</option></select></label>
        </div>
        <div class="form-row">
          <label class="field">Lecture topic<input name="lectureTopic" required placeholder="Newton's Laws"></label>
          <label class="field">Lecture week<input name="lectureWeek" required placeholder="Week 2"></label>
        </div>
        <div class="form-row">
          <label class="field">Lecture date<input type="date" name="lectureDate" required></label>
          <label class="field">Note type<select name="noteType"><option value="typed">Typed</option><option value="image">Image</option><option value="pdf">PDF</option></select></label>
        </div>
        <label class="field">Notes<textarea name="notesText" rows="6" required placeholder="Paste the note, summary, formula sheet, or lesson write-up here."></textarea></label>
        <div id="notesync-form-message"></div>
        <button type="submit" class="button button-primary">Submit note</button>
      </form>
    </div>
  `;
}

function renderWallet(wallet) {
  const available = Number(wallet?.availableCoins || 0);
  return `
    <div class="dashboard-section">
      <h3>Wallet</h3>
      <div class="card-grid">
        <div class="module-card">
          <h4>Available AFT Coins</h4>
          <p style="font-size: 2rem; margin: 0;">${available}</p>
        </div>
        <div class="module-card">
          <h4>Total earned</h4>
          <p style="font-size: 2rem; margin: 0;">${Number(wallet?.totalEarned || 0)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderSubmissions(submissions) {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    return `<div class="empty-state">No submissions yet.</div>`;
  }

  return `
    <div class="dashboard-section" style="grid-column: 1 / -1;">
      <h3>My submissions</h3>
      <div class="card-grid">
        ${submissions.map((item) => `
          <article class="module-card">
            <div class="module-card-head">
              <h4 class="module-card-title">${escapeHtml(item.courseCode || "Course")}</h4>
              <span class="pill-badge">${escapeHtml(item.status || "Pending")}</span>
            </div>
            <p>${escapeHtml(item.lectureTopic || "Lecture topic")}</p>
            <p class="muted">${escapeHtml(item.courseTitle || "")}</p>
            <p class="muted">Reward: ${Number(item.rewardCoins || 0)} AFT Coins</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

async function loadNoteSyncPage() {
  try {
    const eligibility = await apiRequest("/api/notesync/eligibility");
    renderEligibilityCard(eligibility);

    if (!eligibility.eligible) {
      contentRoot.innerHTML = `
        <div class="dashboard-section">
          <h3>Apply for NoteSync access</h3>
          <form id="notesync-application-form" class="tool-form">
            <div class="form-row">
              <label class="field">Full name<input name="fullName" required></label>
              <label class="field">Department<input name="department" required></label>
            </div>
            <div class="form-row">
              <label class="field">Current level<input name="currentLevel" required placeholder="200"></label>
              <label class="field">Email<input type="email" name="email" required></label>
            </div>
            <div class="form-row">
              <label class="field">Phone<input name="phone" placeholder="Optional"></label>
              <label class="field">Student number<input name="studentNumber" placeholder="Optional"></label>
            </div>
            <label class="field">Courses you want included<textarea name="coursesRequested" rows="3" required></textarea></label>
            <label class="field">Why this would help your level<textarea name="justification" rows="4" required></textarea></label>
            <div id="notesync-application-message"></div>
            <button type="submit" class="button button-primary">Submit application</button>
          </form>
        </div>
      `;

      const appForm = document.querySelector("#notesync-application-form");
      const appMessage = document.querySelector("#notesync-application-message");
      appForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        appMessage.innerHTML = "<p class='muted'>Submitting application…</p>";
        try {
          await apiRequest("/api/notesync/applications", {
            method: "POST",
            body: Object.fromEntries(new FormData(appForm).entries())
          });
          appMessage.innerHTML = '<div class="result-box">Application submitted successfully.</div>';
          appForm.reset();
        } catch (error) {
          appMessage.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not submit application.")}</div>`;
        }
      });
      return;
    }

    const [catalog, submissions, wallet, library, lectureTrack] = await Promise.all([
      apiRequest("/api/notesync/course-catalog"),
      apiRequest("/api/notesync/submissions"),
      apiRequest("/api/notesync/wallet"),
      apiRequest("/api/notesync/library"),
      apiRequest("/api/notesync/lecture-track")
    ]);

    contentRoot.innerHTML = `
      ${renderCourseCatalog(catalog.items || [])}
      ${renderLibrary(library.items || [])}
      ${renderLectureTrack(lectureTrack || {})}
      ${renderSubmissionForm()}
      ${renderWallet(wallet.wallet || {})}
      ${renderSubmissions(submissions.items || [])}
    `;

    const linkedNoteId = new URLSearchParams(window.location.search).get("note");
    if (linkedNoteId) {
      try {
        const linkedNote = await apiRequest(`/api/notesync/library/${encodeURIComponent(linkedNoteId)}`);
        const preview = document.querySelector("#notesync-library-preview");
        if (preview) {
          preview.innerHTML = `Shared approved note: <strong>${escapeHtml(linkedNote.item?.courseCode || "Note")}</strong><br>${escapeHtml(String(linkedNote.item?.notesText || "").slice(0, 900))}`;
        }
      } catch (error) {
        renderStatus(error.message || "This shared NoteSync item is unavailable.", "error");
      }
    }

    const submitForm = document.querySelector("#notesync-submit-form");
    const messageBox = document.querySelector("#notesync-form-message");
    submitForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      messageBox.innerHTML = "<p class='muted'>Uploading note…</p>";
      try {
        const formData = new FormData(submitForm);
        const payload = {
          courseCode: formData.get("courseCode"),
          courseTitle: formData.get("courseTitle"),
          academicSession: formData.get("academicSession"),
          semester: formData.get("semester"),
          lectureTopic: formData.get("lectureTopic"),
          lectureWeek: formData.get("lectureWeek"),
          lectureDate: formData.get("lectureDate"),
          noteType: formData.get("noteType"),
          notesText: formData.get("notesText"),
          attachmentCount: 0,
          attachmentRefs: []
        };
        await apiRequest("/api/notesync/submissions", {
          method: "POST",
          body: payload
        });
        messageBox.innerHTML = '<div class="result-box">Submission sent for review.</div>';
        submitForm.reset();
        loadNoteSyncPage();
      } catch (error) {
        messageBox.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not submit note.")}</div>`;
      }
    });

    const librarySearch = document.querySelector("#notesync-library-search");
    if (librarySearch) {
      librarySearch.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(librarySearch);
        const params = new URLSearchParams(formData);
        const result = await apiRequest(`/api/notesync/library?${params.toString()}`);
        const root = document.querySelector("#notesync-library-root");
        if (root) root.outerHTML = renderLibrary(result.items || []);
      });
    }

    const reminderForm = document.querySelector("#notesync-reminder-form");
    if (reminderForm) {
      reminderForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const reminderMessage = document.querySelector("#notesync-reminder-message");
        reminderMessage.innerHTML = "<p class='muted'>Saving reminder…</p>";
        try {
          const payload = Object.fromEntries(new FormData(reminderForm).entries());
          await apiRequest("/api/notesync/lecture-track/reminders", { method: "POST", body: payload });
          reminderMessage.innerHTML = '<div class="result-box">Lecture reminder saved.</div>';
          reminderForm.reset();
          loadNoteSyncPage();
        } catch (error) {
          reminderMessage.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not save reminder.")}</div>`;
        }
      });
    }

    const attendanceForm = document.querySelector("#notesync-attendance-form");
    if (attendanceForm) {
      attendanceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const attendanceMessage = document.querySelector("#notesync-attendance-message");
        attendanceMessage.innerHTML = "<p class='muted'>Saving attendance…</p>";
        try {
          const payload = Object.fromEntries(new FormData(attendanceForm).entries());
          await apiRequest("/api/notesync/lecture-track/attendance", { method: "POST", body: payload });
          attendanceMessage.innerHTML = '<div class="result-box">Attendance entry saved.</div>';
          attendanceForm.reset();
          loadNoteSyncPage();
        } catch (error) {
          attendanceMessage.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not save attendance.")}</div>`;
        }
      });
    }

    contentRoot.addEventListener("click", async (event) => {
      const viewButton = event.target.closest("[data-view-note]");
      const downloadButton = event.target.closest("[data-download-note]");
      if (!viewButton && !downloadButton) return;

      const id = (viewButton || downloadButton).dataset.viewNote || (viewButton || downloadButton).dataset.downloadNote;
      if (!id) return;

      try {
        if (viewButton) {
          const response = await apiRequest(`/api/notesync/library/${id}`);
          const preview = document.querySelector("#notesync-library-preview");
          if (preview) {
            const text = response.item?.notesText || response.item?.notesPreview || "No preview text is available for this note.";
            preview.innerHTML = `Preview: <strong>${escapeHtml(response.item?.courseCode || "Note")}</strong><br>${escapeHtml(String(text).slice(0, 900))}`;
          }
        }
        if (downloadButton) {
          const response = await apiRequest(`/api/notesync/library/${id}/download`);
          const preview = document.querySelector("#notesync-library-preview");
          if (preview) {
            const text = response.preview || "Download ready.";
            preview.innerHTML = `Download ready: <strong>${escapeHtml(response.fileName || "Note")}</strong><br>${escapeHtml(String(text).slice(0, 900))}`;
          }
        }
      } catch (error) {
        const preview = document.querySelector("#notesync-library-preview");
        if (preview) preview.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not load library item.")}</div>`;
      }
    });
  } catch (error) {
    renderStatus(error.message || "Unable to load NoteSync right now.", "error");
    contentRoot.innerHTML = '<div class="empty-state">There was a problem loading NoteSync. Please try again later.</div>';
  }
}

initNavigation("notesync");
loadNoteSyncPage();
