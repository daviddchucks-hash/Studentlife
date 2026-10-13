import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderProfileModule(container) {
  container.innerHTML = '<p class="muted">Loading student profile…</p>';
  try {
    const data = await apiRequest("/api/me");
    const profile = data.profile || {};
    const name = profile.name || data.name || "";
    const dept = profile.department || "";
    const level = profile.level || "";
    const interests = profile.interests || "";
    const skills = profile.skills || "";
    const bio = profile.bio || "";

    container.innerHTML = `
      <p class="tool-intro">Manage your student profile. Private details are restricted to your authenticated account.</p>
      <form class="tool-form" id="profile-edit-form">
        <div class="form-row">
          <label class="field">Full Name<input name="name" required value="${escapeHtml(name)}" placeholder="e.g. David Chukwuma"></label>
          <label class="field">Email Address<input type="email" value="${escapeHtml(data.email || "")}" disabled readonly></label>
        </div>
        <div class="form-row">
          <label class="field">Department<input name="department" value="${escapeHtml(dept)}" placeholder="e.g. Computer Science"></label>
          <label class="field">Level<select name="level">
            <option value="">Select Level</option>
            <option ${level === "100" ? "selected" : ""}>100</option>
            <option ${level === "200" ? "selected" : ""}>200</option>
            <option ${level === "300" ? "selected" : ""}>300</option>
            <option ${level === "400" ? "selected" : ""}>400</option>
            <option ${level === "500" ? "selected" : ""}>500</option>
            <option ${level === "Postgraduate" ? "selected" : ""}>Postgraduate</option>
          </select></label>
        </div>
        <label class="field">Interests<input name="interests" value="${escapeHtml(interests)}" placeholder="e.g. Aerospace, Robotics, Machine Learning"></label>
        <label class="field">Skills<input name="skills" value="${escapeHtml(skills)}" placeholder="e.g. Python, AutoCAD, Technical Writing"></label>
        <label class="field">Bio / Short About Me<textarea name="bio" rows="3" placeholder="A short bio about yourself...">${escapeHtml(bio)}</textarea></label>
        <button class="button button-primary" type="submit">Save Profile</button>
        <div class="tool-output" id="profile-output"></div>
      </form>
    `;

    const form = container.querySelector("#profile-edit-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const output = form.querySelector("#profile-output");
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        await apiRequest("/api/profile", { method: "PUT", body: payload });
        output.innerHTML = '<div class="result-box">Profile saved successfully!</div>';
        const nameLabel = document.querySelector("#student-name");
        if (nameLabel) nameLabel.textContent = data.email || payload.name;
      } catch (err) {
        output.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
      }
    };
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Failed to load profile.")}</div>`;
  }
}
