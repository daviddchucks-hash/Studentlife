"use strict";

export const INITIAL_FORMULAS = [
  {
    id: "f_quadratic",
    name: "Quadratic Formula",
    subject: "Mathematics",
    level: "O-Level",
    topic: "Algebra",
    formula: "x = (-b ± √(b² - 4ac)) / (2a)",
    formulaLatex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    description: "Finds the real or complex solutions for any quadratic equation in standard form ax² + bx + c = 0.",
    variables: "a = coefficient of x², b = coefficient of x, c = constant term",
    units: "Dimensionless / depends on variables",
    conditions: "a ≠ 0",
    examples: "For x² - 5x + 6 = 0: a=1, b=-5, c=6 → x = (5 ± √(25 - 24))/2 → x = 3 or x = 2.",
    tags: "quadratic, algebra, roots, discriminant",
    verified: true,
    calculatorId: "quadratic-solver"
  },
  {
    id: "f_pythagoras",
    name: "Pythagorean Theorem",
    subject: "Mathematics",
    level: "O-Level",
    topic: "Geometry",
    formula: "a² + b² = c²",
    formulaLatex: "a^2 + b^2 = c^2",
    description: "Relates the side lengths of a right-angled triangle, where c is the hypotenuse.",
    variables: "a = perpendicular side, b = base side, c = hypotenuse",
    units: "Meters (m) or any linear unit",
    conditions: "Triangle must contain a 90° angle.",
    examples: "If a = 3m and b = 4m, c² = 9 + 16 = 25 → c = 5m.",
    tags: "geometry, triangle, hypotenuse, right-angle",
    verified: true,
    calculatorId: "math-formula-calc"
  },
  {
    id: "f_ohms_law",
    name: "Ohm's Law",
    subject: "Physics",
    level: "O-Level",
    topic: "Electricity",
    formula: "V = I × R",
    formulaLatex: "V = I \\cdot R",
    description: "Describes the fundamental relation between voltage, current, and resistance in an electrical circuit.",
    variables: "V = Voltage (volts), I = Current (amperes), R = Resistance (ohms)",
    units: "V in Volts (V), I in Amperes (A), R in Ohms (Ω)",
    conditions: "Constant temperature for ohmic conductors.",
    examples: "If I = 2A and R = 5Ω, V = 2 × 5 = 10V.",
    tags: "electricity, voltage, current, resistance, circuit",
    verified: true,
    calculatorId: "ohms-law"
  },
  {
    id: "f_electrical_power",
    name: "Electrical Power",
    subject: "Physics",
    level: "O-Level",
    topic: "Electricity",
    formula: "P = V × I = I²R = V² / R",
    formulaLatex: "P = V \\cdot I = I^2 R = \\frac{V^2}{R}",
    description: "Calculates the rate at which electrical energy is transferred by an electric circuit.",
    variables: "P = Power (watts), V = Voltage (volts), I = Current (amperes), R = Resistance (ohms)",
    units: "P in Watts (W) or Joules per second (J/s)",
    conditions: "Direct current (DC) or AC circuits with unity power factor.",
    examples: "A 120V appliance drawing 2A uses P = 120 × 2 = 240W.",
    tags: "power, electricity, watts, energy",
    verified: true,
    calculatorId: "electrical-power"
  },
  {
    id: "f_kinematics_v",
    name: "Velocity-Time Relation (First Equation of Motion)",
    subject: "Physics",
    level: "O-Level",
    topic: "Mechanics",
    formula: "v = u + at",
    formulaLatex: "v = u + at",
    description: "Calculates final velocity given initial velocity, constant acceleration, and time elapsed.",
    variables: "v = final velocity, u = initial velocity, a = acceleration, t = time",
    units: "v, u in m/s; a in m/s²; t in seconds (s)",
    conditions: "Constant acceleration along a straight line.",
    examples: "Car accelerates from u = 10 m/s at a = 2 m/s² for t = 5 s → v = 10 + (2×5) = 20 m/s.",
    tags: "kinematics, velocity, acceleration, motion",
    verified: true,
    calculatorId: "kinematics"
  },
  {
    id: "f_kinematics_s",
    name: "Displacement Equation (Second Equation of Motion)",
    subject: "Physics",
    level: "O-Level",
    topic: "Mechanics",
    formula: "s = ut + ½at²",
    formulaLatex: "s = ut + \\frac{1}{2}at^2",
    description: "Calculates displacement under constant acceleration.",
    variables: "s = displacement, u = initial velocity, a = acceleration, t = time",
    units: "s in meters (m), u in m/s, a in m/s², t in s",
    conditions: "Constant acceleration.",
    examples: "Dropping an object from rest (u=0) for 3 s with g=9.81 m/s² → s = 0 + 0.5×9.81×9 = 44.14 m.",
    tags: "displacement, motion, gravity, freefall",
    verified: true,
    calculatorId: "kinematics"
  },
  {
    id: "f_newtons_second",
    name: "Newton's Second Law of Motion",
    subject: "Physics",
    level: "O-Level",
    topic: "Mechanics",
    formula: "F = m × a",
    formulaLatex: "F = m \\cdot a",
    description: "Relates net force applied on an object to its mass and resultant acceleration.",
    variables: "F = Net Force (newtons), m = Mass (kilograms), a = Acceleration (m/s²)",
    units: "F in Newtons (N), m in kg, a in m/s²",
    conditions: "Non-relativistic speeds, constant mass.",
    examples: "A 1000 kg car accelerating at 3 m/s² requires F = 1000 × 3 = 3000 N.",
    tags: "force, mass, acceleration, mechanics, Newton",
    verified: true,
    calculatorId: "newtons-laws"
  },
  {
    id: "f_kinetic_energy",
    name: "Kinetic Energy",
    subject: "Physics",
    level: "O-Level",
    topic: "Mechanics",
    formula: "KE = ½m v²",
    formulaLatex: "KE = \\frac{1}{2} m v^2",
    description: "Calculates energy possessed by an object due to its motion.",
    variables: "KE = Kinetic energy, m = Mass, v = Velocity",
    units: "KE in Joules (J), m in kg, v in m/s",
    conditions: "Non-relativistic velocities (v << c).",
    examples: "A 2 kg mass moving at 4 m/s has KE = 0.5 × 2 × 16 = 16 J.",
    tags: "energy, kinetic, mechanics, joules",
    verified: true,
    calculatorId: "work-energy"
  },
  {
    id: "f_gravitational_pe",
    name: "Gravitational Potential Energy",
    subject: "Physics",
    level: "O-Level",
    topic: "Mechanics",
    formula: "PE = m × g × h",
    formulaLatex: "PE = m \\cdot g \\cdot h",
    description: "Energy stored in an object due to its position above ground level.",
    variables: "PE = Potential energy, m = Mass, g = Gravitational acceleration, h = Height",
    units: "PE in Joules (J), m in kg, g = 9.81 m/s², h in m",
    conditions: "Near Earth's surface where g is uniform.",
    examples: "A 5 kg book lifted 2 m high has PE = 5 × 9.81 × 2 = 98.1 J.",
    tags: "potential energy, gravity, mechanics, height",
    verified: true,
    calculatorId: "work-energy"
  },
  {
    id: "f_density",
    name: "Density Formula",
    subject: "Physics",
    level: "O-Level",
    topic: "Properties of Matter",
    formula: "ρ = m / V",
    formulaLatex: "\\rho = \\frac{m}{V}",
    description: "Calculates mass per unit volume of a substance.",
    variables: "ρ = Density, m = Mass, V = Volume",
    units: "ρ in kg/m³ or g/cm³, m in kg, V in m³",
    conditions: "Uniform material density.",
    examples: "1000 kg of water occupying 1 m³ has ρ = 1000 kg/m³.",
    tags: "density, mass, volume, matter",
    verified: true,
    calculatorId: "density"
  },
  {
    id: "f_ideal_gas_law",
    name: "Ideal Gas Law",
    subject: "Chemistry",
    level: "A-Level",
    topic: "Physical Chemistry",
    formula: "P V = n R T",
    formulaLatex: "P V = n R T",
    description: "Relates pressure, volume, temperature, and moles of an ideal gas.",
    variables: "P = Pressure (Pa), V = Volume (m³), n = Moles (mol), R = Gas constant (8.314 J/mol·K), T = Temperature (K)",
    units: "P in Pascals, V in m³, T in Kelvin",
    conditions: "Ideal gas assumptions (negligible molecular volume & intermolecular forces).",
    examples: "For 1 mol of gas at 273.15 K and 101,325 Pa: V = (1 × 8.314 × 273.15) / 101325 = 0.0224 m³ (22.4 L).",
    tags: "gas law, chemistry, thermodynamics, mole, pressure",
    verified: true,
    calculatorId: "unit-converter"
  },
  {
    id: "f_projectile_range",
    name: "Projectile Maximum Range",
    subject: "Physics",
    level: "A-Level",
    topic: "Mechanics",
    formula: "R = (v₀² sin 2θ) / g",
    formulaLatex: "R = \\frac{v_0^2 \\sin(2\\theta)}{g}",
    description: "Calculates horizontal distance traveled by a projectile launched on level ground.",
    variables: "R = Horizontal Range, v₀ = Initial launch velocity, θ = Launch angle, g = Acceleration due to gravity",
    units: "R in meters (m), v₀ in m/s, θ in degrees/radians",
    conditions: "Flat ground, negligible air resistance.",
    examples: "Launched at 20 m/s at 45°: R = (400 × sin 90°) / 9.81 = 40.77 m.",
    tags: "projectile, kinematics, range, motion",
    verified: true,
    calculatorId: "projectile-motion"
  },
  {
    id: "f_logarithm_change_base",
    name: "Logarithm Change of Base Formula",
    subject: "Mathematics",
    level: "A-Level",
    topic: "Algebra",
    formula: "log_b(x) = ln(x) / ln(b) = log_10(x) / log_10(b)",
    formulaLatex: "\\log_b(x) = \\frac{\\ln(x)}{\\ln(b)}",
    description: "Allows calculation of logarithm in any base using natural or base-10 logarithms.",
    variables: "x = argument (x > 0), b = base (b > 0, b ≠ 1)",
    units: "Dimensionless",
    conditions: "x > 0, b > 0, b ≠ 1.",
    examples: "log_2(8) = ln(8)/ln(2) = 2.0794 / 0.6931 = 3.",
    tags: "logarithm, algebra, base, math",
    verified: true,
    calculatorId: "logarithm"
  },
  {
    id: "f_bending_stress",
    name: "Flexural / Bending Formula (Euler-Bernoulli Beam)",
    subject: "Engineering",
    level: "Undergraduate",
    topic: "Solid Mechanics",
    formula: "σ = (M × y) / I",
    formulaLatex: "\\sigma = \\frac{M \\cdot y}{I}",
    description: "Calculates bending stress in a beam subjected to a bending moment.",
    variables: "σ = Bending stress (Pa), M = Bending moment (N·m), y = Distance from neutral axis (m), I = Second moment of area (m⁴)",
    units: "N/m² or Pascals (Pa)",
    conditions: "Linear elastic material, small deflections, symmetric cross section.",
    examples: "Beam with M = 5000 N·m, y = 0.05m, I = 10⁻⁵ m⁴ → σ = (5000 × 0.05) / 10⁻⁵ = 25 MPa.",
    tags: "engineering, stress, bending, beam, mechanics",
    verified: true,
    calculatorId: "engineering-converter"
  }
];

