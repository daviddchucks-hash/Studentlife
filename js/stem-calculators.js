"use strict";

// Helper
function isNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

// 38. Ohm's Law Calculator
export function calculateOhmsLaw({ v, i, r }) {
  let valV = v !== "" && v !== undefined ? Number(v) : null;
  let valI = i !== "" && i !== undefined ? Number(i) : null;
  let valR = r !== "" && r !== undefined ? Number(r) : null;

  const count = [valV, valI, valR].filter((x) => x !== null && !Number.isNaN(x)).length;
  if (count < 2) throw new Error("Please enter at least two values to calculate the third.");

  if (valV === null || Number.isNaN(valV)) {
    if (valR < 0) throw new Error("Resistance cannot be negative.");
    valV = valI * valR;
  } else if (valI === null || Number.isNaN(valI)) {
    if (valR <= 0) throw new Error("Resistance must be greater than zero.");
    valI = valV / valR;
  } else if (valR === null || Number.isNaN(valR)) {
    if (valI === 0) throw new Error("Current cannot be zero when calculating resistance.");
    valR = valV / valI;
    if (valR < 0) throw new Error("Resistance cannot be negative.");
  }

  const p = valV * valI;
  return {
    voltage: valV.toFixed(4).replace(/\.?0+$/, ""),
    current: valI.toFixed(4).replace(/\.?0+$/, ""),
    resistance: valR.toFixed(4).replace(/\.?0+$/, ""),
    power: p.toFixed(4).replace(/\.?0+$/, "")
  };
}

// 39. Electrical Power Calculator
export function calculateElectricalPower({ p, v, i, r }) {
  let valP = p !== "" && p !== undefined ? Number(p) : null;
  let valV = v !== "" && v !== undefined ? Number(v) : null;
  let valI = i !== "" && i !== undefined ? Number(i) : null;
  let valR = r !== "" && r !== undefined ? Number(r) : null;

  const vals = [valP, valV, valI, valR].map((x) => (x !== null && !Number.isNaN(x) ? x : null));
  const count = vals.filter((x) => x !== null).length;
  if (count < 2) throw new Error("Please enter at least two known values.");

  if (vals[1] !== null && vals[2] !== null) {
    valP = vals[1] * vals[2];
    valR = vals[2] !== 0 ? vals[1] / vals[2] : null;
  } else if (vals[1] !== null && vals[3] !== null) {
    if (vals[3] <= 0) throw new Error("Resistance must be positive.");
    valI = vals[1] / vals[3];
    valP = (vals[1] * vals[1]) / vals[3];
  } else if (vals[2] !== null && vals[3] !== null) {
    valV = vals[2] * vals[3];
    valP = vals[2] * vals[2] * vals[3];
  } else if (vals[0] !== null && vals[1] !== null) {
    if (vals[1] === 0) throw new Error("Voltage cannot be zero.");
    valI = vals[0] / vals[1];
    valR = (vals[1] * vals[1]) / vals[0];
  } else if (vals[0] !== null && vals[2] !== null) {
    if (vals[2] === 0) throw new Error("Current cannot be zero.");
    valV = vals[0] / vals[2];
    valR = vals[0] / (vals[2] * vals[2]);
  } else if (vals[0] !== null && vals[3] !== null) {
    if (vals[3] <= 0) throw new Error("Resistance must be positive.");
    valV = Math.sqrt(vals[0] * vals[3]);
    valI = Math.sqrt(vals[0] / vals[3]);
  }

  return {
    power: valP.toFixed(4).replace(/\.?0+$/, ""),
    voltage: valV.toFixed(4).replace(/\.?0+$/, ""),
    current: valI.toFixed(4).replace(/\.?0+$/, ""),
    resistance: valR ? valR.toFixed(4).replace(/\.?0+$/, "") : "N/A"
  };
}

