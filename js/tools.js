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

import {
  evaluateScientific,
  calculatePercentage,
  calculateFraction,
  convertUnit,
  solveLinearEquation,
  calculateMatrix
} from "./calculators.js";

import {
  generateCitation,
  countWordsAndChars,
  convertTextCase,
  formatText
} from "./writing-tools.js";

import {
  calculateOhmsLaw,
  calculateElectricalPower,
  calculateResistorColorCode,
  calculateResistorNetwork,
  calculateKinematics,
  calculateProjectileMotion,
  calculateNewtonLaws,
  calculateWorkEnergy,
  calculateVelocityAccel,
  calculateDensity,
  calculatePressure,
  convertTemperature,
  convertNumberSystem,
  calculateLogarithm,
  solveQuadratic,
  solveSimultaneous2x2,
  calculateStatistics,
  calculatePermutationsCombinations
} from "./stem-calculators.js";

import {
  TimerManager,
  calculateStudyStreak
} from "./study-tools.js";

import {
  mergePDFs,
  splitPDF,
  compressPDF,
  imageToPDF,
  compressImage,
  generateQRCode
} from "./doc-tools.js";

import {
  INITIAL_FORMULAS,
  fetchFormulasFromApi,
  renderFormulaCard
} from "./formula-library.js";

import {
  generateFormulaCsvTemplate,
  parseFormulaCsv
} from "./formula-admin.js";

import { renderProfileModule } from "./profile.js";
import { renderCampusDirectoryModule } from "./campus-directory.js";
import { renderEventsModule } from "./events.js";
import { renderMarketplaceModule } from "./marketplace.js";
import { renderJobsModule } from "./jobs.js";
import { renderOpportunitiesModule } from "./opportunities.js";
import { renderLostFoundModule } from "./lost-found.js";
import { renderAnnouncementsModule } from "./announcements.js";
import { renderFeedbackModule } from "./feedback.js";
import { renderAdminModule } from "./admin.js";
import { renderCampusLifeModule } from "./campus-life.js";
import { renderUtilitiesModule } from "./utilities.js";

