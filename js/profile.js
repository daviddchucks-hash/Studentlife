import { apiRequest } from "./api.js";
import { createSmartSaveTracker, getFormSnapshot } from "./smart-save.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderProfileModule(container) {
  container.innerHTML = '<p class="muted">Loading student profile…</p>';
  try {
    const data = await apiRequest("/api/me");
    let profileData = {
      name: data.profile?.name || data.name || "",
      email: data.email || "",
      department: data.profile?.department || "",
      level: data.profile?.level || "",
      interests: data.profile?.interests || "",
      skills: data.profile?.skills || "",
      bio: data.profile?.bio || ""
    };

    function renderViewMode() {
      container.innerHTML = `
        <div class="view-card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
            <div>
              <h2 style="margin:0;">${escapeHtml(profileData.name || "Student Profile")}</h2>
              <p class="muted" style="margin:2px 0 0;">${escapeHtml(profileData.email)}</p>
            </div>
            <button class="button button-primary button-small" type="button" id="edit-profile-btn">Edit Profile</button>
          </div>

          <div class="view-field-group">
            <div class="view-field">
              <span class="view-field-label">Department</span>
              <span class="view-field-value">${escapeHtml(profileData.department) || '<span class="muted">Not set</span>'}</span>
            </div>
            <div class="view-field">
              <span class="view-field-label">Level</span>
              <span class="view-field-value">${escapeHtml(profileData.level) || '<span class="muted">Not set</span>'}</span>
            </div>
          </div>

          <div class="view-field-group">
            <div class="view-field">
              <span class="view-field-label">Interests</span>
              <span class="view-field-value">${escapeHtml(profileData.interests) || '<span class="muted">Not set</span>'}</span>
            </div>
            <div class="view-field">
              <span class="view-field-label">Skills</span>
              <span class="view-field-value">${escapeHtml(profileData.skills) || '<span class="muted">Not set</span>'}</span>
            </div>
          </div>

          <div class="view-field" style="margin-top:12px;">
            <span class="view-field-label">Bio / About Me</span>
            <span class="view-field-value" style="white-space:pre-wrap;">${escapeHtml(profileData.bio) || '<span class="muted">No bio added yet.</span>'}</span>
          </div>

          <div id="profile-view-msg" style="margin-top:16px;"></div>
        </div>
      `;

      container.querySelector("#edit-profile-btn").onclick = () => renderEditMode();
    }

    function renderEditMode() {
      container.innerHTML = `
        <div class="view-card">
          <h3 style="margin-bottom:16px;">Edit Student Profile</h3>
          <form class="tool-form" id="profile-edit-form">
            <div class="form-row">
              <label class="field">Full Name<input name="name" required value="${escapeHtml(profileData.name)}" placeholder="e.g. David Chukwuma"></label>
              <label class="field">Email Address<input type="email" name="email" value="${escapeHtml(profileData.email)}" disabled readonly></label>
            </div>
            <div class="form-row">
              <label class="field">Department<input name="department" value="${escapeHtml(profileData.department)}" placeholder="e.g. Computer Science"></label>
              <label class="field">Level<select name="level">
                <option value="">Select Level</option>
                <option ${profileData.level === "100" ? "selected" : ""}>100</option>
                <option ${profileData.level === "200" ? "selected" : ""}>200</option>
                <option ${profileData.level === "300" ? "selected" : ""}>300</option>
                <option ${profileData.level === "400" ? "selected" : ""}>400</option>
                <option ${profileData.level === "500" ? "selected" : ""}>500</option>
                <option ${profileData.level === "Postgraduate" ? "selected" : ""}>Postgraduate</option>
              </select></label>
            </div>
            <label class="field">Interests<input name="interests" value="${escapeHtml(profileData.interests)}" placeholder="e.g. Aerospace, Robotics, Machine Learning"></label>
            <label class="field">Skills<input name="skills" value="${escapeHtml(profileData.skills)}" placeholder="e.g. Python, AutoCAD, Technical Writing"></label>
            <label class="field">Bio / Short About Me<textarea name="bio" rows="3" placeholder="A short bio about yourself...">${escapeHtml(profileData.bio)}</textarea></label>

            <div id="profile-output" style="margin-top:10px;"></div>

            <div class="inline-actions" style="margin-top:16px; display:flex; gap:10px;">
              <button class="button button-primary save-button" type="submit" id="save-profile-btn" disabled>Save Changes</button>
              <button class="button button-quiet" type="button" id="cancel-profile-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;

      const form = container.querySelector("#profile-edit-form");
      const saveBtn = container.querySelector("#save-profile-btn");
      const cancelBtn = container.querySelector("#cancel-profile-btn");
      const output = container.querySelector("#profile-output");

      const baselineSnapshot = {
        name: profileData.name,
        department: profileData.department,
        level: profileData.level,
        interests: profileData.interests,
        skills: profileData.skills,
        bio: profileData.bio
      };

      const tracker = createSmartSaveTracker(form, saveBtn, { initialSnapshot: baselineSnapshot });

      cancelBtn.onclick = () => {
        if (tracker.hasChanged()) {
          if (!confirm("You have unsaved changes. Discard changes?")) return;
        }
        tracker.destroy();
        renderViewMode();
      };

      form.onsubmit = async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        output.innerHTML = "";

        try {
          const payload = {
            name: form.name.value.trim(),
            department: form.department.value.trim(),
            level: form.level.value,
            interests: form.interests.value.trim(),
            skills: form.skills.value.trim(),
            bio: form.bio.value.trim()
          };

          await apiRequest("/api/profile", { method: "PUT", body: payload });

          profileData = { ...profileData, ...payload };
          const nameLabel = document.querySelector("#student-name");
          if (nameLabel) nameLabel.textContent = profileData.email || profileData.name;

          tracker.destroy();
          renderViewMode();

          const viewMsg = container.querySelector("#profile-view-msg");
          if (viewMsg) {
            viewMsg.innerHTML = '<div class="result-box">Changes saved successfully.</div>';
            setTimeout(() => { if (viewMsg) viewMsg.innerHTML = ""; }, 4000);
          }
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Changes";
          output.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Unable to save changes. Please try again.")}</div>`;
        }
      };
    }

    renderViewMode();
  } catch (err) {
    container.innerHTML = `<div class="error-box">${escapeHtml(err.message || "Failed to load profile.")}</div>`;
  }
}
