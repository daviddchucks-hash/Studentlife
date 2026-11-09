import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

const panel = document.querySelector("#coursemate-panel");
const statusRoot = document.querySelector("#coursemate-status");
const discoverableToggle = document.querySelector("#coursemate-discoverable");
let courses = [];
let currentSection = "students";
let selectedGroupId = new URLSearchParams(location.search).get("group") || "";
let selectedQuestionId = new URLSearchParams(location.search).get("question") || "";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function showStatus(message, type = "info") {
  const className = type === "error" ? "error-box" : type === "success" ? "result-box" : "info-box";
  statusRoot.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
}

function showPanelError(error) {
  panel.insertAdjacentHTML("afterbegin", `<div class="error-box">${escapeHtml(error.message || "The request could not be completed.")}</div>`);
}

function courseOptions(selected = "") {
  return `<option value="">Select a registered course</option>${courses.map((course) => `
    <option value="${escapeHtml(course.code)}" ${course.code === selected ? "selected" : ""}>${escapeHtml(course.code)} — ${escapeHtml(course.title)}</option>
  `).join("")}`;
}

function selectedValues(form, name) {
  return [...form.querySelector(`[name="${name}"]`).selectedOptions].map((option) => option.value);
}

async function loadProfileSetting() {
  const { profile } = await apiRequest("/api/coursemate/profile");
  discoverableToggle.checked = profile.discoverable === true;
}

async function loadStudents() {
  panel.innerHTML = `
    <section class="dashboard-section">
      <h2>Find classmates</h2>
      <form id="student-search-form" class="tool-form">
        <div class="form-row">
          <label class="field">Course<select name="courseCode" required>${courseOptions()}</select></label>
          <label class="field">Department<input name="department" placeholder="Optional filter"></label>
          <label class="field">Level<input name="level" placeholder="Optional filter"></label>
        </div>
        <button class="button button-primary" type="submit">Find students</button>
      </form>
      <div id="student-results" style="margin-top:16px;"><p class="muted">Choose one of your registered courses to discover opted-in classmates.</p></div>
    </section>
  `;
}

function studentCards(items, { groupId = "" } = {}) {
  if (!items.length) return '<p class="empty-state">No discoverable classmates found for those filters.</p>';
  return `<div class="card-grid">${items.map((student) => `
    <article class="module-card">
      <div class="module-card-head">
        <h3 class="module-card-title">${escapeHtml(student.displayName || "Student")}</h3>
        ${student.profilePicture ? `<img src="${escapeHtml(student.profilePicture)}" alt="" width="44" height="44" loading="lazy" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover;">` : ""}
      </div>
      <p class="muted">${escapeHtml(student.department || "Department not set")} · Level ${escapeHtml(student.level || "Not set")}</p>
      ${student.bio ? `<p>${escapeHtml(student.bio)}</p>` : ""}
      ${student.interests ? `<p class="muted">Interests: ${escapeHtml(student.interests)}</p>` : ""}
      ${student.sharedCourses?.length ? `<p class="muted">Shared courses: ${student.sharedCourses.map((course) => escapeHtml(course.code)).join(", ")}</p>` : ""}
      <div class="inline-actions">
        ${student.studentId ? `<button class="button button-quiet button-small" type="button" data-public-profile="${escapeHtml(student.studentId)}" data-course-code="${escapeHtml(student.sharedCourses?.[0]?.code || student.sharedCourse || "")}">View public profile</button>` : ""}
        ${student.studentId ? `<button class="button button-primary button-small" type="button" data-partner-request="${escapeHtml(student.studentId)}" data-course-code="${escapeHtml(student.sharedCourse || student.sharedCourses?.[0]?.code || "")}">Connect as study partners</button>` : ""}
        ${groupId && student.studentId ? `<button class="button button-quiet button-small" type="button" data-invite-student="${escapeHtml(student.studentId)}" data-group-id="${escapeHtml(groupId)}">Invite to group</button>` : ""}
        ${student.studentId && student.sharedCourses?.[0]?.code ? `<button class="button button-quiet button-small" type="button" data-report-profile="${escapeHtml(student.studentId)}" data-course-code="${escapeHtml(student.sharedCourses[0].code)}">Report profile</button>` : ""}
      </div>
    </article>
  `).join("")}</div>`;
}

async function loadGroups() {
  if (selectedGroupId) return loadGroup(selectedGroupId);
  panel.innerHTML = `
    <section class="dashboard-section">
      <h2>Study groups</h2>
      <form id="group-filter-form" class="tool-form">
        <div class="form-row">
          <label class="field">Course<select name="courseCode">${courseOptions()}</select></label>
          <label class="field">Department<input name="department" placeholder="Filter"></label>
          <label class="field">Level<input name="level" placeholder="Filter"></label>
        </div>
        <button class="button button-quiet button-small" type="submit">Filter groups</button>
      </form>
      <div id="group-list" style="margin-top:16px;"><p class="muted">Loading groups…</p></div>
    </section>
    <section class="dashboard-section">
      <h2>Create a study group</h2>
      <form id="group-create-form" class="tool-form">
        <div class="form-row">
          <label class="field">Group name<input name="groupName" required maxlength="100"></label>
          <label class="field">Registered course<select name="courseCode" required>${courseOptions()}</select></label>
        </div>
        <div class="form-row">
          <label class="field">Visibility<select name="visibility" required><option value="public">Public — students taking the course can join</option><option value="private">Private — invitation or approval required</option></select></label>
          <label class="field">Maximum members<input type="number" name="maxMembers" min="0" max="100" value="0"><small>0 means no set limit.</small></label>
        </div>
        <label class="field">Description<textarea name="description" rows="3" maxlength="1500"></textarea></label>
        <label class="field">Group rules<textarea name="rules" rows="3" maxlength="1500"></textarea></label>
        <div id="group-create-message"></div>
        <button class="button button-primary" type="submit">Create group</button>
      </form>
    </section>
  `;
  const result = await apiRequest("/api/coursemate/groups");
  renderGroupList(result.items || []);
}