const tools = [
  // 34 Major Platform Hub Sections
  { id: "academic-tools", name: "1. Academic Tools & GPA Calculators", category: "Academics", description: "GPA, CGPA, semester weighted-average, and grade conversion tools." },
  { id: "courses", name: "2. Course & Department Planner", category: "Academics", description: "Personal course list and departmental course requirements." },
  { id: "timetable", name: "3. Timetable & Scheduling", category: "Academics", description: "Save class days, times, venues, and weekly schedules." },
  { id: "exams", name: "4. Exams & Results Organizer", category: "Academics", description: "Exam dates, venue countdown, and results planner." },
  { id: "study-revision", name: "5. Study & Revision Hub", category: "Academics", description: "Flashcards, practice quizzes, revision planner, reading tracker." },
  { id: "assignments", name: "6. Assignments & Coursework Projects", category: "Academics", description: "Coursework deadline tracker, progress, and submissions." },
  { id: "academic-resources", name: "7. Academic Resources & Formula Library", category: "Academics", description: "O-Level, A-Level, & Engineering verified formula library." },
  { id: "campus-life", name: "8. Campus Life Overview", category: "Campus & Living", description: "Student campus orientation, lifestyle, and student guides." },
  { id: "hostels", name: "9. Hostel & Accommodation", category: "Campus & Living", description: "AFIT hostel listings, porter contacts, and off-campus housing." },
  { id: "marketplace", name: "10. Campus Marketplace", category: "Opportunities & Services", description: "Student marketplace for textbooks, electronics, and items." },
  { id: "jobs-gigs", name: "11. Student Jobs & Freelance Gigs", category: "Opportunities & Services", description: "Student gigs, freelance roles, campus jobs, and internships." },
  { id: "events", name: "12. Events & Activities", category: "Community & Events", description: "Discover campus events, tech summits, and social activities." },
  { id: "organizations", name: "13. Student Organizations & Clubs", category: "Community & Events", description: "Departmental associations, technology clubs, and societies." },
  { id: "announcements", name: "14. Announcements & Official Notices", category: "Community & Events", description: "Official AFIT administrative notices and campus announcements." },
  { id: "transportation", name: "15. Transportation & Shuttle Services", category: "Campus & Living", description: "Campus shuttle routes, departure times, and transport contacts." },
  { id: "food-dining", name: "16. Food & Dining Guide", category: "Campus & Living", description: "Campus cafeteria menus, eateries, and operating hours." },
  { id: "health-wellness", name: "17. Health & Wellness Services", category: "Campus & Living", description: "AFIT Medical Center contacts, health tips, and counseling." },
  { id: "finance-budgeting", name: "18. Finance & Budgeting Calculator", category: "Personal & Utilities", description: "Student allowance calculator and monthly expense budgeter." },
  { id: "career-internship", name: "19. Career & Internship Guidance", category: "Opportunities & Services", description: "Career advice, CV tips, and interview preparation resources." },
  { id: "student-services", name: "20. Student Services Directory", category: "Opportunities & Services", description: "Student affairs, transcripts, library services, and ID office." },
  { id: "lost-found", name: "21. Lost & Found Directory", category: "Opportunities & Services", description: "Report lost or found items on campus, search listings." },
  { id: "campus-directory", name: "22. Campus Directory", category: "Campus & Living", description: "Searchable departments, faculties, offices, and services." },
  { id: "community", name: "23. Communication & Community Noticeboard", category: "Community & Events", description: "Student community forums and study group noticeboard." },
  { id: "student-businesses", name: "24. Student Businesses & Services", category: "Community & Events", description: "Directory of student enterprises, tech, printing, and catering." },
  { id: "entertainment", name: "25. Entertainment & Student Recreation", category: "Community & Events", description: "Recreational gaming, movie nights, and creative arts events." },
  { id: "sports-fitness", name: "26. Sports & Fitness Hub", category: "Community & Events", description: "Sports center hours, intra-campus games, and fitness clubs." },
  { id: "emergency-safety", name: "27. Emergency & Safety Hotlines", category: "Campus & Living", description: "24/7 Campus security, ambulance, chief porter, and emergency calls." },
  { id: "utilities", name: "28. Useful Document Utilities", category: "Personal & Utilities", description: "PDF merger, splitter, compressor, image tools, QR generator." },
  { id: "ai-assistant", name: "29. AI Student Assistant", category: "Academics", description: "Interactive study AI assistant, prompt guide, and note summary." },
  { id: "profile", name: "30. Student Profile Manager", category: "Personal & Utilities", description: "Manage name, department, level, interests, skills, and bio." },
  { id: "alumni-networking", name: "31. Alumni & Networking Connect", category: "Opportunities & Services", description: "AFIT alumni network, mentorship, and post-grad pathways." },
  { id: "opportunities", name: "32. Scholarships & Opportunities", category: "Opportunities & Services", description: "Filterable scholarships, fellowships, and competition grants." },
  { id: "feedback", name: "33. Feedback & Complaints Portal", category: "Personal & Utilities", description: "Structured feedback and official complaint submissions." },
  { id: "admin-management", name: "34. Admin & Platform Management", category: "Personal & Utilities", description: "Server-enforced platform administration control center." },

  // Individual Calculators & Sub-Tools (Preserving Phase 1/2)
  { id: "gpa", name: "GPA Calculator", category: "Calculators", description: "Calculate a weighted semester GPA." },
  { id: "cgpa", name: "CGPA Calculator", category: "Calculators", description: "Add a semester to your cumulative result." },
  { id: "semester-result", name: "Semester Result Calculator", category: "Calculators", description: "Find your unit-weighted average score." },
  { id: "grade", name: "Grade Calculator", category: "Calculators", description: "Convert a score into a percentage and grade." },
  { id: "units", name: "Course Unit Calculator", category: "Calculators", description: "Total the units in a course selection." },
  { id: "registration", name: "Course Registration Planner", category: "Courses", description: "Draft and review a semester registration." },
  { id: "timetable-generator", name: "Timetable Generator", category: "Planning", description: "View saved classes by day of the week." },
  { id: "countdown", name: "Exam Countdown", category: "Planning", description: "See how long remains before each exam." },
  { id: "deadlines", name: "Academic Deadline Tracker", category: "Planning", description: "Track registration and other key dates." },
  { id: "semester-planner", name: "Semester Planner", category: "Planning", description: "Keep milestones and plans in one list." },
  { id: "study-generator", name: "Study Timetable Generator", category: "Planning", description: "Create a simple repeating study plan." },
  { id: "sessions", name: "Study Session Tracker", category: "Study & Revision", description: "Log sessions and review study time." },
  { id: "pomodoro", name: "Pomodoro Study Timer", category: "Study & Revision", description: "Timed 25m focus work and 5m break sessions." },
  { id: "focus-timer", name: "Focus Timer", category: "Study & Revision", description: "Custom focus timer for deep study work." },
  { id: "break-timer", name: "Break Timer", category: "Study & Revision", description: "Rest timer to refresh your mind." },
  { id: "flashcards", name: "Flashcard Maker", category: "Study & Revision", description: "Create, view, and test active recall flashcards." },
  { id: "study-notes", name: "Study Notes Organizer", category: "Study & Revision", description: "Organize categorized study notes." },
  { id: "quizzes", name: "Quiz Maker & Practice Quiz", category: "Study & Revision", description: "Create multiple-choice practice quizzes with scoring." },
  { id: "revision-plans", name: "Revision Planner", category: "Study & Revision", description: "Plan revision topics by priority and target date." },
  { id: "reading-progress", name: "Reading Progress Tracker", category: "Study & Revision", description: "Track completed book/textbook pages." },
  { id: "topic-checklists", name: "Topic Checklist", category: "Study & Revision", description: "Check off completed syllabus topics." },
  { id: "study-streak", name: "Study Streak Tracker", category: "Study & Revision", description: "View consecutive study activity and total time." },
  { id: "citation-gen", name: "Citation Generator", category: "Writing Utilities", description: "Generate APA, MLA, and Harvard citations." },
  { id: "word-counter", name: "Word & Character Counter", category: "Writing Utilities", description: "Live word, character, and sentence counting." },
  { id: "case-converter", name: "Text Case Converter", category: "Writing Utilities", description: "Convert uppercase, lowercase, Title Case, etc." },
  { id: "text-formatter", name: "Text Formatter", category: "Writing Utilities", description: "Clean duplicate spaces, line breaks, and HTML tags." },
  { id: "pdf-merger", name: "PDF Merger", category: "Document Tools", description: "Combine multiple PDF documents into one." },
  { id: "pdf-splitter", name: "PDF Splitter", category: "Document Tools", description: "Extract selected pages or ranges from a PDF." },
  { id: "pdf-compressor", name: "PDF Compressor", category: "Document Tools", description: "Attempt browser-side PDF stream optimization." },
  { id: "img-to-pdf", name: "Image-to-PDF Converter", category: "Document Tools", description: "Convert PNG/JPEG images into a PDF document." },
  { id: "img-compressor", name: "Image Compressor", category: "Document Tools", description: "Reduce image file dimensions and quality." },
  { id: "file-renamer", name: "File Renamer Utility", category: "Document Tools", description: "Provide downloadable renamed file copies." },
  { id: "qr-generator", name: "QR Code Generator", category: "Document Tools", description: "Generate downloadable QR codes for links/text." },
  { id: "scientific-calc", name: "Scientific Calculator", category: "General Calculators", description: "Evaluate trig, log, powers, and math expressions." },
  { id: "percentage-calc", name: "Percentage Calculator", category: "General Calculators", description: "Calculate percentages, ratios, and changes." },
  { id: "fraction-calc", name: "Fraction Calculator", category: "General Calculators", description: "Add, subtract, multiply, and reduce fractions." },
  { id: "unit-converter", name: "Unit Converter", category: "General Calculators", description: "Convert length, mass, volume, and time." },
  { id: "equation-solver", name: "Equation Solver", category: "General Calculators", description: "Solve linear algebraic equations ax + b = c." },
  { id: "matrix-calc", name: "Matrix Calculator", category: "General Calculators", description: "2x2 and 3x3 matrix determinant, inverse, transpose." },
  { id: "ohms-law", name: "Ohm's Law Calculator", category: "STEM Calculators", description: "Calculate Voltage, Current, and Resistance (V = I R)." },
  { id: "electrical-power", name: "Electrical Power Calculator", category: "STEM Calculators", description: "Calculate Power (P = VI = I²R = V²/R)." },
  { id: "resistor-calc", name: "Resistor Calculator", category: "STEM Calculators", description: "Resistor color band solver and series/parallel networks." },
  { id: "kinematics", name: "Kinematics Calculator", category: "STEM Calculators", description: "Solve constant acceleration motion equations." },
  { id: "projectile-motion", name: "Projectile Motion Calculator", category: "STEM Calculators", description: "Calculate projectile range, flight time, and max height." },
  { id: "newtons-laws", name: "Newton's Laws Calculator", category: "STEM Calculators", description: "Force, mass, and acceleration solver (F = ma)." },
  { id: "work-energy", name: "Work & Energy Calculator", category: "STEM Calculators", description: "Calculate Work, Kinetic Energy, and Potential Energy." },
  { id: "velocity-accel", name: "Velocity & Acceleration", category: "STEM Calculators", description: "Velocity (v = Δd/Δt) and acceleration (a = Δv/Δt)." },
  { id: "density", name: "Density Calculator", category: "STEM Calculators", description: "Calculate Mass, Volume, and Density (ρ = m/V)." },
  { id: "pressure", name: "Pressure Calculator", category: "STEM Calculators", description: "Force per unit area solver (P = F/A)." },
  { id: "temp-converter", name: "Temperature Converter", category: "STEM Calculators", description: "Convert Celsius, Fahrenheit, Kelvin, and Rankine." },
  { id: "number-system", name: "Number System Converter", category: "STEM Calculators", description: "Convert between Binary, Decimal, Hex, and Octal." },
  { id: "logarithm", name: "Logarithm Calculator", category: "STEM Calculators", description: "Compute log with arbitrary positive base." },
  { id: "quadratic-solver", name: "Quadratic Equation Solver", category: "STEM Calculators", description: "Solve ax² + bx + c = 0 with real and complex roots." },
  { id: "simultaneous-solver", name: "Simultaneous Equation Solver", category: "STEM Calculators", description: "Solve 2x2 linear equation systems." },
  { id: "statistics-calc", name: "Statistics Calculator", category: "STEM Calculators", description: "Mean, median, mode, variance, and standard deviation." },
  { id: "probability", name: "Probability & Combinatorics", category: "STEM Calculators", description: "Compute Permutations (nPr) and Combinations (nCr)." },
  { id: "formula-library", name: "Formula Library", category: "Formula Library", description: "Comprehensive O-Level & A-Level formula repository." },
  { id: "formula-admin", name: "Formula Management Admin", category: "Admin", description: "Protected formula administration & bulk import/export." }
];

