"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { updateStudentMatricNumber } = require("./matric");
const { matricLookupKey } = require("./messaging");

function readPath(root, path) {
  return path.split("/").filter(Boolean).reduce((value, part) => value?.[part], root);
}

function writePath(root, path, value) {
  const parts = path.split("/").filter(Boolean);
  let node = root;
  for (const part of parts.slice(0, -1)) {
    node[part] ||= {};
    node = node[part];
  }
  if (value === null) delete node[parts[parts.length - 1]];
  else node[parts[parts.length - 1]] = structuredClone(value);
}

class FakeDatabase {
  constructor(data = {}) { this.data = structuredClone(data); }

  ref(path) {
    return {
      get: async () => {
        const value = readPath(this.data, path);
        return { val: () => structuredClone(value ?? null) };
      },
      set: async (value) => writePath(this.data, path, value),
      transaction: async (update) => {
        const current = structuredClone(readPath(this.data, path) ?? null);
        const next = update(current);
        if (next === undefined) return { committed: false, snapshot: { val: () => current } };
        writePath(this.data, path, next);
        return { committed: true, snapshot: { val: () => structuredClone(next) } };
      }
    };
  }
}

test("new and updated matriculation numbers are verified and indexed automatically", async () => {
  const database = new FakeDatabase({
    users: {
      studentA: { profile: { name: "Student A", matricNumber: "OLD000001", matricVerified: true } },
      studentB: { profile: { name: "Student B" } }
    },
    matricLookup: { [matricLookupKey("OLD000001")]: "studentA" }
  });

  const updated = await updateStudentMatricNumber(database, "studentA", "NEW000002");
  assert.equal(updated.matricNumber, "NEW000002");
  assert.equal(updated.matricVerified, true);
  assert.equal(database.data.matricLookup[matricLookupKey("NEW000002")], "studentA");
  assert.equal(database.data.matricLookup[matricLookupKey("OLD000001")], undefined);

  const created = await updateStudentMatricNumber(database, "studentB", "NEW000003");
  assert.equal(created.matricNumber, "NEW000003");
  assert.equal(created.matricVerified, true);
  assert.equal(database.data.matricLookup[matricLookupKey("NEW000003")], "studentB");
});

test("existing unverified numbers become verified when saved again", async () => {
  const database = new FakeDatabase({
    users: { studentA: { profile: { matricNumber: "OLD000001", matricVerified: false } } }
  });

  const profile = await updateStudentMatricNumber(database, "studentA", "OLD000001");
  assert.equal(profile.matricVerified, true);
  assert.equal(database.data.matricLookup[matricLookupKey("OLD000001")], "studentA");
});

test("duplicate or invalid matriculation numbers are not reserved", async () => {
  const database = new FakeDatabase({
    users: { studentA: { profile: { matricNumber: "USED00001", matricVerified: true } }, studentB: { profile: {} } },
    matricLookup: { [matricLookupKey("USED00001")]: "studentA" }
  });

  await assert.rejects(updateStudentMatricNumber(database, "studentB", "USED00001"), /already registered/);
  await assert.rejects(updateStudentMatricNumber(database, "studentB", "bad"), /exactly 9 characters/);
  assert.equal(database.data.users.studentB.profile.matricNumber, undefined);
  assert.equal(database.data.matricLookup[matricLookupKey("USED00001")], "studentA");
});
