import { apiRequest } from "./api.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function renderFeedbackModule(container) {
  container.innerHTML = `
    <p class="tool-intro">Submit student feedback, complaints, or improvement suggestions directly to campus administration.</p>
    <form class="tool-form" id="fb-form">
      <div class="form-row">
        <label class="field">Feedback Type<select name="type"><option value="feedback">General Feedback</option><option value="complaint">Complaint</option><option value="suggestion">Suggestion</option></select></label>
        <label class="field">Subject<input name="subject" required placeholder="Hostel Water Supply / Course Timetable Clashes"></label>
      </div>
      <label class="field">Message / Submission Details<textarea name="message" required rows="4" placeholder="Detailed description of your feedback or complaint..."></textarea></label>
      <button class="button button-primary" type="submit">Submit Feedback</button>
      <div class="tool-output" id="fb-output"></div>
    </form>
  `;

  const form = container.querySelector("#fb-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const output = form.querySelector("#fb-output");
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await apiRequest("/api/feedback", { method: "POST", body: payload });
      output.innerHTML = '<div class="result-box">Thank you! Your feedback has been submitted to administration.</div>';
      form.reset();
    } catch (err) {
      output.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`;
    }
  };
}