export async function fetchFormulasFromApi(apiReqFunc, query = {}) {
  try {
    const params = new URLSearchParams();
    if (query.subject) params.append("subject", query.subject);
    if (query.level) params.append("level", query.level);
    if (query.search) params.append("search", query.search);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await apiReqFunc(`/api/formulas${queryString}`, { authenticated: false });
    if (res && Array.isArray(res.items) && res.items.length > 0) {
      return res.items;
    }
  } catch {
    /* Fallback to INITIAL_FORMULAS */
  }
  return INITIAL_FORMULAS;
}

export function renderFormulaCard(formula) {
  const isVerifiedBadge = formula.verified
    ? '<span class="badge badge-success">✓ Verified</span>'
    : '<span class="badge badge-warning">Awaiting Review</span>';

  const calcButton = formula.calculatorId
    ? `<button class="button button-small button-secondary" type="button" data-open-tool="${formula.calculatorId}">Use Calculator</button>`
    : "";

  return `
    <article class="formula-card">
      <div class="formula-head">
        <div>
          <span class="formula-meta">${escapeHtml(formula.subject)} · ${escapeHtml(formula.level)} · ${escapeHtml(formula.topic)}</span>
          <h3>${escapeHtml(formula.name)}</h3>
        </div>
        ${isVerifiedBadge}
      </div>
      <div class="formula-display">
        <code>${escapeHtml(formula.formula)}</code>
      </div>
      <p class="formula-desc">${escapeHtml(formula.description)}</p>
      ${formula.variables ? `<div class="formula-detail"><strong>Variables:</strong> ${escapeHtml(formula.variables)}</div>` : ""}
      ${formula.units ? `<div class="formula-detail"><strong>Units:</strong> ${escapeHtml(formula.units)}</div>` : ""}
      ${formula.conditions ? `<div class="formula-detail"><strong>Conditions:</strong> ${escapeHtml(formula.conditions)}</div>` : ""}
      ${formula.examples ? `<div class="formula-detail"><strong>Example:</strong> ${escapeHtml(formula.examples)}</div>` : ""}
      <div class="formula-actions">
        <button class="button button-small button-quiet" type="button" data-copy-formula="${escapeHtml(formula.formula)}">Copy Formula</button>
        ${calcButton}
      </div>
    </article>
  `;
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
