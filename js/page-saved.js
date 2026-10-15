import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";

let allSavedItems = [];
let currentCategory = "all";
let searchQuery = "";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
}

const RECORD_TYPES = [
  { type: "timetable", label: "Timetable Class", link: "./timetable.html" },
  { type: "courses", label: "Registered Course", link: "./courses.html" },
  { type: "registration", label: "Registration Draft", link: "./courses.html" },
  { type: "assignments", label: "Assignment", link: "./assignments.html" },
  { type: "deadlines", label: "Academic Deadline", link: "./assignments.html" },
  { type: "exams", label: "Exam", link: "./exams.html" },
  { type: "semester-plan", label: "Semester Plan", link: "./timetable.html" },
  { type: "notes", label: "Study Note", link: "./notes.html" },
  { type: "flashcards", label: "Flashcard", link: "./notes.html" },
  { type: "quizzes", label: "Practice Quiz", link: "./notes.html" },
  { type: "revision-plans", label: "Revision Plan", link: "./notes.html" },
  { type: "formula-bookmarks", label: "Bookmarked Formula", link: "./formula-library.html" }
];

async function fetchAllSavedData() {
  const container = document.querySelector("#saved-items-container");
  container.innerHTML = '<p class="muted">Fetching your saved items…</p>';

  try {
    const promises = RECORD_TYPES.map(async (def) => {
      try {
        const res = await apiRequest(`/api/records/${def.type}`);
        return (res.items || []).map((item) => ({
          ...item,
          recType: def.type,
          categoryLabel: def.label,
          targetLink: def.link
        }));
      } catch {
        return [];
      }
    });

    const results = await Promise.all(promises);
    allSavedItems = results.flat();
    allSavedItems.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

    renderSavedItems();
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function getItemTitle(item) {
  return item.title || item.code || item.course || item.formulaName || item.front || item.topic || item.subject || "Saved Item";
}

function getItemSubtitle(item) {
  if (item.recType === "timetable") return `${item.day} ${item.start} - ${item.end} ${item.venue ? `| 📍 ${item.venue}` : ""}`;
  if (item.recType === "courses" || item.recType === "registration") return `${item.name} (${item.units} units)`;
  if (item.recType === "assignments" || item.recType === "deadlines") return `Due: ${item.dueDate} | Status: ${item.status || "To do"}`;
  if (item.recType === "exams") return `Date: ${item.date} ${item.time || ""} ${item.venue ? `| 📍 ${item.venue}` : ""}`;
  if (item.recType === "notes") return item.content ? item.content.slice(0, 100) : "";
  if (item.recType === "flashcards") return `A: ${item.back}`;
  if (item.recType === "quizzes") return `${(item.questions || []).length} questions`;
  if (item.recType === "formula-bookmarks") return `Subject: ${item.subject || "General"}`;
  return item.notes || "";
}

function renderSavedItems() {
  const container = document.querySelector("#saved-items-container");

  let filtered = allSavedItems;

  if (currentCategory !== "all") {
    filtered = filtered.filter((x) => x.recType === currentCategory);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((item) => {
      const t = getItemTitle(item).toLowerCase();
      const s = getItemSubtitle(item).toLowerCase();
      const cat = (item.categoryLabel || "").toLowerCase();
      return t.includes(q) || s.includes(q) || cat.includes(q);
    });
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="dashboard-section" style="text-align:center; padding:32px;">
        <h3>No saved items found</h3>
        <p class="muted">You haven't saved any entries in this category yet.</p>
        <a href="./courses.html" class="button button-primary button-small" style="margin-top:10px;">Get Started</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="record-list">
      ${filtered.map((item) => `
        <div class="record-item">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="pill-badge active">${escapeHtml(item.categoryLabel)}</span>
              <strong style="font-size:15px;">${escapeHtml(getItemTitle(item))}</strong>
            </div>
            <small style="color:var(--muted);">${escapeHtml(getItemSubtitle(item))}</small>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <a href="${item.targetLink}" class="small-button">Open in Tool</a>
            <button class="record-delete" data-del-id="${item.id}" data-rec-type="${item.recType}">Delete</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation("saved");

  const searchInput = document.querySelector("#saved-search-input");
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      renderSavedItems();
    };
  }

  document.querySelector("#saved-category-filters").onclick = (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    document.querySelectorAll("#saved-category-filters .filter-button").forEach((b) => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    currentCategory = btn.dataset.cat;
    renderSavedItems();
  };

  document.querySelector("#saved-items-container").onclick = async (e) => {
    const delBtn = e.target.closest("[data-del-id]");
    if (delBtn) {
      const id = delBtn.dataset.delId;
      const recType = delBtn.dataset.recType;
      if (confirm("Delete this saved item?")) {
        try {
          await apiRequest(`/api/records/${recType}/${id}`, { method: "DELETE" });
          await fetchAllSavedData();
        } catch (err) {
          alert(err.message || "Could not delete item.");
        }
      }
    }
  };

  void fetchAllSavedData();
});
