import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { createSmartSaveTracker } from "./smart-save.js";

let notesList = [];
let flashcardsList = [];
let quizzesList = [];
let revisionList = [];
let checklistsList = [];
let activeTab = "notes";

let editingNoteId = null;
let editingFcId = null;
let editingRevId = null;
let editingQuizId = null;
let activeTrackers = new Map();

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
}

async function loadAllNotesData() {
  try {
    const [nRes, fRes, qRes, rRes, cRes] = await Promise.all([
      apiRequest("/api/records/notes"),
      apiRequest("/api/records/flashcards"),
      apiRequest("/api/records/quizzes"),
      apiRequest("/api/records/revision-plans"),
      apiRequest("/api/records/topic-checklists")
    ]);

    notesList = nRes.items || [];
    flashcardsList = fRes.items || [];
    quizzesList = qRes.items || [];
    revisionList = rRes.items || [];
    checklistsList = cRes.items || [];

    renderTab(activeTab);
  } catch (err) {
    console.error("Could not load notes data:", err);
  }
}

function clearTrackers() {
  activeTrackers.forEach((t) => t.destroy());
  activeTrackers.clear();
}

function renderTab(tab) {
  activeTab = tab;
  clearTrackers();
  document.querySelectorAll("#notes-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  const container = document.querySelector("#notes-tab-content");

  if (tab === "notes") {
    container.innerHTML = `
      <div class="dashboard-section" style="margin-bottom:20px;">
        <h3>Create Study Note</h3>
        <form id="note-form" class="tool-form">
          <div class="form-row">
            <label class="field">Note Title<input name="title" required placeholder="e.g. Newton's Laws Summary"></label>
            <label class="field">Course Code (optional)<input name="course" placeholder="e.g. PHY 101"></label>
          </div>
          <label class="field">Note Content<textarea name="content" rows="4" required placeholder="Write your revision notes, formulas, or key concepts..."></textarea></label>
          <div id="note-form-msg"></div>
          <button type="submit" class="button button-primary">Save Note</button>
        </form>
      </div>

      <h3>Saved Notes (${notesList.length})</h3>
      <div class="card-grid">
        ${notesList.length ? notesList.map((item) => {
          if (editingNoteId === item.id) {
            return `
              <div class="view-card" id="edit-note-card-${item.id}">
                <h4 style="margin-top:0; margin-bottom:12px;">Edit Study Note</h4>
                <form class="tool-form" id="edit-note-form-${item.id}">
                  <div class="form-row">
                    <label class="field">Note Title<input name="title" required value="${escapeHtml(item.title)}"></label>
                    <label class="field">Course Code (optional)<input name="course" value="${escapeHtml(item.course || "")}"></label>
                  </div>
                  <label class="field">Note Content<textarea name="content" rows="4" required>${escapeHtml(item.content)}</textarea></label>
                  <div id="edit-note-msg-${item.id}"></div>
                  <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                    <button type="submit" class="button button-primary button-small save-button" id="save-note-btn-${item.id}" disabled>Save Changes</button>
                    <button type="button" class="button button-quiet button-small" id="cancel-note-btn-${item.id}">Cancel</button>
                  </div>
                </form>
              </div>
            `;
          }

          return `
            <div class="module-card">
              <div>
                <div class="module-card-head">
                  <h4 class="module-card-title">${escapeHtml(item.title)}</h4>
                  ${item.course ? `<span class="pill-badge">${escapeHtml(item.course)}</span>` : ""}
                </div>
                <p class="module-card-body" style="white-space:pre-wrap; margin-top:10px;">${escapeHtml(item.content)}</p>
              </div>
              <div class="module-card-footer">
                <span class="muted">${new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
                <div style="display:flex; gap:6px;">
                  <button class="record-update" data-edit-note="${item.id}">Edit</button>
                  <button class="record-delete" data-del-note="${item.id}">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join("") : '<p class="empty-state">No study notes saved yet. Write your first note above!</p>'}
      </div>
    `;

    if (editingNoteId) {
      const item = notesList.find((x) => x.id === editingNoteId);
      if (item) {
        const form = container.querySelector(`#edit-note-form-${item.id}`);
        const saveBtn = container.querySelector(`#save-note-btn-${item.id}`);
        const cancelBtn = container.querySelector(`#cancel-note-btn-${item.id}`);
        const msg = container.querySelector(`#edit-note-msg-${item.id}`);

        const baseline = { title: item.title, course: item.course || "", content: item.content };
        const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
        activeTrackers.set(item.id, tracker);

        cancelBtn.onclick = () => {
          if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
          editingNoteId = null;
          renderTab("notes");
        };

        form.onsubmit = async (e) => {
          e.preventDefault();
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          try {
            await apiRequest(`/api/records/notes/${item.id}`, {
              method: "PUT",
              body: { title: form.title.value.trim(), course: form.course.value.trim() || undefined, content: form.content.value.trim() }
            });
            editingNoteId = null;
            await loadAllNotesData();
          } catch (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
            msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes.")}</div>`;
          }
        };
      }
    }

    const form = container.querySelector("#note-form");
    const msg = container.querySelector("#note-form-msg");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        msg.innerHTML = '<p class="muted">Saving note…</p>';
        try {
          await apiRequest("/api/records/notes", {
            method: "POST",
            body: { title: form.title.value.trim(), course: form.course.value.trim() || undefined, content: form.content.value.trim() }
          });
          msg.innerHTML = '<div class="result-box">Note saved!</div>';
          form.reset();
          await loadAllNotesData();
        } catch (err) {
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
        }
      };
    }

    container.onclick = async (e) => {
      const editBtn = e.target.closest("[data-edit-note]");
      const delBtn = e.target.closest("[data-del-note]");
      if (editBtn) {
        editingNoteId = editBtn.dataset.editNote;
        renderTab("notes");
      } else if (delBtn) {
        if (confirm("Delete this note?")) {
          await apiRequest(`/api/records/notes/${delBtn.dataset.delNote}`, { method: "DELETE" });
          if (editingNoteId === delBtn.dataset.delNote) editingNoteId = null;
          await loadAllNotesData();
        }
      }
    };

  } else if (tab === "flashcards") {
    container.innerHTML = `
      <div class="dashboard-section" style="margin-bottom:20px;">
        <h3>Create Flashcard</h3>
        <form id="flashcard-form" class="tool-form">
          <div class="form-row">
            <label class="field">Front (Question / Prompt)<input name="front" required placeholder="e.g. What is First Law of Thermodynamics?"></label>
            <label class="field">Back (Answer)<input name="back" required placeholder="e.g. Energy cannot be created or destroyed..."></label>
          </div>
          <label class="field">Deck Name (optional)<input name="deck" placeholder="e.g. Physics 101"></label>
          <div id="fc-form-msg"></div>
          <button type="submit" class="button button-primary">Save Flashcard</button>
        </form>
      </div>

      <h3>Flashcards (${flashcardsList.length})</h3>
      <div class="card-grid">
        ${flashcardsList.length ? flashcardsList.map((item) => {
          if (editingFcId === item.id) {
            return `
              <div class="view-card" id="edit-fc-card-${item.id}">
                <h4 style="margin-top:0; margin-bottom:12px;">Edit Flashcard</h4>
                <form class="tool-form" id="edit-fc-form-${item.id}">
                  <div class="form-row">
                    <label class="field">Front<input name="front" required value="${escapeHtml(item.front)}"></label>
                    <label class="field">Back<input name="back" required value="${escapeHtml(item.back)}"></label>
                  </div>
                  <label class="field">Deck Name (optional)<input name="deck" value="${escapeHtml(item.deck || "")}"></label>
                  <div id="edit-fc-msg-${item.id}"></div>
                  <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                    <button type="submit" class="button button-primary button-small save-button" id="save-fc-btn-${item.id}" disabled>Save Changes</button>
                    <button type="button" class="button button-quiet button-small" id="cancel-fc-btn-${item.id}">Cancel</button>
                  </div>
                </form>
              </div>
            `;
          }

          return `
            <div class="module-card" style="min-height:180px;">
              <div>
                <span class="pill-badge">${escapeHtml(item.deck || "General")}</span>
                <p style="font-weight:700; font-size:15px; margin:10px 0 6px;">Q: ${escapeHtml(item.front)}</p>
                <p style="font-size:14px; color:var(--blue); font-weight:600; margin:0;">A: ${escapeHtml(item.back)}</p>
              </div>
              <div class="module-card-footer">
                <span></span>
                <div style="display:flex; gap:6px;">
                  <button class="record-update" data-edit-fc="${item.id}">Edit</button>
                  <button class="record-delete" data-del-fc="${item.id}">Delete</button>
                </div>
              </div>
            </div>
          `;
        }).join("") : '<p class="empty-state">No flashcards created yet. Add flashcards above!</p>'}
      </div>
    `;

    if (editingFcId) {
      const item = flashcardsList.find((x) => x.id === editingFcId);
      if (item) {
        const form = container.querySelector(`#edit-fc-form-${item.id}`);
        const saveBtn = container.querySelector(`#save-fc-btn-${item.id}`);
        const cancelBtn = container.querySelector(`#cancel-fc-btn-${item.id}`);
        const msg = container.querySelector(`#edit-fc-msg-${item.id}`);

        const baseline = { front: item.front, back: item.back, deck: item.deck || "" };
        const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
        activeTrackers.set(item.id, tracker);

        cancelBtn.onclick = () => {
          if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
          editingFcId = null;
          renderTab("flashcards");
        };

        form.onsubmit = async (e) => {
          e.preventDefault();
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          try {
            await apiRequest(`/api/records/flashcards/${item.id}`, {
              method: "PUT",
              body: { front: form.front.value.trim(), back: form.back.value.trim(), deck: form.deck.value.trim() || undefined }
            });
            editingFcId = null;
            await loadAllNotesData();
          } catch (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
            msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes.")}</div>`;
          }
        };
      }
    }

    const form = container.querySelector("#flashcard-form");
    const msg = container.querySelector("#fc-form-msg");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await apiRequest("/api/records/flashcards", {
            method: "POST",
            body: { front: form.front.value.trim(), back: form.back.value.trim(), deck: form.deck.value.trim() || undefined }
          });
          msg.innerHTML = '<div class="result-box">Flashcard created!</div>';
          form.reset();
          await loadAllNotesData();
        } catch (err) {
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
        }
      };
    }

    container.onclick = async (e) => {
      const editBtn = e.target.closest("[data-edit-fc]");
      const delBtn = e.target.closest("[data-del-fc]");
      if (editBtn) {
        editingFcId = editBtn.dataset.editFc;
        renderTab("flashcards");
      } else if (delBtn) {
        if (confirm("Delete this flashcard?")) {
          await apiRequest(`/api/records/flashcards/${delBtn.dataset.delFc}`, { method: "DELETE" });
          if (editingFcId === delBtn.dataset.delFc) editingFcId = null;
          await loadAllNotesData();
        }
      }
    };

  } else if (tab === "quizzes") {
    container.innerHTML = `
      <div class="dashboard-section" style="margin-bottom:20px;">
        <h3>Create Practice Quiz</h3>
        <form id="quiz-form" class="tool-form">
          <div class="form-row">
            <label class="field">Quiz Title<input name="title" required placeholder="e.g. Calculus Quiz 1"></label>
            <label class="field">Subject Code (optional)<input name="subject" placeholder="e.g. MTH 101"></label>
          </div>
          <div style="border:1px solid var(--line); padding:14px; border-radius:8px; background:#fafbfc; margin-bottom:10px;">
            <p style="font-weight:700; margin-bottom:8px;">Question 1</p>
            <label class="field">Question Text<input name="q_text" required placeholder="What is the derivative of x²?"></label>
            <div class="form-row" style="margin-top:8px;">
              <label class="field">Option A<input name="opt_0" required value="2x"></label>
              <label class="field">Option B<input name="opt_1" required value="x"></label>
            </div>
            <div class="form-row">
              <label class="field">Option C<input name="opt_2" value="x^3"></label>
              <label class="field">Correct Option
                <select name="correctIndex">
                  <option value="0">Option A</option>
                  <option value="1">Option B</option>
                  <option value="2">Option C</option>
                </select>
              </label>
            </div>
          </div>
          <div id="quiz-form-msg"></div>
          <button type="submit" class="button button-primary">Save Quiz</button>
        </form>
      </div>

      <h3>Practice Quizzes (${quizzesList.length})</h3>
      <div class="record-list">
        ${quizzesList.length ? quizzesList.map((item) => {
          if (editingQuizId === item.id) {
            const q = (item.questions || [])[0] || {};
            const opts = q.options || ["", "", ""];
            return `
              <div class="view-card" id="edit-quiz-card-${item.id}">
                <h4 style="margin-top:0; margin-bottom:12px;">Edit Quiz</h4>
                <form class="tool-form" id="edit-quiz-form-${item.id}">
                  <div class="form-row">
                    <label class="field">Quiz Title<input name="title" required value="${escapeHtml(item.title)}"></label>
                    <label class="field">Subject Code (optional)<input name="subject" value="${escapeHtml(item.subject || "")}"></label>
                  </div>
                  <div style="border:1px solid var(--line); padding:12px; border-radius:8px; background:#fafbfc;">
                    <label class="field">Question 1 Text<input name="q_text" required value="${escapeHtml(q.question || "")}"></label>
                    <div class="form-row" style="margin-top:6px;">
                      <label class="field">Option A<input name="opt_0" required value="${escapeHtml(opts[0] || "")}"></label>
                      <label class="field">Option B<input name="opt_1" required value="${escapeHtml(opts[1] || "")}"></label>
                    </div>
                    <div class="form-row">
                      <label class="field">Option C<input name="opt_2" value="${escapeHtml(opts[2] || "")}"></label>
                      <label class="field">Correct Option
                        <select name="correctIndex">
                          <option value="0" ${q.correctIndex === 0 ? "selected" : ""}>Option A</option>
                          <option value="1" ${q.correctIndex === 1 ? "selected" : ""}>Option B</option>
                          <option value="2" ${q.correctIndex === 2 ? "selected" : ""}>Option C</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div id="edit-quiz-msg-${item.id}"></div>
                  <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                    <button type="submit" class="button button-primary button-small save-button" id="save-quiz-btn-${item.id}" disabled>Save Changes</button>
                    <button type="button" class="button button-quiet button-small" id="cancel-quiz-btn-${item.id}">Cancel</button>
                  </div>
                </form>
              </div>
            `;
          }

          return `
            <div class="record-item">
              <div>
                <strong>${escapeHtml(item.title)} ${item.subject ? `(${escapeHtml(item.subject)})` : ""}</strong>
                <small>${(item.questions || []).length} questions included</small>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="small-button" data-take-quiz="${item.id}">Take Quiz</button>
                <button class="record-update" data-edit-quiz="${item.id}">Edit</button>
                <button class="record-delete" data-del-quiz="${item.id}">Delete</button>
              </div>
            </div>
          `;
        }).join("") : '<p class="empty-state">No practice quizzes created yet.</p>'}
      </div>
      <div id="active-quiz-container" style="margin-top:20px;"></div>
    `;

    if (editingQuizId) {
      const item = quizzesList.find((x) => x.id === editingQuizId);
      if (item) {
        const form = container.querySelector(`#edit-quiz-form-${item.id}`);
        const saveBtn = container.querySelector(`#save-quiz-btn-${item.id}`);
        const cancelBtn = container.querySelector(`#cancel-quiz-btn-${item.id}`);
        const msg = container.querySelector(`#edit-quiz-msg-${item.id}`);

        const q = (item.questions || [])[0] || {};
        const opts = q.options || ["", "", ""];
        const baseline = {
          title: item.title,
          subject: item.subject || "",
          q_text: q.question || "",
          opt_0: opts[0] || "",
          opt_1: opts[1] || "",
          opt_2: opts[2] || "",
          correctIndex: String(q.correctIndex || 0)
        };

        const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
        activeTrackers.set(item.id, tracker);

        cancelBtn.onclick = () => {
          if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
          editingQuizId = null;
          renderTab("quizzes");
        };

        form.onsubmit = async (e) => {
          e.preventDefault();
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          try {
            const updatedOpts = [form.opt_0.value.trim(), form.opt_1.value.trim(), form.opt_2.value.trim()].filter(Boolean);
            const questions = [{
              question: form.q_text.value.trim(),
              options: updatedOpts,
              correctIndex: Number(form.correctIndex.value)
            }];

            await apiRequest(`/api/records/quizzes/${item.id}`, {
              method: "PUT",
              body: { title: form.title.value.trim(), subject: form.subject.value.trim() || undefined, questions }
            });
            editingQuizId = null;
            await loadAllNotesData();
          } catch (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
            msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes.")}</div>`;
          }
        };
      }
    }

    const form = container.querySelector("#quiz-form");
    const msg = container.querySelector("#quiz-form-msg");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const opts = [form.opt_0.value.trim(), form.opt_1.value.trim(), form.opt_2.value.trim()].filter(Boolean);
          const questions = [{
            question: form.q_text.value.trim(),
            options: opts,
            correctIndex: Number(form.correctIndex.value)
          }];

          await apiRequest("/api/records/quizzes", {
            method: "POST",
            body: { title: form.title.value.trim(), subject: form.subject.value.trim() || undefined, questions }
          });
          msg.innerHTML = '<div class="result-box">Quiz created!</div>';
          form.reset();
          await loadAllNotesData();
        } catch (err) {
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
        }
      };
    }

    container.onclick = async (e) => {
      const takeBtn = e.target.closest("[data-take-quiz]");
      const editBtn = e.target.closest("[data-edit-quiz]");
      const delBtn = e.target.closest("[data-del-quiz]");

      if (takeBtn) {
        const id = takeBtn.dataset.takeQuiz;
        const quiz = quizzesList.find((q) => q.id === id);
        if (quiz) renderActiveQuiz(quiz);
      } else if (editBtn) {
        editingQuizId = editBtn.dataset.editQuiz;
        renderTab("quizzes");
      } else if (delBtn) {
        if (confirm("Delete quiz?")) {
          await apiRequest(`/api/records/quizzes/${delBtn.dataset.delQuiz}`, { method: "DELETE" });
          if (editingQuizId === delBtn.dataset.delQuiz) editingQuizId = null;
          await loadAllNotesData();
        }
      }
    };

  } else if (tab === "revision") {
    container.innerHTML = `
      <div class="dashboard-section" style="margin-bottom:20px;">
        <h3>Add Revision Topic</h3>
        <form id="revision-form" class="tool-form">
          <div class="form-row">
            <label class="field">Topic Name<input name="topic" required placeholder="e.g. Differential Equations"></label>
            <label class="field">Subject Code (optional)<input name="subject" placeholder="e.g. MTH 201"></label>
          </div>
          <div class="form-row">
            <label class="field">Priority
              <select name="priority"><option value="High">High</option><option value="Medium" selected>Medium</option><option value="Low">Low</option></select>
            </label>
            <label class="field">Target Date<input type="date" name="targetDate" required></label>
          </div>
          <div id="rev-form-msg"></div>
          <button type="submit" class="button button-primary">Save Revision Topic</button>
        </form>
      </div>

      <h3>Revision Plans (${revisionList.length})</h3>
      <div class="record-list">
        ${revisionList.length ? revisionList.map((item) => {
          if (editingRevId === item.id) {
            return `
              <div class="view-card" id="edit-rev-card-${item.id}">
                <h4 style="margin-top:0; margin-bottom:12px;">Edit Revision Topic</h4>
                <form class="tool-form" id="edit-rev-form-${item.id}">
                  <div class="form-row">
                    <label class="field">Topic Name<input name="topic" required value="${escapeHtml(item.topic)}"></label>
                    <label class="field">Subject Code (optional)<input name="subject" value="${escapeHtml(item.subject || "")}"></label>
                  </div>
                  <div class="form-row">
                    <label class="field">Priority
                      <select name="priority">
                        <option value="High" ${item.priority === "High" ? "selected" : ""}>High</option>
                        <option value="Medium" ${item.priority === "Medium" ? "selected" : ""}>Medium</option>
                        <option value="Low" ${item.priority === "Low" ? "selected" : ""}>Low</option>
                      </select>
                    </label>
                    <label class="field">Target Date<input type="date" name="targetDate" required value="${escapeHtml(item.targetDate)}"></label>
                  </div>
                  <div id="edit-rev-msg-${item.id}"></div>
                  <div class="inline-actions" style="margin-top:12px; display:flex; gap:10px;">
                    <button type="submit" class="button button-primary button-small save-button" id="save-rev-btn-${item.id}" disabled>Save Changes</button>
                    <button type="button" class="button button-quiet button-small" id="cancel-rev-btn-${item.id}">Cancel</button>
                  </div>
                </form>
              </div>
            `;
          }

          return `
            <div class="record-item">
              <div>
                <strong>${escapeHtml(item.topic)} ${item.subject ? `(${escapeHtml(item.subject)})` : ""}</strong>
                <small>Priority: <strong>${escapeHtml(item.priority)}</strong> | Target Date: ${escapeHtml(item.targetDate)} | Status: ${escapeHtml(item.status)}</small>
              </div>
              <div style="display:flex; gap:6px;">
                <button class="record-update" data-edit-rev="${item.id}">Edit</button>
                <button class="record-delete" data-del-rev="${item.id}">Delete</button>
              </div>
            </div>
          `;
        }).join("") : '<p class="empty-state">No revision topics added yet.</p>'}
      </div>
    `;

    if (editingRevId) {
      const item = revisionList.find((x) => x.id === editingRevId);
      if (item) {
        const form = container.querySelector(`#edit-rev-form-${item.id}`);
        const saveBtn = container.querySelector(`#save-rev-btn-${item.id}`);
        const cancelBtn = container.querySelector(`#cancel-rev-btn-${item.id}`);
        const msg = container.querySelector(`#edit-rev-msg-${item.id}`);

        const baseline = { topic: item.topic, subject: item.subject || "", priority: item.priority, targetDate: item.targetDate };
        const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baseline });
        activeTrackers.set(item.id, tracker);

        cancelBtn.onclick = () => {
          if (tracker.hasChanged() && !confirm("Discard unsaved changes?")) return;
          editingRevId = null;
          renderTab("revision");
        };

        form.onsubmit = async (e) => {
          e.preventDefault();
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          try {
            await apiRequest(`/api/records/revision-plans/${item.id}`, {
              method: "PUT",
              body: {
                topic: form.topic.value.trim(),
                subject: form.subject.value.trim() || undefined,
                priority: form.priority.value,
                targetDate: form.targetDate.value,
                status: item.status || "Not started"
              }
            });
            editingRevId = null;
            await loadAllNotesData();
          } catch (err) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes";
            msg.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes.")}</div>`;
          }
        };
      }
    }

    const form = container.querySelector("#revision-form");
    const msg = container.querySelector("#rev-form-msg");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await apiRequest("/api/records/revision-plans", {
            method: "POST",
            body: {
              topic: form.topic.value.trim(),
              subject: form.subject.value.trim() || undefined,
              priority: form.priority.value,
              targetDate: form.targetDate.value,
              status: "Not started"
            }
          });
          msg.innerHTML = '<div class="result-box">Revision topic added!</div>';
          form.reset();
          await loadAllNotesData();
        } catch (err) {
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
        }
      };
    }

    container.onclick = async (e) => {
      const editBtn = e.target.closest("[data-edit-rev]");
      const delBtn = e.target.closest("[data-del-rev]");

      if (editBtn) {
        editingRevId = editBtn.dataset.editRev;
        renderTab("revision");
      } else if (delBtn) {
        if (confirm("Delete revision topic?")) {
          await apiRequest(`/api/records/revision-plans/${delBtn.dataset.delRev}`, { method: "DELETE" });
          if (editingRevId === delBtn.dataset.delRev) editingRevId = null;
          await loadAllNotesData();
        }
      }
    };

  } else if (tab === "checklists") {
    container.innerHTML = `
      <div class="dashboard-section" style="margin-bottom:20px;">
        <h3>Add Topic Checklist Entry</h3>
        <form id="checklist-form" class="tool-form">
          <div class="form-row">
            <label class="field">Subject Code<input name="subject" required placeholder="e.g. CSC 201"></label>
            <label class="field">Syllabus Topic<input name="topic" required placeholder="e.g. Object-Oriented Inheritance"></label>
          </div>
          <div id="chk-form-msg"></div>
          <button type="submit" class="button button-primary">Add Topic</button>
        </form>
      </div>

      <h3>Topic Checklists (${checklistsList.length})</h3>
      <div class="record-list">
        ${checklistsList.length ? checklistsList.map((item) => `
          <div class="record-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="checkbox" ${item.completed ? "checked" : ""} data-toggle-chk="${item.id}" style="width:18px; height:18px; cursor:pointer;">
              <div>
                <strong style="${item.completed ? "text-decoration:line-through; color:var(--muted);" : ""}">${escapeHtml(item.topic)} (${escapeHtml(item.subject)})</strong>
              </div>
            </div>
            <button class="record-delete" data-del-chk="${item.id}">Delete</button>
          </div>
        `).join("") : '<p class="empty-state">No topic checklists added yet.</p>'}
      </div>
    `;

    const form = container.querySelector("#checklist-form");
    const msg = container.querySelector("#chk-form-msg");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await apiRequest("/api/records/topic-checklists", {
            method: "POST",
            body: { subject: form.subject.value.trim(), topic: form.topic.value.trim(), completed: false }
          });
          msg.innerHTML = '<div class="result-box">Topic added!</div>';
          form.reset();
          await loadAllNotesData();
        } catch (err) {
          msg.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
        }
      };
    }

    container.onclick = async (e) => {
      const delBtn = e.target.closest("[data-del-chk]");
      const chkBox = e.target.closest("[data-toggle-chk]");

      if (delBtn) {
        if (confirm("Delete topic?")) {
          await apiRequest(`/api/records/topic-checklists/${delBtn.dataset.delChk}`, { method: "DELETE" });
          await loadAllNotesData();
        }
      } else if (chkBox) {
        const item = checklistsList.find((c) => c.id === chkBox.dataset.toggleChk);
        if (item) {
          try {
            await apiRequest(`/api/records/topic-checklists/${item.id}`, {
              method: "PUT",
              body: { subject: item.subject, topic: item.topic, completed: chkBox.checked }
            });
            await loadAllNotesData();
          } catch (err) {
            alert(err.message || "Could not update checklist.");
          }
        }
      }
    };
  }
}

