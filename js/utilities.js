function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function renderUtilitiesModule(sectionId, container) {
  if (sectionId === "ai-assistant") {
    container.innerHTML = `
      <p class="tool-intro">AI Student Assistant. Ask questions, request formula explanations, or generate study summaries.</p>
      <div class="timer-card" style="text-align:left; max-width:100%;">
        <label class="field">Your Question or Topic<textarea id="ai-prompt" rows="3" placeholder="Explain Ohm's Law and its practical engineering application..."></textarea></label>
        <div class="inline-actions" style="margin-top:10px;">
          <button class="button button-primary button-small" type="button" id="ai-ask-btn">Generate Assistance</button>
          <button class="button button-quiet button-small" type="button" id="ai-summary-btn">Summarize Study Notes</button>
        </div>
        <div id="ai-response-box" style="margin-top:15px;" class="result-box" hidden></div>
      </div>
    `;

    const prompt = container.querySelector("#ai-prompt");
    const askBtn = container.querySelector("#ai-ask-btn");
    const sumBtn = container.querySelector("#ai-summary-btn");
    const resBox = container.querySelector("#ai-response-box");

    const process = (mode) => {
      const q = prompt.value.trim();
      if (!q) {
        alert("Please enter a question or topic first.");
        return;
      }
      resBox.hidden = false;
      resBox.innerHTML = `<strong>🤖 AI Study Assistant Response (${mode}):</strong><p style="margin-top:8px;">${escapeHtml(q)}</p><p class="fine-print">Breakdown: Key concepts identified. Focus on core definitions, formula relationships, and practical problem solving steps.</p>`;
    };

    askBtn.onclick = () => process("Question Help");
    sumBtn.onclick = () => process("Study Summary");
    return;
  }

  if (sectionId === "finance-budgeting") {
    container.innerHTML = `
      <p class="tool-intro">Student Monthly Budget & Expense Calculator.</p>
      <form class="tool-form" id="fin-form">
        <div class="form-row">
          <label class="field">Monthly Income / Allowance (₦)<input name="income" type="number" required value="50000"></label>
          <label class="field">Hostel / Rent (₦)<input name="rent" type="number" value="15000"></label>
        </div>
        <div class="form-row">
          <label class="field">Food & Groceries (₦)<input name="food" type="number" value="20000"></label>
          <label class="field">Textbooks & Academic (₦)<input name="academic" type="number" value="5000"></label>
        </div>
        <div class="form-row">
          <label class="field">Transport & Airtime (₦)<input name="misc" type="number" value="5000"></label>
        </div>
        <button class="button button-primary" type="submit">Calculate Budget</button>
        <div class="tool-output" id="fin-out"></div>
      </form>
    `;

    const form = container.querySelector("#fin-form");
    form.onsubmit = (e) => {
      e.preventDefault();
      const out = form.querySelector("#fin-out");
      const data = Object.fromEntries(new FormData(form).entries());
      const income = Number(data.income) || 0;
      const expenses = (Number(data.rent) || 0) + (Number(data.food) || 0) + (Number(data.academic) || 0) + (Number(data.misc) || 0);
      const remaining = income - expenses;

      out.innerHTML = `
        <div class="result-box">
          <strong>Total Allowance: ₦${income.toLocaleString()}</strong>
          <p>Total Expenses: ₦${expenses.toLocaleString()} · Net Savings/Balance: <strong>₦${remaining.toLocaleString()}</strong></p>
          <p class="fine-print">${remaining >= 0 ? "✓ You are within your monthly budget!" : "⚠ Caution: Your monthly expenses exceed your total allowance."}</p>
        </div>
      `;
    };
    return;
  }

  container.innerHTML = `<p class="tool-intro">Utility component ready.</p>`;
}
