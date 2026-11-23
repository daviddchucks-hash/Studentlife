import { apiRequest } from "./api.js";
import { updateStudentDisplayName } from "./firebase-config.js";
import { createSmartSaveTracker } from "./smart-save.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export async function renderProfileModule(container, options = {}) {
  if (!container) return null;
  const { onProfileLoaded, onProfileUpdated, onProfileError } = options;

  container.innerHTML = `
    <div class="view-card">
      <p class="muted" style="margin:0;">Loading student profile…</p>
    </div>
  `;

  let data;
  try {
    data = await apiRequest("/api/me");
  } catch (err) {
    if (typeof onProfileError === "function") {
      try {
        onProfileError(err);
      } catch {
        // Non-fatal UI listener failure
      }
    }
    container.innerHTML = `
      <div class="view-card">
        <div class="error-box" role="alert">${escapeHtml(err?.message || "Failed to load profile.")}</div>
        <div class="inline-actions" style="margin-top:12px;">
          <button class="button button-outline button-small" type="button" id="retry-profile-load-btn">Retry Loading Profile</button>
        </div>
      </div>
    `;
    const retryBtn = container.querySelector("#retry-profile-load-btn");
    if (retryBtn) {
      retryBtn.onclick = () => renderProfileModule(container, options);
    }
    return null;
  }

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

  const accountSummary = {
    uid: data.uid || "",
    email: profileData.email,
    name: profileData.name,
    isAdmin: Boolean(data.isAdmin),
    profile: { ...profileData },
    themePreference: data.profile?.themePreference || null
  };

  if (typeof onProfileLoaded === "function") {
    try {
      onProfileLoaded(accountSummary);
    } catch {
      // Never block profile UI due to secondary listeners
    }
  }

  function isMatricLocked() {
    return Boolean(profileData.matricNumber && profileData.matricVerified);
  }

  function notifyProfileChanged() {
    const nameLabel = document.querySelector("#student-name");
    if (nameLabel) {
      nameLabel.textContent = profileData.name || profileData.email || "Student";
    }
    if (typeof onProfileUpdated === "function") {
      try {
        onProfileUpdated({
          uid: data.uid || "",
          email: profileData.email,
          name: profileData.name,
          isAdmin: Boolean(data.isAdmin),
          profile: { ...profileData }
        });
      } catch {
        // Non-fatal UI listener failure
      }
    }
  }

  function renderViewMode(flashMessage = "") {
    const locked = isMatricLocked();
    container.innerHTML = `
      <div class="view-card">
        <div class="profile-card-head">
          <div>
            <p class="eyebrow">Student profile</p>
            <h2 style="margin:0;">${escapeHtml(profileData.name || "Student Profile")}</h2>
            <p class="muted" style="margin:3px 0 0;">${escapeHtml(profileData.email)}</p>
          </div>
          <button class="button button-primary button-small" type="button" id="edit-profile-btn">Edit Profile</button>
        </div>

        <section class="student-matric-card" aria-labelledby="student-matric-title">
          <div class="student-matric-heading">
            <div>
              <p class="eyebrow">Student identification</p>
              <h3 id="student-matric-title">Matriculation number</h3>
            </div>
            <span class="matric-status ${locked ? "is-verified" : profileData.matricNumber ? "is-pending" : "is-missing"}" role="status">
              <span aria-hidden="true">${locked ? "✓" : profileData.matricNumber ? "…" : "!"}</span>
              ${locked ? "Verified Permanent ID" : profileData.matricNumber ? "Needs verification" : "Not provided"}
            </span>
          </div>
          <p class="student-matric-number">${escapeHtml(profileData.matricNumber || "Not added yet")}</p>
          <p class="student-matric-help">${locked
            ? "Your verified matriculation number is permanently linked to your student account and cannot be edited."
            : profileData.matricNumber
              ? "This number was saved before automatic verification was enabled. Save it once more to verify uniqueness and lock it for messaging."
              : "Add your 9-character matriculation number. Once verified, it becomes your permanent student identifier across AFITStudentLife."}</p>
          ${locked
            ? `<p class="muted" style="margin:0; font-weight:650;">Permanent verified student identifier</p>`
            : `<button class="button button-outline button-small" type="button" id="edit-matric-btn">${profileData.matricNumber ? "Verify matriculation number" : "Add matriculation number"}</button>`
          }
        </section>

        <h3 class="profile-section-title">Personal and academic details</h3>
        <div class="view-field-group">
          <div class="view-field">
            <span class="view-field-label">Full Name</span>
            <span class="view-field-value">${escapeHtml(profileData.name) || '<span class="muted">Not set</span>'}</span>
          </div>
          <div class="view-field">
            <span class="view-field-label">Email Address</span>
            <span class="view-field-value">${escapeHtml(profileData.email) || '<span class="muted">Not set</span>'}</span>
          </div>
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

        <div id="profile-view-msg" role="status" aria-live="polite" style="margin-top:16px;">${
          flashMessage ? `<div class="result-box">${escapeHtml(flashMessage)}</div>` : ""
        }</div>
      </div>
    `;

    container.querySelector("#edit-profile-btn").onclick = () => renderEditMode();
    const editMatricBtn = container.querySelector("#edit-matric-btn");
    if (editMatricBtn && !locked) {
      editMatricBtn.onclick = () => renderMatricEditMode();
    }

    if (flashMessage) {
      setTimeout(() => {
        const msgBox = container.querySelector("#profile-view-msg");
        if (msgBox && msgBox.textContent.trim() === flashMessage) {
          msgBox.innerHTML = "";
        }
      }, 4500);
    }
  }

  function renderMatricEditMode() {
    if (isMatricLocked()) {
      renderViewMode();
      return;
    }

    container.innerHTML = `
      <div class="view-card">
        <div class="profile-form-heading">
          <div>
            <p class="eyebrow">Student identification</p>
            <h2>Verify matriculation number</h2>
          </div>
          <button class="button button-quiet button-small" type="button" id="cancel-matric-btn">Back to profile</button>
        </div>
        <p class="muted">Enter your valid 9-character matriculation number. Once verified, it becomes a permanent part of your account.</p>
        <form class="tool-form" id="matric-edit-form">
          <label class="field" for="matric-number-input">Matriculation number
            <input id="matric-number-input" name="matricNumber" required minlength="9" maxlength="24" pattern="[A-Za-z0-9./_ -]{9,24}" autocomplete="off" value="${escapeHtml(profileData.matricNumber)}" placeholder="AFIT12345" aria-describedby="matric-format-help">
          </label>
          <small class="muted" id="matric-format-help">Enter exactly 9 letters, numbers, or common separators. Spaces are removed when saved.</small>
          <div class="matric-verification-note">
            <strong>Verification status: ${profileData.matricNumber ? "Needs verification" : "Not provided"}</strong>
            <span>StudentLife checks format and uniqueness automatically and locks verified IDs against accidental changes.</span>
          </div>
          <div id="matric-output" class="tool-output" role="status" aria-live="polite"></div>
          <div class="inline-actions">
            <button class="button button-primary" type="submit" id="save-matric-btn">Save &amp; Verify Matriculation Number</button>
          </div>
        </form>
      </div>
    `;

    const form = container.querySelector("#matric-edit-form");
    const input = container.querySelector("#matric-number-input");
    const saveButton = container.querySelector("#save-matric-btn");
    const output = container.querySelector("#matric-output");

    container.querySelector("#cancel-matric-btn").onclick = () => renderViewMode();

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
      saveButton.textContent = "Verifying…";
      output.innerHTML = "";
      try {
        const result = await apiRequest("/api/profile/matric", {
          method: "PUT",
          body: { matricNumber }
        });
        profileData.matricNumber = result.profile.matricNumber || "";
        profileData.matricVerified = Boolean(result.profile.matricVerified);
        notifyProfileChanged();
        renderViewMode("Your matriculation number was verified and permanently linked to your account.");
      } catch (error) {
        saveButton.disabled = false;
        saveButton.textContent = "Save & Verify Matriculation Number";
        output.innerHTML = `<div class="error-box" role="alert">${escapeHtml(error.message || "Unable to save the matriculation number. Please try again.")}</div>`;
      }
    };
  }

  function renderEditMode() {
    const locked = isMatricLocked();
    const levelOptions = ["", "100", "200", "300", "400", "500", "Postgraduate"];
    if (profileData.level && !levelOptions.includes(profileData.level)) {
      levelOptions.push(profileData.level);
    }

    container.innerHTML = `
      <div class="view-card">
        <div class="profile-form-heading">
          <div>
            <p class="eyebrow">Student profile</p>
            <h2>Edit Profile Details</h2>
          </div>
          <button class="button button-quiet button-small" type="button" id="back-to-view-btn">View Profile</button>
        </div>
        <form class="tool-form" id="profile-edit-form" novalidate>
          <div class="form-row">
            <label class="field" for="profile-name-input">Full Name
              <input id="profile-name-input" name="name" required maxlength="100" value="${escapeHtml(profileData.name)}" placeholder="e.g. David Chukwuma">
            </label>
            <label class="field" for="profile-email-display">Email Address
              <input id="profile-email-display" type="email" value="${escapeHtml(profileData.email)}" disabled readonly>
            </label>
          </div>
          <div class="matric-verification-note">
            <strong>Matriculation number: ${escapeHtml(profileData.matricNumber || "Not provided")}</strong>
            <span>${locked
              ? "Verified Permanent ID · Locked after verification"
              : `${profileData.matricNumber ? "Unverified" : "Not set"} · <button class="text-button" type="button" id="edit-matric-from-profile">Verify matriculation number</button>`
            }</span>
          </div>
          <div class="form-row">
            <label class="field" for="profile-department-input">Department
              <input id="profile-department-input" name="department" maxlength="100" value="${escapeHtml(profileData.department)}" placeholder="e.g. Computer Science">
            </label>
            <label class="field" for="profile-level-select">Level
              <select id="profile-level-select" name="level">
                ${levelOptions.map((lvl) => `
                  <option value="${escapeHtml(lvl)}" ${profileData.level === lvl ? "selected" : ""}>${lvl ? escapeHtml(lvl) : "Select Level"}</option>
                `).join("")}
              </select>
            </label>
          </div>
          <label class="field" for="profile-interests-input">Interests
            <input id="profile-interests-input" name="interests" maxlength="300" value="${escapeHtml(profileData.interests)}" placeholder="e.g. Aerospace, Robotics, Machine Learning">
          </label>
          <label class="field" for="profile-skills-input">Skills
            <input id="profile-skills-input" name="skills" maxlength="300" value="${escapeHtml(profileData.skills)}" placeholder="e.g. Python, AutoCAD, Technical Writing">
          </label>
          <label class="field" for="profile-bio-input">Bio / Short About Me
            <textarea id="profile-bio-input" name="bio" rows="3" maxlength="500" placeholder="A short bio about yourself...">${escapeHtml(profileData.bio)}</textarea>
          </label>

          <div id="profile-output" role="status" aria-live="polite" style="margin-top:6px;"></div>

          <div class="inline-actions" style="margin-top:8px;">
            <button class="button button-primary save-button" type="submit" id="save-profile-btn" disabled>Save Changes</button>
            <button class="button button-quiet" type="button" id="cancel-profile-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;

    const form = container.querySelector("#profile-edit-form");
    const nameInput = container.querySelector("#profile-name-input");
    const saveBtn = container.querySelector("#save-profile-btn");
    const cancelBtn = container.querySelector("#cancel-profile-btn");
    const backBtn = container.querySelector("#back-to-view-btn");
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

    const editMatricLink = container.querySelector("#edit-matric-from-profile");
    if (editMatricLink && !locked) {
      editMatricLink.onclick = () => {
        if (tracker.hasChanged() && !confirm("You have unsaved profile changes. Discard them and verify your matriculation number?")) {
          return;
        }
        tracker.destroy();
        renderMatricEditMode();
      };
    }

    const handleCancel = () => {
      if (tracker.hasChanged() && !confirm("You have unsaved changes. Discard changes?")) {
        return;
      }
      tracker.destroy();
      renderViewMode();
    };

    cancelBtn.onclick = handleCancel;
    backBtn.onclick = handleCancel;

    form.onsubmit = async (event) => {
      event.preventDefault();
      output.innerHTML = "";

      const payload = {
        name: form.name.value.trim(),
        department: form.department.value.trim(),
        level: form.level.value,
        interests: form.interests.value.trim(),
        skills: form.skills.value.trim(),
        bio: form.bio.value.trim()
      };

      if (!payload.name) {
        output.innerHTML = '<div class="error-box" role="alert">Please enter your full name before saving.</div>';
        nameInput.focus();
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";

      try {
        const result = await apiRequest("/api/profile", { method: "PUT", body: payload });
        const savedProfile = result?.profile || payload;

        profileData = {
          ...profileData,
          name: savedProfile.name ?? payload.name,
          department: savedProfile.department ?? payload.department,
          level: savedProfile.level ?? payload.level,
          interests: savedProfile.interests ?? payload.interests,
          skills: savedProfile.skills ?? payload.skills,
          bio: savedProfile.bio ?? payload.bio
        };

        await updateStudentDisplayName(profileData.name);
        notifyProfileChanged();

        tracker.destroy();
        renderViewMode("Changes saved successfully.");
      } catch (err) {
        saveBtn.textContent = "Save Changes";
        saveBtn.disabled = !tracker.hasChanged();
        output.innerHTML = `<div class="error-box" role="alert">${escapeHtml(err.message || "Unable to save changes. Please try again.")}</div>`;
      }
    };
  }

  renderViewMode();
  return accountSummary;
}