function renderGroupList(items) {
  const list = panel.querySelector("#group-list");
  if (!list) return;
  list.innerHTML = items.length ? `<div class="card-grid">${items.map((group) => `
    <article class="module-card">
      <div class="module-card-head">
        <h3 class="module-card-title">${escapeHtml(group.groupName)}</h3>
        <span class="pill-badge">${escapeHtml(group.visibility)}</span>
      </div>
      <p><strong>${escapeHtml(group.courseCode)}</strong> · ${escapeHtml(group.courseTitle || "")}</p>
      <p class="muted">${escapeHtml(group.department || "")} · Level ${escapeHtml(group.level || "")}</p>
      <p>${escapeHtml(group.description || "No description provided.")}</p>
      <p class="muted">${group.role ? `Your role: ${escapeHtml(group.role)}` : "Not a member"}</p>
      <button class="button button-primary button-small" type="button" data-open-group="${escapeHtml(group.id)}">Open group</button>
    </article>
  `).join("")}</div>` : '<p class="empty-state">No study groups found for your registered courses yet. Create one to get started.</p>';
}

async function loadGroup(groupId) {
  selectedGroupId = groupId;
  const [detail, messages, revisions] = await Promise.all([
    apiRequest(`/api/coursemate/groups/${groupId}`),
    apiRequest(`/api/coursemate/groups/${groupId}/messages?limit=30`),
    apiRequest(`/api/coursemate/groups/${groupId}/revisions`)
  ]);
  const group = detail.group;
  const isMember = Boolean(detail.role);
  let requestsMarkup = "";
  if (["owner", "moderator"].includes(detail.role)) {
    const requestData = await apiRequest(`/api/coursemate/groups/${groupId}/requests`);
    requestsMarkup = `
      <section class="dashboard-section">
        <h3>Membership requests</h3>
        ${requestData.items.length ? requestData.items.map((item) => `
          <div class="record-item">
            <span>${escapeHtml(item.profile?.displayName || "Student")} requested to join · ${new Date(item.requestedAt).toLocaleString()}</span>
            <span class="inline-actions">
              <button type="button" class="button button-small button-primary" data-join-decision="approve" data-group-id="${escapeHtml(groupId)}" data-student-id="${escapeHtml(item.uid)}">Approve</button>
              <button type="button" class="button button-small button-quiet" data-join-decision="reject" data-group-id="${escapeHtml(groupId)}" data-student-id="${escapeHtml(item.uid)}">Reject</button>
            </span>
          </div>
        `).join("") : '<p class="muted">No pending requests.</p>'}
      </section>
      <section class="dashboard-section">
        <h3>Invite a classmate</h3>
        <button class="button button-quiet button-small" type="button" data-load-group-classmates="${escapeHtml(groupId)}" data-course-code="${escapeHtml(group.courseCode)}">Find eligible classmates to invite</button>
        <div id="group-classmates"></div>
      </section>
    `;
  }
  panel.innerHTML = `
    <section class="dashboard-section">
      <button class="button button-quiet button-small" type="button" data-back-groups>← All groups</button>
      <h2>${escapeHtml(group.groupName)}</h2>
      <p><strong>${escapeHtml(group.courseCode)}</strong> · ${escapeHtml(group.courseTitle || "")} · ${escapeHtml(group.visibility)} group</p>
      <p>${escapeHtml(group.description || "")}</p>
      ${group.rules ? `<p class="muted">Group rules: ${escapeHtml(group.rules)}</p>` : ""}
      ${isMember ? `<p class="muted">Your role: ${escapeHtml(detail.role)}</p>` : detail.joinRequestStatus === "pending" ? `<p class="info-box">Your request is pending approval.</p><button type="button" class="button button-quiet button-small" data-cancel-join-request="${escapeHtml(groupId)}">Cancel request</button>` : `<button type="button" class="button button-primary button-small" data-join-group="${escapeHtml(groupId)}">${group.visibility === "public" ? "Join group" : "Request to join"}</button>`}
      ${isMember ? `<section><h3>Members</h3>${(detail.members || []).map((member) => `<div class="record-item"><span>${escapeHtml(member.displayName)} · ${escapeHtml(member.role)}</span>${["owner", "moderator"].includes(detail.role) && member.role !== "owner" ? `<span class="inline-actions">${detail.role === "owner" ? `<button type="button" class="button button-small button-quiet" data-member-role="${escapeHtml(member.uid)}" data-role="${member.role === "moderator" ? "member" : "moderator"}">${member.role === "moderator" ? "Remove moderator" : "Make moderator"}</button><button type="button" class="button button-small button-quiet" data-transfer-owner="${escapeHtml(member.uid)}">Transfer ownership</button>` : ""}<button type="button" class="record-delete" data-remove-member="${escapeHtml(member.uid)}">Remove</button></span>` : ""}</div>`).join("")}</section>` : ""}
      ${detail.role && detail.role !== "owner" ? `<button type="button" class="button button-quiet button-small" data-leave-group="${escapeHtml(groupId)}">Leave group</button>` : ""}
      <div id="group-action-message"></div>
    </section>
    ${isMember ? `
      <section class="dashboard-section">
        <h3>Group discussion</h3>
        <div id="group-messages" class="record-list">${renderMessages(messages.items || [], groupId)}</div>
        ${messages.hasMore ? `<button class="button button-quiet button-small" type="button" data-older-messages="${escapeHtml(groupId)}" data-before="${escapeHtml(messages.nextCursor)}">Load older messages</button>` : ""}
        <form id="group-message-form" class="tool-form" style="margin-top:12px;">
          <label class="field">Message<textarea name="content" rows="3" maxlength="3000" required placeholder="Ask a question or share an explanation."></textarea></label>
          <label class="field">Approved NoteSync note ID (optional)<input name="noteId" placeholder="Share an approved note for this course"></label>
          <button class="button button-primary button-small" type="submit">Send message</button>
        </form>
      </section>
      ${requestsMarkup}
    ` : `<section class="dashboard-section"><p class="muted">Join the group to view its discussion, membership requests, and revision sessions.</p></section>`}
    ${renderRevisions(revisions.items || [], group, detail.role)}
  `;
}