const categoryList = [
  "All Sections",
  "Academics",
  "Campus & Living",
  "Opportunities & Services",
  "Community & Events",
  "Personal & Utilities",
  "Calculators",
  "STEM Calculators",
  "Document Tools"
];

const recentKey = "afitStudentLife.recentTools";
let activeTool = null;
let activeTimerManager = null;
let currentFilter = "All Sections";
let currentSearchQuery = "";

const dialog = document.querySelector("#tool-dialog");
const title = document.querySelector("#tool-title");
const category = document.querySelector("#tool-category");
const body = document.querySelector("#tool-body");
const grid = document.querySelector("#tool-grid");
const filters = document.querySelector("#tool-filters");
const recent = document.querySelector("#recent-tools");
const platformSearch = document.querySelector("#platform-search");

const recordTools = {
  registration: { type: "registration", label: "Registration plan", fields: [["code", "Course code", "text", true], ["name", "Course title", "text", true], ["units", "Units", "number", true]] },
  courses: { type: "courses", label: "Personal course", fields: [["code", "Course code", "text", true], ["name", "Course title", "text", true], ["units", "Units", "number", true]] },
  timetable: { type: "timetable", label: "Class", fields: [["course", "Course or activity", "text", true], ["day", "Day", "select", true, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]], ["start", "Start time", "time", true], ["end", "End time", "time", true], ["venue", "Venue (optional)", "text", false]] },
  exams: { type: "exams", label: "Exam", fields: [["course", "Course", "text", true], ["date", "Exam date", "date", true], ["time", "Time (optional)", "time", false], ["venue", "Venue (optional)", "text", false]] },
  assignments: { type: "assignments", label: "Assignment", fields: [["title", "Assignment", "text", true], ["course", "Course (optional)", "text", false], ["dueDate", "Due date", "date", true], ["status", "Status", "select", true, ["To do", "In progress", "Complete"]], ["notes", "Notes (optional)", "text", false]] },
  deadlines: { type: "deadlines", label: "Academic deadline", fields: [["title", "Deadline", "text", true], ["category", "Type (optional)", "text", false], ["dueDate", "Date", "date", true], ["notes", "Notes (optional)", "text", false]] },
  "semester-planner": { type: "semester-plan", label: "Semester milestone", fields: [["title", "Milestone", "text", true], ["date", "Target date (optional)", "date", false], ["notes", "Notes (optional)", "text", false]] },
  sessions: { type: "study-sessions", label: "Study session", fields: [["subject", "Subject or course", "text", true], ["minutes", "Minutes studied", "number", true], ["date", "Date", "date", true]] },
  flashcards: { type: "flashcards", label: "Flashcard", fields: [["front", "Front / Question", "text", true], ["back", "Back / Answer", "text", true], ["deck", "Deck name (optional)", "text", false]] },
  "study-notes": { type: "notes", label: "Study Note", fields: [["title", "Note title", "text", true], ["course", "Course code (optional)", "text", false], ["content", "Note content", "text", true]] },
  "revision-plans": { type: "revision-plans", label: "Revision topic", fields: [["topic", "Topic", "text", true], ["subject", "Subject", "text", false], ["priority", "Priority", "select", true, ["Low", "Medium", "High"]], ["targetDate", "Target date", "date", true], ["status", "Status", "select", true, ["Not started", "In progress", "Completed"]]] },
  "reading-progress": { type: "reading-progress", label: "Reading item", fields: [["title", "Book/Textbook title", "text", true], ["subject", "Subject", "text", false], ["totalPages", "Total pages", "number", true], ["completedPages", "Pages completed", "number", true]] },
  "topic-checklists": { type: "topic-checklists", label: "Checklist item", fields: [["subject", "Subject", "text", true], ["topic", "Topic name", "text", true], ["completed", "Completed?", "select", true, ["false", "true"]]] }
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { return []; }
}

