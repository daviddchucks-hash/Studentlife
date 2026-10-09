"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("General calculators evaluate accurately", async () => {
  const { evaluateScientific, calculatePercentage, calculateFraction, convertUnit, solveLinearEquation, calculateMatrix } = await import("../js/calculators.js");

  assert.equal(evaluateScientific("10 + 5 * 2"), 20);
  assert.equal(evaluateScientific("sqrt(16) + 3"), 7);
  assert.equal(solveLinearEquation(2, 4, 10), "x = 3");

  const frac = calculateFraction(1, 2, "+", 1, 4);
  assert.equal(frac.fractionStr, "3/4");
  assert.equal(frac.decimal, "0.75");

  assert.equal(convertUnit("length", 1, "km", "m"), 1000);

  const m2x2 = [[1, 2], [3, 4]];
  assert.equal(calculateMatrix("det", m2x2), -2);
});

test("STEM calculators compute physics & math accurately", async () => {
  const { calculateOhmsLaw, calculateProjectileMotion, solveQuadratic, calculateStatistics } = await import("../js/stem-calculators.js");

  const ohm = calculateOhmsLaw({ i: 2, r: 5 });
  assert.equal(ohm.voltage, "10");
  assert.equal(ohm.power, "20");

  const quadReal = solveQuadratic(1, -5, 6);
  assert.equal(quadReal.type, "Two distinct real roots");
  assert.deepEqual(quadReal.roots, ["x₁ = 3", "x₂ = 2"]);

  const quadComplex = solveQuadratic(1, 0, 4);
  assert.equal(quadComplex.type, "Two complex conjugate roots");

  const stats = calculateStatistics([10, 20, 30, 40, 50]);
  assert.equal(stats.mean, "30");
  assert.equal(stats.median, "30");
});

test("Writing tools and study tools compute correctly", async () => {
  const { countWordsAndChars, convertTextCase } = await import("../js/writing-tools.js");
  const { calculateStudyStreak } = await import("../js/study-tools.js");

  const counts = countWordsAndChars("Hello world! This is a test.");
  assert.equal(counts.words, 6);
  assert.equal(convertTextCase("hello world", "uppercase"), "HELLO WORLD");

  const today = new Date().toISOString().slice(0, 10);
  const streak = calculateStudyStreak([{ date: today, minutes: 45 }]);
  assert.equal(streak.currentStreak, 1);
  assert.equal(streak.totalMinutes, 45);
});
