import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { apiConfigured, apiRequest } from "./api.js";
import { initNavigation } from "./nav.js";

const welcomeTitle = document.querySelector("#welcome-title");
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
  if (!target) return;
  target.innerHTML = items.length ? items.map(renderItem).join("") : `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
}

async function loadOverview(user) {
  if (!apiConfigured) {
    const message = "The Render API URL is not set in js/app-config.js. Configure it to load and save private student data.";
    if (setupNotice) { setupNotice.hidden = false; setupNotice.textContent = message; }
    return;
  }

  try {
    const [dashData, ttData] = await Promise.all([
      apiRequest("/api/dashboard"),
      apiRequest("/api/records/timetable").catch(() => ({ items: [] }))
    ]);

    if (user.uid !== activeUid) return;

    const stats = dashData.stats || {};
    overviewStats.innerHTML = [
      ["Courses", stats.courseCount || 0],
      ["Open Assignments", stats.openAssignments || 0],
      ["Study Minutes Logged", stats.studyMinutes || 0]
    ].map(([label, value]) => `<article class="summary-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("");

    // Today's classes from timetable
    const todayIndex = new Date().getDay();
    const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][todayIndex];
    const todayClasses = (ttData.items || [])
      .filter((item) => item.day === todayName)
      .sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    renderItems("today-classes", todayClasses, `No classes scheduled for today (${todayName}).`, (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.course)}</strong><span>⏰ ${escapeHtml(item.start)} - ${escapeHtml(item.end)} ${item.venue ? `| 📍 ${escapeHtml(item.venue)}` : ""}</span></div>`
    );

    renderItems("current-courses", dashData.courses || [], "Your course list is empty.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.code || item.name || "Course")}</strong><span>${escapeHtml(item.name || "")}${item.units ? ` · ${escapeHtml(item.units)} units` : ""}</span></div>`
    );

    renderItems("upcoming-assignments", dashData.assignments || [], "No open assignments saved.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.course || "Course not set")} · ${escapeHtml(formatDate(item.dueDate))} · ${escapeHtml(item.status || "To do")}</span></div>`
    );

    renderItems("exam-countdown", dashData.exams || [], "No upcoming exams saved.", (item) =>
      `<div class="summary-entry"><strong>${escapeHtml(item.course || "Exam")} · ${item.daysUntil === 0 ? "Today" : `${escapeHtml(item.daysUntil)} days`}</strong><span>${escapeHtml(formatDate(item.date))}${item.time ? ` · ${escapeHtml(item.time)}` : ""}</span></div>`
    );

  } catch (error) {
    if (setupNotice) {
      setupNotice.hidden = false;
      setupNotice.textContent = error.message || "Could not load the dashboard summary.";
    }
  }
}

const mainPages = [
  { href: "./calculators.html", title: "1. Calculators & Converters", category: "Calculators", desc: "GPA, CGPA, scientific, physics, Ohm's law, and unit converters." },
  { href: "./timetable.html", title: "2. Timetable & Schedule", category: "Planning", desc: "Weekly schedule, today's classes, and overlap detection." },
  { href: "./courses.html", title: "3. Courses & Registration", category: "Academics", desc: "Registered course list, registration draft, and total units." },
  { href: "./assignments.html", title: "4. Assignments & Deadlines", category: "Academics", desc: "Coursework tracker, assignment status, and due dates." },
  { href: "./exams.html", title: "5. Exams & Countdown", category: "Academics", desc: "Exam schedules, venues, and day countdowns." },
  { href: "./study.html", title: "6. Study & Timers", category: "Study", desc: "Study session logger, Pomodoro timer, and study plan generator." },
  { href: "./notes.html", title: "7. Notes & Flashcards", category: "Study", desc: "Study notes, active recall flashcards, practice quizzes, checklists." },
  { href: "./formula-library.html", title: "8. Formula Library", category: "Resources", desc: "O-Level, A-Level, STEM formulas, and admin manager." },
  { href: "./saved-items.html", title: "9. My Saved Items", category: "Personal", desc: "Central storage for all saved timetables, notes, courses, and formulas." },
  { href: "./campus-life.html", title: "10. Campus Life & Directory", category: "Campus", desc: "Hostels, transport shuttles, dining, health center, directory." },
  { href: "./opportunities.html", title: "11. Marketplace & Opportunities", category: "Campus", desc: "Campus marketplace, student gigs, scholarships, lost & found." },
  { href: "./community.html", title: "12. Community & Clubs", category: "Campus", desc: "Clubs & societies, student businesses, feedback portal." },
  { href: "./profile.html", title: "13. Student Profile", category: "Personal", desc: "Manage display name, department, level, skills, and bio." }
];

function renderHubCards(searchQuery = "") {
  const grid = document.querySelector("#tool-grid");
  if (!grid) return;

  let visible = mainPages;
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    visible = visible.filter((p) => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  grid.innerHTML = visible.map((page) => `
    <a href="${page.href}" class="tool-card" style="text-decoration:none;">
      <span class="tool-number">${escapeHtml(page.category.toUpperCase())}</span>
      <strong>${escapeHtml(page.title)}</strong>
      <span>${escapeHtml(page.desc)}</span>
    </a>
  `).join("");
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("./login.html");
    return;
  }
  if (activeUid === user.uid) return;
  activeUid = user.uid;

  const name = user.displayName || user.email?.split("@")[0] || "Student";
  if (welcomeTitle) welcomeTitle.textContent = `Welcome back, ${name}.`;

  initNavigation("dashboard");
  renderHubCards();

  const search = document.querySelector("#platform-search");
  if (search) {
    search.oninput = (e) => renderHubCards(e.target.value);
  }

  void loadOverview(user);
});
