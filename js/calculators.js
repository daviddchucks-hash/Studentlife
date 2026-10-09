"use strict";

export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// 29. Scientific Calculator
export function evaluateScientific(expression, angleMode = "deg") {
  if (!expression || typeof expression !== "string") throw new Error("Please enter a valid mathematical expression.");
  let expr = expression.trim();
  expr = expr.replace(/π/g, "Math.PI").replace(/π/g, "Math.PI").replace(/\be\b/g, "Math.E");

  // Replace functions
  const toRad = angleMode === "deg" ? "(Math.PI/180)*" : "";
  expr = expr.replace(/sin\(/g, `Math.sin(${toRad}`)
            .replace(/cos\(/g, `Math.cos(${toRad}`)
            .replace(/tan\(/g, `Math.tan(${toRad}`)
            .replace(/asin\(/g, "Math.asin(")
            .replace(/acos\(/g, "Math.acos(")
            .replace(/atan\(/g, "Math.atan(")
            .replace(/log\(/g, "Math.log10(")
            .replace(/ln\(/g, "Math.log(")
            .replace(/sqrt\(/g, "Math.sqrt(")
            .replace(/\^/g, "**");

  // Check for allowed characters only
  if (/[^0-9\.\+\-\*\/\(\)\,\sMathPIEsincoatglrq10\*\*]/.test(expr)) {
    throw new Error("Invalid characters in expression.");
  }

  try {
    const fn = new Function(`return (${expr});`);
    const val = fn();
    if (typeof val !== "number" || !Number.isFinite(val)) {
      if (Number.isNaN(val)) throw new Error("Undefined result (NaN).");
      throw new Error("Division by zero or infinity encountered.");
    }
    return val;
  } catch (err) {
    throw new Error(err.message || "Invalid mathematical expression.");
  }
}

// 30. Percentage Calculator
export function calculatePercentage(type, a, b) {
  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isFinite(numA) || !Number.isFinite(numB)) throw new Error("Please enter valid numbers.");

  if (type === "percent_of") {
    // What is numA % of numB?
    const result = (numA / 100) * numB;
    return `${numA}% of ${numB} is <strong>${result}</strong>`;
  } else if (type === "is_percent") {
    // numA is what % of numB?
    if (numB === 0) throw new Error("Cannot divide by zero.");
    const result = (numA / numB) * 100;
    return `${numA} is <strong>${result.toFixed(2)}%</strong> of ${numB}`;
  } else if (type === "percent_change") {
    // Percentage change from numA to numB
    if (numA === 0) throw new Error("Initial value cannot be zero for percentage change.");
    const change = ((numB - numA) / Math.abs(numA)) * 100;
    const direction = change >= 0 ? "increase" : "decrease";
    return `Change from ${numA} to ${numB} is a <strong>${Math.abs(change).toFixed(2)}% ${direction}</strong>`;
  }
  throw new Error("Unknown percentage calculation type.");
}

// Helper: GCD
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// 31. Fraction Calculator
export function calculateFraction(num1, den1, op, num2, den2) {
  const n1 = Number(num1);
  const d1 = Number(den1);
  const n2 = Number(num2);
  const d2 = Number(den2);

  if (!Number.isInteger(n1) || !Number.isInteger(d1) || !Number.isInteger(n2) || !Number.isInteger(d2)) {
    throw new Error("Numerators and denominators must be integers.");
  }
  if (d1 === 0 || d2 === 0) throw new Error("Denominator cannot be zero.");

  let resNum, resDen;
  if (op === "+") {
    resNum = n1 * d2 + n2 * d1;
    resDen = d1 * d2;
  } else if (op === "-") {
    resNum = n1 * d2 - n2 * d1;
    resDen = d1 * d2;
  } else if (op === "*") {
    resNum = n1 * n2;
    resDen = d1 * d2;
  } else if (op === "/") {
    if (n2 === 0) throw new Error("Cannot divide by a fraction with zero numerator.");
    resNum = n1 * d2;
    resDen = d1 * n2;
  } else {
    throw new Error("Invalid operation.");
  }

  if (resDen < 0) {
    resNum = -resNum;
    resDen = -resDen;
  }

  const common = gcd(resNum, resDen);
  const simpNum = resNum / common;
  const simpDen = resDen / common;
  const decimal = resNum / resDen;

  let fractionStr = `${simpNum}`;
  if (simpDen !== 1) fractionStr += `/${simpDen}`;

  return {
    fractionStr,
    simplifiedNum: simpNum,
    simplifiedDen: simpDen,
    decimal: decimal.toFixed(6).replace(/\.?0+$/, "")
  };
}

// 32. Unit Converter
const UNIT_FACTORS = {
  length: {
    m: 1, km: 1000, cm: 0.01, mm: 0.001, miles: 1609.344, feet: 0.3048, inches: 0.0254
  },
  mass: {
    kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125
  },
  volume: {
    L: 1, mL: 0.001, gal: 3.78541, m3: 1000
  },
  time: {
    s: 1, min: 60, h: 3600, days: 86400
  }
};

export function convertUnit(category, value, fromUnit, toUnit) {
  const val = Number(value);
  if (!Number.isFinite(val)) throw new Error("Enter a valid numerical value.");
  const cat = UNIT_FACTORS[category];
  if (!cat) throw new Error("Invalid category.");
  const fromFactor = cat[fromUnit];
  const toFactor = cat[toUnit];
  if (!fromFactor || !toFactor) throw new Error("Invalid units selected.");

  const inBase = val * fromFactor;
  const converted = inBase / toFactor;
  return converted;
}

// 33. Equation Solver (Linear ax + b = c)
export function solveLinearEquation(a, b, c) {
  const numA = Number(a);
  const numB = Number(b);
  const numC = Number(c);

  if (!Number.isFinite(numA) || !Number.isFinite(numB) || !Number.isFinite(numC)) {
    throw new Error("Coefficients must be valid numbers.");
  }
  if (numA === 0) {
    if (numB === numC) return "Infinite solutions (identity).";
    return "No solution (inconsistent equation).";
  }
  const x = (numC - numB) / numA;
  return `x = ${x.toFixed(6).replace(/\.?0+$/, "")}`;
}

// 34. Matrix Calculator (2x2 and 3x3)
export function calculateMatrix(operation, matrixA, matrixB = null) {
  const dim = matrixA.length; // 2 or 3
  if (operation === "det") {
    if (dim === 2) {
      return matrixA[0][0] * matrixA[1][1] - matrixA[0][1] * matrixA[1][0];
    } else if (dim === 3) {
      const a = matrixA[0][0], b = matrixA[0][1], c = matrixA[0][2];
      const d = matrixA[1][0], e = matrixA[1][1], f = matrixA[1][2];
      const g = matrixA[2][0], h = matrixA[2][1], i = matrixA[2][2];
      return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    }
  } else if (operation === "transpose") {
    const result = Array.from({ length: dim }, () => Array(dim).fill(0));
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        result[c][r] = matrixA[r][c];
      }
    }
    return result;
  } else if (operation === "add" || operation === "subtract") {
    if (!matrixB) throw new Error("Second matrix is required for addition/subtraction.");
    const sign = operation === "add" ? 1 : -1;
    const result = Array.from({ length: dim }, () => Array(dim).fill(0));
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        result[r][c] = matrixA[r][c] + sign * matrixB[r][c];
      }
    }
    return result;
  } else if (operation === "multiply") {
    if (!matrixB) throw new Error("Second matrix is required for multiplication.");
    const result = Array.from({ length: dim }, () => Array(dim).fill(0));
    for (let r = 0; r < dim; r++) {
      for (let c = 0; c < dim; c++) {
        for (let k = 0; k < dim; k++) {
          result[r][c] += matrixA[r][k] * matrixB[k][c];
        }
      }
    }
    return result;
  } else if (operation === "inverse") {
    const det = calculateMatrix("det", matrixA);
    if (Math.abs(det) < 1e-12) throw new Error("Matrix is singular (determinant is zero); inverse does not exist.");
    if (dim === 2) {
      return [
        [matrixA[1][1] / det, -matrixA[0][1] / det],
        [-matrixA[1][0] / det, matrixA[0][0] / det]
      ];
    } else {
      const a = matrixA[0][0], b = matrixA[0][1], c = matrixA[0][2];
      const d = matrixA[1][0], e = matrixA[1][1], f = matrixA[1][2];
      const g = matrixA[2][0], h = matrixA[2][1], i = matrixA[2][2];

      const inv = [
        [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
        [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
        [(d * h - e * g) / det, (g * b - a * h) / det, (a * e - b * d) / det]
      ];
      return inv;
    }
  }
  throw new Error("Invalid matrix operation.");
}
