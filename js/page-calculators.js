import { initNavigation } from "./nav.js";
import {
  calculateGpa,
  calculateCgpa,
  calculateSemesterAverage,
  calculateGrade,
  sumCourseUnits,
  parseCourseRows
} from "./calculations.js";

import {
  evaluateScientific,
  calculatePercentage,
  calculateFraction,
  convertUnit,
  solveLinearEquation,
  calculateMatrix
} from "./calculators.js";

import {
  calculateOhmsLaw,
  calculateElectricalPower,
  calculateResistorColorCode,
  calculateResistorNetwork,
  calculateKinematics,
  calculateProjectileMotion,
  calculateNewtonLaws,
  calculateWorkEnergy,
  calculateVelocityAccel,
  calculateDensity,
  calculatePressure,
  convertTemperature,
  convertNumberSystem,
  calculateLogarithm,
  solveQuadratic,
  solveSimultaneous2x2,
  calculateStatistics,
  calculatePermutationsCombinations
} from "./stem-calculators.js";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&#39;" })[c]);
}

let activeTab = "academic";

function renderTab(tab) {
  activeTab = tab;
  document.querySelectorAll("#calc-tabs .tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const content = document.querySelector("#calc-content");
  if (!content) return;
  content.innerHTML = "";

  if (tab === "academic") {
    content.innerHTML = `
      <!-- GPA Calculator -->
      <article class="calc-card">
        <h3>Semester GPA Calculator</h3>
        <p class="calc-desc">Enter course rows as: <code>CourseCode, CreditUnits, GradePoint(0-5)</code></p>
        <form id="calc-gpa-form" class="tool-form">
          <label class="field">Courses Input
            <textarea name="courses" rows="4" placeholder="MTH101, 3, 5&#10;PHY101, 3, 4&#10;ENG101, 2, 3"></textarea>
          </label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate GPA</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- CGPA Calculator -->
      <article class="calc-card">
        <h3>CGPA Calculator</h3>
        <p class="calc-desc">Add current semester courses and previous cumulative totals.</p>
        <form id="calc-cgpa-form" class="tool-form">
          <label class="field">Current Semester Courses (CourseCode, Units, GradePoint)
            <textarea name="courses" rows="3" placeholder="MTH102, 3, 4&#10;PHY102, 3, 5"></textarea>
          </label>
          <div class="form-row">
            <label class="field">Previous Total Points<input type="number" step="0.01" name="prevPoints" value="0"></label>
            <label class="field">Previous Total Units<input type="number" step="0.5" name="prevUnits" value="0"></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate CGPA</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Semester Weighted Result -->
      <article class="calc-card">
        <h3>Semester Weighted Average</h3>
        <p class="calc-desc">Calculate weighted average score (0-100%): <code>CourseCode, Units, Score</code></p>
        <form id="calc-avg-form" class="tool-form">
          <label class="field">Courses & Scores
            <textarea name="courses" rows="3" placeholder="MTH101, 3, 78&#10;PHY101, 3, 65"></textarea>
          </label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate Average</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Grade Calculator -->
      <article class="calc-card">
        <h3>Grade & Percentage Converter</h3>
        <p class="calc-desc">Convert score and total mark into percentage and letter grade.</p>
        <form id="calc-grade-form" class="tool-form">
          <div class="form-row">
            <label class="field">Score Obtained<input type="number" step="0.5" name="score" required placeholder="75"></label>
            <label class="field">Total Maximum Score<input type="number" step="0.5" name="total" required value="100"></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Convert Grade</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Course Units Calculator -->
      <article class="calc-card">
        <h3>Course Units Calculator</h3>
        <p class="calc-desc">Total up course units separated by commas or lines.</p>
        <form id="calc-units-form" class="tool-form">
          <label class="field">Credit Units List<input name="units" placeholder="3, 3, 2, 4, 1"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Total Units</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>
    `;

    document.querySelector("#calc-gpa-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const parsed = parseCourseRows(e.target.courses.value, false);
        const res = calculateGpa(parsed);
        out.innerHTML = `<div class="result-box"><strong>GPA: ${res.value.toFixed(2)}</strong><p>Total Units: ${res.totalUnits} | Quality Points: ${res.qualityPoints}</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-cgpa-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const parsed = parseCourseRows(e.target.courses.value, false);
        const pPts = Number(e.target.prevPoints.value) || 0;
        const pUnits = Number(e.target.prevUnits.value) || 0;
        const res = calculateCgpa(parsed, pPts, pUnits);
        out.innerHTML = `<div class="result-box"><strong>Cumulative CGPA: ${res.value.toFixed(2)}</strong><p>Total Cumulative Units: ${res.totalUnits} | Cumulative Points: ${res.qualityPoints}</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-avg-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const parsed = parseCourseRows(e.target.courses.value, true);
        const res = calculateSemesterAverage(parsed);
        out.innerHTML = `<div class="result-box"><strong>Weighted Average: ${res.value.toFixed(2)}%</strong><p>Total Units: ${res.totalUnits} across ${res.courseCount} courses</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-grade-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const score = Number(e.target.score.value);
        const total = Number(e.target.total.value);
        const res = calculateGrade(score, total);
        out.innerHTML = `<div class="result-box"><strong>Grade: ${res.letter}</strong> (${res.percentage.toFixed(2)}%)</div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-units-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = sumCourseUnits(e.target.units.value);
        out.innerHTML = `<div class="result-box"><strong>Total Credit Units: ${res.total}</strong> (${res.count} courses)</div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

  } else if (tab === "math") {
    content.innerHTML = `
      <!-- Scientific -->
      <article class="calc-card">
        <h3>Scientific Calculator</h3>
        <p class="calc-desc">Supports sin, cos, tan, log, ln, sqrt, ^, π, e.</p>
        <form id="calc-sci-form" class="tool-form">
          <label class="field">Expression<input name="expr" required placeholder="sin(30) + sqrt(16) * 2"></label>
          <label class="field">Angle Mode
            <select name="angle"><option value="deg">Degrees</option><option value="rad">Radians</option></select>
          </label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Evaluate</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Percentage -->
      <article class="calc-card">
        <h3>Percentage Calculator</h3>
        <p class="calc-desc">Calculate percentage values, ratios, and changes.</p>
        <form id="calc-pct-form" class="tool-form">
          <label class="field">Type
            <select name="type">
              <option value="percent_of">What is A% of B?</option>
              <option value="is_percent">A is what % of B?</option>
              <option value="percent_change">% change from A to B</option>
            </select>
          </label>
          <div class="form-row">
            <label class="field">Value A<input type="number" step="any" name="a" required></label>
            <label class="field">Value B<input type="number" step="any" name="b" required></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Quadratic Solver -->
      <article class="calc-card">
        <h3>Quadratic Equation Solver</h3>
        <p class="calc-desc">Solve ax² + bx + c = 0</p>
        <form id="calc-quad-form" class="tool-form">
          <div class="form-row">
            <label class="field">a<input type="number" step="any" name="a" required value="1"></label>
            <label class="field">b<input type="number" step="any" name="b" required value="-5"></label>
          </div>
          <label class="field">c<input type="number" step="any" name="c" required value="6"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Solve</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Simultaneous Solver -->
      <article class="calc-card">
        <h3>2x2 Simultaneous Equations</h3>
        <p class="calc-desc">Solve system: a1·x + b1·y = c1 and a2·x + b2·y = c2</p>
        <form id="calc-simult-form" class="tool-form">
          <div class="form-row">
            <label class="field">a1<input type="number" step="any" name="a1" required></label>
            <label class="field">b1<input type="number" step="any" name="b1" required></label>
          </div>
          <label class="field">c1<input type="number" step="any" name="c1" required></label>
          <div class="form-row">
            <label class="field">a2<input type="number" step="any" name="a2" required></label>
            <label class="field">b2<input type="number" step="any" name="b2" required></label>
          </div>
          <label class="field">c2<input type="number" step="any" name="c2" required></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Solve System</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Statistics -->
      <article class="calc-card">
        <h3>Statistics Calculator</h3>
        <p class="calc-desc">Mean, median, mode, variance, and standard deviation.</p>
        <form id="calc-stats-form" class="tool-form">
          <label class="field">Numbers List (comma separated)<input name="numbers" required placeholder="10, 20, 30, 40, 50"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate Stats</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Combinatorics -->
      <article class="calc-card">
        <h3>Permutations & Combinations</h3>
        <p class="calc-desc">Compute nPr and nCr</p>
        <form id="calc-comb-form" class="tool-form">
          <div class="form-row">
            <label class="field">n (total items)<input type="number" min="0" name="n" required value="5"></label>
            <label class="field">r (chosen items)<input type="number" min="0" name="r" required value="2"></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Compute</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>
    `;

    document.querySelector("#calc-sci-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const val = evaluateScientific(e.target.expr.value, e.target.angle.value);
        out.innerHTML = `<div class="result-box"><strong>Result: ${val}</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-pct-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculatePercentage(e.target.type.value, e.target.a.value, e.target.b.value);
        out.innerHTML = `<div class="result-box">${res}</div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-quad-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = solveQuadratic(e.target.a.value, e.target.b.value, e.target.c.value);
        out.innerHTML = `<div class="result-box"><strong>${res.type}</strong><p>${res.roots.join("<br>")}</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-simult-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = solveSimultaneous2x2(
          Number(e.target.a1.value), Number(e.target.b1.value), Number(e.target.c1.value),
          Number(e.target.a2.value), Number(e.target.b2.value), Number(e.target.c2.value)
        );
        if (res.x !== undefined) {
          out.innerHTML = `<div class="result-box"><strong>${res.status}</strong><p>x = ${res.x}, y = ${res.y}</p></div>`;
        } else {
          out.innerHTML = `<div class="result-box"><strong>${res.status}</strong></div>`;
        }
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-stats-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const nums = e.target.numbers.value.split(",").map(Number);
        const res = calculateStatistics(nums);
        out.innerHTML = `<div class="result-box"><strong>Mean: ${res.mean} | Median: ${res.median}</strong><p>Mode: ${res.mode}<br>Std Dev (Sample): ${res.stdDevSample} | Variance: ${res.varianceSample}</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-comb-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculatePermutationsCombinations(e.target.n.value, e.target.r.value);
        out.innerHTML = `<div class="result-box"><strong>Permutations (nPr): ${res.nPr}</strong><br><strong>Combinations (nCr): ${res.nCr}</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

  } else if (tab === "physics") {
    content.innerHTML = `
      <!-- Kinematics -->
      <article class="calc-card">
        <h3>Kinematics Calculator</h3>
        <p class="calc-desc">Equations of motion (enter at least 3 knowns: u, v, a, t, s)</p>
        <form id="calc-kin-form" class="tool-form">
          <div class="form-row">
            <label class="field">Initial velocity (u)<input type="number" step="any" name="u" placeholder="m/s"></label>
            <label class="field">Final velocity (v)<input type="number" step="any" name="v" placeholder="m/s"></label>
          </div>
          <div class="form-row">
            <label class="field">Acceleration (a)<input type="number" step="any" name="a" placeholder="m/s²"></label>
            <label class="field">Time (t)<input type="number" step="any" name="t" placeholder="seconds"></label>
          </div>
          <label class="field">Displacement (s)<input type="number" step="any" name="s" placeholder="meters"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Solve Motion</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Projectile Motion -->
      <article class="calc-card">
        <h3>Projectile Motion</h3>
        <p class="calc-desc">Calculate range, time of flight, and max height (g = 9.81 m/s²)</p>
        <form id="calc-proj-form" class="tool-form">
          <div class="form-row">
            <label class="field">Initial Velocity (v₀)<input type="number" step="any" name="v0" required value="20" placeholder="m/s"></label>
            <label class="field">Launch Angle (θ°)<input type="number" step="any" min="0" max="90" name="angle" required value="45" placeholder="degrees"></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate Trajectory</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Newton's Second Law -->
      <article class="calc-card">
        <h3>Newton's Laws (F = ma)</h3>
        <p class="calc-desc">Enter 2 values to compute the third.</p>
        <form id="calc-newton-form" class="tool-form">
          <div class="form-row">
            <label class="field">Force (F)<input type="number" step="any" name="f" placeholder="N"></label>
            <label class="field">Mass (m)<input type="number" step="any" name="m" placeholder="kg"></label>
          </div>
          <label class="field">Acceleration (a)<input type="number" step="any" name="a" placeholder="m/s²"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Density & Pressure -->
      <article class="calc-card">
        <h3>Density & Pressure Solvers</h3>
        <p class="calc-desc">Density (ρ = m/V) and Pressure (P = F/A)</p>
        <form id="calc-density-form" class="tool-form">
          <div class="form-row">
            <label class="field">Mass (m)<input type="number" step="any" name="m" placeholder="kg"></label>
            <label class="field">Volume (V)<input type="number" step="any" name="v" placeholder="m³"></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate Density</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>
    `;

    document.querySelector("#calc-kin-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculateKinematics({
          u: e.target.u.value, v: e.target.v.value, a: e.target.a.value, t: e.target.t.value, s: e.target.s.value
        });
        out.innerHTML = `<div class="result-box"><strong>u: ${res.u} m/s | v: ${res.v} m/s</strong><p>a: ${res.a} m/s² | t: ${res.t} s | s: ${res.s} m</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-proj-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculateProjectileMotion(e.target.v0.value, e.target.angle.value);
        out.innerHTML = `<div class="result-box"><strong>Max Range: ${res.range} m</strong><p>Max Height: ${res.maxHeight} m | Flight Time: ${res.timeOfFlight} s</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-newton-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculateNewtonLaws({ f: e.target.f.value, m: e.target.m.value, a: e.target.a.value });
        out.innerHTML = `<div class="result-box"><strong>Force: ${res.force || (res.mass * res.accel)} N</strong><p>Mass: ${res.mass} kg | Acceleration: ${res.accel} m/s²</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-density-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculateDensity(e.target.m.value, e.target.v.value, undefined);
        out.innerHTML = `<div class="result-box"><strong>Density (ρ): ${res.density} kg/m³</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

  } else if (tab === "engineering") {
    content.innerHTML = `
      <!-- Ohm's Law -->
      <article class="calc-card">
        <h3>Ohm's Law (V = IR)</h3>
        <p class="calc-desc">Enter at least 2 values to calculate the third and electrical power.</p>
        <form id="calc-ohms-form" class="tool-form">
          <div class="form-row">
            <label class="field">Voltage (V)<input type="number" step="any" name="v" placeholder="Volts"></label>
            <label class="field">Current (I)<input type="number" step="any" name="i" placeholder="Amperes"></label>
          </div>
          <label class="field">Resistance (R)<input type="number" step="any" name="r" placeholder="Ohms (Ω)"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Electrical Power -->
      <article class="calc-card">
        <h3>Electrical Power (P = VI = I²R)</h3>
        <p class="calc-desc">Enter 2 known values to calculate power and electrical params.</p>
        <form id="calc-power-form" class="tool-form">
          <div class="form-row">
            <label class="field">Power (P)<input type="number" step="any" name="p" placeholder="Watts"></label>
            <label class="field">Voltage (V)<input type="number" step="any" name="v" placeholder="Volts"></label>
          </div>
          <div class="form-row">
            <label class="field">Current (I)<input type="number" step="any" name="i" placeholder="Amperes"></label>
            <label class="field">Resistance (R)<input type="number" step="any" name="r" placeholder="Ohms"></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate Power</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Resistor Network -->
      <article class="calc-card">
        <h3>Resistor Series & Parallel Network</h3>
        <p class="calc-desc">Enter resistor values separated by commas.</p>
        <form id="calc-res-form" class="tool-form">
          <label class="field">Network Type
            <select name="type"><option value="series">Series</option><option value="parallel">Parallel</option></select>
          </label>
          <label class="field">Resistor Values (Ω)<input name="resistors" required placeholder="10, 20, 30"></label>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Calculate Equivalent</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>
    `;

    document.querySelector("#calc-ohms-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculateOhmsLaw({ v: e.target.v.value, i: e.target.i.value, r: e.target.r.value });
        out.innerHTML = `<div class="result-box"><strong>Voltage: ${res.voltage} V | Current: ${res.current} A</strong><p>Resistance: ${res.resistance} Ω | Power: ${res.power} W</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-power-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = calculateElectricalPower({ p: e.target.p.value, v: e.target.v.value, i: e.target.i.value, r: e.target.r.value });
        out.innerHTML = `<div class="result-box"><strong>Power: ${res.power} W</strong><p>Voltage: ${res.voltage} V | Current: ${res.current} A | Resistance: ${res.resistance} Ω</p></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-res-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const vals = e.target.resistors.value.split(",").map(Number);
        const res = calculateResistorNetwork(e.target.type.value, vals);
        out.innerHTML = `<div class="result-box"><strong>Total ${res.type} Resistance: ${res.total} Ω</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

  } else if (tab === "utilities") {
    content.innerHTML = `
      <!-- Temperature -->
      <article class="calc-card">
        <h3>Temperature Converter</h3>
        <p class="calc-desc">Convert between Celsius, Fahrenheit, Kelvin, and Rankine.</p>
        <form id="calc-temp-form" class="tool-form">
          <label class="field">Temperature Value<input type="number" step="any" name="val" required value="25"></label>
          <div class="form-row">
            <label class="field">From
              <select name="from"><option value="C">Celsius (°C)</option><option value="F">Fahrenheit (°F)</option><option value="K">Kelvin (K)</option></select>
            </label>
            <label class="field">To
              <select name="to"><option value="F">Fahrenheit (°F)</option><option value="C">Celsius (°C)</option><option value="K">Kelvin (K)</option></select>
            </label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Convert</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Unit Converter -->
      <article class="calc-card">
        <h3>General Unit Converter</h3>
        <p class="calc-desc">Convert length, mass, volume, and time units.</p>
        <form id="calc-unit-form" class="tool-form">
          <label class="field">Category
            <select name="category" id="unit-cat-select">
              <option value="length">Length</option>
              <option value="mass">Mass</option>
              <option value="volume">Volume</option>
              <option value="time">Time</option>
            </select>
          </label>
          <label class="field">Value<input type="number" step="any" name="val" required value="1"></label>
          <div class="form-row">
            <label class="field">From Unit<select name="from" id="unit-from-select"><option value="km">km</option><option value="m">m</option><option value="cm">cm</option></select></label>
            <label class="field">To Unit<select name="to" id="unit-to-select"><option value="m">m</option><option value="km">km</option><option value="cm">cm</option></select></label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Convert Unit</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>

      <!-- Number System -->
      <article class="calc-card">
        <h3>Number System Converter</h3>
        <p class="calc-desc">Convert between Binary, Decimal, Hex, and Octal.</p>
        <form id="calc-numsys-form" class="tool-form">
          <label class="field">Input String<input name="val" required value="255"></label>
          <div class="form-row">
            <label class="field">From Base
              <select name="from"><option value="10">Decimal (10)</option><option value="2">Binary (2)</option><option value="16">Hexadecimal (16)</option><option value="8">Octal (8)</option></select>
            </label>
            <label class="field">To Base
              <select name="to"><option value="2">Binary (2)</option><option value="10">Decimal (10)</option><option value="16">Hexadecimal (16)</option><option value="8">Octal (8)</option></select>
            </label>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="button button-primary button-small" type="submit">Convert Base</button>
            <button class="button button-quiet button-small" type="reset">Reset</button>
          </div>
          <div class="tool-output"></div>
        </form>
      </article>
    `;

    document.querySelector("#calc-temp-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = convertTemperature(e.target.val.value, e.target.from.value, e.target.to.value);
        out.innerHTML = `<div class="result-box"><strong>Converted: ${res} °${e.target.to.value}</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-unit-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = convertUnit(e.target.category.value, e.target.val.value, e.target.from.value, e.target.to.value);
        out.innerHTML = `<div class="result-box"><strong>Result: ${res} ${e.target.to.value}</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };

    document.querySelector("#calc-numsys-form").onsubmit = (e) => {
      e.preventDefault();
      const out = e.target.querySelector(".tool-output");
      try {
        const res = convertNumberSystem(e.target.val.value, e.target.from.value, e.target.to.value);
        out.innerHTML = `<div class="result-box"><strong>Result: ${res}</strong></div>`;
      } catch (err) { out.innerHTML = `<div class="error-box">${escapeHtml(err.message)}</div>`; }
    };
  }
}

function init() {
  initNavigation("calculators");
  const calcTabs = document.querySelector("#calc-tabs");
  if (calcTabs) {
    calcTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (btn) renderTab(btn.dataset.tab);
    });
  }
  renderTab("academic");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
