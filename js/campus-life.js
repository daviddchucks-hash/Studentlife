function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

const SECTION_TITLES = {
  hostels: "Accommodation",
  transportation: "Transportation",
  "food-dining": "Food and dining",
  "health-wellness": "Health and wellness",
  "emergency-safety": "Emergency and safety",
  organizations: "Student organizations",
  "student-businesses": "Student businesses",
  "alumni-networking": "Alumni and networking"
};

export function renderCampusLifeModule(sectionId, container) {
  const title = SECTION_TITLES[sectionId] || sectionId.replace("-", " ");
  const message = sectionId === "emergency-safety"
    ? "This app does not have verified emergency contact information. For immediate danger, contact local emergency services or campus security directly. Do not rely on this page as an emergency response service."
    : "This information has not been verified for public use. Please check official AFIT communications for current details.";

  container.innerHTML = `<p class="tool-intro">${escapeHtml(title)}: ${escapeHtml(message)}</p>`;
}
