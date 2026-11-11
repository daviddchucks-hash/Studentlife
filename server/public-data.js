"use strict";

const PUBLIC_LOST_FOUND_STATUSES = new Set([
  "published",
  "match_found",
  "claim_pending",
  "resolved",
  "returned",
  "recovered"
]);

function isPublicLostFoundItem(item) {
  const status = String(item.status || "published").toLowerCase();
  return item.visibility !== "private" && PUBLIC_LOST_FOUND_STATUSES.has(status);
}

function publicLostFoundItem(item) {
  const {
    id,
    title,
    type,
    category,
    location,
    date,
    time,
    description,
    imageUrl,
    status,
    visibility,
    createdAt,
    updatedAt
  } = item;
  return { id, title, type, category, location, date, time, description, imageUrl, status, visibility, createdAt, updatedAt };
}

module.exports = { isPublicLostFoundItem, publicLostFoundItem };