// 40. Resistor Calculator
const COLOR_CODES = {
  black: 0, brown: 1, red: 2, orange: 3, yellow: 4,
  green: 5, blue: 6, violet: 7, grey: 8, white: 9
};
const MULTIPLIERS = {
  black: 1, brown: 10, red: 100, orange: 1000, yellow: 10000,
  green: 100000, blue: 1000000, violet: 10000000, grey: 100000000, white: 1000000000,
  gold: 0.1, silver: 0.01
};
const TOLERANCES = {
  brown: "±1%", red: "±2%", green: "±0.5%", blue: "±0.25%", violet: "±0.1%", grey: "±0.05%", gold: "±5%", silver: "±10%"
};

export function calculateResistorColorCode(b1, b2, b3, mult, tol) {
  const digit1 = COLOR_CODES[b1];
  const digit2 = COLOR_CODES[b2];
  if (digit1 === undefined || digit2 === undefined) throw new Error("Invalid color selected.");

  let baseVal = digit1 * 10 + digit2;
  if (b3 && COLOR_CODES[b3] !== undefined) {
    baseVal = baseVal * 10 + COLOR_CODES[b3];
  }

  const m = MULTIPLIERS[mult];
  if (m === undefined) throw new Error("Invalid multiplier color.");

  const resistance = baseVal * m;
  const tolerance = TOLERANCES[tol] || "±20%";

  let formatted = `${resistance} Ω`;
  if (resistance >= 1e6) formatted = `${(resistance / 1e6).toFixed(2)} MΩ`;
  else if (resistance >= 1e3) formatted = `${(resistance / 1e3).toFixed(2)} kΩ`;

  return { resistance, tolerance, formatted: `${formatted} ${tolerance}` };
}

export function calculateResistorNetwork(type, resistors) {
  const list = resistors.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (list.length < 2) throw new Error("Enter at least 2 valid resistor values greater than zero.");

  if (type === "series") {
    const total = list.reduce((a, b) => a + b, 0);
    return { total: total.toFixed(4).replace(/\.?0+$/, ""), type: "Series" };
  } else {
    const invSum = list.reduce((a, b) => a + (1 / b), 0);
    const total = 1 / invSum;
    return { total: total.toFixed(4).replace(/\.?0+$/, ""), type: "Parallel" };
  }
}

// 41. Kinematics Calculator (Constant acceleration)
export function calculateKinematics({ u, v, a, t, s }) {
  let valU = u !== "" && u !== undefined ? Number(u) : null;
  let valV = v !== "" && v !== undefined ? Number(v) : null;
  let valA = a !== "" && a !== undefined ? Number(a) : null;
  let valT = t !== "" && t !== undefined ? Number(t) : null;
  let valS = s !== "" && s !== undefined ? Number(s) : null;

  const knowns = [valU, valV, valA, valT, valS].filter((x) => x !== null && !Number.isNaN(x));
  if (knowns.length < 3) throw new Error("Please enter at least 3 known variables (u, v, a, t, s).");

  // We need to calculate missing 2 variables
  // v = u + at
  // s = ut + 0.5at^2
  // v^2 = u^2 + 2as
  // s = 0.5(u + v)t

  for (let iter = 0; iter < 3; iter++) {
    if (valU !== null && valA !== null && valT !== null && valV === null) valV = valU + valA * valT;
    if (valU !== null && valA !== null && valT !== null && valS === null) valS = valU * valT + 0.5 * valA * valT * valT;
    if (valU !== null && valV !== null && valA !== null && valT === null) {
      if (valA === 0) valT = 0; else valT = (valV - valU) / valA;
    }
    if (valU !== null && valV !== null && valA !== null && valS === null) {
      valS = (valV * valV - valU * valU) / (2 * valA);
    }
    if (valU !== null && valV !== null && valT !== null && valS === null) valS = 0.5 * (valU + valV) * valT;
    if (valU !== null && valV !== null && valT !== null && valA === null) {
      if (valT === 0) throw new Error("Time cannot be zero."); valA = (valV - valU) / valT;
    }
    if (valS !== null && valU !== null && valT !== null && valA === null) {
      if (valT === 0) throw new Error("Time cannot be zero."); valA = (2 * (valS - valU * valT)) / (valT * valT);
    }
    if (valS !== null && valV !== null && valT !== null && valU === null) {
      if (valT === 0) throw new Error("Time cannot be zero."); valU = (2 * valS) / valT - valV;
    }
  }

  return {
    u: valU !== null ? valU.toFixed(4).replace(/\.?0+$/, "") : "N/A",
    v: valV !== null ? valV.toFixed(4).replace(/\.?0+$/, "") : "N/A",
    a: valA !== null ? valA.toFixed(4).replace(/\.?0+$/, "") : "N/A",
    t: valT !== null ? valT.toFixed(4).replace(/\.?0+$/, "") : "N/A",
    s: valS !== null ? valS.toFixed(4).replace(/\.?0+$/, "") : "N/A"
  };
}