function rememberTool(id) {
  const items = [id, ...getRecent().filter((item) => item !== id)].slice(0, 4);
  try { localStorage.setItem(recentKey, JSON.stringify(items)); } catch {}
  renderRecent();
}

function renderRecent() {
  const items = getRecent().map((id) => tools.find((tool) => tool.id === id)).filter(Boolean);
  recent.innerHTML = items.length
    ? items.map((item) => `<button class="recent-link" type="button" data-open-tool="${item.id}">${escapeHtml(item.name)}</button>`).join("")
    : '<p class="muted">Your recent tools will appear here.</p>';
}

function renderFilters(selected = "All Sections") {
  currentFilter = selected;
  filters.innerHTML = categoryList.map((item) =>
    `<button class="filter-button" type="button" aria-pressed="${item === selected}" data-filter="${escapeHtml(item)}">${escapeHtml(item)}</button>`
  ).join("");
}

function renderCards() {
  let visible = currentFilter === "All Sections" ? tools : tools.filter((tool) => tool.category === currentFilter);
  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase().trim();
    visible = visible.filter((tool) =>
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q)
    );
  }
  grid.innerHTML = visible.length ? visible.map((tool) => {
    const number = String(tools.indexOf(tool) + 1).padStart(2, "0");
    return `<button class="tool-card" type="button" data-open-tool="${tool.id}">
      <span class="tool-number">${number} / ${escapeHtml(tool.category.toUpperCase())}</span>
      <strong>${escapeHtml(tool.name)}</strong><span>${escapeHtml(tool.description)}</span>
    </button>`;
  }).join("") : '<p class="empty-state">No matching platform sections or tools found.</p>';
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

