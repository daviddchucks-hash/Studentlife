"use strict";

/**
 * Normalizes a field value for accurate change comparison.
 * Trims strings, converts numbers/booleans, normalizes line endings.
 */
export function normalizeValue(val) {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return String(val);
  return String(val).replace(/\r\n/g, "\n").trim();
}

/**
 * Extracts a normalized form data key-value object from a form element or container.
 */
export function getFormSnapshot(container) {
  const snapshot = {};
  if (!container) return snapshot;

  const elements = container.querySelectorAll("input[name], select[name], textarea[name]");
  elements.forEach((el) => {
    const name = el.getAttribute("name");
    if (!name) return;

    if (el.type === "checkbox") {
      snapshot[name] = el.checked;
    } else if (el.type === "radio") {
      if (el.checked) snapshot[name] = normalizeValue(el.value);
    } else {
      snapshot[name] = normalizeValue(el.value);
    }
  });

  return snapshot;
}

/**
 * Compares two snapshots and returns true if all relevant values are identical.
 */
export function isSnapshotEqual(snapshotA = {}, snapshotB = {}) {
  const keysA = Object.keys(snapshotA);
  const keysB = Object.keys(snapshotB);
  const allKeys = new Set([...keysA, ...keysB]);

  for (const key of allKeys) {
    const valA = normalizeValue(snapshotA[key]);
    const valB = normalizeValue(snapshotB[key]);
    if (valA !== valB) return false;
  }
  return true;
}

/**
 * Attaches smart save change tracking to a form or container.
 * Manages Save button disabled attribute based on whether current values differ from baseline.
 */
export function createSmartSaveTracker(container, saveButton, options = {}) {
  let baseline = options.initialSnapshot ? { ...options.initialSnapshot } : getFormSnapshot(container);

  // Ensure normalized baseline values
  Object.keys(baseline).forEach((k) => {
    baseline[k] = typeof baseline[k] === "boolean" ? baseline[k] : normalizeValue(baseline[k]);
  });

  const checkChanges = () => {
    const current = getFormSnapshot(container);
    const hasChanged = !isSnapshotEqual(baseline, current);

    if (saveButton) {
      saveButton.disabled = !hasChanged;
    }

    if (typeof options.onChange === "function") {
      options.onChange({ hasChanged, current, baseline });
    }

    return hasChanged;
  };

  const handleInput = () => {
    checkChanges();
  };

  container.addEventListener("input", handleInput);
  container.addEventListener("change", handleInput);

  // Initial state check
  checkChanges();

  return {
    checkChanges,
    updateBaseline: (newSnapshot) => {
      const source = newSnapshot || getFormSnapshot(container);
      baseline = { ...source };
      Object.keys(baseline).forEach((k) => {
        baseline[k] = typeof baseline[k] === "boolean" ? baseline[k] : normalizeValue(baseline[k]);
      });
      checkChanges();
    },
    getBaseline: () => ({ ...baseline }),
    getCurrent: () => getFormSnapshot(container),
    hasChanged: () => !isSnapshotEqual(baseline, getFormSnapshot(container)),
    resetToBaseline: () => {
      const elements = container.querySelectorAll("input[name], select[name], textarea[name]");
      elements.forEach((el) => {
        const name = el.getAttribute("name");
        if (!name || !(name in baseline)) return;

        if (el.type === "checkbox") {
          el.checked = Boolean(baseline[name]);
        } else if (el.type === "radio") {
          el.checked = (normalizeValue(el.value) === normalizeValue(baseline[name]));
        } else {
          el.value = baseline[name] !== undefined ? baseline[name] : "";
        }
      });
      checkChanges();
    },
    destroy: () => {
      container.removeEventListener("input", handleInput);
      container.removeEventListener("change", handleInput);
    }
  };
}