function renderActiveQuiz(quiz) {
  const container = document.querySelector("#active-quiz-container");
  container.scrollIntoView({ behavior: "smooth" });

  const qList = quiz.questions || [];
  container.innerHTML = `
    <div class="dashboard-section" style="border:2px solid var(--blue);">
      <h3>Taking Quiz: ${escapeHtml(quiz.title)}</h3>
      <form id="take-quiz-form">
        ${qList.map((q, idx) => `
          <div style="margin-bottom:16px;">
            <p style="font-weight:700;">Question ${idx + 1}: ${escapeHtml(q.question)}</p>
            ${(q.options || []).map((opt, oIdx) => `
              <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-weight:normal; cursor:pointer;">
                <input type="radio" name="q_${idx}" value="${oIdx}" required style="width:auto; min-height:auto;">
                <span>${escapeHtml(opt)}</span>
              </label>
            `).join("")}
          </div>
        `).join("")}
        <button type="submit" class="button button-primary">Submit Quiz</button>
        <div id="quiz-result-out" style="margin-top:14px;"></div>
      </form>
    </div>
  `;

  document.querySelector("#take-quiz-form").onsubmit = (e) => {
    e.preventDefault();
    let score = 0;
    qList.forEach((q, idx) => {
      const selected = e.target[`q_${idx}`].value;
      if (Number(selected) === q.correctIndex) score++;
    });
    document.querySelector("#quiz-result-out").innerHTML = `
      <div class="result-box">
        <strong>Your Score: ${score} / ${qList.length} (${Math.round((score / qList.length) * 100)}%)</strong>
      </div>
    `;
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("notes");

  document.querySelector("#notes-tabs").onclick = (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    renderTab(btn.dataset.tab);
  };

  renderTab("notes");
  void loadAllNotesData();
});