// 42. Projectile Motion Calculator (g = 9.81 m/s², flat terrain, negligible air resistance)
export function calculateProjectileMotion(v0, angleDeg, g = 9.81) {
  const valV0 = Number(v0);
  const valAngle = Number(angleDeg);
  if (!Number.isFinite(valV0) || valV0 < 0) throw new Error("Initial velocity must be a non-negative number.");
  if (!Number.isFinite(valAngle) || valAngle < 0 || valAngle > 90) throw new Error("Launch angle must be between 0° and 90°.");

  const rad = (valAngle * Math.PI) / 180;
  const v0x = valV0 * Math.cos(rad);
  const v0y = valV0 * Math.sin(rad);

  const timeOfFlight = (2 * v0y) / g;
  const maxHeight = (v0y * v0y) / (2 * g);
  const range = (valV0 * valV0 * Math.sin(2 * rad)) / g;

  return {
    v0x: v0x.toFixed(4).replace(/\.?0+$/, ""),
    v0y: v0y.toFixed(4).replace(/\.?0+$/, ""),
    timeOfFlight: timeOfFlight.toFixed(4).replace(/\.?0+$/, ""),
    maxHeight: maxHeight.toFixed(4).replace(/\.?0+$/, ""),
    range: range.toFixed(4).replace(/\.?0+$/, ""),
    assumptions: "Assumes uniform gravity (g = 9.81 m/s²), flat terrain, and zero air resistance."
  };
}

// 43. Newton's Laws & Momentum
export function calculateNewtonLaws({ m, a, f }) {
  const numM = m !== "" && m !== undefined ? Number(m) : null;
  const numA = a !== "" && a !== undefined ? Number(a) : null;
  const numF = f !== "" && f !== undefined ? Number(f) : null;

  if (numF === null && numM !== null && numA !== null) {
    if (numM < 0) throw new Error("Mass cannot be negative.");
    return { force: (numM * numA).toFixed(4).replace(/\.?0+$/, ""), mass: numM, accel: numA };
  } else if (numA === null && numF !== null && numM !== null) {
    if (numM <= 0) throw new Error("Mass must be greater than zero.");
    return { accel: (numF / numM).toFixed(4).replace(/\.?0+$/, ""), force: numF, mass: numM };
  } else if (numM === null && numF !== null && numA !== null) {
    if (numA === 0) throw new Error("Acceleration cannot be zero when finding mass.");
    const resM = numF / numA;
    if (resM < 0) throw new Error("Resulting mass cannot be negative.");
    return { mass: resM.toFixed(4).replace(/\.?0+$/, ""), force: numF, accel: numA };
  }
  throw new Error("Enter exactly two values to calculate the third (F = ma).");
}

