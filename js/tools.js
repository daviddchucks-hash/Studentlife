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

const tools = [
  // Academic & Course Planning
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
  { id: "study-generator", name: "Study Timetable Generator", category: "Planning", description: "Create a simple repeating study plan." },
  { id: "sessions", name: "Study Session Tracker", category: "Study & Revision", description: "Log sessions and review study time." },

  // A. Study & Revision Tools (#1–#14)
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

  // B. Writing & Academic Utilities (#15–#20)
  { id: "citation-gen", name: "Citation Generator", category: "Writing Utilities", description: "Generate APA, MLA, and Harvard citations." },
  { id: "word-counter", name: "Word & Character Counter", category: "Writing Utilities", description: "Live word, character, and sentence counting." },
  { id: "case-converter", name: "Text Case Converter", category: "Writing Utilities", description: "Convert uppercase, lowercase, Title Case, etc." },
  { id: "text-formatter", name: "Text Formatter", category: "Writing Utilities", description: "Clean duplicate spaces, line breaks, and HTML tags." },

  // C. Document & File Tools (#21–#28)
  { id: "pdf-merger", name: "PDF Merger", category: "Document Tools", description: "Combine multiple PDF documents into one." },
  { id: "pdf-splitter", name: "PDF Splitter", category: "Document Tools", description: "Extract selected pages or ranges from a PDF." },
  { id: "pdf-compressor", name: "PDF Compressor", category: "Document Tools", description: "Attempt browser-side PDF stream optimization." },
  { id: "img-to-pdf", name: "Image-to-PDF Converter", category: "Document Tools", description: "Convert PNG/JPEG images into a PDF document." },
  { id: "img-compressor", name: "Image Compressor", category: "Document Tools", description: "Reduce image file dimensions and quality." },
  { id: "file-renamer", name: "File Renamer Utility", category: "Document Tools", description: "Provide downloadable renamed file copies." },
  { id: "qr-generator", name: "QR Code Generator", category: "Document Tools", description: "Generate downloadable QR codes for links/text." },

  // D. General Calculators (#29–#34)
  { id: "scientific-calc", name: "Scientific Calculator", category: "General Calculators", description: "Evaluate trig, log, powers, and math expressions." },
  { id: "percentage-calc", name: "Percentage Calculator", category: "General Calculators", description: "Calculate percentages, ratios, and changes." },
  { id: "fraction-calc", name: "Fraction Calculator", category: "General Calculators", description: "Add, subtract, multiply, and reduce fractions." },
  { id: "unit-converter", name: "Unit Converter", category: "General Calculators", description: "Convert length, mass, volume, and time." },
  { id: "equation-solver", name: "Equation Solver", category: "General Calculators", description: "Solve linear algebraic equations ax + b = c." },
  { id: "matrix-calc", name: "Matrix Calculator", category: "General Calculators", description: "2x2 and 3x3 matrix determinant, inverse, transpose." },

  // E. Mathematics, Physics & Engineering Tools (#35–#58)
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

  // Formula Library & Admin
  { id: "formula-library", name: "Formula Library", category: "Formula Library", description: "Comprehensive O-Level & A-Level formula repository." },
  { id: "formula-admin", name: "Formula Management Admin", category: "Admin", description: "Protected formula administration & bulk import/export." }
];

const categoryList = [
  "All tools",
  "Study & Revision",
  "Writing Utilities",
  "Document Tools",
  "General Calculators",
  "STEM Calculators",
  "Courses",
  "Planning",
  "Formula Library",
  "Admin"
];

const recentKey = "afitStudentLife.recentTools";
let activeTool = null;
let activeTimerManager = null;

const dialog = document.querySelector("#tool-dialog");
const title = document.querySelector("#tool-title");
const category = document.querySelector("#tool-category");
const body = document.querySelector("#tool-body");
const grid = document.querySelector("#tool-grid");
const filters = document.querySelector("#tool-filters");
const recent = document.querySelector("#recent-tools");

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
  return '<div class="db-missing">The Render API is configured for authentication & personal saved records.</div>';
}

function showError(message) {
  return `<div class="error-box">${escapeHtml(message)}</div>`;
}

