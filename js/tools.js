import { apiConfigured, apiRequest } from "./api.js";
import {
  calculateCgpa,
  calculateGrade,
  calculateGpa,
  calculateSemesterAverage,
  generateStudyPlan,
  parseCourseRows,
  sumCourseUnits
} from "./calculations.js";

const tools = [
  { id: "gpa", name: "GPA Calculator", category: "Calculators", description: "Calculate a weighted semester GPA." },
  { id: "cgpa", name: "CGPA Calculator", category: "Calculators", description: "Add a semester to your cumulative result." },
  { id: "semester-result", name: "Semester Result Calculator", category: "Calculators", description: "Find your unit-weighted average score." },
  { id: "grade", name: "Grade Calculator", category: "Calculators", description: "Convert a score into a percentage and grade." },
  { id: "units", name: "Course Unit Calculator", category: "Calculators", description: "Total the units in a course selection." },
  { id: "registration", name: "Course Registration Planner", category: "Courses", description: "Draft and review a semester registration." },
  { id: "courses", name: "Personal Course List", category: "Courses", description: "Keep your current courses together." },
  { id: "timetable", name: "Personal Timetable", category: "Courses", description: "Save class days, times, and venues." },
  { id: "timetable-generator", name: "Timetable Generator", category: "Planning", description: "View saved classes by day of the week." },
  { id: "exams", name: "Exam Timetable Organizer", category: "Planning", description: "Save exam dates, times, and venues." },
  { id: "countdown", name: "Exam Countdown", category: "Planning", description: "See how long remains before each exam." },
  { id: "assignments", name: "Assignment Deadline Tracker", category: "Planning", description: "Keep coursework deadlines visible." },
  { id: "deadlines", name: "Academic Deadline Tracker", category: "Planning", description: "Track registration and other key dates." },
  { id: "semester-planner", name: "Semester Planner", category: "Planning", description: "Keep milestones and plans in one list." },
  { id: "study-generator", name: "Study Timetable Generator", category: "Study", description: "Create a simple repeating study plan." },
  { id: "sessions", name: "Study Session Tracker", category: "Study", description: "Log sessions and review study time." }
];

const categoryList = ["All tools", "Calculators", "Courses", "Planning", "Study"];
const recentKey = "afitStudentLife.recentTools";
let activeTool = null;

const dialog = document.querySelector("#tool-dialog");
const title = document.querySelector("#tool-title");
const category = document.querySelector("#tool-category");
const body = document.querySelector("#tool-body");
const grid = document.querySelector("#tool-grid");
const filters = document.querySelector("#tool-filters");
const recent = document.querySelector("#recent-tools");

const recordTools = {
  registration: { type: "registration", label: "Registration plan", fields: [
    ["code", "Course code", "text", true], ["name", "Course title", "text", true], ["units", "Units", "number", true]
  ] },
  courses: { type: "courses", label: "Personal course", fields: [
    ["code", "Course code", "text", true], ["name", "Course title", "text", true], ["units", "Units", "number", true]
  ] },
  timetable: { type: "timetable", label: "Class", fields: [
    ["course", "Course or activity", "text", true], ["day", "Day", "select", true, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]],
    ["start", "Start time", "time", true], ["end", "End time", "time", true], ["venue", "Venue (optional)", "text", false]
  ] },
  exams: { type: "exams", label: "Exam", fields: [
    ["course", "Course", "text", true], ["date", "Exam date", "date", true], ["time", "Time (optional)", "time", false], ["venue", "Venue (optional)", "text", false]
  ] },
  assignments: { type: "assignments", label: "Assignment", fields: [
    ["title", "Assignment", "text", true], ["course", "Course (optional)", "text", false], ["dueDate", "Due date", "date", true], ["status", "Status", "select", true, ["To do", "In progress", "Complete"]], ["notes", "Notes (optional)", "text", false]
  ] },
  deadlines: { type: "deadlines", label: "Academic deadline", fields: [
    ["title", "Deadline", "text", true], ["category", "Type (optional)", "text", false], ["dueDate", "Date", "date", true], ["notes", "Notes (optional)", "text", false]
  ] },
  "semester-planner": { type: "semester-plan", label: "Semester milestone", fields: [
    ["title", "Milestone", "text", true], ["date", "Target date (optional)", "date", false], ["notes", "Notes (optional)", "text", false]
  ] },
  sessions: { type: "study-sessions", label: "Study session", fields: [
    ["subject", "Subject or course", "text", true], ["minutes", "Minutes studied", "number", true], ["date", "Date", "date", true]
  ] }
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { return []; }
}