// 44. Work/Energy Calculator
export function calculateWorkEnergy({ f, d, thetaDeg, m, v, h, g = 9.81 }) {
  const res = {};
  if (f !== undefined && d !== undefined) {
    const numF = Number(f), numD = Number(d), numT = Number(thetaDeg || 0);
    if (Number.isFinite(numF) && Number.isFinite(numD)) {
      const rad = (numT * Math.PI) / 180;
      res.work = (numF * numD * Math.cos(rad)).toFixed(4).replace(/\.?0+$/, "");
    }
  }
  if (m !== undefined && v !== undefined && m !== "" && v !== "") {
    const numM = Number(m), numV = Number(v);
    if (numM >= 0 && Number.isFinite(numV)) {
      res.ke = (0.5 * numM * numV * numV).toFixed(4).replace(/\.?0+$/, "");
    }
  }
  if (m !== undefined && h !== undefined && m !== "" && h !== "") {
    const numM = Number(m), numH = Number(h);
    if (numM >= 0 && Number.isFinite(numH)) {
      res.pe = (numM * g * numH).toFixed(4).replace(/\.?0+$/, "");
    }
  }
  if (Object.keys(res).length === 0) throw new Error("Please enter valid inputs for Work, KE, or PE.");
  return res;
}

// 45 & 46. Velocity & Acceleration
export function calculateVelocityAccel(d, t, u, v) {
  if (d !== undefined && t !== undefined && d !== "" && t !== "") {
    const numD = Number(d), numT = Number(t);
    if (!Number.isFinite(numD) || !Number.isFinite(numT)) throw new Error("Invalid inputs.");
    if (numT === 0) throw new Error("Time cannot be zero.");
    return { velocity: (numD / numT).toFixed(4).replace(/\.?0+$/, "") };
  }
  if (u !== undefined && v !== undefined && t !== undefined && u !== "" && v !== "" && t !== "") {
    const numU = Number(u), numV = Number(v), numT = Number(t);
    if (!Number.isFinite(numU) || !Number.isFinite(numV) || !Number.isFinite(numT)) throw new Error("Invalid inputs.");
    if (numT === 0) throw new Error("Time cannot be zero.");
    return { accel: ((numV - numU) / numT).toFixed(4).replace(/\.?0+$/, "") };
  }
  throw new Error("Provide distance & time for velocity, or initial/final velocity & time for acceleration.");
}

// 47. Density Calculator
export function calculateDensity(m, v, p) {
  const numM = m !== "" && m !== undefined ? Number(m) : null;
  const numV = v !== "" && v !== undefined ? Number(v) : null;
  const numP = p !== "" && p !== undefined ? Number(p) : null;

  if (numP === null && numM !== null && numV !== null) {
    if (numV <= 0) throw new Error("Volume must be greater than zero.");
    if (numM < 0) throw new Error("Mass cannot be negative.");
    return { density: (numM / numV).toFixed(4).replace(/\.?0+$/, "") };
  } else if (numM === null && numP !== null && numV !== null) {
    if (numV <= 0 || numP < 0) throw new Error("Volume and density must be positive.");
    return { mass: (numP * numV).toFixed(4).replace(/\.?0+$/, "") };
  } else if (numV === null && numM !== null && numP !== null) {
    if (numP <= 0 || numM < 0) throw new Error("Density must be positive.");
    return { volume: (numM / numP).toFixed(4).replace(/\.?0+$/, "") };
  }
  throw new Error("Enter 2 values to compute the 3rd (ρ = m/V).");
}