function renderMessages(items, groupId) {
  if (!items.length) return '<p class="empty-state">No discussion messages yet.</p>';
  return items.map((message) => `
    <article class="record-item" data-message-item="${escapeHtml(message.id)}">
      <div>
        <strong>${escapeHtml(message.authorName || "Student")}</strong>
        <small>${new Date(message.createdAt).toLocaleString()}${message.updatedAt ? " · edited" : ""}</small>
        <p style="white-space:pre-wrap;">${escapeHtml(message.content)}</p>
        ${message.noteId ? `<p><a class="text-link" href="./notesync.html?note=${encodeURIComponent(message.noteId)}">Open approved NoteSync note</a></p>` : ""}
      </div>
      <div class="inline-actions">
        ${message.isMine ? `<button type="button" class="record-update" data-edit-message="${escapeHtml(message.id)}" data-group-id="${escapeHtml(groupId)}" data-content="${escapeHtml(message.content)}">Edit</button><button type="button" class="record-delete" data-delete-message="${escapeHtml(message.id)}" data-group-id="${escapeHtml(groupId)}">Delete</button>` : ""}
        <button type="button" class="button button-quiet button-small" data-report-message="${escapeHtml(message.id)}" data-group-id="${escapeHtml(groupId)}">Report</button>
      </div>
    </article>
  `).join("");
}

function renderRevisions(items, group, role) {
  return `
    <section class="dashboard-section">
      <h3>Group revision sessions</h3>
      ${items.length ? items.map((session) => `
        <article class="module-card">
          <h4>${escapeHtml(session.title)}</h4>
          <p>${escapeHtml(session.courseCode)} · ${escapeHtml(session.topic)}</p>
          <p class="muted">${escapeHtml(session.date)} · ${escapeHtml(session.start)}–${escapeHtml(session.end)} · ${escapeHtml(session.location)}</p>
          ${session.meetingUrl ? `<p><a class="text-link" href="${escapeHtml(session.meetingUrl)}" target="_blank" rel="noopener noreferrer">Open meeting link</a></p>` : ""}
          ${role ? `<div class="inline-actions"><button type="button" class="button button-small button-quiet" data-revision-rsvp="going" data-revision-id="${escapeHtml(session.id)}" data-group-id="${escapeHtml(group.id)}">Going</button><button type="button" class="button button-small button-quiet" data-revision-rsvp="maybe" data-revision-id="${escapeHtml(session.id)}" data-group-id="${escapeHtml(group.id)}">Maybe</button><button type="button" class="button button-small button-quiet" data-revision-rsvp="not-going" data-revision-id="${escapeHtml(session.id)}" data-group-id="${escapeHtml(group.id)}">Not going</button></div>` : ""}
          ${["owner", "moderator"].includes(role) ? `<div class="inline-actions"><button type="button" class="button button-small button-quiet" data-edit-revision="${escapeHtml(session.id)}" data-title="${escapeHtml(session.title)}" data-topic="${escapeHtml(session.topic)}" data-date="${escapeHtml(session.date)}" data-start="${escapeHtml(session.start)}" data-end="${escapeHtml(session.end)}" data-location="${escapeHtml(session.location)}" data-meeting-url="${escapeHtml(session.meetingUrl || "")}" data-description="${escapeHtml(session.description || "")}">Edit session</button><button type="button" class="record-delete" data-cancel-revision="${escapeHtml(session.id)}">Cancel session</button></div>` : ""}
        </article>
      `).join("") : '<p class="empty-state">No revision sessions scheduled.</p>'}
      ${["owner", "moderator"].includes(role) ? `
        <form id="revision-form" class="tool-form" style="margin-top:16px;">
          <h4>Schedule group revision</h4>
          <div class="form-row"><label class="field">Title<input name="title" required maxlength="160"></label><label class="field">Topic<input name="topic" required maxlength="160"></label></div>
          <div class="form-row"><label class="field">Date<input type="date" name="date" required></label><label class="field">Location or online details<input name="location" required maxlength="200"></label></div>
          <div class="form-row"><label class="field">Start<input type="time" name="start" required></label><label class="field">End<input type="time" name="end" required></label></div>
          <label class="field">HTTPS meeting link (optional)<input type="url" name="meetingUrl" placeholder="https://..."></label>
          <label class="field">Description<textarea name="description" rows="2" maxlength="1500"></textarea></label>
          <button type="submit" class="button button-primary button-small">Schedule revision</button>
        </form>
      ` : ""}
    </section>
  `;
}