// Render dynamic forms & tools
async function renderTool(tool) {
  if (activeTimerManager) {
    activeTimerManager.pause();
    activeTimerManager = null;
  }
  body.innerHTML = "";

  // 1-3. Timers
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

  // Study Streak
  if (tool.id === "study-streak") {
    body.innerHTML = '<p class="muted">Calculating study streak from your saved study sessions…</p>';
    try {
      const sessions = await apiRequest("/api/records/study-sessions");
      const streak = calculateStudyStreak(sessions.items || []);
      body.innerHTML = `
        <div class="result-box">
          <strong>🔥 ${streak.currentStreak} Day Study Streak</strong>
          <p>${streak.totalDays} total study days recorded</p>
          <p>${streak.totalMinutes} total minutes studied</p>
        </div>
      `;
    } catch {
      body.innerHTML = showError("Could not load study sessions.");
    }
    return;
  }

  // Flashcards with Interactive Flipper
  if (tool.id === "flashcards") {
    body.innerHTML = `
      <p class="tool-intro">Create and flip flashcards for active recall study.</p>
      <form class="tool-form" id="fc-form">
        <label class="field">Front / Question<textarea name="front" required placeholder="What is the speed of light?"></textarea></label>
        <label class="field">Back / Answer<textarea name="back" required placeholder="3.0 × 10⁸ m/s"></label>
        <label class="field">Deck Name (optional)<input name="deck" placeholder="Physics"></label>
        <button class="button button-primary" type="submit">Add Flashcard</button>
        <div class="tool-output"></div>
      </form>
      <div id="fc-player" style="margin-top:1.5rem;"></div>
    `;
    const form = body.querySelector("#fc-form");
    const player = body.querySelector("#fc-player");

    const loadFlashcards = async () => {
      try {
        const data = await apiRequest("/api/records/flashcards");
        const cards = data.items || [];
        if (!cards.length) {
          player.innerHTML = '<p class="muted">No flashcards saved yet. Add your first card above.</p>';
          return;
        }
        let cardIdx = 0;
        let isFlipped = false;

        const renderCard = () => {
          const card = cards[cardIdx];
          player.innerHTML = `
            <div class="timer-card" id="flip-card-box" style="cursor:pointer; min-height:140px; display:flex; flex-direction:column; justify-content:center;">
              <small class="muted">Card ${cardIdx + 1} of ${cards.length} · Click card to flip</small>
              <h3 style="margin-top:10px;">${escapeHtml(isFlipped ? card.back : card.front)}</h3>
              <p class="fine-print">${isFlipped ? "Answer" : "Question"}</p>
            </div>
            <div class="inline-actions" style="justify-content:center; margin-top:10px;">
              <button class="button button-small button-secondary" type="button" id="fc-prev">Previous</button>
              <button class="button button-small button-secondary" type="button" id="fc-next">Next</button>
            </div>
          `;
          body.querySelector("#flip-card-box").onclick = () => { isFlipped = !isFlipped; renderCard(); };
          body.querySelector("#fc-prev").onclick = () => { cardIdx = (cardIdx - 1 + cards.length) % cards.length; isFlipped = false; renderCard(); };
          body.querySelector("#fc-next").onclick = () => { cardIdx = (cardIdx + 1) % cards.length; isFlipped = false; renderCard(); };
        };
        renderCard();
      } catch {
        player.innerHTML = showError("Could not load flashcards.");
      }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const output = form.querySelector(".tool-output");
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        await apiRequest("/api/records/flashcards", { method: "POST", body: payload });
        output.innerHTML = '<div class="result-box">Flashcard added!</div>';
        form.reset();
        await loadFlashcards();
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    await loadFlashcards();
    return;
  }

  // Quizzes & Practice Quiz
  if (tool.id === "quizzes") {
    body.innerHTML = `
      <p class="tool-intro">Create and practice custom multiple-choice quizzes with instant scoring.</p>
      <form class="tool-form" id="quiz-create-form">
        <label class="field">Quiz Title<input name="title" required placeholder="Physics Mechanics Quiz"></label>
        <label class="field">Subject<input name="subject" placeholder="Physics"></label>
        <p><strong>Question 1:</strong></p>
        <label class="field">Question Text<input name="q1" required placeholder="What is the unit of Force?"></label>
        <div class="form-row">
          <input name="opt0" required placeholder="Option A (Correct)" value="Newton">
          <input name="opt1" required placeholder="Option B" value="Joule">
        </div>
        <div class="form-row">
          <input name="opt2" required placeholder="Option C" value="Pascal">
          <input name="opt3" required placeholder="Option D" value="Watt">
        </div>
        <label class="field">Explanation<input name="exp" placeholder="Force is measured in Newtons (N)."></label>
        <button class="button button-primary" type="submit">Create Practice Quiz</button>
        <div class="tool-output"></div>
      </form>
      <div id="quiz-runner" style="margin-top:1.5rem;"></div>
    `;
    const form = body.querySelector("#quiz-create-form");
    const runner = body.querySelector("#quiz-runner");

    const loadQuizzes = async () => {
      try {
        const data = await apiRequest("/api/records/quizzes");
        const list = data.items || [];
        if (!list.length) {
          runner.innerHTML = '<p class="muted">No quizzes saved yet. Create your first quiz above.</p>';
          return;
        }
        runner.innerHTML = list.map((q) => `
          <div class="record-item">
            <div>
              <strong>${escapeHtml(q.title)} (${q.questions ? q.questions.length : 0} Questions)</strong>
              <small>${escapeHtml(q.subject || "General")}</small>
            </div>
            <button class="button button-small button-secondary" type="button" data-take-quiz="${q.id}">Take Quiz</button>
          </div>
        `).join("");

        runner.onclick = (e) => {
          const btn = e.target.closest("[data-take-quiz]");
          if (!btn) return;
          const targetQuiz = list.find((x) => x.id === btn.dataset.takeQuiz);
          if (!targetQuiz || !targetQuiz.questions.length) return;
          const q = targetQuiz.questions[0];
          runner.innerHTML = `
            <div class="formula-card">
              <h3>${escapeHtml(targetQuiz.title)}</h3>
              <p><strong>Q1: ${escapeHtml(q.question)}</strong></p>
              <form id="quiz-take-form">
                ${q.options.map((opt, idx) => `
                  <label class="field" style="flex-direction:row; align-items:center; gap:8px;">
                    <input type="radio" name="quizOpt" value="${idx}" required> ${escapeHtml(opt)}
                  </label>
                `).join("")}
                <button class="button button-primary button-small" type="submit" style="margin-top:10px;">Submit Answer</button>
              </form>
              <div id="quiz-score-output" style="margin-top:10px;"></div>
            </div>
          `;
          body.querySelector("#quiz-take-form").onsubmit = (ev) => {
            ev.preventDefault();
            const sel = Number(ev.currentTarget.quizOpt.value);
            const scoreOut = body.querySelector("#quiz-score-output");
            if (sel === q.correctIndex) {
              scoreOut.innerHTML = `<div class="result-box"><strong>✓ Correct! Score: 100%</strong><p>${escapeHtml(q.explanation || "")}</p></div>`;
            } else {
              scoreOut.innerHTML = `<div class="error-box"><strong>✗ Incorrect. Correct answer: ${escapeHtml(q.options[q.correctIndex])}</strong><p>${escapeHtml(q.explanation || "")}</p></div>`;
            }
          };
        };
      } catch {
        runner.innerHTML = showError("Could not load quizzes.");
      }
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      const output = form.querySelector(".tool-output");
      try {
        const payload = {
          title: form.title.value,
          subject: form.subject.value,
          questions: [
            {
              question: form.q1.value,
              options: [form.opt0.value, form.opt1.value, form.opt2.value, form.opt3.value],
              correctIndex: 0,
              explanation: form.exp.value
            }
          ]
        };
        await apiRequest("/api/records/quizzes", { method: "POST", body: payload });
        output.innerHTML = '<div class="result-box">Quiz created!</div>';
        form.reset();
        await loadQuizzes();
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    await loadQuizzes();
    return;
  }

  // Writing Utilities
  if (tool.id === "citation-gen") {
    body.innerHTML = `
      <p class="tool-intro">Generate draft citations in APA, MLA, or Harvard format. <em>Verify draft citations against your department style guide.</em></p>
      <form class="tool-form" id="citation-form">
        <div class="form-row">
          <label class="field">Style<select name="style"><option>APA</option><option>MLA</option><option>Harvard</option></select></label>
          <label class="field">Source type<select name="type"><option value="book">Book</option><option value="journal">Journal Article</option><option value="website">Website</option></select></label>
        </div>
        <label class="field">Author(s)<input name="author" placeholder="e.g. Smith, J. D."></label>
        <label class="field">Title<input name="title" required placeholder="Title of work"></label>
        <div class="form-row">
          <label class="field">Container / Journal<input name="containerTitle" placeholder="Journal or Website name"></label>
          <label class="field">Year<input name="year" placeholder="2026"></label>
        </div>
        <div class="form-row">
          <label class="field">Publisher<input name="publisher" placeholder="Publisher name"></label>
          <label class="field">URL<input name="url" placeholder="https://..."></label>
        </div>
        <button class="button button-primary" type="submit">Generate Draft Citation</button>
        <div class="tool-output" id="tool-output"></div>
      </form>
    `;
    body.querySelector("#citation-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const citation = generateCitation(data.style, data.type, data);
      form.querySelector("#tool-output").innerHTML = `
        <div class="result-box">
          <p><strong>Draft Citation (${escapeHtml(data.style)}):</strong></p>
          <blockquote class="citation-block">${citation}</blockquote>
          <p class="fine-print">Note: Check italicization and formatting according to your department guide.</p>
        </div>
      `;
    };
    return;
  }

  if (tool.id === "word-counter") {
    body.innerHTML = `
      <p class="tool-intro">Type or paste text below for live word and character counts.</p>
      <label class="field"><textarea id="counter-input" rows="8" placeholder="Paste your text here..."></textarea></label>
      <div class="result-box" id="counter-output">
        <strong>0 words · 0 characters</strong>
        <p>0 sentences · 0 paragraphs · ~0 min reading time</p>
      </div>
    `;
    const textarea = body.querySelector("#counter-input");
    const output = body.querySelector("#counter-output");
    textarea.oninput = () => {
      const stats = countWordsAndChars(textarea.value);
      output.innerHTML = `
        <strong>${stats.words} words · ${stats.characters} characters (${stats.charactersNoSpaces} without spaces)</strong>
        <p>${stats.sentences} sentences · ${stats.paragraphs} paragraphs · ~${stats.readingTimeMinutes} min reading time</p>
      `;
    };
    return;
  }

  if (tool.id === "case-converter") {
    body.innerHTML = `
      <p class="tool-intro">Enter text and choose a case conversion option.</p>
      <label class="field"><textarea id="case-input" rows="5" placeholder="Enter text..."></textarea></label>
      <div class="inline-actions" style="margin-bottom:1rem;">
        <button class="button button-secondary" type="button" data-case="uppercase">UPPERCASE</button>
        <button class="button button-secondary" type="button" data-case="lowercase">lowercase</button>
        <button class="button button-secondary" type="button" data-case="titlecase">Title Case</button>
        <button class="button button-secondary" type="button" data-case="sentencecase">Sentence case</button>
      </div>
    `;
    const input = body.querySelector("#case-input");
    body.onclick = (e) => {
      const btn = e.target.closest("[data-case]");
      if (btn) input.value = convertTextCase(input.value, btn.dataset.case);
    };
    return;
  }

  // Document & File Tools (#21–#28)
  if (tool.id === "pdf-merger") {
    body.innerHTML = `
      <p class="tool-intro">PDF Merger. Select 2 or more PDF files to combine in order. Processing is performed locally in your browser.</p>
      <form class="tool-form" id="pdf-merge-form">
        <label class="field">Select PDF files<input type="file" name="files" accept="application/pdf" multiple required></label>
        <button class="button button-primary" type="submit">Merge PDFs</button>
        <div class="tool-output" id="pdf-merge-output"></div>
      </form>
    `;
    body.querySelector("#pdf-merge-form").onsubmit = async (e) => {
      e.preventDefault();
      const output = body.querySelector("#pdf-merge-output");
      const files = Array.from(e.currentTarget.files.files);
      output.innerHTML = "<p>Processing PDF files locally in browser...</p>";
      try {
        const mergedBlob = await mergePDFs(files);
        const downloadUrl = URL.createObjectURL(mergedBlob);
        output.innerHTML = `
          <div class="result-box">
            <strong>PDFs Merged Successfully!</strong><br>
            <a class="button button-small button-primary" href="${downloadUrl}" download="merged_document.pdf" style="margin-top:8px; display:inline-block;">Download Merged PDF</a>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "pdf-splitter") {
    body.innerHTML = `
      <p class="tool-intro">PDF Splitter. Select a PDF file and specify page ranges (e.g., 1, 3-5).</p>
      <form class="tool-form" id="pdf-split-form">
        <label class="field">Select PDF file<input type="file" name="file" accept="application/pdf" required></label>
        <label class="field">Page Numbers / Range<input name="pages" required placeholder="e.g. 1, 3-5"></label>
        <button class="button button-primary" type="submit">Split PDF</button>
        <div class="tool-output" id="pdf-split-output"></div>
      </form>
    `;
    body.querySelector("#pdf-split-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#pdf-split-output");
      const file = form.file.files[0];
      output.innerHTML = "<p>Splitting PDF locally in browser...</p>";
      try {
        const splitBlob = await splitPDF(file, form.pages.value);
        const downloadUrl = URL.createObjectURL(splitBlob);
        output.innerHTML = `
          <div class="result-box">
            <strong>PDF Split Successfully!</strong><br>
            <a class="button button-small button-primary" href="${downloadUrl}" download="split_pages.pdf" style="margin-top:8px; display:inline-block;">Download Split PDF</a>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "pdf-compressor") {
    body.innerHTML = `
      <p class="tool-intro">PDF Compressor. Attempts browser-side stream optimization and removes unneeded objects.</p>
      <form class="tool-form" id="pdf-comp-form">
        <label class="field">Select PDF file<input type="file" name="file" accept="application/pdf" required></label>
        <button class="button button-primary" type="submit">Compress PDF</button>
        <div class="tool-output" id="pdf-comp-output"></div>
      </form>
    `;
    body.querySelector("#pdf-comp-form").onsubmit = async (e) => {
      e.preventDefault();
      const output = body.querySelector("#pdf-comp-output");
      const file = e.currentTarget.file.files[0];
      output.innerHTML = "<p>Compressing PDF locally in browser...</p>";
      try {
        const res = await compressPDF(file);
        const downloadUrl = URL.createObjectURL(res.blob);
        const origKb = (res.originalSize / 1024).toFixed(1);
        const compKb = (res.compressedSize / 1024).toFixed(1);
        const statusMsg = res.isSmaller
          ? `Reduced size from ${origKb} KB to ${compKb} KB.`
          : `Note: File was already optimized (${origKb} KB vs ${compKb} KB).`;

        output.innerHTML = `
          <div class="result-box">
            <strong>Compression Processed!</strong>
            <p>${statusMsg}</p>
            <a class="button button-small button-primary" href="${downloadUrl}" download="compressed.pdf" style="margin-top:8px; display:inline-block;">Download Compressed PDF</a>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "img-to-pdf") {
    body.innerHTML = `
      <p class="tool-intro">Image-to-PDF Converter. Select images (PNG, JPEG) to convert into a single PDF document.</p>
      <form class="tool-form" id="img-pdf-form">
        <label class="field">Select Images<input type="file" name="files" accept="image/png, image/jpeg, image/webp" multiple required></label>
        <button class="button button-primary" type="submit">Convert to PDF</button>
        <div class="tool-output" id="img-pdf-output"></div>
      </form>
    `;
    body.querySelector("#img-pdf-form").onsubmit = async (e) => {
      e.preventDefault();
      const output = body.querySelector("#img-pdf-output");
      const files = Array.from(e.currentTarget.files.files);
      output.innerHTML = "<p>Creating PDF from images...</p>";
      try {
        const pdfBlob = await imageToPDF(files);
        const downloadUrl = URL.createObjectURL(pdfBlob);
        output.innerHTML = `
          <div class="result-box">
            <strong>PDF Created Successfully!</strong><br>
            <a class="button button-small button-primary" href="${downloadUrl}" download="converted_images.pdf" style="margin-top:8px; display:inline-block;">Download PDF</a>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "img-compressor") {
    body.innerHTML = `
      <p class="tool-intro">Image Compressor. Reduce image file size by tuning dimensions and JPEG quality.</p>
      <form class="tool-form" id="img-comp-form">
        <label class="field">Select Image<input type="file" name="file" accept="image/*" required></label>
        <div class="form-row">
          <label class="field">Quality (0.1 - 1.0)<input name="quality" type="number" step="0.1" min="0.1" max="1.0" value="0.7"></label>
          <label class="field">Max Width (px)<input name="maxWidth" type="number" value="1920"></label>
        </div>
        <button class="button button-primary" type="submit">Compress Image</button>
        <div class="tool-output" id="img-comp-output"></div>
      </form>
    `;
    body.querySelector("#img-comp-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#img-comp-output");
      const file = form.file.files[0];
      output.innerHTML = "<p>Compressing image...</p>";
      try {
        const res = await compressImage(file, Number(form.quality.value), Number(form.maxWidth.value));
        const downloadUrl = URL.createObjectURL(res.blob);
        const origKb = (res.originalSize / 1024).toFixed(1);
        const compKb = (res.compressedSize / 1024).toFixed(1);

        output.innerHTML = `
          <div class="result-box">
            <strong>Image Compressed!</strong>
            <p>Original: ${origKb} KB → Compressed: ${compKb} KB</p>
            <a class="button button-small button-primary" href="${downloadUrl}" download="compressed_image.jpg" style="margin-top:8px; display:inline-block;">Download Image</a>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "file-renamer") {
    body.innerHTML = `
      <p class="tool-intro">File Renamer Utility. <em>Note: Web browsers cannot rename files directly on your disk due to security sandbox rules; this tool provides a downloadable renamed copy.</em></p>
      <form class="tool-form" id="rename-form">
        <label class="field">Select File<input type="file" name="file" required></label>
        <label class="field">New File Name (including extension)<input name="newName" required placeholder="renamed_document.pdf"></label>
        <button class="button button-primary" type="submit">Prepare Renamed Download</button>
        <div class="tool-output" id="rename-output"></div>
      </form>
    `;
    body.querySelector("#rename-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#rename-output");
      const file = form.file.files[0];
      const newName = form.newName.value.trim();
      const downloadUrl = URL.createObjectURL(file);
      output.innerHTML = `
        <div class="result-box">
          <strong>File Prepared as '${escapeHtml(newName)}'</strong><br>
          <a class="button button-small button-primary" href="${downloadUrl}" download="${escapeHtml(newName)}" style="margin-top:8px; display:inline-block;">Download Renamed Copy</a>
        </div>
      `;
    };
    return;
  }

  if (tool.id === "qr-generator") {
    body.innerHTML = `
      <p class="tool-intro">Generate a downloadable QR code for any URL or plain text.</p>
      <form class="tool-form" id="qr-form">
        <label class="field">Text or URL<input name="qrText" required placeholder="https://example.com"></label>
        <button class="button button-primary" type="submit">Generate QR Code</button>
        <div class="tool-output" id="qr-output" style="text-align:center;"></div>
      </form>
    `;
    body.querySelector("#qr-form").onsubmit = async (e) => {
      e.preventDefault();
      const output = body.querySelector("#qr-output");
      output.innerHTML = "<p>Generating QR code...</p>";
      try {
        const text = e.currentTarget.qrText.value;
        const canvas = await generateQRCode(text);
        output.innerHTML = "";
        output.appendChild(canvas);
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  // Scientific Calculators
  // General Calculators (#29–#34)
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

  if (tool.id === "percentage-calc") {
    body.innerHTML = `
      <p class="tool-intro">Percentage Calculator. Select type and enter numbers.</p>
      <form class="tool-form" id="pct-form">
        <label class="field">Calculation Type
          <select name="type">
            <option value="percent_of">What is X% of Y?</option>
            <option value="is_percent">X is what percentage of Y?</option>
            <option value="percent_change">Percentage change from X to Y</option>
          </select>
        </label>
        <div class="form-row">
          <label class="field">Value X<input name="a" type="number" step="any" required value="15"></label>
          <label class="field">Value Y<input name="b" type="number" step="any" required value="200"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Percentage</button>
        <div class="tool-output" id="pct-output"></div>
      </form>
    `;
    body.querySelector("#pct-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#pct-output");
      try {
        const res = calculatePercentage(form.type.value, form.a.value, form.b.value);
        output.innerHTML = `<div class="result-box">${res}</div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "fraction-calc") {
    body.innerHTML = `
      <p class="tool-intro">Fraction Calculator. Perform operations on fractions and simplify results.</p>
      <form class="tool-form" id="frac-form">
        <div class="form-row">
          <label class="field">Fraction 1 Numerator<input name="n1" type="number" required value="1"></label>
          <label class="field">Fraction 1 Denominator<input name="d1" type="number" required value="2"></label>
        </div>
        <label class="field">Operation
          <select name="op">
            <option value="+">+</option>
            <option value="-">-</option>
            <option value="*">×</option>
            <option value="/">÷</option>
          </select>
        </label>
        <div class="form-row">
          <label class="field">Fraction 2 Numerator<input name="n2" type="number" required value="1"></label>
          <label class="field">Fraction 2 Denominator<input name="d2" type="number" required value="4"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Fraction</button>
        <div class="tool-output" id="frac-output"></div>
      </form>
    `;
    body.querySelector("#frac-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#frac-output");
      try {
        const res = calculateFraction(form.n1.value, form.d1.value, form.op.value, form.n2.value, form.d2.value);
        output.innerHTML = `<div class="result-box"><strong>Simplified Fraction: ${res.fractionStr}</strong><p>Decimal value: ${res.decimal}</p></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "unit-converter") {
    body.innerHTML = `
      <p class="tool-intro">Unit Converter. Convert length, mass, volume, and time units.</p>
      <form class="tool-form" id="unit-form">
        <label class="field">Category
          <select name="category" id="unit-cat">
            <option value="length">Length</option>
            <option value="mass">Mass</option>
            <option value="volume">Volume</option>
            <option value="time">Time</option>
          </select>
        </label>
        <div class="form-row">
          <label class="field">Value<input name="val" type="number" step="any" required value="10"></label>
          <label class="field">From<select name="fromUnit" id="unit-from"><option value="km">km</option><option value="m">m</option><option value="miles">miles</option></select></label>
          <label class="field">To<select name="toUnit" id="unit-to"><option value="m">m</option><option value="km">km</option><option value="feet">feet</option></select></label>
        </div>
        <button class="button button-primary" type="submit">Convert</button>
        <div class="tool-output" id="unit-output"></div>
      </form>
    `;
    const catSelect = body.querySelector("#unit-cat");
    const fromSelect = body.querySelector("#unit-from");
    const toSelect = body.querySelector("#unit-to");

    const unitOptions = {
      length: ["m", "km", "cm", "mm", "miles", "feet", "inches"],
      mass: ["kg", "g", "mg", "lb", "oz"],
      volume: ["L", "mL", "gal", "m3"],
      time: ["s", "min", "h", "days"]
    };

    const updateUnits = () => {
      const opts = unitOptions[catSelect.value] || [];
      fromSelect.innerHTML = opts.map((u) => `<option value="${u}">${u}</option>`).join("");
      toSelect.innerHTML = opts.map((u) => `<option value="${u}">${u}</option>`).join("");
      if (opts.length > 1) toSelect.selectedIndex = 1;
    };
    catSelect.onchange = updateUnits;
    updateUnits();

    body.querySelector("#unit-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#unit-output");
      try {
        const converted = convertUnit(form.category.value, form.val.value, form.fromUnit.value, form.toUnit.value);
        output.innerHTML = `<div class="result-box"><strong>${form.val.value} ${form.fromUnit.value} = ${converted.toFixed(6).replace(/\.?0+$/, "")} ${form.toUnit.value}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "equation-solver") {
    body.innerHTML = `
      <p class="tool-intro">Linear Equation Solver. Solves ax + b = c.</p>
      <form class="tool-form" id="eq-form">
        <div class="form-row">
          <label class="field">a<input name="a" type="number" step="any" required value="2"></label>
          <label class="field">b<input name="b" type="number" step="any" required value="4"></label>
          <label class="field">c<input name="c" type="number" step="any" required value="10"></label>
        </div>
        <button class="button button-primary" type="submit">Solve Equation</button>
        <div class="tool-output" id="eq-output"></div>
      </form>
    `;
    body.querySelector("#eq-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#eq-output");
      try {
        const res = solveLinearEquation(form.a.value, form.b.value, form.c.value);
        output.innerHTML = `<div class="result-box"><strong>${res}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "matrix-calc") {
    body.innerHTML = `
      <p class="tool-intro">2x2 Matrix Calculator. Compute Determinant, Transpose, or Inverse.</p>
      <form class="tool-form" id="mat-form">
        <label class="field">Operation
          <select name="op">
            <option value="det">Determinant</option>
            <option value="transpose">Transpose</option>
            <option value="inverse">Inverse Matrix</option>
          </select>
        </label>
        <p><strong>Matrix A:</strong></p>
        <div class="form-row">
          <input name="a00" type="number" step="any" required value="1">
          <input name="a01" type="number" step="any" required value="2">
        </div>
        <div class="form-row">
          <input name="a10" type="number" step="any" required value="3">
          <input name="a11" type="number" step="any" required value="4">
        </div>
        <button class="button button-primary" type="submit" style="margin-top:1rem;">Compute Matrix</button>
        <div class="tool-output" id="mat-output"></div>
      </form>
    `;
    body.querySelector("#mat-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#mat-output");
      try {
        const matA = [
          [Number(form.a00.value), Number(form.a01.value)],
          [Number(form.a10.value), Number(form.a11.value)]
        ];
        const res = calculateMatrix(form.op.value, matA);
        if (typeof res === "number") {
          output.innerHTML = `<div class="result-box"><strong>Determinant: ${res}</strong></div>`;
        } else {
          const rows = res.map((row) => `[ ${row.map((val) => Number(val).toFixed(4).replace(/\.?0+$/, "")).join(", ")} ]`).join("<br>");
          output.innerHTML = `<div class="result-box"><strong>Result Matrix:</strong><p>${rows}</p></div>`;
        }
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  // STEM Calculators (#35–#58)
  if (tool.id === "ohms-law") {
    body.innerHTML = `
      <p class="tool-intro">Ohm's Law Calculator. Enter any two values to compute the third (V = I × R).</p>
      <form class="tool-form" id="ohm-form">
        <div class="form-row">
          <label class="field">Voltage (V)<input name="v" type="number" step="any" placeholder="Volts"></label>
          <label class="field">Current (I)<input name="i" type="number" step="any" placeholder="Amperes"></label>
          <label class="field">Resistance (R)<input name="r" type="number" step="any" placeholder="Ohms (Ω)"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Ohm's Law</button>
        <div class="tool-output" id="ohm-output"></div>
      </form>
    `;
    body.querySelector("#ohm-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#ohm-output");
      try {
        const res = calculateOhmsLaw({ v: form.v.value, i: form.i.value, r: form.r.value });
        output.innerHTML = `
          <div class="result-box">
            <strong>V = ${res.voltage} V · I = ${res.current} A · R = ${res.resistance} Ω</strong>
            <p>Power Dissipated: ${res.power} W</p>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "electrical-power") {
    body.innerHTML = `
      <p class="tool-intro">Electrical Power Calculator. P = V × I = I²R = V² / R.</p>
      <form class="tool-form" id="power-form">
        <div class="form-row">
          <label class="field">Power (P)<input name="p" type="number" step="any" placeholder="Watts (W)"></label>
          <label class="field">Voltage (V)<input name="v" type="number" step="any" placeholder="Volts (V)"></label>
        </div>
        <div class="form-row">
          <label class="field">Current (I)<input name="i" type="number" step="any" placeholder="Amperes (A)"></label>
          <label class="field">Resistance (R)<input name="r" type="number" step="any" placeholder="Ohms (Ω)"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Power</button>
        <div class="tool-output" id="power-output"></div>
      </form>
    `;
    body.querySelector("#power-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#power-output");
      try {
        const res = calculateElectricalPower({ p: form.p.value, v: form.v.value, i: form.i.value, r: form.r.value });
        output.innerHTML = `
          <div class="result-box">
            <strong>Power: ${res.power} W</strong>
            <p>Voltage: ${res.voltage} V · Current: ${res.current} A · Resistance: ${res.resistance} Ω</p>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "resistor-calc") {
    body.innerHTML = `
      <p class="tool-intro">Resistor Calculator. Calculate Color Band Resistance or Series/Parallel Total.</p>
      <form class="tool-form" id="res-form">
        <label class="field">Mode
          <select name="mode" id="res-mode">
            <option value="color">Color Bands (4-Band)</option>
            <option value="network">Series / Parallel Network</option>
          </select>
        </label>
        <div id="res-color-fields">
          <div class="form-row">
            <label class="field">Band 1<select name="b1"><option value="brown">Brown (1)</option><option value="red">Red (2)</option><option value="orange">Orange (3)</option><option value="yellow">Yellow (4)</option></select></label>
            <label class="field">Band 2<select name="b2"><option value="black">Black (0)</option><option value="brown">Brown (1)</option><option value="red">Red (2)</option></select></label>
          </div>
          <div class="form-row">
            <label class="field">Multiplier<select name="mult"><option value="red">x100 (Red)</option><option value="orange">x1k (Orange)</option><option value="yellow">x10k (Yellow)</option></select></label>
            <label class="field">Tolerance<select name="tol"><option value="gold">±5% (Gold)</option><option value="silver">±10% (Silver)</option></select></label>
          </div>
        </div>
        <div id="res-net-fields" style="display:none;">
          <label class="field">Network Type<select name="netType"><option value="series">Series</option><option value="parallel">Parallel</option></select></label>
          <label class="field">Resistor Values (Ω), separated by commas<input name="resList" placeholder="100, 220, 470"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Resistor</button>
        <div class="tool-output" id="res-output"></div>
      </form>
    `;
    const modeSelect = body.querySelector("#res-mode");
    const colorFields = body.querySelector("#res-color-fields");
    const netFields = body.querySelector("#res-net-fields");

    modeSelect.onchange = () => {
      const isNet = modeSelect.value === "network";
      colorFields.style.display = isNet ? "none" : "block";
      netFields.style.display = isNet ? "block" : "none";
    };

    body.querySelector("#res-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#res-output");
      try {
        if (form.mode.value === "color") {
          const res = calculateResistorColorCode(form.b1.value, form.b2.value, null, form.mult.value, form.tol.value);
          output.innerHTML = `<div class="result-box"><strong>Resistance: ${res.formatted}</strong></div>`;
        } else {
          const list = form.resList.value.split(",").map((x) => x.trim());
          const res = calculateResistorNetwork(form.netType.value, list);
          output.innerHTML = `<div class="result-box"><strong>Total ${res.type} Resistance: ${res.total} Ω</strong></div>`;
        }
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "kinematics") {
    body.innerHTML = `
      <p class="tool-intro">Kinematics Calculator. Enter at least 3 known values (u, v, a, t, s) to calculate missing variables.</p>
      <form class="tool-form" id="kin-form">
        <div class="form-row">
          <label class="field">Initial velocity (u)<input name="u" type="number" step="any" placeholder="m/s"></label>
          <label class="field">Final velocity (v)<input name="v" type="number" step="any" placeholder="m/s"></label>
        </div>
        <div class="form-row">
          <label class="field">Acceleration (a)<input name="a" type="number" step="any" placeholder="m/s²"></label>
          <label class="field">Time (t)<input name="t" type="number" step="any" placeholder="seconds"></label>
        </div>
        <label class="field">Displacement (s)<input name="s" type="number" step="any" placeholder="meters"></label>
        <button class="button button-primary" type="submit">Solve Kinematics</button>
        <div class="tool-output" id="kin-output"></div>
      </form>
    `;
    body.querySelector("#kin-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#kin-output");
      try {
        const res = calculateKinematics({ u: form.u.value, v: form.v.value, a: form.a.value, t: form.t.value, s: form.s.value });
        output.innerHTML = `
          <div class="result-box">
            <strong>u = ${res.u} m/s · v = ${res.v} m/s</strong>
            <p>a = ${res.a} m/s² · t = ${res.t} s · s = ${res.s} m</p>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "projectile-motion") {
    body.innerHTML = `
      <p class="tool-intro">Projectile Motion Calculator. Flat terrain, g = 9.81 m/s².</p>
      <form class="tool-form" id="proj-form">
        <div class="form-row">
          <label class="field">Initial Velocity (v₀)<input name="v0" type="number" step="any" required value="20" placeholder="m/s"></label>
          <label class="field">Launch Angle (θ°)<input name="angle" type="number" step="any" required value="45" placeholder="degrees"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Projectile</button>
        <div class="tool-output" id="proj-output"></div>
      </form>
    `;
    body.querySelector("#proj-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#proj-output");
      try {
        const res = calculateProjectileMotion(form.v0.value, form.angle.value);
        output.innerHTML = `
          <div class="result-box">
            <strong>Max Range: ${res.range} m · Max Height: ${res.maxHeight} m</strong>
            <p>Time of Flight: ${res.timeOfFlight} s · v₀x = ${res.v0x} m/s · v₀y = ${res.v0y} m/s</p>
            <p class="fine-print">${res.assumptions}</p>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "newtons-laws") {
    body.innerHTML = `
      <p class="tool-intro">Newton's Second Law Calculator (F = m × a).</p>
      <form class="tool-form" id="newton-form">
        <div class="form-row">
          <label class="field">Force (F)<input name="f" type="number" step="any" placeholder="Newtons (N)"></label>
          <label class="field">Mass (m)<input name="m" type="number" step="any" placeholder="kg"></label>
          <label class="field">Acceleration (a)<input name="a" type="number" step="any" placeholder="m/s²"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate F = ma</button>
        <div class="tool-output" id="newton-output"></div>
      </form>
    `;
    body.querySelector("#newton-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#newton-output");
      try {
        const res = calculateNewtonLaws({ m: form.m.value, a: form.a.value, f: form.f.value });
        output.innerHTML = `
          <div class="result-box">
            <strong>F = ${res.force} N · m = ${res.mass} kg · a = ${res.accel} m/s²</strong>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "work-energy") {
    body.innerHTML = `
      <p class="tool-intro">Work, Kinetic Energy & Potential Energy Calculator.</p>
      <form class="tool-form" id="we-form">
        <p><strong>Work (W = F × d × cos θ)</strong></p>
        <div class="form-row">
          <input name="f" type="number" step="any" placeholder="Force (N)">
          <input name="d" type="number" step="any" placeholder="Distance (m)">
          <input name="theta" type="number" step="any" placeholder="Angle (°)" value="0">
        </div>
        <p><strong>Kinetic Energy (KE = ½mv²) & PE (mgh)</strong></p>
        <div class="form-row">
          <input name="m" type="number" step="any" placeholder="Mass (kg)">
          <input name="v" type="number" step="any" placeholder="Velocity (m/s)">
          <input name="h" type="number" step="any" placeholder="Height (m)">
        </div>
        <button class="button button-primary" type="submit" style="margin-top:1rem;">Calculate Work & Energy</button>
        <div class="tool-output" id="we-output"></div>
      </form>
    `;
    body.querySelector("#we-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#we-output");
      try {
        const res = calculateWorkEnergy({ f: form.f.value, d: form.d.value, thetaDeg: form.theta.value, m: form.m.value, v: form.v.value, h: form.h.value });
        let txt = [];
        if (res.work) txt.push(`Work done: <strong>${res.work} J</strong>`);
        if (res.ke) txt.push(`Kinetic Energy: <strong>${res.ke} J</strong>`);
        if (res.pe) txt.push(`Potential Energy: <strong>${res.pe} J</strong>`);
        output.innerHTML = `<div class="result-box">${txt.join("<br>")}</div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "velocity-accel") {
    body.innerHTML = `
      <p class="tool-intro">Velocity (v = Δd/Δt) and Acceleration (a = Δv/Δt) Calculator.</p>
      <form class="tool-form" id="va-form">
        <p><strong>Calculate Velocity:</strong></p>
        <div class="form-row">
          <input name="d" type="number" step="any" placeholder="Distance (m)">
          <input name="t" type="number" step="any" placeholder="Time (s)">
        </div>
        <p><strong>Or Calculate Acceleration:</strong></p>
        <div class="form-row">
          <input name="u" type="number" step="any" placeholder="Initial velocity u (m/s)">
          <input name="v" type="number" step="any" placeholder="Final velocity v (m/s)">
        </div>
        <button class="button button-primary" type="submit" style="margin-top:1rem;">Calculate</button>
        <div class="tool-output" id="va-output"></div>
      </form>
    `;
    body.querySelector("#va-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#va-output");
      try {
        const res = calculateVelocityAccel(form.d.value, form.t.value, form.u.value, form.v.value);
        if (res.velocity) output.innerHTML = `<div class="result-box"><strong>Velocity: ${res.velocity} m/s</strong></div>`;
        else output.innerHTML = `<div class="result-box"><strong>Acceleration: ${res.accel} m/s²</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "density") {
    body.innerHTML = `
      <p class="tool-intro">Density Calculator (ρ = m / V).</p>
      <form class="tool-form" id="den-form">
        <div class="form-row">
          <label class="field">Mass (m)<input name="m" type="number" step="any" placeholder="kg"></label>
          <label class="field">Volume (V)<input name="v" type="number" step="any" placeholder="m³"></label>
          <label class="field">Density (ρ)<input name="p" type="number" step="any" placeholder="kg/m³"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Density</button>
        <div class="tool-output" id="den-output"></div>
      </form>
    `;
    body.querySelector("#den-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#den-output");
      try {
        const res = calculateDensity(form.m.value, form.v.value, form.p.value);
        const val = res.density ? `Density ρ = ${res.density} kg/m³` : res.mass ? `Mass m = ${res.mass} kg` : `Volume V = ${res.volume} m³`;
        output.innerHTML = `<div class="result-box"><strong>${val}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "pressure") {
    body.innerHTML = `
      <p class="tool-intro">Pressure Calculator (P = F / A).</p>
      <form class="tool-form" id="press-form">
        <div class="form-row">
          <label class="field">Force (F)<input name="f" type="number" step="any" placeholder="Newtons (N)"></label>
          <label class="field">Area (A)<input name="a" type="number" step="any" placeholder="m²"></label>
          <label class="field">Pressure (P)<input name="p" type="number" step="any" placeholder="Pascals (Pa)"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Pressure</button>
        <div class="tool-output" id="press-output"></div>
      </form>
    `;
    body.querySelector("#press-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#press-output");
      try {
        const res = calculatePressure(form.f.value, form.a.value, form.p.value);
        const val = res.pressure ? `Pressure P = ${res.pressure} Pa` : res.force ? `Force F = ${res.force} N` : `Area A = ${res.area} m²`;
        output.innerHTML = `<div class="result-box"><strong>${val}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "temp-converter") {
    body.innerHTML = `
      <p class="tool-intro">Temperature Converter.</p>
      <form class="tool-form" id="temp-form">
        <div class="form-row">
          <label class="field">Value<input name="val" type="number" step="any" required value="25"></label>
          <label class="field">From<select name="from"><option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option><option value="K">Kelvin (K)</option></select></label>
          <label class="field">To<select name="to"><option value="F">Fahrenheit (°F)</option><option value="K">Kelvin (K)</option><option value="C">Celsius (°C)</option></select></label>
        </div>
        <button class="button button-primary" type="submit">Convert Temperature</button>
        <div class="tool-output" id="temp-output"></div>
      </form>
    `;
    body.querySelector("#temp-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#temp-output");
      try {
        const res = convertTemperature(form.val.value, form.from.value, form.to.value);
        output.innerHTML = `<div class="result-box"><strong>${form.val.value} °${form.from.value} = ${res} °${form.to.value}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "number-system") {
    body.innerHTML = `
      <p class="tool-intro">Number System Converter (Base 2 to 36).</p>
      <form class="tool-form" id="base-form">
        <label class="field">Value<input name="val" required value="1010" placeholder="Number string"></label>
        <div class="form-row">
          <label class="field">From Base<input name="fromBase" type="number" min="2" max="36" required value="2"></label>
          <label class="field">To Base<input name="toBase" type="number" min="2" max="36" required value="10"></label>
        </div>
        <button class="button button-primary" type="submit">Convert Base</button>
        <div class="tool-output" id="base-output"></div>
      </form>
    `;
    body.querySelector("#base-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#base-output");
      try {
        const res = convertNumberSystem(form.val.value, form.fromBase.value, form.toBase.value);
        output.innerHTML = `<div class="result-box"><strong>(Base ${form.fromBase.value}) ${form.val.value} = (Base ${form.toBase.value}) ${res}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "logarithm") {
    body.innerHTML = `
      <p class="tool-intro">Logarithm Calculator (log_b(x)).</p>
      <form class="tool-form" id="log-form">
        <div class="form-row">
          <label class="field">x<input name="x" type="number" step="any" required value="100"></label>
          <label class="field">Base b<input name="base" type="number" step="any" required value="10"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Log</button>
        <div class="tool-output" id="log-output"></div>
      </form>
    `;
    body.querySelector("#log-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#log-output");
      try {
        const res = calculateLogarithm(form.x.value, form.base.value);
        output.innerHTML = `<div class="result-box"><strong>log_${form.base.value}(${form.x.value}) = ${res}</strong></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "simultaneous-solver") {
    body.innerHTML = `
      <p class="tool-intro">Simultaneous Linear Equation Solver (2x2).</p>
      <form class="tool-form" id="sim-form">
        <p><strong>Equation 1: a₁x + b₁y = c₁</strong></p>
        <div class="form-row">
          <input name="a1" type="number" step="any" required value="2" placeholder="a₁">
          <input name="b1" type="number" step="any" required value="3" placeholder="b₁">
          <input name="c1" type="number" step="any" required value="8" placeholder="c₁">
        </div>
        <p><strong>Equation 2: a₂x + b₂y = c₂</strong></p>
        <div class="form-row">
          <input name="a2" type="number" step="any" required value="1" placeholder="a₂">
          <input name="b2" type="number" step="any" required value="-1" placeholder="b₂">
          <input name="c2" type="number" step="any" required value="-1" placeholder="c₂">
        </div>
        <button class="button button-primary" type="submit" style="margin-top:1rem;">Solve System</button>
        <div class="tool-output" id="sim-output"></div>
      </form>
    `;
    body.querySelector("#sim-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#sim-output");
      try {
        const res = solveSimultaneous2x2(
          Number(form.a1.value), Number(form.b1.value), Number(form.c1.value),
          Number(form.a2.value), Number(form.b2.value), Number(form.c2.value)
        );
        if (res.x !== undefined) {
          output.innerHTML = `<div class="result-box"><strong>x = ${res.x} · y = ${res.y}</strong><p>${res.status}</p></div>`;
        } else {
          output.innerHTML = `<div class="result-box"><strong>${res.status}</strong></div>`;
        }
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "statistics-calc") {
    body.innerHTML = `
      <p class="tool-intro">Statistics Calculator. Enter numbers separated by commas or spaces.</p>
      <form class="tool-form" id="stat-form">
        <label class="field">Numbers<textarea name="nums" required placeholder="12, 15, 20, 25, 30, 35"></textarea></label>
        <button class="button button-primary" type="submit">Compute Statistics</button>
        <div class="tool-output" id="stat-output"></div>
      </form>
    `;
    body.querySelector("#stat-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#stat-output");
      try {
        const list = form.nums.value.split(/[\s,]+/).map(Number).filter(Number.isFinite);
        const res = calculateStatistics(list);
        output.innerHTML = `
          <div class="result-box">
            <strong>Mean: ${res.mean} · Median: ${res.median} · Mode: ${res.mode}</strong>
            <p>Count: ${res.count} · Sum: ${res.sum} · Min: ${res.min} · Max: ${res.max} · Range: ${res.range}</p>
            <p>Population Std Dev: ${res.stdDevPop} (Var: ${res.variancePop})</p>
            <p>Sample Std Dev: ${res.stdDevSample} (Var: ${res.varianceSample})</p>
          </div>
        `;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "probability") {
    body.innerHTML = `
      <p class="tool-intro">Probability & Combinatorics. Compute Permutations (nPr) and Combinations (nCr).</p>
      <form class="tool-form" id="prob-form">
        <div class="form-row">
          <label class="field">n (Total items)<input name="n" type="number" min="0" required value="5"></label>
          <label class="field">r (Sample size)<input name="r" type="number" min="0" required value="2"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate nPr & nCr</button>
        <div class="tool-output" id="prob-output"></div>
      </form>
    `;
    body.querySelector("#prob-form").onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const output = form.querySelector("#prob-output");
      try {
        const res = calculatePermutationsCombinations(form.n.value, form.r.value);
        output.innerHTML = `<div class="result-box"><strong>nPr (Permutations): ${res.nPr}</strong><p>nCr (Combinations): <strong>${res.nCr}</strong></p></div>`;
      } catch (err) {
        output.innerHTML = showError(err.message);
      }
    };
    return;
  }

  if (tool.id === "quadratic-solver") {

  // Formula Library View
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

    let activeFormulas = INITIAL_FORMULAS;

    const render = async () => {
      const q = searchInput.value.toLowerCase().trim();
      const subj = subjectFilter.value;
      const lvl = levelFilter.value;

      try {
        activeFormulas = await fetchFormulasFromApi(apiRequest, { search: q, subject: subj, level: lvl });
      } catch {
        activeFormulas = INITIAL_FORMULAS;
      }

      const filtered = activeFormulas.filter((f) => {
        if (subj && String(f.subject).toLowerCase() !== subj.toLowerCase()) return false;
        if (lvl && String(f.level).toLowerCase() !== lvl.toLowerCase()) return false;
        if (q) {
          return String(f.name).toLowerCase().includes(q) || String(f.formula).toLowerCase().includes(q) || String(f.description).toLowerCase().includes(q) || (f.tags && String(f.tags).toLowerCase().includes(q));
        }
        return true;
      });

      container.innerHTML = filtered.length
        ? filtered.map(renderFormulaCard).join("")
        : '<p class="muted">No matching formulas found.</p>';
    };

    searchInput.oninput = render;
    subjectFilter.onchange = render;
    levelFilter.onchange = render;
    await render();
    return;
  }

  // Formula Management Admin Portal
  if (tool.id === "formula-admin") {
    body.innerHTML = '<p class="muted">Checking administrator credentials…</p>';
    try {
      const me = await apiRequest("/api/me");
      if (!me.isAdmin) {
        body.innerHTML = `
          <div class="db-missing">
            <strong>Administrator Access Required</strong>
            <p>Your signed-in account (${escapeHtml(me.email)}) is not authorized to publish, edit, delete, or bulk-import shared formulas.</p>
          </div>
        `;
        return;
      }

      body.innerHTML = `
        <div class="result-box" style="margin-bottom:1rem;">
          <strong>Authorized Administrator (${escapeHtml(me.email)})</strong>
          <p>Manage shared formula library, verify entries, or perform bulk JSON/CSV imports.</p>
        </div>

        <div class="panel-heading"><h2>Bulk Formula Import</h2></div>
        <form class="tool-form" id="admin-import-form">
          <label class="field">Select JSON or CSV File
            <input type="file" name="importFile" accept=".json, .csv" required>
          </label>
          <div class="form-row">
            <label class="field" style="flex-direction:row; align-items:center; gap:8px;">
              <input type="checkbox" name="overwrite" value="true"> Overwrite existing duplicate formulas
            </label>
            <button class="button button-small button-secondary" type="button" id="download-csv-template">Download CSV Template</button>
          </div>
          <button class="button button-primary" type="submit">Import Formulas</button>
          <div class="tool-output" id="import-output"></div>
        </form>

        <hr style="margin: 1.5rem 0; border:0; border-top:1px solid var(--line);">

        <div class="panel-heading"><h2>Formula Database Backup</h2></div>
        <button class="button button-secondary" type="button" id="admin-export-btn">Export Formula Backup (JSON)</button>
        <div id="export-output" style="margin-top:0.5rem;"></div>

        <hr style="margin: 1.5rem 0; border:0; border-top:1px solid var(--line);">

        <div class="panel-heading"><h2>Add Single Formula</h2></div>
        <form class="tool-form" id="admin-add-form">
          <div class="form-row">
            <label class="field">Formula Name<input name="name" required placeholder="Quadratic Formula"></label>
            <label class="field">Subject<select name="subject"><option>Mathematics</option><option>Physics</option><option>Chemistry</option><option>Engineering</option></select></label>
          </div>
          <div class="form-row">
            <label class="field">Level<select name="level"><option>O-Level</option><option>A-Level</option><option>Undergraduate</option></select></label>
            <label class="field">Topic<input name="topic" required placeholder="Algebra"></label>
          </div>
          <label class="field">Formula (Text / Symbol)<input name="formula" required placeholder="x = (-b ± √(b² - 4ac)) / (2a)"></label>
          <label class="field">Description<textarea name="description" required placeholder="Description of the formula..."></textarea></label>
          <div class="form-row">
            <label class="field">Variables<input name="variables" placeholder="a=coef x², b=coef x"></label>
            <label class="field">Units<input name="units" placeholder="m/s²"></label>
          </div>
          <label class="field" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" name="verified" value="true" checked> Mark as Verified
          </label>
          <button class="button button-primary" type="submit">Publish Formula</button>
          <div class="tool-output" id="add-output"></div>
        </form>
      `;

      // Download CSV Template
      body.querySelector("#download-csv-template").onclick = () => {
        const csvContent = generateFormulaCsvTemplate();
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "formula_import_template.csv";
        a.click();
      };

      // Export JSON
      body.querySelector("#admin-export-btn").onclick = async () => {
        const out = body.querySelector("#export-output");
        out.innerHTML = "<p>Exporting...</p>";
        try {
          const res = await apiRequest("/api/admin/formulas/export");
          const blob = new Blob([JSON.stringify(res.items || [], null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          out.innerHTML = `<a class="button button-small button-primary" href="${url}" download="formulas_backup.json">Download JSON Backup (${(res.items || []).length} items)</a>`;
        } catch (err) {
          out.innerHTML = showError(err.message);
        }
      };

      // Handle Single Formula Add
      body.querySelector("#admin-add-form").onsubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const output = form.querySelector("#add-output");
        try {
          const payload = Object.fromEntries(new FormData(form).entries());
          payload.verified = payload.verified === "true";
          await apiRequest("/api/admin/formulas", { method: "POST", body: payload });
          output.innerHTML = '<div class="result-box">Formula published to Realtime Database!</div>';
          form.reset();
        } catch (err) {
          output.innerHTML = showError(err.message);
        }
      };

      // Handle Bulk Import
      body.querySelector("#admin-import-form").onsubmit = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const output = form.querySelector("#import-output");
        const file = form.importFile.files[0];
        const overwrite = form.overwrite.checked;

        output.innerHTML = "<p>Reading import file...</p>";
        try {
          let items = [];
          if (file.name.endsWith(".json")) {
            const text = await file.text();
            items = JSON.parse(text);
          } else if (file.name.endsWith(".csv")) {
            const text = await file.text();
            items = parseFormulaCsv(text);
          } else {
            throw new Error("File must be .json or .csv format.");
          }

          output.innerHTML = `<p>Uploading ${items.length} formulas to Render API...</p>`;
          const res = await apiRequest("/api/admin/formulas/import", {
            method: "POST",
            body: { items, overwrite }
          });

          let errList = "";
          if (res.errors && res.errors.length) {
            errList = `<div class="error-box" style="margin-top:8px;">Errors encountered:<br>${res.errors.map((x) => `Row ${x.index} (${x.name}): ${x.error}`).join("<br>")}</div>`;
          }

          output.innerHTML = `
            <div class="result-box">
              <strong>Bulk Import Complete!</strong>
              <p>Imported: ${res.importedCount} · Skipped: ${res.skippedCount} · Failed: ${res.failedCount}</p>
            </div>
            ${errList}
          `;
        } catch (err) {
          output.innerHTML = showError(err.message);
        }
      };

    } catch (err) {
      body.innerHTML = showError(err.message || "Admin verification failed.");
    }
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
    renderCards(button.dataset.filter);
  });
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-tool]");
    if (openButton) openTool(openButton.dataset.openTool);
  });
  document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

export { initializeTools };