// 48. Pressure Calculator
export function calculatePressure(f, a, p) {
  const numF = f !== "" && f !== undefined ? Number(f) : null;
  const numA = a !== "" && a !== undefined ? Number(a) : null;
  const numP = p !== "" && p !== undefined ? Number(p) : null;

  if (numP === null && numF !== null && numA !== null) {
    if (numA <= 0) throw new Error("Area must be greater than zero.");
    return { pressure: (numF / numA).toFixed(4).replace(/\.?0+$/, "") };
  } else if (numF === null && numP !== null && numA !== null) {
    if (numA <= 0) throw new Error("Area must be positive.");
    return { force: (numP * numA).toFixed(4).replace(/\.?0+$/, "") };
  } else if (numA === null && numF !== null && numP !== null) {
    if (numP <= 0) throw new Error("Pressure must be greater than zero.");
    return { area: (numF / numP).toFixed(4).replace(/\.?0+$/, "") };
  }
  throw new Error("Enter 2 values to compute the 3rd (P = F/A).");
}

// 49. Temperature Converter
export function convertTemperature(val, fromUnit, toUnit) {
  const num = Number(val);
  if (!Number.isFinite(num)) throw new Error("Enter a valid numerical temperature.");

  let c;
  if (fromUnit === "C") c = num;
  else if (fromUnit === "F") c = ((num - 32) * 5) / 9;
  else if (fromUnit === "K") c = num - 273.15;
  else if (fromUnit === "R") c = ((num - 491.67) * 5) / 9;

  let result;
  if (toUnit === "C") result = c;
  else if (toUnit === "F") result = (c * 9) / 5 + 32;
  else if (toUnit === "K") result = c + 273.15;
  else if (toUnit === "R") result = ((c + 273.15) * 9) / 5;

  if (toUnit === "K" && result < 0) throw new Error("Temperature below absolute zero (0 K).");
  return result.toFixed(4).replace(/\.?0+$/, "");
}

// 50 & 51. Number System Converter
export function convertNumberSystem(value, fromBase, toBase) {
  if (!value || typeof value !== "string") throw new Error("Enter a valid value.");
  const srcBase = Number(fromBase);
  const tgtBase = Number(toBase);

  if (srcBase < 2 || srcBase > 36 || tgtBase < 2 || tgtBase > 36) {
    throw new Error("Bases must be between 2 and 36.");
  }

  const parsed = parseInt(value.trim(), srcBase);
  if (Number.isNaN(parsed)) throw new Error(`Invalid base-${srcBase} string.`);

  return parsed.toString(tgtBase).toUpperCase();
}

// 52. Logarithm Calculator
export function calculateLogarithm(x, base = 10) {
  const numX = Number(x);
  const numB = Number(base);
  if (!Number.isFinite(numX) || numX <= 0) throw new Error("Argument x must be greater than zero.");
  if (!Number.isFinite(numB) || numB <= 0 || numB === 1) throw new Error("Base must be greater than 0 and not equal to 1.");

  const res = Math.log(numX) / Math.log(numB);
  return res.toFixed(6).replace(/\.?0+$/, "");
}

// 53. Quadratic Equation Solver (ax² + bx + c = 0)
export function solveQuadratic(a, b, c) {
  const numA = Number(a);
  const numB = Number(b);
  const numC = Number(c);

  if (!Number.isFinite(numA) || !Number.isFinite(numB) || !Number.isFinite(numC)) {
    throw new Error("Coefficients must be valid numbers.");
  }
  if (numA === 0) throw new Error("Coefficient 'a' cannot be 0 for a quadratic equation.");

  const disc = numB * numB - 4 * numA * numC;

  if (Math.abs(disc) < 1e-12) {
    const x = -numB / (2 * numA);
    return {
      type: "Real and equal roots (single root)",
      discriminant: 0,
      roots: [`x = ${x.toFixed(6).replace(/\.?0+$/, "")}`]
    };
  } else if (disc > 0) {
    const x1 = (-numB + Math.sqrt(disc)) / (2 * numA);
    const x2 = (-numB - Math.sqrt(disc)) / (2 * numA);
    return {
      type: "Two distinct real roots",
      discriminant: disc.toFixed(4).replace(/\.?0+$/, ""),
      roots: [
        `x₁ = ${x1.toFixed(6).replace(/\.?0+$/, "")}`,
        `x₂ = ${x2.toFixed(6).replace(/\.?0+$/, "")}`
      ]
    };
  } else {
    const realPart = (-numB / (2 * numA)).toFixed(4).replace(/\.?0+$/, "");
    const imagPart = (Math.sqrt(-disc) / (2 * numA)).toFixed(4).replace(/\.?0+$/, "");
    return {
      type: "Two complex conjugate roots",
      discriminant: disc.toFixed(4).replace(/\.?0+$/, ""),
      roots: [
        `x₁ = ${realPart} + ${imagPart}i`,
        `x₂ = ${realPart} - ${imagPart}i`
      ]
    };
  }
}