async function loadQuestions() {
  if (selectedQuestionId) return loadQuestion(selectedQuestionId);
  panel.innerHTML = `
    <section class="dashboard-section">
      <h2>Academic questions</h2>
      <form id="question-filter-form" class="tool-form">
        <div class="form-row">
          <label class="field">Course<select name="courseCode">${courseOptions()}</select></label>
          <label class="field">Search<input name="search" placeholder="Question, topic, or keyword"></label>
          <label class="field"><span>Show unanswered</span><input type="checkbox" name="unanswered" value="true"></label>
        </div>
        <button class="button button-quiet button-small" type="submit">Search questions</button>
      </form>
      <div id="question-list" style="margin-top:16px;"><p class="muted">Loading questions…</p></div>
    </section>
    <section class="dashboard-section">
      <h2>Ask a course question</h2>
      <form id="question-create-form" class="tool-form">
        <label class="field">Registered course<select name="courseCode" required>${courseOptions()}</select></label>
        <div class="form-row"><label class="field">Title<input name="title" required maxlength="180"></label><label class="field">Topic<input name="topic" required maxlength="160"></label></div>
        <label class="field">Question details<textarea name="details" rows="4" required maxlength="5000"></textarea></label>
        <div id="question-create-message"></div>
        <button class="button button-primary" type="submit">Post question</button>
      </form>
    </section>
  `;
  const result = await apiRequest("/api/coursemate/questions?limit=25");
  renderQuestionList(result.items || []);
}

function renderQuestionList(items) {
  const root = panel.querySelector("#question-list");
  if (!root) return;
  root.innerHTML = items.length ? `<div class="record-list">${items.map((question) => `
    <article class="record-item">
      <div><strong>${escapeHtml(question.title)}</strong><small>${escapeHtml(question.courseCode)} · ${escapeHtml(question.topic)} · ${escapeHtml(question.authorName || "Student")} · ${new Date(question.createdAt).toLocaleString()}</small><p>${escapeHtml(question.details)}</p><small>${Number(question.answerCount) || 0} answers ${question.acceptedAnswerId ? "· helpful answer selected" : ""}</small></div>
      <div class="inline-actions"><button class="button button-primary button-small" type="button" data-open-question="${escapeHtml(question.id)}">View answers</button>${question.isMine ? `<button class="button button-quiet button-small" type="button" data-edit-question="${escapeHtml(question.id)}" data-title="${escapeHtml(question.title)}" data-topic="${escapeHtml(question.topic)}" data-details="${escapeHtml(question.details)}">Edit</button><button class="record-delete" type="button" data-delete-question="${escapeHtml(question.id)}">Delete</button>` : ""}<button class="button button-quiet button-small" type="button" data-report-question="${escapeHtml(question.id)}">Report</button></div>
    </article>
  `).join("")}</div>` : '<p class="empty-state">No questions match those filters yet.</p>';
}

async function loadQuestion(questionId) {
  selectedQuestionId = questionId;
  const { question } = await apiRequest(`/api/coursemate/questions/${questionId}`);
  const answers = await apiRequest(`/api/coursemate/questions/${questionId}/answers`);
  panel.innerHTML = `
    <section class="dashboard-section">
      <button type="button" class="button button-quiet button-small" data-back-questions>← All questions</button>
      <h2>${escapeHtml(question.title)}</h2>
      <p>${escapeHtml(question.courseCode)} · ${escapeHtml(question.topic)} · ${escapeHtml(question.authorName || "Student")}</p>
      <p style="white-space:pre-wrap;">${escapeHtml(question.details)}</p>
      ${question.isMine ? `<div class="inline-actions"><button type="button" class="button button-quiet button-small" data-edit-question="${escapeHtml(question.id)}" data-title="${escapeHtml(question.title)}" data-topic="${escapeHtml(question.topic)}" data-details="${escapeHtml(question.details)}">Edit question</button><button type="button" class="record-delete" data-delete-question="${escapeHtml(question.id)}">Delete question</button></div>` : `<button type="button" class="button button-quiet button-small" data-report-question="${escapeHtml(question.id)}">Report question</button>`}
      <div id="answer-list" class="record-list" style="margin-top:16px;">${renderAnswers(answers.items || [], question)}</div>
      ${question.isMine ? "" : `
        <form id="answer-form" class="tool-form" style="margin-top:16px;">
          <label class="field">Your explanation<textarea name="content" rows="4" required maxlength="5000"></textarea></label>
          <button class="button button-primary button-small" type="submit">Submit answer</button>
        </form>
      `}
    </section>
  `;
}

function renderAnswers(items, question) {
  if (!items.length) return '<p class="empty-state">No explanations yet. Share a clear solution or example.</p>';
  return items.map((answer) => `
    <article class="record-item">
      <div><strong>${escapeHtml(answer.authorName || "Student")}${answer.accepted ? " · Marked helpful by question owner" : ""}</strong><small>${new Date(answer.createdAt).toLocaleString()}</small><p style="white-space:pre-wrap;">${escapeHtml(answer.content)}</p></div>
      <div class="inline-actions">
        ${question.isMine && !answer.accepted ? `<button class="button button-small button-primary" type="button" data-select-answer="${escapeHtml(answer.id)}">Mark helpful</button>` : ""}
        ${answer.isMine ? `<button class="record-delete" type="button" data-delete-answer="${escapeHtml(answer.id)}">Delete</button>` : ""}
        <button class="button button-quiet button-small" type="button" data-report-answer="${escapeHtml(answer.id)}" data-question-id="${escapeHtml(question.id)}">Report</button>
      </div>
    </article>
  `).join("");
}

