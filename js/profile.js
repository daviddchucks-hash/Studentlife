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
      matricNumber: data.profile?.matricNumber || "",
      matricVerified: Boolean(data.profile?.matricVerified),
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

          <section class="student-matric-card" aria-labelledby="student-matric-title">
            <div class="student-matric-heading">
              <div>
                <p class="eyebrow">Student identification</p>
                <h3 id="student-matric-title">Matriculation number</h3>
              </div>
              <span class="matric-status ${profileData.matricVerified ? "is-verified" : profileData.matricNumber ? "is-pending" : "is-missing"}" role="status">
                <span aria-hidden="true">${profileData.matricVerified ? "✓" : profileData.matricNumber ? "…" : "!"}</span>
                ${profileData.matricVerified ? "Verified for StudentLife" : profileData.matricNumber ? "Needs update" : "Not provided"}
              </span>
            </div>
            <p class="student-matric-number">${escapeHtml(profileData.matricNumber || "Add your matriculation number")}</p>
            <p class="student-matric-help">${profileData.matricVerified
              ? "Your unique matriculation number is available to other students in messaging. StudentLife checks its format and uniqueness; this does not confirm it against AFIT records."
              : profileData.matricNumber
                ? "This number was saved before automatic verification was enabled. Save it again to check that it is unique and make it available in messaging."
                : "Add the 9-character matriculation number you used to register. A unique, valid number is verified automatically and becomes available in messaging."}</p>
            <button class="button button-outline button-small" type="button" id="edit-matric-btn">${profileData.matricNumber ? "Update matriculation number" : "Add matriculation number"}</button>
          </section>

          <h3 class="profile-section-title">Personal and academic details</h3>
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
      container.querySelector("#edit-matric-btn").onclick = () => renderMatricEditMode();
    }

    function renderMatricEditMode() {
      container.innerHTML = `
        <div class="view-card">
          <div class="profile-form-heading">
            <div>
              <p class="eyebrow">Student identification</p>
              <h2>Matriculation number</h2>
            </div>
            <button class="button button-quiet button-small" type="button" id="cancel-matric-btn">Back to profile</button>
          </div>
          <p class="muted">Enter a valid 9-character matriculation number. StudentLife checks that it is not already in use and verifies it immediately after saving. This is not an independent check against AFIT records.</p>
          <form class="tool-form" id="matric-edit-form">
            <label class="field" for="matric-number-input">Matriculation number
              <input id="matric-number-input" name="matricNumber" required minlength="9" maxlength="24" pattern="[A-Za-z0-9./_ -]{9,24}" autocomplete="off" value="${escapeHtml(profileData.matricNumber)}" placeholder="AFIT12345" aria-describedby="matric-format-help">
            </label>
            <small class="muted" id="matric-format-help">Enter exactly 9 letters, numbers, or common separators. Spaces are ignored when saved.</small>
            <div class="matric-verification-note">
              <strong>Verification status: ${profileData.matricVerified ? "Verified" : profileData.matricNumber ? "Not verified" : "Not provided"}</strong>
              <span>The number is checked for format and uniqueness, then verified automatically for use in StudentLife.</span>
            </div>
            <div id="matric-output" class="tool-output" role="status" aria-live="polite"></div>
            <div class="inline-actions">
              <button class="button button-primary" type="submit" id="save-matric-btn">Save matriculation number</button>
            </div>
          </form>
        </div>
      `;

      const form = container.querySelector("#matric-edit-form");
      const input = container.querySelector("#matric-number-input");
      const saveButton = container.querySelector("#save-matric-btn");
      const output = container.querySelector("#matric-output");

      container.querySelector("#cancel-matric-btn").onclick = renderViewMode;
      form.onsubmit = async (event) => {
        event.preventDefault();
        const matricNumber = input.value.trim().replace(/\s+/g, "").toUpperCase();
        if (!/^[A-Z0-9./_-]{9}$/.test(matricNumber)) {
          input.setCustomValidity("Enter exactly 9 letters, numbers, or common separators.");
          input.reportValidity();
          input.setCustomValidity("");
          return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving…";
        output.innerHTML = "";
        try {
          const result = await apiRequest("/api/profile/matric", {
            method: "PUT",
            body: { matricNumber }
          });
          profileData.matricNumber = result.profile.matricNumber || "";
          profileData.matricVerified = Boolean(result.profile.matricVerified);
          renderViewMode();
          const viewMessage = container.querySelector("#profile-view-msg");
          if (viewMessage) {
            viewMessage.innerHTML = '<div class="result-box">Your matriculation number was saved and verified for use in StudentLife.</div>';
          }
        } catch (error) {
          saveButton.disabled = false;
          saveButton.textContent = "Save matriculation number";
          output.innerHTML = `<div class="error-box">${escapeHtml(error.message || "Unable to save the matriculation number. Please try again.")}</div>`;
        }
      };
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
            <div class="matric-verification-note">
              <strong>Matriculation number: ${escapeHtml(profileData.matricNumber || "Not provided")}</strong>
              <span>${profileData.matricVerified ? "Verified" : "Not verified"} · <button class="text-button" type="button" id="edit-matric-from-profile">Manage matriculation number</button></span>
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
      container.querySelector("#edit-matric-from-profile").onclick = () => {
        if (tracker.hasChanged() && !confirm("You have unsaved profile changes. Discard them and manage your matriculation number?")) return;
        tracker.destroy();
        renderMatricEditMode();
      };

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
          if (nameLabel) nameLabel.textContent = profileData.name || profileData.email || "Student";

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
