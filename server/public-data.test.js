"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isPublicLostFoundItem, publicLostFoundItem } = require("./public-data");

test("public lost-and-found data omits reporter contact and private claim details", () => {
  const item = publicLostFoundItem({
    id: "item-1",
    title: "Wallet",
    location: "Library",
    status: "published",
    visibility: "public",
    contactInfo: "private@example.edu",
    reporterEmail: "reporter@example.edu",
    reporterUid: "uid-1",
    identifyingCharacteristics: "Hidden engraving",
    bankInfo: "must not appear"
  });

  assert.deepEqual(item, {
    id: "item-1",
    title: "Wallet",
    type: undefined,
    category: undefined,
    location: "Library",
    date: undefined,
    time: undefined,
    description: undefined,
    imageUrl: undefined,
    status: "published",
    visibility: "public",
    createdAt: undefined,
    updatedAt: undefined
  });
  assert.equal(Object.hasOwn(item, "contactInfo"), false);
  assert.equal(Object.hasOwn(item, "reporterEmail"), false);
  assert.equal(Object.hasOwn(item, "identifyingCharacteristics"), false);
});

test("lost-and-found unpublished and private records are excluded from public matches", () => {
  assert.equal(isPublicLostFoundItem({ status: "published" }), true);
  assert.equal(isPublicLostFoundItem({ status: "pending_review" }), false);
  assert.equal(isPublicLostFoundItem({ status: "rejected" }), false);
  assert.equal(isPublicLostFoundItem({ status: "closed" }), false);
  assert.equal(isPublicLostFoundItem({ status: "published", visibility: "private" }), false);
});