function rememberTool(id) {
  const items = [id, ...getRecent().filter((item) => item !== id)].slice(0, 4);
  try { localStorage.setItem(recentKey, JSON.stringify(items)); } catch { /* Recent tools are an optional convenience. */ }
  renderRecent();
}

function renderRecent() {
  const items = getRecent().map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);
  recent.innerHTML = items.length
    ? items.map((item) => `<button class="recent-link" type="button" data-open-tool="${item.id}">${escapeHtml(item.name)}</button>`).join("")
    : '<p class="muted">Your recent tools will appear here.</p>';
}

function renderFilters(selected = "All tools") {
  filters.innerHTML = categoryList.map((item) =>
    `<button class="filter-button" type="button" aria-pressed="${item === selected}" data-filter="${escapeHtml(item)}">${escapeHtml(item)}</button>`
  ).join("");
}

function renderCards(selected = "All tools") {
  const visible = selected === "All tools" ? tools : tools.filter((tool) => tool.category === selected);
  grid.innerHTML = visible.map((tool) => {
    const number = String(tools.indexOf(tool) + 1).padStart(2, "0");
    return `<button class="tool-card" type="button" data-open-tool="${tool.id}">
      <span class="tool-number">${number} / ${escapeHtml(tool.category.toUpperCase())}</span>
      <strong>${escapeHtml(tool.name)}</strong><span>${escapeHtml(tool.description)}</span>
    </button>`;
  }).join("");
}

function openTool(id) {
  const tool = tools.find((item) => item.id === id);
  if (!tool) return;
  activeTool = id;
  title.textContent = tool.name;
  category.textContent = tool.category;
  rememberTool(id);
  if (!dialog.open) dialog.showModal();
  renderTool(tool);
}

function missingApi() {
  return '<div class="db-missing">The Render API is not configured yet. Set its public URL in <strong>js/app-config.js</strong> before saving or loading personal entries.</div>';
}

function calculatorMarkup(id) {
  if (["gpa", "cgpa"].includes(id)) {
    return `<p class="tool-intro">Enter one course per line as <strong>course code, units, grade point</strong>. The default point scale is A=5 through F=0; confirm the scale with your department.</p>
      <form class="tool-form" data-calculator="${id}">
        ${id === "cgpa" ? '<div class="form-row"><label class="field">Previous total quality points<input name="previousPoints" type="number" step="0.01" min="0" value="0" required></label><label class="field">Previous total units<input name="previousUnits" type="number" step="0.5" min="0" value="0" required></label></div>' : ""}
        <label class="field">Semester courses<textarea name="rows" required placeholder="MTH 101, 3, 5&#10;PHY 101, 2, 4"></textarea></label>
        <button class="button button-primary" type="submit">Calculate ${id === "cgpa" ? "CGPA" : "GPA"}</button><div class="tool-output" id="tool-output" aria-live="polite"></div>
      </form>`;
  }
  if (id === "semester-result") {
    return `<p class="tool-intro">Enter one course per line as <strong>course code, units, score out of 100</strong>. This calculates the unit-weighted average score.</p>
      <form class="tool-form" data-calculator="semester-result"><label class="field">Semester scores<textarea name="rows" required placeholder="MTH 101, 3, 76&#10;PHY 101, 2, 68"></textarea></label><button class="button button-primary" type="submit">Calculate result</button><div class="tool-output" id="tool-output" aria-live="polite"></div></form>`;
  }
  if (id === "grade") {
    return `<p class="tool-intro">Enter the marks earned and the maximum possible marks.</p>
      <form class="tool-form" data-calculator="grade"><div class="form-row"><label class="field">Score earned<input name="score" type="number" min="0" step="any" required></label><label class="field">Maximum score<input name="total" type="number" min="0.01" step="any" required></label></div><button class="button button-primary" type="submit">Calculate grade</button><div class="tool-output" id="tool-output" aria-live="polite"></div></form>`;
  }
  return `<p class="tool-intro">Enter course unit values separated by commas or line breaks.</p>
    <form class="tool-form" data-calculator="units"><label class="field">Course units<textarea name="units" required placeholder="3, 2, 3, 1"></textarea></label><button class="button button-primary" type="submit">Add units</button><div class="tool-output" id="tool-output" aria-live="polite"></div></form>`;
}