// 54. Simultaneous Equation Solver (2x2 and 3x3)
export function solveSimultaneous2x2(a1, b1, c1, a2, b2, c2) {
  // a1*x + b1*y = c1
  // a2*x + b2*y = c2
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < 1e-12) {
    const detX = c1 * b2 - c2 * b1;
    if (Math.abs(detX) < 1e-12) return { status: "Infinite solutions (dependent system)." };
    return { status: "No solution (inconsistent parallel lines)." };
  }
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return {
    status: "Unique solution",
    x: x.toFixed(6).replace(/\.?0+$/, ""),
    y: y.toFixed(6).replace(/\.?0+$/, "")
  };
}

// 55–57. Statistics Calculator
export function calculateStatistics(numbers) {
  const arr = numbers.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (arr.length === 0) throw new Error("Please enter at least one valid number.");

  const n = arr.length;
  const sum = arr.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Median
  let median;
  if (n % 2 === 1) {
    median = arr[Math.floor(n / 2)];
  } else {
    median = (arr[n / 2 - 1] + arr[n / 2]) / 2;
  }

  // Mode
  const counts = new Map();
  let maxFreq = 0;
  for (const num of arr) {
    const cnt = (counts.get(num) || 0) + 1;
    counts.set(num, cnt);
    if (cnt > maxFreq) maxFreq = cnt;
  }
  let modes = [];
  if (maxFreq > 1) {
    for (const [num, cnt] of counts) {
      if (cnt === maxFreq) modes.push(num);
    }
  }

  // Variance & Std Dev
  const variancePop = arr.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / n;
  const stdDevPop = Math.sqrt(variancePop);
  const varianceSample = n > 1 ? arr.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (n - 1) : 0;
  const stdDevSample = Math.sqrt(varianceSample);

  return {
    count: n,
    sum: sum.toFixed(4).replace(/\.?0+$/, ""),
    mean: mean.toFixed(4).replace(/\.?0+$/, ""),
    median: median.toFixed(4).replace(/\.?0+$/, ""),
    mode: modes.length ? modes.join(", ") : "No mode (all unique)",
    min: arr[0],
    max: arr[n - 1],
    range: (arr[n - 1] - arr[0]).toFixed(4).replace(/\.?0+$/, ""),
    variancePop: variancePop.toFixed(4).replace(/\.?0+$/, ""),
    stdDevPop: stdDevPop.toFixed(4).replace(/\.?0+$/, ""),
    varianceSample: varianceSample.toFixed(4).replace(/\.?0+$/, ""),
    stdDevSample: stdDevSample.toFixed(4).replace(/\.?0+$/, "")
  };
}

// 58. Probability Calculator
function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function calculatePermutationsCombinations(n, r) {
  const numN = Number(n);
  const numR = Number(r);
  if (!Number.isInteger(numN) || !Number.isInteger(numR) || numN < 0 || numR < 0) {
    throw new Error("n and r must be non-negative integers.");
  }
  if (numR > numN) throw new Error("r cannot be greater than n.");

  const nFact = factorial(numN);
  const rFact = factorial(numR);
  const nMinusRFact = factorial(numN - numR);

  const nPr = nFact / nMinusRFact;
  const nCr = nFact / (rFact * nMinusRFact);

  return { nPr, nCr };
}
