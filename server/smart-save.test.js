"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// Dynamic import of ES module js/smart-save.js
async function getSmartSaveModule() {
  return await import("../js/smart-save.js");
}

test("normalizeValue handles null, numbers, strings, and line endings", async () => {
  const { normalizeValue } = await getSmartSaveModule();

  assert.equal(normalizeValue(null), "");
  assert.equal(normalizeValue(undefined), "");
  assert.equal(normalizeValue("  hello world  "), "hello world");
  assert.equal(normalizeValue(42), "42");
  assert.equal(normalizeValue(true), true);
  assert.equal(normalizeValue(false), false);
  assert.equal(normalizeValue("line1\r\nline2"), "line1\nline2");
});

test("isSnapshotEqual compares form snapshots accurately", async () => {
  const { isSnapshotEqual } = await getSmartSaveModule();

  const original = { name: "David", level: "300", bio: "Student at AFIT" };
  const identical = { name: " David ", level: "300", bio: "Student at AFIT\r\n" };
  const changed = { name: "David Chucks", level: "300", bio: "Student at AFIT" };

  assert.equal(isSnapshotEqual(original, identical), true);
  assert.equal(isSnapshotEqual(original, changed), false);
});

test("isSnapshotEqual returns true when restored to original value", async () => {
  const { isSnapshotEqual } = await getSmartSaveModule();

  const baseline = { name: "David", email: "david@afit.edu.ng" };
  const modified = { name: "David Chucks", email: "david@afit.edu.ng" };
  const restored = { name: "David", email: "david@afit.edu.ng" };

  assert.equal(isSnapshotEqual(baseline, modified), false);
  assert.equal(isSnapshotEqual(baseline, restored), true);
});
