"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { courseKey, refreshCourseIndex } = require("./coursemate");

function createMemoryDatabase(seed) {
  const root = structuredClone(seed);
  const parts = (path) => path ? path.split("/") : [];
  const getAt = (path) => parts(path).reduce((value, key) => value?.[key], root);
  const setAt = (path, value) => {
    const keys = parts(path);
    if (!keys.length) throw new Error("Cannot replace root in this test helper.");
    let node = root;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    if (value === null) delete node[keys[keys.length - 1]];
    else node[keys[keys.length - 1]] = structuredClone(value);
  };
  return {
    root,
    ref(path = "") {
      return {
        async get() {
          const value = getAt(path);
          return { val: () => value === undefined ? null : structuredClone(value) };
        },
        async update(values) {
          for (const [key, value] of Object.entries(values)) setAt(key, value);
        },
        async set(value) {
          setAt(path, value);
        },
        async transaction(update) {
          const next = update(getAt(path));
          if (next === undefined) return { committed: false, snapshot: { val: () => getAt(path) } };
          setAt(path, next);
          return { committed: true, snapshot: { val: () => getAt(path) } };
        }
      };
    }
  };
}

test("CourseMate builds and refreshes indexes only from a student's existing courses", async () => {
  const database = createMemoryDatabase({
    users: {
      alice: {
        profile: { name: "Alice", department: "Math", level: "100", email: "private@example.edu" },
        courses: {
          personal: { one: { code: "MTH 101", name: "Calculus" } },
          registration: { two: { code: "PHY 101", name: "Physics" } }
        }
      }
    },
    coursemate: {
      userCourseIndex: { alice: { [courseKey("CSC 101")]: "CSC 101" } },
      courseParticipants: { [courseKey("CSC 101")]: { alice: { courseCode: "CSC 101" } } }
    }
  });

  await refreshCourseIndex(database, "alice");

  const index = database.root.coursemate.userCourseIndex.alice;
  assert.deepEqual(Object.values(index).sort(), ["MTH 101", "PHY 101"]);
  assert.equal(database.root.coursemate.courseParticipants[courseKey("MTH 101")].alice.displayName, "Alice");
  assert.equal(database.root.coursemate.courseParticipants[courseKey("MTH 101")].alice.email, undefined);
  assert.deepEqual(database.root.coursemate.courseParticipants[courseKey("CSC 101")], {});
});
