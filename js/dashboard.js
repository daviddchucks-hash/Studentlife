import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { apiConfigured, apiRequest } from "./api.js";
import { initializeTools } from "./tools.js";

const nameLabel = document.querySelector("#student-name");
const welcomeTitle = document.querySelector("#welcome-title");
const logoutButton = document.querySelector("#logout-button");
const setupNotice = document.querySelector("#setup-notice");
const overviewStats = document.querySelector("#overview-stats");
let activeUid = null;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function renderItems(targetId, items, emptyMessage, renderItem) {
  const target = document.querySelector(`#${targetId}`);
  target.innerHTML = items.length ? items.map(renderItem).join("") : `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
}

function showOverviewMessage(message) {
  overviewStats.innerHTML = `<p class="overview-message">${escapeHtml(message)}</p>`;
  for (const id of ["current-courses", "upcoming-assignments", "upcoming-deadlines", "exam-countdown"]) {
    document.querySelector(`#${id}`).innerHTML = `<p class="overview-message">${escapeHtml(message)}</p>`;
  }
}

async function loadOverview(user) {
  if (!apiConfigured) {
    const message = "The Render API URL is not set in js/app-config.js. Configure it after creating the Render service to load and save private student data.";
    setupNotice.hidden = false;
    setupNotice.textContent = message;
    showOverviewMessage(message);
    return;
  }
  try {
    const data = await apiRequest("/api/dashboard");
    if (user.uid !== activeUid) return;
    const stats = data.stats || {};
    overviewStats.innerHTML = [
      ["Courses", stats.courseCount || 0],
      ["Open assignments", stats.openAssignments || 0],
      ["Study minutes logged", stats.studyMinutes || 0]
    ].map(([label, value]) => `<article class="summary-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");
    renderItems("current-courses", data.courses || [], "Your course list is empty.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.code || item.name || "Course")}</strong><span>${escapeHtml(item.name || "")}${item.units ? ` · ${escapeHtml(item.units)} units` : ""}</span></div>`
    );
    renderItems("upcoming-assignments", data.assignments || [], "No open assignments saved.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.course || "Course not set")} · ${escapeHtml(formatDate(item.dueDate))} · ${escapeHtml(item.status || "To do")}</span></div>`
    );
    renderItems("upcoming-deadlines", data.deadlines || [], "No upcoming academic deadlines.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category || "Academic")}${item.dueDate ? ` · ${escapeHtml(formatDate(item.dueDate))}` : ""}</span></div>`
    );
    renderItems("exam-countdown", data.exams || [], "No upcoming exams saved.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.course || "Exam")} · ${item.daysUntil === 0 ? "Today" : `${escapeHtml(item.daysUntil)} days`}</strong><span>${escapeHtml(formatDate(item.date))}${item.time ? ` · ${escapeHtml(item.time)}` : ""}</span></div>`
    );
  } catch (error) {
    setupNotice.hidden = false;
    setupNotice.textContent = error.message || "Could not load the dashboard summary.";
    showOverviewMessage("Dashboard information is temporarily unavailable.");
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    if (!logoutButton.disabled) window.location.replace("./login.html");
    return;
  }
  if (activeUid === user.uid) return;
  activeUid = user.uid;
  const name = user.displayName || user.email?.split("@")[0] || "Student";
  nameLabel.textContent = user.email || "Signed in";
  welcomeTitle.textContent = `Welcome, ${name}.`;
  initializeTools();
  void loadOverview(user);
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Signing out…";
  try {
    await signOut(auth);
    window.location.replace("./index.html");
  } catch {
    logoutButton.disabled = false;
    logoutButton.textContent = "Sign out";
  }
});
