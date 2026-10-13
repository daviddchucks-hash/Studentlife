"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validRecordId, validateRecord, snapshotToList, validateFormula } = require("./validation");

test("course records retain only allowed, validated fields", () => {
  assert.deepEqual(validateRecord("courses", { code: " MTH 101 ", name: "Mathematics", units: 3 }), {
    code: "MTH 101", name: "Mathematics", units: 3
  });
});

test("course records reject uid injection and invalid units", () => {
  assert.throws(() => validateRecord("courses", { code: "MTH 101", name: "Math", units: 3, uid: "other-user" }), /Unsupported field: uid/);
  assert.throws(() => validateRecord("courses", { code: "MTH 101", name: "Math", units: 61 }), /units must be/);
});

test("timetable requires valid weekday and 24-hour time", () => {
  assert.deepEqual(validateRecord("timetable", { course: "PHY 101", day: "Monday", start: "08:00", end: "09:30", venue: "Lab A" }), {
    course: "PHY 101", day: "Monday", start: "08:00", end: "09:30", venue: "Lab A"
  });
  assert.throws(() => validateRecord("timetable", { course: "PHY 101", day: "Funday", start: "25:00", end: "09:30" }), /day must be/);
  assert.throws(() => validateRecord("timetable", { course: "PHY 101", day: "Monday", start: "10:00", end: "10:00" }), /end time must be later/);
});

test("assignment status and date are validated", () => {
  assert.throws(() => validateRecord("assignments", { title: "Report", dueDate: "2026-02-30", status: "To do" }), /valid YYYY-MM-DD/);
  assert.throws(() => validateRecord("assignments", { title: "Report", dueDate: "2026-02-28", status: "Done" }), /valid assignment status/);
});

test("study plans validate nested entries and length", () => {
  const result = validateRecord("study-plans", {
    title: "Math plan",
    entries: [{ day: "Tuesday", time: "16:00", minutes: 45, subject: "Math" }]
  });
  assert.equal(result.entries.length, 1);
  assert.throws(() => validateRecord("study-plans", { title: "Bad plan", entries: [{ day: "Sunday", time: "16:00", minutes: 0, subject: "Math" }] }), /duration/);
});

test("record IDs and Firebase snapshots are safely normalized", () => {
  assert.equal(validRecordId("-OAbc_123"), true);
  assert.equal(validRecordId("../other-user"), false);
  assert.deepEqual(snapshotToList({ key1: { title: "First" } }), [{ title: "First", id: "key1" }]);
});

test("flashcards, notes, quizzes, and revision plans validate correctly", () => {
  assert.deepEqual(validateRecord("flashcards", { front: "Q?", back: "A", deck: "Math" }), {
    front: "Q?", back: "A", deck: "Math"
  });
  assert.deepEqual(validateRecord("notes", { title: "Note 1", content: "Some content" }), {
    title: "Note 1", content: "Some content"
  });
  const quiz = validateRecord("quizzes", {
    title: "Math Quiz",
    questions: [{ question: "1+1?", options: ["2", "3"], correctIndex: 0, explanation: "Basic math" }]
  });
  assert.equal(quiz.questions.length, 1);
  assert.deepEqual(validateRecord("revision-plans", { topic: "Algebra", priority: "High", targetDate: "2026-05-10", status: "Not started" }), {
    topic: "Algebra", priority: "High", targetDate: "2026-05-10", status: "Not started"
  });
});

test("formula validation enforces required fields and cleans strings", () => {
  const formulaData = {
    name: "Quadratic Formula",
    subject: "Mathematics",
    level: "O-Level",
    topic: "Algebra",
    formula: "x = (-b ± √(b² - 4ac)) / (2a)",
    description: "Solves ax² + bx + c = 0",
    verified: true
  };
  const validated = validateFormula(formulaData);
  assert.equal(validated.name, "Quadratic Formula");
  assert.equal(validated.verified, true);
  assert.throws(() => validateFormula({ ...formulaData, name: "" }), /name is required/);
});
