import { initNavigation } from "./nav.js";
import { apiRequest } from "./api.js";
import { INITIAL_FORMULAS, fetchFormulasFromApi, renderFormulaCard } from "./formula-library.js";
import { renderAdminModule } from "./admin.js";

let formulasList = [];
let bookmarkedIds = new Set();
let isAdmin = false;

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
}

async function checkAdminAndBookmarks() {
  try {
    const me = await apiRequest("/api/me");
    if (me && me.isAdmin) {
      isAdmin = true;
      document.querySelector("#admin-tab-btn").hidden = false;
    }
  } catch {}

  try {
    const bRes = await apiRequest("/api/records/formula-bookmarks");
    const items = bRes.items || [];
    bookmarkedIds = new Set(items.map((x) => x.formulaId));
  } catch {}
}

async function loadFormulas(query = {}) {
  const container = document.querySelector("#formula-cards-container");
  if (!container) return;
  container.innerHTML = '<p class="muted">Loading formulas from database…</p>';

  try {
    formulasList = await fetchFormulasFromApi(apiRequest, query);
  } catch {
    formulasList = INITIAL_FORMULAS;
  }

  renderFormulasList();
}

function renderFormulasList() {
  const container = document.querySelector("#formula-cards-container");
  if (!container) return;

  if (!formulasList.length) {
    container.innerHTML = '<p class="empty-state">No matching formulas found in library.</p>';
    return;
  }

  container.innerHTML = formulasList.map((f) => {
    const isBookmarked = bookmarkedIds.has(f.id);
    return `
      <div class="formula-card">
        <div class="formula-head">
          <div>
            <div class="formula-meta">${escapeHtml(f.subject)} · ${escapeHtml(f.level)} · ${escapeHtml(f.topic || "General")}</div>
            <h3>${escapeHtml(f.name)} ${f.verified ? `<span class="badge badge-success">Verified</span>` : ""}</h3>
          </div>
          <button class="small-button ${isBookmarked ? "button-primary" : ""}" data-bookmark-id="${f.id}" data-formula-name="${escapeHtml(f.name)}" data-formula-subject="${escapeHtml(f.subject)}">
            ${isBookmarked ? "★ Bookmarked" : "☆ Bookmark"}
          </button>
        </div>
        <div class="formula-display">${escapeHtml(f.formula)}</div>
        <p class="formula-desc">${escapeHtml(f.description)}</p>
        ${f.variables ? `<div class="formula-detail"><strong>Variables:</strong> ${escapeHtml(f.variables)}</div>` : ""}
        ${f.units ? `<div class="formula-detail"><strong>Units:</strong> ${escapeHtml(f.units)}</div>` : ""}
        ${f.examples ? `<div class="formula-detail"><strong>Example:</strong> ${escapeHtml(f.examples)}</div>` : ""}
      </div>
    `;
  }).join("");
}

function renderLibraryTab() {
  const container = document.querySelector("#formula-tab-content");
  container.innerHTML = `
    <div class="dashboard-section" style="margin-bottom:20px;">
      <div class="form-row">
        <div class="search-bar-wrap" style="flex:1;">
          <input type="search" id="formula-search-input" placeholder="Search formulas by name, variable, or keyword...">
        </div>
        <select id="formula-subject-filter" style="width:auto; min-width:160px;">
          <option value="">All Subjects</option>
          <option>Mathematics</option>
          <option>Physics</option>
          <option>Chemistry</option>
          <option>Engineering</option>
        </select>
        <select id="formula-level-filter" style="width:auto; min-width:140px;">
          <option value="">All Levels</option>
          <option>O-Level</option>
          <option>A-Level</option>
          <option>Undergraduate</option>
        </select>
      </div>
    </div>
    <div id="formula-cards-container" class="formula-cards-grid"></div>
  `;

  const searchInput = container.querySelector("#formula-search-input");
  const subjFilter = container.querySelector("#formula-subject-filter");
  const lvlFilter = container.querySelector("#formula-level-filter");

  const updateSearch = () => {
    loadFormulas({
      search: searchInput.value.trim(),
      subject: subjFilter.value,
      level: lvlFilter.value
    });
  };

  searchInput.oninput = updateSearch;
  subjFilter.onchange = updateSearch;
  lvlFilter.onchange = updateSearch;

  container.onclick = async (e) => {
    const bmBtn = e.target.closest("[data-bookmark-id]");
    if (bmBtn) {
      const id = bmBtn.dataset.bookmarkId;
      const name = bmBtn.dataset.formulaName;
      const subject = bmBtn.dataset.formulaSubject;

      if (bookmarkedIds.has(id)) {
        // Find existing bookmark record ID if needed, or toggle
        alert("Formula is already bookmarked in My Saved Items!");
      } else {
        try {
          await apiRequest("/api/records/formula-bookmarks", {
            method: "POST",
            body: { formulaId: id, formulaName: name, subject }
          });
          bookmarkedIds.add(id);
          bmBtn.textContent = "★ Bookmarked";
          bmBtn.classList.add("button-primary");
        } catch (err) {
          alert(err.message || "Could not bookmark formula.");
        }
      }
    }
  };

  void loadFormulas();
}

async function renderAdminTab() {
  const container = document.querySelector("#formula-tab-content");
  container.innerHTML = `<div id="admin-module-root"></div>`;
  await renderAdminModule(container.querySelector("#admin-module-root"));
}

document.addEventListener("DOMContentLoaded", async () => {
  initNavigation("formulas");
  await checkAdminAndBookmarks();

  document.querySelector("#formula-page-tabs").onclick = async (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    document.querySelectorAll("#formula-page-tabs .tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (btn.dataset.tab === "admin") {
      await renderAdminTab();
    } else {
      renderLibraryTab();
    }
  };

  renderLibraryTab();
});