function showError(message) {
  return `<div class="error-box">${escapeHtml(message)}</div>`;
}

async function renderTool(tool) {
  if (activeTimerManager) {
    activeTimerManager.pause();
    activeTimerManager = null;
  }
  body.innerHTML = "";

  // 1. Profile Module (#30 / "profile")
  if (tool.id === "profile") {
    await renderProfileModule(body);
    return;
  }

  // 2. Campus Directory (#22 / "campus-directory")
  if (tool.id === "campus-directory") {
    await renderCampusDirectoryModule(body);
    return;
  }

  // 3. Events (#12 / "events")
  if (tool.id === "events") {
    await renderEventsModule(body);
    return;
  }

  // 4. Marketplace (#10 / "marketplace")
  if (tool.id === "marketplace") {
    await renderMarketplaceModule(body);
    return;
  }

  // 5. Jobs & Gigs (#11 / "jobs-gigs")
  if (tool.id === "jobs-gigs") {
    await renderJobsModule(body);
    return;
  }

  // 6. Scholarships & Opportunities (#32 / "opportunities")
  if (tool.id === "opportunities") {
    await renderOpportunitiesModule(body);
    return;
  }

  // 7. Lost & Found (#21 / "lost-found")
  if (tool.id === "lost-found") {
    await renderLostFoundModule(body);
    return;
  }

  // 8. Announcements (#14 / "announcements")
  if (tool.id === "announcements") {
    await renderAnnouncementsModule(body);
    return;
  }

  // 9. Feedback (#33 / "feedback")
  if (tool.id === "feedback") {
    await renderFeedbackModule(body);
    return;
  }

  // 10. Admin (#34 / "admin-management")
  if (tool.id === "admin-management") {
    await renderAdminModule(body);
    return;
  }

  // 11. Campus Life Modules (Hostels, Transport, Dining, Health, Emergency, Orgs, Businesses, Alumni)
  if (["hostels", "transportation", "food-dining", "health-wellness", "emergency-safety", "organizations", "student-businesses", "alumni-networking", "campus-life", "community", "entertainment", "sports-fitness", "student-services", "career-internship"].includes(tool.id)) {
    renderCampusLifeModule(tool.id, body);
    return;
  }

  // 12. Utilities (AI Assistant, Finance Budgeting, Document Utilities)
  if (["ai-assistant", "finance-budgeting", "utilities"].includes(tool.id)) {
    renderUtilitiesModule(tool.id, body);
    return;
  }

  // 13. Academic Hubs (1-7)
  if (tool.id === "academic-tools") {
    body.innerHTML = `
      <p class="tool-intro">Choose an academic calculator or tool below:</p>
      <div class="inline-actions">
        <button class="button button-small button-primary" type="button" data-open-tool="gpa">GPA Calculator</button>
        <button class="button button-small button-primary" type="button" data-open-tool="cgpa">CGPA Calculator</button>
        <button class="button button-small button-primary" type="button" data-open-tool="semester-result">Semester Result</button>
        <button class="button button-small button-primary" type="button" data-open-tool="units">Course Unit Calculator</button>
      </div>
    `;
    return;
  }

  if (tool.id === "study-revision" || tool.id === "academic-resources") {
    body.innerHTML = `
      <p class="tool-intro">Academic Study & Revision tools:</p>
      <div class="inline-actions">
        <button class="button button-small button-primary" type="button" data-open-tool="flashcards">Flashcard Maker</button>
        <button class="button button-small button-primary" type="button" data-open-tool="quizzes">Practice Quizzes</button>
        <button class="button button-small button-primary" type="button" data-open-tool="formula-library">Formula Library</button>
      </div>
    `;
    return;
  }

  // Timers
  if (["pomodoro", "focus-timer", "break-timer"].includes(tool.id)) {
    const defaultMins = tool.id === "pomodoro" ? 25 : tool.id === "break-timer" ? 5 : 45;
    body.innerHTML = `
      <p class="tool-intro">Active countdown timer for your study routine.</p>
      <div class="timer-card">
        <div class="timer-display" id="timer-display">${String(defaultMins).padStart(2, "0")}:00</div>
        <div class="timer-controls">
          <button class="button button-primary" type="button" id="start-timer">Start</button>
          <button class="button button-secondary" type="button" id="pause-timer">Pause</button>
          <button class="button button-quiet" type="button" id="reset-timer">Reset</button>
        </div>
        <div class="form-row" style="margin-top:1rem;">
          <label class="field">Set minutes: <input type="number" id="custom-minutes" min="1" max="180" value="${defaultMins}"></label>
        </div>
      </div>
    `;
    const display = body.querySelector("#timer-display");
    const manager = new TimerManager(display, () => alert("Timer finished!"));
    activeTimerManager = manager;
    manager.set(defaultMins);

    body.querySelector("#start-timer").onclick = () => manager.start();
    body.querySelector("#pause-timer").onclick = () => manager.pause();
    body.querySelector("#reset-timer").onclick = () => {
      const mins = Number(body.querySelector("#custom-minutes").value) || defaultMins;
      manager.set(mins);
    };
    body.querySelector("#custom-minutes").onchange = (e) => {
      const mins = Number(e.target.value) || defaultMins;
      manager.set(mins);
    };
    return;
  }

  // Formula Library
  if (tool.id === "formula-library") {
    body.innerHTML = `
      <div class="formula-search-bar">
        <input type="text" id="formula-search-input" placeholder="Search formulas by name, keyword, or variable...">
        <div class="form-row" style="margin-top:0.5rem;">
          <select id="formula-subject-filter"><option value="">All Subjects</option><option>Mathematics</option><option>Physics</option><option>Chemistry</option><option>Engineering</option></select>
          <select id="formula-level-filter"><option value="">All Levels</option><option>O-Level</option><option>A-Level</option><option>Undergraduate</option></select>
        </div>
      </div>
      <div id="formula-cards-container" class="formula-cards-grid"><p class="muted">Loading formulas from library…</p></div>
    `;

    const searchInput = body.querySelector("#formula-search-input");
    const subjectFilter = body.querySelector("#formula-subject-filter");
    const levelFilter = body.querySelector("#formula-level-filter");
    const container = body.querySelector("#formula-cards-container");

    const render = async () => {
      const q = searchInput.value.toLowerCase().trim();
      const subj = subjectFilter.value;
      const lvl = levelFilter.value;
      let formulas = INITIAL_FORMULAS;

      try {
        formulas = await fetchFormulasFromApi(apiRequest, { search: q, subject: subj, level: lvl });
      } catch {
        formulas = INITIAL_FORMULAS;
      }

      container.innerHTML = formulas.length
        ? formulas.map(renderFormulaCard).join("")
        : '<p class="muted">No matching formulas found.</p>';
    };

    searchInput.oninput = render;
    subjectFilter.onchange = render;
    levelFilter.onchange = render;
    await render();
    return;
  }

  // Formula Admin
  if (tool.id === "formula-admin") {
    await renderAdminModule(body);
    return;
  }

  // Calculators & Math Tools
  if (tool.id === "scientific-calc") {
    body.innerHTML = `
      <p class="tool-intro">Scientific Calculator. Supports sin, cos, tan, log, ln, sqrt, ^, π, e.</p>
      <form class="tool-form" id="sci-form">
        <label class="field">Expression<input name="expr" required placeholder="sin(30) + sqrt(16) * 2"></label>
        <div class="form-row">
          <label class="field">Angle Mode<select name="angle"><option value="deg">Degrees</option><option value="rad">Radians</option></select></label>
        </div>
        <button class="button button-primary" type="submit">Evaluate</button>
        <div class="tool-output" id="sci-output"></div>
      </form>
    `;
    body.querySelector("#sci-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#sci-output");
      try {
        const res = evaluateScientific(form.expr.value, form.angle.value);
        output.innerHTML = `<div class="result-box"><strong>Result: ${res}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  // Record-based tools fallback
  if (recordTools[tool.id]) {
    const config = recordTools[tool.id];
    body.innerHTML = `
      <form class="tool-form" data-record-tool="${tool.id}">
        ${config.fields.map(([name, label, type, req, opts]) => {
          if (type === "select") {
            return `<label class="field">${escapeHtml(label)}<select name="${name}">${opts.map((o) => `<option>${escapeHtml(o)}</option>`).join("")}</select></label>`;
          }
          return `<label class="field">${escapeHtml(label)}<input name="${name}" type="${type}" ${req ? "required" : ""}></label>`;
        }).join("")}
        <button class="button button-primary" type="submit">Save Entry</button>
        <div class="tool-output"></div>
      </form>
      <div class="record-list" data-record-list></div>
    `;
    const form = body.querySelector("form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const output = form.querySelector(".tool-output");
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        if (payload.completed) payload.completed = payload.completed === "true";
        if (payload.totalPages) payload.totalPages = Number(payload.totalPages);
        if (payload.completedPages) payload.completedPages = Number(payload.completedPages);
        await apiRequest(`/api/records/${config.type}`, { method: "POST", body: payload });
        output.innerHTML = '<div class="result-box">Saved successfully!</div>';
        form.reset();
        loadRecordList(tool.id);
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    loadRecordList(tool.id);
    return;
  }

  body.innerHTML = `<p class="tool-intro">Tool component interactive view ready.</p>`;
}

async function loadRecordList(toolId) {
  const config = recordTools[toolId];
  const listElem = body.querySelector("[data-record-list]");
  if (!listElem || !config) return;
  try {
    const data = await apiRequest(`/api/records/${config.type}`);
    const items = data.items || [];
    if (!items.length) {
      listElem.innerHTML = '<p class="muted">No entries saved yet.</p>';
      return;
    }
    listElem.innerHTML = items.map((item) => `
      <div class="record-item">
        <div>
          <strong>${escapeHtml(item.title || item.front || item.topic || item.subject || "Entry")}</strong>
          <small>${escapeHtml(item.back || item.content || item.notes || "")}</small>
        </div>
      </div>
    `).join("");
  } catch {
    listElem.innerHTML = '<p class="muted">Could not load list.</p>';
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
    renderCards();
  });

  if (platformSearch) {
    platformSearch.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value;
      renderCards();
    });
  }

  const profileNavBtn = document.querySelector("#profile-nav-btn");
  if (profileNavBtn) {
    profileNavBtn.addEventListener("click", () => openTool("profile"));
  }

  const adminNavBtn = document.querySelector("#admin-nav-btn");
  if (adminNavBtn) {
    adminNavBtn.addEventListener("click", () => openTool("admin-management"));
    // Check if user is admin to reveal admin nav button
    apiRequest("/api/me").then((user) => {
      if (user && user.isAdmin) adminNavBtn.hidden = false;
    }).catch(() => {});
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-tool]");
    if (openButton) openTool(openButton.dataset.openTool);
  });

  const closeBtn = document.querySelector("#close-dialog");
  if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
}

export { initializeTools };
