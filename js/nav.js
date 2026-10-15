import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { apiRequest } from "./api.js";

export function initNavigation(activePage = "") {
  const header = document.querySelector("header.app-header") || document.querySelector("header.site-header");
  if (!header) return;

  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  const navLinks = [
    { href: "./dashboard.html", id: "dashboard", label: "Home" },
    { href: "./courses.html", id: "courses", label: "Academics" },
    { href: "./calculators.html", id: "calculators", label: "Calculators" },
    { href: "./timetable.html", id: "timetable", label: "Timetable" },
    { href: "./study.html", id: "study", label: "Study" },
    { href: "./notes.html", id: "notes", label: "Notes" },
    { href: "./formula-library.html", id: "formulas", label: "Formulas" },
    { href: "./campus-life.html", id: "campus-life", label: "Campus" },
    { href: "./opportunities.html", id: "opportunities", label: "Opportunities" },
    { href: "./community.html", id: "community", label: "Community" },
    { href: "./saved-items.html", id: "saved", label: "Saved Items" }
  ];

  header.className = "app-header nav-header";
  header.innerHTML = `
    <div class="nav-brand-wrap">
      <a class="brand" href="./dashboard.html">
        <span class="brand-mark">A</span>
        <span>AFIT<span class="brand-light">StudentLife</span></span>
      </a>
    </div>
    <nav class="app-nav-links" aria-label="Main Navigation">
      ${navLinks.map((link) => {
        const isActive = activePage === link.id || currentPath === link.href.replace("./", "");
        return `<a href="${link.href}" class="nav-link ${isActive ? "active" : ""}">${link.label}</a>`;
      }).join("")}
    </nav>
    <div class="account-actions">
      <a href="./profile.html" class="button button-quiet button-small" id="nav-profile-btn">Profile</a>
      <span class="account-name" id="student-name">Loading…</span>
      <button id="logout-button" class="button button-quiet button-small" type="button">Sign out</button>
    </div>
  `;

  const nameLabel = header.querySelector("#student-name");
  const logoutBtn = header.querySelector("#logout-button");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = "Signing out…";
      try {
        await signOut(auth);
        window.location.replace("./login.html");
      } catch {
        logoutBtn.disabled = false;
        logoutBtn.textContent = "Sign out";
      }
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (currentPath !== "index.html" && currentPath !== "login.html" && currentPath !== "signup.html") {
        window.location.replace("./login.html");
      }
      return;
    }

    if (nameLabel) {
      const name = user.displayName || user.email?.split("@")[0] || "Student";
      nameLabel.textContent = name;
    }
  });
}