function showError(message) {
  return `<div class="error-box">${escapeHtml(message)}</div>`;
}

function onCalculate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const output = form.querySelector("#tool-output");
  try {
    const values = new FormData(form);
    const mode = form.dataset.calculator;
    let result;
    if (mode === "gpa" || mode === "cgpa") {
      const rows = parseCourseRows(values.get("rows"));
      const calculation = mode === "cgpa"
        ? calculateCgpa(rows, Number(values.get("previousPoints") || 0), Number(values.get("previousUnits") || 0))
        : calculateGpa(rows);
      const semester = calculation.semester || calculation;
      result = `<div class="result-box"><strong>${mode === "cgpa" ? "CGPA" : "GPA"}: ${calculation.value.toFixed(2)} / 5.00</strong><p>${semester.totalUnits} semester units · ${semester.qualityPoints.toFixed(2)} semester quality points</p></div>`;
    } else if (mode === "semester-result") {
      const rows = parseCourseRows(values.get("rows"), true);
      const calculation = calculateSemesterAverage(rows);
      result = `<div class="result-box"><strong>Weighted average: ${calculation.value.toFixed(2)}%</strong><p>${calculation.totalUnits} total units · ${calculation.courseCount} courses</p></div>`;
    } else if (mode === "grade") {
      const score = Number(values.get("score"));
      const total = Number(values.get("total"));
      const calculation = calculateGrade(score, total);
      result = `<div class="result-box"><strong>${calculation.percentage.toFixed(1)}% · ${calculation.letter}</strong><p>Indicative grade only; your department’s grading boundaries may differ.</p></div>`;
    } else {
      const calculation = sumCourseUnits(values.get("units"));
      result = `<div class="result-box"><strong>${calculation.total} units</strong><p>${calculation.count} course unit values added.</p></div>`;
    }
    output.innerHTML = result;
  } catch (error) {
    output.innerHTML = showError(error.message || "Check your inputs and try again.");
  }
}