async function loadPartners() {
  const [profileResult, requests] = await Promise.all([
    apiRequest("/api/coursemate/partner-profile"),
    apiRequest("/api/coursemate/partner-requests")
  ]);
  const profile = profileResult.profile || {};
  const multiSelect = (name, selected) => `<select name="${name}" multiple size="4">${courses.map((course) => `<option value="${escapeHtml(course.code)}" ${(selected || []).includes(course.code) ? "selected" : ""}>${escapeHtml(course.code)} — ${escapeHtml(course.title)}</option>`).join("")}</select>`;
  panel.innerHTML = `
    <section class="dashboard-section">
      <h2>Study partner profile</h2>
      <form id="partner-profile-form" class="tool-form">
        <div class="form-row"><label class="field">Courses I want help with${multiSelect("coursesSeeking", profile.coursesSeeking)}</label><label class="field">Courses I can help with${multiSelect("coursesOffering", profile.coursesOffering)}</label></div>
        <label class="field">Preferred study method<input name="method" maxlength="100" value="${escapeHtml(profile.method || "")}" placeholder="In-person, online, problem solving…"></label>
        <label class="field">Interests<input name="interests" maxlength="300" value="${escapeHtml(profile.interests || "")}"></label>
        <label class="field">Availability (optional)<input name="availability" maxlength="300" value="${escapeHtml(profile.availability || "")}"></label>
        <label class="field">Short introduction<textarea name="introduction" rows="3" maxlength="500">${escapeHtml(profile.introduction || "")}</textarea></label>
        <label class="field"><span>Show my study-partner profile in discovery</span><input type="checkbox" name="discoverable" ${profile.discoverable ? "checked" : ""}></label>
        <div id="partner-profile-message"></div><button class="button button-primary" type="submit">Save partner profile</button>
      </form>
    </section>
    <section class="dashboard-section">
      <h2>Find a study partner</h2>
      <form id="partner-search-form" class="tool-form"><label class="field">Registered course<select name="courseCode" required>${courseOptions()}</select></label><button class="button button-primary button-small" type="submit">Search partners</button></form>
      <div id="partner-results" style="margin-top:12px;"></div>
    </section>
    <section class="dashboard-section">
      <h2>Requests and connections</h2>
      <h3>Incoming requests</h3>
      ${(requests.incoming || []).filter((item) => item.status === "pending").map((item) => `
        <div class="record-item"><span>${escapeHtml(item.profile?.displayName || "Student")} sent a request.</span><span class="inline-actions"><button class="button button-small button-primary" type="button" data-partner-decision="accept" data-sender="${escapeHtml(item.senderUid)}">Accept</button><button class="button button-small button-quiet" type="button" data-partner-decision="decline" data-sender="${escapeHtml(item.senderUid)}">Decline</button><button class="record-delete" type="button" data-block-partner="${escapeHtml(item.senderUid)}">Block</button></span></div>
      `).join("") || '<p class="muted">No pending requests.</p>'}
      <h3>Outgoing requests</h3>
      ${(requests.outgoing || []).filter((item) => item.status === "pending").map((item) => `<div class="record-item"><span>Request to ${escapeHtml(item.recipientUid)} · ${escapeHtml(item.courseCode)}</span><button class="record-delete" type="button" data-cancel-partner-request="${escapeHtml(item.recipientUid)}">Cancel request</button></div>`).join("") || '<p class="muted">No pending outgoing requests.</p>'}
      <h3>Blocked study-partner requests</h3>
      ${(requests.blocked || []).map((uid) => `<div class="record-item"><span>Student ${escapeHtml(uid)}</span><button class="button button-small button-quiet" type="button" data-unblock-partner="${escapeHtml(uid)}">Unblock</button></div>`).join("") || '<p class="muted">No blocked students.</p>'}
      <h3>Active connections</h3>
      ${(requests.connections || []).map((connection) => `<div class="record-item"><span>${escapeHtml(connection.profile?.displayName || "Connected student")}</span><button class="record-delete" type="button" data-disconnect="${escapeHtml(connection.uid)}">Disconnect</button></div>`).join("") || '<p class="muted">No active study-partner connections.</p>'}
    </section>
  `;
}

async function loadNotifications() {
  const [notifications, invitations] = await Promise.all([
    apiRequest("/api/coursemate/notifications"),
    apiRequest("/api/coursemate/invitations")
  ]);
  panel.innerHTML = `
    <section class="dashboard-section">
      <h2>Notifications</h2>
      ${(notifications.items || []).length ? `<div class="record-list">${notifications.items.map((item) => `
        <article class="record-item"><div><strong>${escapeHtml(item.title)}</strong><small>${new Date(item.createdAt).toLocaleString()} · ${item.read ? "Read" : "Unread"}</small><p>${escapeHtml(item.message)}</p></div>${item.read ? "" : `<button class="button button-quiet button-small" type="button" data-read-notification="${escapeHtml(item.id)}">Mark read</button>`}</article>
      `).join("")}</div>` : '<p class="empty-state">No notifications.</p>'}
    </section>
    <section class="dashboard-section">
      <h2>Study-group invitations</h2>
      ${(invitations.items || []).map((item) => `<div class="record-item"><span>${escapeHtml(item.groupName)} · ${escapeHtml(item.courseCode)}</span><span class="inline-actions"><button class="button button-small button-primary" type="button" data-invitation="${escapeHtml(item.groupId)}" data-decision="accept">Accept</button><button class="button button-small button-quiet" type="button" data-invitation="${escapeHtml(item.groupId)}" data-decision="decline">Decline</button></span></div>`).join("") || '<p class="muted">No pending invitations.</p>'}
    </section>
  `;
}