function fieldMarkup(field) {
  const [name, label, type, required, options] = field;
  const req = required ? "required" : "";
  if (type === "select") {
    return `<label class="field">${escapeHtml(label)}<select name="${name}" ${req}>${options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }
  const numeric = type === "number"
    ? name === "minutes" ? 'min="1" max="600" step="1"' : 'min="0.5" max="60" step="0.5"'
    : "";
  return `<label class="field">${escapeHtml(label)}<input name="${name}" type="${type}" ${numeric} ${req} maxlength="120"></label>`;
}

function recordFormMarkup(id, config) {
  const extraHelp = id === "registration" ? '<p class="tool-intro">This is a personal planning list; confirm registration requirements with your department.</p>' : "";
  return `${extraHelp}<form class="tool-form" data-record-tool="${id}">${config.fields.map(fieldMarkup).join("")}<button class="button button-primary" type="submit">Save ${escapeHtml(config.label.toLowerCase())}</button><div class="tool-output" aria-live="polite"></div></form><div class="record-list" data-record-list></div>`;
}

function dayDifference(dateValue) {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function displayDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function itemMeta(id, item) {
  if (id === "registration" || id === "courses") return `${escapeHtml(item.code || "")} · ${escapeHtml(item.units || 0)} units`;
  if (id === "timetable") return `${escapeHtml(item.day || "")} · ${escapeHtml(item.start || "")}–${escapeHtml(item.end || "")}${item.venue ? ` · ${escapeHtml(item.venue)}` : ""}`;
  if (id === "exams") {
    const days = dayDifference(item.date);
    const countdown = days === null ? "" : days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? "Today" : `${days} days left`;
    return `${escapeHtml(displayDate(item.date))}${item.time ? ` · ${escapeHtml(item.time)}` : ""}${item.venue ? ` · ${escapeHtml(item.venue)}` : ""}${countdown ? ` · ${countdown}` : ""}`;
  }
  if (["assignments", "deadlines"].includes(id)) return `${escapeHtml(item.course || item.category || "")}${item.dueDate ? ` · Due ${escapeHtml(displayDate(item.dueDate))}` : ""}${item.status ? ` · ${escapeHtml(item.status)}` : ""}${item.notes ? ` · ${escapeHtml(item.notes)}` : ""}`;
  if (id === "semester-planner") return `${escapeHtml(displayDate(item.date))}${item.notes ? ` · ${escapeHtml(item.notes)}` : ""}`;
  if (id === "sessions") return `${escapeHtml(item.minutes || 0)} minutes · ${escapeHtml(displayDate(item.date))}`;
  return "";
}

async function readCollection(type) {
  const result = await apiRequest(`/api/records/${encodeURIComponent(type)}`);
  return result.items || [];
}

async function saveRecord(type, record) {
  await apiRequest(`/api/records/${encodeURIComponent(type)}`, { method: "POST", body: record });
}

async function deleteRecord(type, id) {
  await apiRequest(`/api/records/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

async function completeAssignment(id) {
  const items = await readCollection("assignments");
  const item = items.find((record) => record.id === id);
  if (!item) throw new Error("This assignment is no longer available.");
  await apiRequest(`/api/records/assignments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: {
      title: item.title,
      course: item.course,
      dueDate: item.dueDate,
      status: "Complete",
      notes: item.notes
    }
  });
}

function recordItem(item, config, id) {
  const heading = item.course || item.title || item.name || item.subject || "Saved item";
  const completeAction = id === "assignments" && item.status !== "Complete"
    ? `<button class="record-update" type="button" data-complete-record="${escapeHtml(item.id)}">Mark complete</button>`
    : "";
  return `<div class="record-item"><div><strong>${escapeHtml(heading)}</strong><small>${itemMeta(id, item)}</small></div><div class="inline-actions"><button class="record-delete" type="button" data-delete-record="${escapeHtml(item.id)}" data-record-type="${escapeHtml(config.type)}">Remove</button>${completeAction}</div></div>`;
}

async function renderRecords(id) {
  const list = body.querySelector("[data-record-list]");
  if (!list) return;
  if (!apiConfigured) {
    list.innerHTML = missingApi();
    return;
  }
  list.innerHTML = '<p class="muted">Loading saved items…</p>';
  try {
    const config = recordTools[id];
    let items = await readCollection(config.type);
    if (activeTool !== id) return;
    if (id === "exams") items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (id === "assignments" || id === "deadlines") items.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    if (id === "semester-planner") items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    if (id === "sessions") items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (!items.length) {
      list.innerHTML = `<div class="empty-state">No ${escapeHtml(config.label.toLowerCase())} entries yet. Add one above to get started.</div>`;
      return;
    }
    const totalUnits = id === "registration" ? items.reduce((sum, item) => sum + (Number(item.units) || 0), 0) : null;
    const sessionMinutes = id === "sessions" ? items.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0) : null;
    const summary = totalUnits !== null
      ? `<div class="result-box"><strong>${totalUnits} planned course units</strong><p>${items.length} courses in this registration plan.</p></div>`
      : sessionMinutes !== null
        ? `<div class="result-box"><strong>${sessionMinutes} minutes logged</strong><p>${items.length} study sessions recorded.</p></div>`
        : "";
    list.innerHTML = `${summary}${items.map((item) => recordItem(item, config, id)).join("")}`;
  } catch {
    list.innerHTML = '<div class="error-box">Could not load saved entries. Check your Render API, session, and network connection.</div>';
  }
}

async function handleRecordSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const id = form.dataset.recordTool;
  const config = recordTools[id];
  const output = form.querySelector(".tool-output");
  if (!form.reportValidity()) return;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Saving…";
  const values = new FormData(form);
  const record = Object.fromEntries(values.entries());
  if (record.units !== undefined) record.units = Number(record.units);
  if (record.minutes !== undefined) record.minutes = Number(record.minutes);
  try {
    await saveRecord(config.type, record);
    form.reset();
    output.innerHTML = '<div class="result-box"><strong>Saved</strong><p>This entry is stored in your account.</p></div>';
    await renderRecords(id);
  } catch (error) {
    output.innerHTML = showError(error.message || "Could not save this item. Check your Render API and connection.");
  } finally {
    button.disabled = false;
    button.textContent = `Save ${config.label.toLowerCase()}`;
  }
}

async function timetableGeneratorMarkup() {
  if (!apiConfigured) return missingApi();
  try {
    const items = await readCollection("timetable");
    if (!items.length) return '<div class="empty-state">Add classes in Personal Timetable first. Your weekly view will appear here.</div>';
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const groups = days.map((day) => ({ day, items: items.filter((item) => item.day === day).sort((a, b) => (a.start || "").localeCompare(b.start || "")) })).filter((group) => group.items.length);
    return `<p class="tool-intro">Generated from the class entries in your personal timetable.</p><div class="record-list">${groups.map((group) => `<section><p class="eyebrow">${group.day}</p>${group.items.map((item) => `<div class="record-item"><div><strong>${escapeHtml(item.start)}–${escapeHtml(item.end)} · ${escapeHtml(item.course)}</strong><small>${escapeHtml(item.venue || "Venue not set")}</small></div></div>`).join("")}</section>`).join("")}</div>`;
  } catch {
    return '<div class="error-box">Could not load your timetable. Check the Render API and your connection.</div>';
  }
}

async function renderCountdown() {
  if (!apiConfigured) return missingApi();
  try {
    const items = (await readCollection("exams")).filter((item) => dayDifference(item.date) !== null && dayDifference(item.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) return '<div class="empty-state">No upcoming exams saved. Add exam dates with Exam Timetable Organizer.</div>';
    return `<p class="tool-intro">Countdowns use the date saved in your exam timetable.</p><div class="record-list">${items.map((item) => {
      const days = dayDifference(item.date);
      const remain = days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? "Today" : `${days} days`;
      return `<div class="record-item"><div><strong>${escapeHtml(item.course || "Exam")} · ${escapeHtml(remain)}</strong><small>${escapeHtml(displayDate(item.date))}${item.time ? ` · ${escapeHtml(item.time)}` : ""}</small></div></div>`;
    }).join("")}</div>`;
  } catch {
    return '<div class="error-box">Could not load exam dates. Check the Render API and your connection.</div>';
  }
}

function studyGeneratorMarkup() {
  return `<p class="tool-intro">Make a lightweight weekly plan from your subjects and available study days. The plan is saved to your account.</p>
    <form class="tool-form" data-study-generator>
      <label class="field">Subjects, one per line<textarea name="subjects" required placeholder="Mathematics&#10;Physics&#10;Programming"></textarea></label>
      <label class="field">Study days, separated by commas<input name="days" required value="Monday, Tuesday, Wednesday, Thursday, Friday"></label>
      <div class="form-row"><label class="field">Sessions per day<input name="sessions" type="number" min="1" max="8" value="2" required></label><label class="field">Session length (minutes)<input name="minutes" type="number" min="15" max="180" step="15" value="45" required></label></div>
      <label class="field">First session starts at<input name="start" type="time" value="16:00" required></label>
      <button class="button button-primary" type="submit">Generate and save plan</button><div class="tool-output" aria-live="polite"></div>
    </form><div class="record-list" data-study-list></div>`;
}

async function renderStudyPlans() {
  const list = body.querySelector("[data-study-list]");
  if (!list) return;
  if (!apiConfigured) { list.innerHTML = missingApi(); return; }
  try {
    const plans = (await readCollection("study-plans")).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 3);
    list.innerHTML = plans.length ? plans.map((plan) =>
      `<div class="record-item"><div><strong>${escapeHtml(plan.title || "Study plan")}</strong><small>${(plan.entries || []).map((entry) => `${escapeHtml(entry.day)} ${escapeHtml(entry.time)} · ${escapeHtml(entry.subject)}`).join("<br>")}</small></div></div>`
    ).join("") : '<div class="empty-state">No saved study plans yet.</div>';
  } catch {
    list.innerHTML = '<div class="error-box">Could not load saved plans.</div>';
  }
}

async function handleStudyPlan(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const output = form.querySelector(".tool-output");
  const button = form.querySelector("button[type=submit]");
  const values = new FormData(form);
  try {
    const entries = generateStudyPlan({
      subjects: values.get("subjects"),
      days: values.get("days"),
      sessions: values.get("sessions"),
      minutes: values.get("minutes"),
      start: values.get("start")
    });
    button.disabled = true;
    button.textContent = "Saving plan…";
    const subjects = String(values.get("subjects")).split(/\n/).map((item) => item.trim()).filter(Boolean);
    await apiRequest("/api/records/study-plans", { method: "POST", body: {
      title: `${subjects.join(", ").slice(0, 140)} study plan`,
      entries
    } });
    output.innerHTML = `<div class="result-box"><strong>Plan generated and saved</strong><p>${entries.length} study sessions across ${new Set(entries.map((item) => item.day)).size} days.</p></div>`;
    await renderStudyPlans();
  } catch (error) {
    output.innerHTML = showError(error.message || "Could not create your plan.");
  } finally {
    button.disabled = false;
    button.textContent = "Generate and save plan";
  }
}

async function renderTool(tool) {
  body.innerHTML = "";
  if (["gpa", "cgpa", "semester-result", "grade", "units"].includes(tool.id)) {
    body.innerHTML = calculatorMarkup(tool.id);
    body.querySelector("form").addEventListener("submit", onCalculate);
  } else if (recordTools[tool.id]) {
    body.innerHTML = recordFormMarkup(tool.id, recordTools[tool.id]);
    body.querySelector("form").addEventListener("submit", handleRecordSubmit);
    await renderRecords(tool.id);
  } else if (tool.id === "timetable-generator") {
    body.innerHTML = await timetableGeneratorMarkup();
  } else if (tool.id === "countdown") {
    body.innerHTML = await renderCountdown();
  } else if (tool.id === "study-generator") {
    body.innerHTML = studyGeneratorMarkup();
    body.querySelector("form").addEventListener("submit", handleStudyPlan);
    await renderStudyPlans();
  }
}

function initializeTools() {
  renderFilters();
  renderCards();
  renderRecent();
  filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    renderFilters(button.dataset.filter);
    renderCards(button.dataset.filter);
  });
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-tool]");
    if (openButton) openTool(openButton.dataset.openTool);
    const completeButton = event.target.closest("[data-complete-record]");
    if (completeButton) {
      completeButton.disabled = true;
      completeButton.textContent = "Updating…";
      completeAssignment(completeButton.dataset.completeRecord)
        .then(() => renderRecords("assignments"))
        .catch((error) => {
          completeButton.disabled = false;
          completeButton.textContent = "Mark complete";
          const list = body.querySelector("[data-record-list]");
          if (list) list.insertAdjacentHTML("afterbegin", showError(error.message || "Could not update this assignment."));
        });
    }
    const deleteButton = event.target.closest("[data-delete-record]");
    if (deleteButton) {
      if (!window.confirm("Remove this saved item from your account?")) return;
      deleteRecord(deleteButton.dataset.recordType, deleteButton.dataset.deleteRecord)
        .then(() => activeTool && renderRecords(activeTool))
        .catch(() => {
          const list = body.querySelector("[data-record-list]");
          if (list) list.insertAdjacentHTML("afterbegin", '<div class="error-box">Could not remove this item. Check your Render API and connection.</div>');
        });
    }
  });
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

export { initializeTools };