async function renderSection(section) {
  currentSection = section;
  selectedGroupId = "";
  selectedQuestionId = "";
  panel.innerHTML = '<p class="muted">Loading…</p>';
  try {
    if (section === "students") await loadStudents();
    else if (section === "groups") await loadGroups();
    else if (section === "questions") await loadQuestions();
    else if (section === "partners") await loadPartners();
    else if (section === "notifications") await loadNotifications();
  } catch (error) {
    panel.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Could not load this section.")}</div>`;
  }
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function handleSubmit(event) {
  const form = event.target;
  event.preventDefault();
  try {
    if (form.id === "student-search-form") {
      const params = new URLSearchParams(formValues(form));
      const result = await apiRequest(`/api/coursemate/students?${params}`);
      panel.querySelector("#student-results").innerHTML = studentCards(result.items || []);
    } else if (form.id === "group-filter-form") {
      const params = new URLSearchParams(Object.fromEntries(new FormData(form).entries()));
      const result = await apiRequest(`/api/coursemate/groups?${params}`);
      renderGroupList(result.items || []);
    } else if (form.id === "group-create-form") {
      const output = form.querySelector("#group-create-message");
      output.innerHTML = '<p class="muted">Creating study group…</p>';
      const payload = formValues(form);
      payload.maxMembers = Number(payload.maxMembers || 0);
      const result = await apiRequest("/api/coursemate/groups", { method: "POST", body: payload });
      selectedGroupId = result.id;
      showStatus("Study group created.", "success");
      await loadGroup(result.id);
    } else if (form.id === "group-message-form") {
      const payload = formValues(form);
      await apiRequest(`/api/coursemate/groups/${selectedGroupId}/messages`, { method: "POST", body: payload });
      await loadGroup(selectedGroupId);
    } else if (form.id === "revision-form") {
      const group = await apiRequest(`/api/coursemate/groups/${selectedGroupId}`);
      const payload = formValues(form);
      payload.courseCode = group.group.courseCode;
      await apiRequest(`/api/coursemate/groups/${selectedGroupId}/revisions`, { method: "POST", body: payload });
      await loadGroup(selectedGroupId);
      showStatus("Revision session scheduled.", "success");
    } else if (form.id === "question-filter-form") {
      const data = formValues(form);
      const params = new URLSearchParams();
      if (data.courseCode) params.set("courseCode", data.courseCode);
      if (data.search) params.set("search", data.search);
      if (form.unanswered.checked) params.set("unanswered", "true");
      const result = await apiRequest(`/api/coursemate/questions?${params}`);
      renderQuestionList(result.items || []);
    } else if (form.id === "question-create-form") {
      const output = form.querySelector("#question-create-message");
      output.innerHTML = '<p class="muted">Posting question…</p>';
      await apiRequest("/api/coursemate/questions", { method: "POST", body: formValues(form) });
      showStatus("Question posted.", "success");
      form.reset();
      selectedQuestionId = "";
      await loadQuestions();
    } else if (form.id === "answer-form") {
      await apiRequest(`/api/coursemate/questions/${selectedQuestionId}/answers`, { method: "POST", body: formValues(form) });
      await loadQuestion(selectedQuestionId);
    } else if (form.id === "partner-profile-form") {
      const payload = formValues(form);
      payload.coursesSeeking = selectedValues(form, "coursesSeeking");
      payload.coursesOffering = selectedValues(form, "coursesOffering");
      payload.discoverable = form.discoverable.checked;
      await apiRequest("/api/coursemate/partner-profile", { method: "PUT", body: payload });
      form.querySelector("#partner-profile-message").innerHTML = '<div class="result-box">Study-partner profile saved.</div>';
    } else if (form.id === "partner-search-form") {
      const result = await apiRequest(`/api/coursemate/partners?courseCode=${encodeURIComponent(form.courseCode.value)}`);
      panel.querySelector("#partner-results").innerHTML = studentCards(result.items || []);
    }
  } catch (error) {
    showPanelError(error);
  }
}

async function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  try {
    if (button.dataset.openGroup) {
      selectedQuestionId = "";
      await loadGroup(button.dataset.openGroup);
    } else if (button.hasAttribute("data-back-groups")) {
      selectedGroupId = "";
      await loadGroups();
    } else if (button.hasAttribute("data-join-group")) {
      const result = await apiRequest(`/api/coursemate/groups/${button.dataset.joinGroup}/join`, { method: "POST", body: {} });
      panel.querySelector("#group-action-message").innerHTML = `<div class="result-box">${result.joined ? "You joined the group." : "Your request to join was sent."}</div>`;
      if (result.joined) await loadGroup(selectedGroupId);
    } else if (button.dataset.cancelJoinRequest) {
      await apiRequest(`/api/coursemate/groups/${button.dataset.cancelJoinRequest}/join-request`, { method: "DELETE" });
      await loadGroup(selectedGroupId);
    } else if (button.dataset.leaveGroup) {
      if (confirm("Leave this study group?")) {
        await apiRequest(`/api/coursemate/groups/${button.dataset.leaveGroup}/membership`, { method: "DELETE" });
        selectedGroupId = "";
        await loadGroups();
      }
    } else if (button.dataset.joinDecision) {
      await apiRequest(`/api/coursemate/groups/${button.dataset.groupId}/requests/${button.dataset.studentId}`, { method: "PUT", body: { decision: button.dataset.joinDecision } });
      await loadGroup(selectedGroupId);
    } else if (button.dataset.loadGroupClassmates) {
      const result = await apiRequest(`/api/coursemate/students?courseCode=${encodeURIComponent(button.dataset.courseCode)}`);
      panel.querySelector("#group-classmates").innerHTML = studentCards(result.items || [], { groupId: selectedGroupId });
    } else if (button.dataset.inviteStudent) {
      await apiRequest(`/api/coursemate/groups/${button.dataset.groupId}/invitations/${button.dataset.inviteStudent}`, { method: "POST", body: {} });
      showStatus("Study-group invitation sent.", "success");
    } else if (button.dataset.memberRole) {
      await apiRequest(`/api/coursemate/groups/${selectedGroupId}/members/${button.dataset.memberRole}/role`, { method: "PUT", body: { role: button.dataset.role } });
      await loadGroup(selectedGroupId);
    } else if (button.dataset.transferOwner) {
      if (confirm("Transfer group ownership? You will become a moderator.")) {
        await apiRequest(`/api/coursemate/groups/${selectedGroupId}/owner`, { method: "PUT", body: { uid: button.dataset.transferOwner } });
        await loadGroup(selectedGroupId);
      }
    } else if (button.dataset.removeMember) {
      if (confirm("Remove this member from the study group?")) {
        await apiRequest(`/api/coursemate/groups/${selectedGroupId}/members/${button.dataset.removeMember}`, { method: "DELETE" });
        await loadGroup(selectedGroupId);
      }
    } else if (button.dataset.olderMessages) {
      const result = await apiRequest(`/api/coursemate/groups/${button.dataset.olderMessages}/messages?limit=30&before=${encodeURIComponent(button.dataset.before)}`);
      const root = panel.querySelector("#group-messages");
      root.insertAdjacentHTML("afterbegin", renderMessages(result.items || [], selectedGroupId));
      button.remove();
      if (result.hasMore) root.insertAdjacentHTML("beforebegin", `<button class="button button-quiet button-small" type="button" data-older-messages="${escapeHtml(selectedGroupId)}" data-before="${escapeHtml(result.nextCursor)}">Load older messages</button>`);
    } else if (button.dataset.editMessage) {
      const content = prompt("Edit your message:", button.dataset.content || "");
      if (content !== null && content.trim()) {
        await apiRequest(`/api/coursemate/groups/${button.dataset.groupId}/messages/${button.dataset.editMessage}`, { method: "PUT", body: { content } });
        await loadGroup(selectedGroupId);
      }
    } else if (button.dataset.deleteMessage) {
      if (confirm("Delete this message?")) {
        await apiRequest(`/api/coursemate/groups/${button.dataset.groupId}/messages/${button.dataset.deleteMessage}`, { method: "DELETE" });
        await loadGroup(selectedGroupId);
      }
    } else if (button.dataset.revisionRsvp) {
      await apiRequest(`/api/coursemate/groups/${button.dataset.groupId}/revisions/${button.dataset.revisionId}/rsvp`, { method: "PUT", body: { response: button.dataset.revisionRsvp } });
      showStatus("Your revision-session response was saved.", "success");
    } else if (button.dataset.editRevision) {
      const session = {
        title: prompt("Session title:", button.dataset.title),
        topic: prompt("Topic:", button.dataset.topic),
        date: prompt("Date (YYYY-MM-DD):", button.dataset.date),
        start: prompt("Start time (HH:MM):", button.dataset.start),
        end: prompt("End time (HH:MM):", button.dataset.end),
        location: prompt("Location:", button.dataset.location),
        meetingUrl: prompt("HTTPS meeting link (optional):", button.dataset.meetingUrl),
        description: prompt("Description:", button.dataset.description)
      };
      if (Object.values(session).some((value) => value === null)) return;
      const group = await apiRequest(`/api/coursemate/groups/${selectedGroupId}`);
      await apiRequest(`/api/coursemate/groups/${selectedGroupId}/revisions/${button.dataset.editRevision}`, {
        method: "PUT",
        body: { ...session, courseCode: group.group.courseCode }
      });
      await loadGroup(selectedGroupId);
      showStatus("Revision session updated.", "success");
    } else if (button.dataset.cancelRevision) {
      if (confirm("Cancel this revision session?")) {
        await apiRequest(`/api/coursemate/groups/${selectedGroupId}/revisions/${button.dataset.cancelRevision}`, { method: "DELETE" });
        await loadGroup(selectedGroupId);
        showStatus("Revision session cancelled.", "success");
      }
    } else if (button.dataset.openQuestion) {
      selectedGroupId = "";
      await loadQuestion(button.dataset.openQuestion);
    } else if (button.hasAttribute("data-back-questions")) {
      selectedQuestionId = "";
      await loadQuestions();
    } else if (button.dataset.selectAnswer) {
      if (confirm("Mark this answer as helpful? This does not certify it as academically correct.")) {
        await apiRequest(`/api/coursemate/questions/${selectedQuestionId}/accepted/${button.dataset.selectAnswer}`, { method: "PUT", body: {} });
        await loadQuestion(selectedQuestionId);
      }
    } else if (button.dataset.deleteAnswer) {
      if (confirm("Delete this answer?")) {
        await apiRequest(`/api/coursemate/questions/${selectedQuestionId}/answers/${button.dataset.deleteAnswer}`, { method: "DELETE" });
        await loadQuestion(selectedQuestionId);
      }
    } else if (button.dataset.deleteQuestion) {
      if (confirm("Remove your question? This will hide it from the CourseMate question list.")) {
        await apiRequest(`/api/coursemate/questions/${button.dataset.deleteQuestion}`, { method: "DELETE" });
        selectedQuestionId = "";
        await loadQuestions();
      }
    } else if (button.dataset.editQuestion) {
      const title = prompt("Question title:", button.dataset.title);
      if (title === null) return;
      const topic = prompt("Question topic:", button.dataset.topic);
      if (topic === null) return;
      const details = prompt("Question details:", button.dataset.details);
      if (details === null) return;
      const question = await apiRequest(`/api/coursemate/questions/${button.dataset.editQuestion}`);
      await apiRequest(`/api/coursemate/questions/${button.dataset.editQuestion}`, {
        method: "PUT",
        body: { title, topic, details, courseCode: question.question.courseCode }
      });
      selectedQuestionId = "";
      await loadQuestions();
      showStatus("Question updated.", "success");
    } else if (button.dataset.partnerRequest) {
      const selectedCourse = button.dataset.courseCode;
      if (!selectedCourse) throw new Error("Select the shared course before sending a study-partner request.");
      await apiRequest(`/api/coursemate/partner-requests/${button.dataset.partnerRequest}`, { method: "POST", body: { courseCode: selectedCourse } });
      showStatus("Study-partner request sent.", "success");
    } else if (button.dataset.partnerDecision) {
      await apiRequest(`/api/coursemate/partner-requests/${button.dataset.sender}/${button.dataset.partnerDecision}`, { method: "PUT", body: {} });
      await loadPartners();
    } else if (button.dataset.blockPartner) {
      if (confirm("Block future study-partner requests from this student?")) {
        await apiRequest(`/api/coursemate/partner-blocks/${button.dataset.blockPartner}`, { method: "PUT", body: {} });
        await loadPartners();
      }
    } else if (button.dataset.unblockPartner) {
      await apiRequest(`/api/coursemate/partner-blocks/${button.dataset.unblockPartner}`, { method: "DELETE" });
      await loadPartners();
    } else if (button.dataset.cancelPartnerRequest) {
      await apiRequest(`/api/coursemate/partner-requests/${button.dataset.cancelPartnerRequest}`, { method: "DELETE" });
      await loadPartners();
    } else if (button.dataset.disconnect) {
      if (confirm("Disconnect from this study partner?")) {
        await apiRequest(`/api/coursemate/partners/${button.dataset.disconnect}`, { method: "DELETE" });
        await loadPartners();
      }
    } else if (button.dataset.readNotification) {
      await apiRequest(`/api/coursemate/notifications/${button.dataset.readNotification}/read`, { method: "PUT", body: {} });
      await loadNotifications();
    } else if (button.dataset.invitation) {
      const decision = button.dataset.decision;
      await apiRequest(`/api/coursemate/invitations/${button.dataset.invitation}/${decision}`, { method: "PUT", body: {} });
      await loadNotifications();
    } else if (button.dataset.publicProfile) {
      const result = await apiRequest(`/api/coursemate/students/${button.dataset.publicProfile}?courseCode=${encodeURIComponent(button.dataset.courseCode)}`);
      alert(`${result.profile.displayName}\n${result.profile.department} · Level ${result.profile.level}\n\n${result.profile.bio || "No bio provided."}\n\nInterests: ${result.profile.interests || "Not provided"}`);
    } else if (button.dataset.reportMessage || button.dataset.reportQuestion || button.dataset.reportAnswer || button.dataset.reportProfile) {
      const reason = prompt("Briefly explain why you are reporting this content:");
      if (reason?.trim()) {
        const payload = {
          targetType: button.dataset.reportMessage ? "message" : button.dataset.reportQuestion ? "question" : button.dataset.reportAnswer ? "answer" : "profile",
          targetId: button.dataset.reportMessage || button.dataset.reportQuestion || button.dataset.reportAnswer || button.dataset.reportProfile,
          reason: reason.trim()
        };
        if (button.dataset.groupId) payload.groupId = button.dataset.groupId;
        if (button.dataset.questionId) payload.questionId = button.dataset.questionId;
        if (button.dataset.courseCode) payload.courseCode = button.dataset.courseCode;
        await apiRequest("/api/coursemate/reports", { method: "POST", body: payload });
        showStatus("Report sent to CourseMate moderation.", "success");
      }
    }
  } catch (error) {
    showPanelError(error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation("coursemate");
  panel.addEventListener("submit", (event) => void handleSubmit(event));
  panel.addEventListener("click", (event) => void handleClick(event));
  document.querySelector("#coursemate-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    document.querySelectorAll("#coursemate-tabs .tab-btn").forEach((tab) => tab.classList.toggle("active", tab === button));
    void renderSection(button.dataset.section);
  });
  discoverableToggle.addEventListener("change", async () => {
    discoverableToggle.disabled = true;
    try {
      await apiRequest("/api/coursemate/profile", { method: "PUT", body: { discoverable: discoverableToggle.checked } });
      showStatus(discoverableToggle.checked ? "Your CourseMate public profile is discoverable to classmates." : "Your CourseMate profile is hidden from student discovery.", "success");
    } catch (error) {
      discoverableToggle.checked = !discoverableToggle.checked;
      showStatus(error.message || "Could not update your discovery setting.", "error");
    } finally {
      discoverableToggle.disabled = false;
    }
  });
  try {
    const result = await apiRequest("/api/coursemate/courses");
    courses = result.items || [];
    await loadProfileSetting();
    const groupId = new URLSearchParams(location.search).get("group");
    const questionId = new URLSearchParams(location.search).get("question");
    if (groupId) {
      currentSection = "groups";
      document.querySelector('[data-section="groups"]').classList.add("active");
      document.querySelector('[data-section="students"]').classList.remove("active");
      await loadGroup(groupId);
    } else if (questionId) {
      currentSection = "questions";
      document.querySelector('[data-section="questions"]').classList.add("active");
      document.querySelector('[data-section="students"]').classList.remove("active");
      await loadQuestion(questionId);
    } else {
      await renderSection(currentSection);
    }
  } catch (error) {
    showPanelError(error);
  }
});
