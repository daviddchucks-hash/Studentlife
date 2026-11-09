"use strict";

const {
  validRecordId,
  snapshotToList,
  validateCourseMateGroup,
  validateCourseMateMessage,
  validateCourseMateQuestion,
  validateCourseMateAnswer,
  validateCourseMatePartnerProfile,
  validateCourseMateRevision,
  validateCourseMateReport
} = require("./validation");

const MAX_PAGE_SIZE = 50;
const ROLE_OWNER = "owner";
const ROLE_MODERATOR = "moderator";
const ROLE_MEMBER = "member";
const RATE_LIMITS = new Map();

function courseKey(code) {
  return Buffer.from(String(code || "").trim().toUpperCase()).toString("base64url");
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function validUid(uid) {
  return typeof uid === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(uid);
}

function safePageSize(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE) : 25;
}

function fail(res, status, error) {
  return res.status(status).json({ error });
}

async function getProfile(database, uid) {
  const snap = await database.ref(`users/${uid}/profile`).get();
  return snap.val() || {};
}

async function getOwnCourses(database, uid) {
  const [personalSnap, registrationSnap] = await Promise.all([
    database.ref(`users/${uid}/courses/personal`).get(),
    database.ref(`users/${uid}/courses/registration`).get()
  ]);
  const courses = new Map();
  for (const item of [...snapshotToList(personalSnap.val()), ...snapshotToList(registrationSnap.val())]) {
    const code = normalizeCode(item.code);
    if (code) courses.set(code, { code, title: String(item.name || item.title || code).trim() });
  }
  return courses;
}

async function refreshCourseIndex(database, uid) {
  const [oldIndexSnap, courses, profile] = await Promise.all([
    database.ref(`coursemate/userCourseIndex/${uid}`).get(),
    getOwnCourses(database, uid),
    getProfile(database, uid)
  ]);
  const oldIndex = oldIndexSnap.val() || {};
  const nextIndex = {};
  const updates = {};
  const profileSummary = {
    displayName: String(profile.name || "Student").slice(0, 100),
    department: String(profile.department || "").slice(0, 100),
    level: String(profile.level || "").slice(0, 30)
  };

  for (const [code, course] of courses) {
    const key = courseKey(code);
    nextIndex[key] = code;
    updates[`coursemate/courseParticipants/${key}/${uid}`] = {
      courseCode: code,
      courseTitle: course.title,
      ...profileSummary,
      updatedAt: Date.now()
    };
  }
  for (const key of Object.keys(oldIndex)) {
    if (!nextIndex[key]) updates[`coursemate/courseParticipants/${key}/${uid}`] = null;
  }
  updates[`coursemate/userCourseIndex/${uid}`] = nextIndex;
  await database.ref().update(updates);
}

async function checkRateLimit(uid, action, limit = 20, windowMs = 10 * 60_000) {
  const key = `${uid}:${action}`;
  const now = Date.now();
  const current = RATE_LIMITS.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    RATE_LIMITS.set(key, { startedAt: now, count: 1 });
    if (RATE_LIMITS.size > 10_000) {
      for (const [entry, value] of RATE_LIMITS) {
        if (now - value.startedAt >= windowMs) RATE_LIMITS.delete(entry);
      }
    }
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

async function sendNotification(database, uid, title, message, destination) {
  const notification = {
    title: String(title).slice(0, 160),
    message: String(message).slice(0, 500),
    destination: String(destination || "coursemate").slice(0, 120),
    read: false,
    createdAt: Date.now()
  };
  const ref = await database.ref(`notifications/${uid}`).push(notification);
  return { ...notification, id: ref.key };
}

async function getMembership(database, groupId, uid) {
  const snap = await database.ref(`coursemate/memberships/${groupId}/${uid}`).get();
  return snap.val() || null;
}

async function requireGroup(database, groupId) {
  if (!validRecordId(groupId)) return { error: "Invalid study group ID.", status: 400 };
  const snap = await database.ref(`coursemate/groups/${groupId}`).get();
  if (!snap.exists() || snap.val().status === "removed" || snap.val().status === "suspended") {
    return { error: "Study group not found.", status: 404 };
  }
  return { group: snap.val() };
}

function hasGroupManagementRole(membership) {
  return membership && [ROLE_OWNER, ROLE_MODERATOR].includes(membership.role);
}

async function requireGroupAccess(database, res, groupId, uid, requireMember = true) {
  const result = await requireGroup(database, groupId);
  if (result.error) {
    fail(res, result.status, result.error);
    return null;
  }
  const membership = await getMembership(database, groupId, uid);
  if (requireMember && !membership) {
    fail(res, 403, "Study group membership is required.");
    return null;
  }
  if (!membership && !(await requireRegisteredCourse(database, uid, result.group.courseCode))) {
    fail(res, 403, "This group is limited to students registered in its course.");
    return null;
  }
  if (!requireMember && result.group.visibility !== "public" && !membership) {
    fail(res, 404, "Study group not found.");
    return null;
  }
  return { group: result.group, membership };
}

async function addMembership(database, groupId, uid, role, group) {
  const membersRef = database.ref(`coursemate/memberships/${groupId}`);
  const result = await membersRef.transaction((members) => {
    const current = members || {};
    if (current[uid]) return;
    const capacity = Number(group.maxMembers) || 0;
    if (capacity && Object.keys(current).length >= capacity) return;
    current[uid] = { role, joinedAt: Date.now() };
    return current;
  });
  return Boolean(result.committed);
}

async function requireRegisteredCourse(database, uid, code) {
  const courses = await getOwnCourses(database, uid);
  return courses.get(normalizeCode(code)) || null;
}

async function getPublicProfile(database, uid) {
  const [profile, courseMateSnap, partnerSnap] = await Promise.all([
    getProfile(database, uid),
    database.ref(`coursemate/profiles/${uid}`).get(),
    database.ref(`coursemate/partnerProfiles/${uid}`).get()
  ]);
  const courseMate = courseMateSnap.val() || {};
  if (courseMate.discoverable !== true) return null;
  const partner = partnerSnap.val() || {};
  return {
    displayName: String(profile.name || "Student").slice(0, 100),
    profilePicture: /^https:\/\//i.test(String(profile.profilePicture || "")) ? String(profile.profilePicture).slice(0, 2000) : "",
    department: String(profile.department || "").slice(0, 100),
    level: String(profile.level || "").slice(0, 30),
    interests: String(profile.interests || "").slice(0, 300),
    bio: String(profile.bio || "").slice(0, 500),
    studyProfile: partner.discoverable === true ? {
      coursesSeeking: partner.coursesSeeking || [],
      coursesOffering: partner.coursesOffering || [],
      method: partner.method || "",
      interests: partner.interests || "",
      availability: partner.availability || "",
      introduction: partner.introduction || ""
    } : null
  };
}

async function getQuestion(database, questionId) {
  if (!validRecordId(questionId)) return null;
  const snap = await database.ref(`coursemate/questions/${questionId}`).get();
  return snap.exists() && snap.val().moderationStatus !== "removed" ? snap.val() : null;
}

async function getRevision(database, groupId, revisionId) {
  if (!validRecordId(revisionId)) return null;
  const snap = await database.ref(`coursemate/revisionSessions/${groupId}/${revisionId}`).get();
  return snap.exists() ? snap.val() : null;
}

function registerCourseMateRoutes(app, { database, requireAuth, requireAdmin }) {
  app.get("/api/coursemate/profile", requireAuth, async (req, res, next) => {
    try {
      const snap = await database.ref(`coursemate/profiles/${req.user.uid}`).get();
      res.json({ profile: snap.val() || { discoverable: false } });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/profile", requireAuth, async (req, res, next) => {
    try {
      const courses = await getOwnCourses(database, req.user.uid);
      const profile = req.body || {};
      if (typeof profile.discoverable !== "boolean") return fail(res, 400, "Choose whether your CourseMate profile is discoverable.");
      const saved = {
        discoverable: profile.discoverable,
        updatedAt: Date.now()
      };
      await database.ref(`coursemate/profiles/${req.user.uid}`).set(saved);
      await refreshCourseIndex(database, req.user.uid);
      res.json({ profile: saved, registeredCourses: [...courses.values()] });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/courses", requireAuth, async (req, res, next) => {
    try {
      const courses = await getOwnCourses(database, req.user.uid);
      res.json({ items: [...courses.values()] });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/students", requireAuth, async (req, res, next) => {
    try {
      await refreshCourseIndex(database, req.user.uid);
      const courseCode = normalizeCode(req.query.courseCode);
      if (!courseCode) return fail(res, 400, "Select a course to find classmates.");
      const ownCourse = await requireRegisteredCourse(database, req.user.uid, courseCode);
      if (!ownCourse) return fail(res, 403, "Classmate discovery is limited to your registered courses.");
      const participantSnap = await database.ref(`coursemate/courseParticipants/${courseKey(courseCode)}`).get();
      const participants = participantSnap.val() || {};
      const studentIds = Object.keys(participants).filter((uid) => uid !== req.user.uid).slice(0, 100);
      const items = [];
      for (const uid of studentIds) {
        const publicProfile = await getPublicProfile(database, uid);
        if (!publicProfile) continue;
        const profile = participants[uid];
        const profileSnap = await database.ref(`coursemate/userCourseIndex/${uid}`).get();
        const enrolledCodes = new Set(Object.values(profileSnap.val() || {}));
        const sharedCourses = [ownCourse].filter((course) => enrolledCodes.has(course.code));
        items.push({
          studentId: uid,
          ...publicProfile,
          department: publicProfile.department || String(profile.department || ""),
          level: publicProfile.level || String(profile.level || ""),
          sharedCourses
        });
      }
      const department = String(req.query.department || "").trim().toLowerCase();
      const level = String(req.query.level || "").trim().toLowerCase();
      const filtered = items.filter((student) =>
        (!department || student.department.toLowerCase() === department) &&
        (!level || student.level.toLowerCase() === level)
      );
      res.json({ course: ownCourse, items: filtered });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/students/:uid", requireAuth, async (req, res, next) => {
    try {
      const uid = req.params.uid;
      const code = normalizeCode(req.query.courseCode);
      if (!validUid(uid) || uid === req.user.uid) return fail(res, 400, "Student ID is invalid.");
      const ownCourse = await requireRegisteredCourse(database, req.user.uid, code);
      if (!ownCourse) return fail(res, 403, "Student profiles are visible only through a course you are registered in.");
      const participantSnap = await database.ref(`coursemate/courseParticipants/${courseKey(code)}/${uid}`).get();
      if (!participantSnap.exists()) return fail(res, 404, "Student is not listed for this course.");
      const publicProfile = await getPublicProfile(database, uid);
      if (!publicProfile) return fail(res, 404, "Student profile is not discoverable.");
      res.json({ profile: publicProfile, sharedCourses: [ownCourse] });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/groups", requireAuth, async (req, res, next) => {
    try {
      await refreshCourseIndex(database, req.user.uid);
      const courses = await getOwnCourses(database, req.user.uid);
      const requestedCode = normalizeCode(req.query.courseCode);
      if (requestedCode && !courses.has(requestedCode)) return fail(res, 403, "Groups can only be filtered by your registered courses.");
      const codes = requestedCode ? [requestedCode] : [...courses.keys()];
      const ids = new Set();
      for (const code of codes) {
        const snap = await database.ref(`coursemate/groupsByCourse/${courseKey(code)}`).get();
        Object.keys(snap.val() || {}).forEach((id) => ids.add(id));
      }
      const items = [];
      const departmentFilter = String(req.query.department || "").trim().toLowerCase();
      const levelFilter = String(req.query.level || "").trim().toLowerCase();
      for (const id of [...ids].slice(0, 100)) {
        const snap = await database.ref(`coursemate/groups/${id}`).get();
        if (!snap.exists()) continue;
        const group = snap.val();
        if (group.status === "removed" || group.status === "suspended") continue;
        const membership = await getMembership(database, id, req.user.uid);
        if (group.visibility !== "public" && !membership) continue;
        if (departmentFilter && String(group.department || "").toLowerCase() !== departmentFilter) continue;
        if (levelFilter && String(group.level || "").toLowerCase() !== levelFilter) continue;
        items.push({ id, ...group, role: membership?.role || null });
      }
      items.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
      res.json({ items: items.slice(0, 50) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/groups", requireAuth, async (req, res, next) => {
    try {
      const payload = validateCourseMateGroup(req.body);
      const course = await requireRegisteredCourse(database, req.user.uid, payload.courseCode);
      if (!course) return fail(res, 403, "Groups can only be created for courses in your registered course list.");
      const profile = await getProfile(database, req.user.uid);
      const now = Date.now();
      const record = {
        ...payload,
        courseTitle: course.title,
        department: String(profile.department || ""),
        level: String(profile.level || ""),
        semester: "",
        academicSession: "",
        ownerUid: req.user.uid,
        ownerName: String(profile.name || "Student").slice(0, 100),
        status: "active",
        createdAt: now,
        updatedAt: now
      };
      const ref = await database.ref("coursemate/groups").push(record);
      await Promise.all([
        database.ref(`coursemate/groupsByCourse/${courseKey(course.code)}/${ref.key}`).set(true),
        database.ref(`coursemate/memberships/${ref.key}/${req.user.uid}`).set({ role: ROLE_OWNER, joinedAt: now })
      ]);
      res.status(201).json({ id: ref.key, group: record });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/groups/:groupId", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid, false);
      if (!access) return;
      const membersSnap = access.membership
        ? await database.ref(`coursemate/memberships/${req.params.groupId}`).get()
        : null;
      const membershipRequestsSnap = access.membership && hasGroupManagementRole(access.membership)
        ? await database.ref(`coursemate/joinRequests/${req.params.groupId}`).get()
        : null;
      const members = [];
      for (const member of membersSnap ? snapshotToList(membersSnap.val()) : []) {
        const profile = await getPublicProfile(database, member.id);
        members.push({
          uid: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          displayName: profile?.displayName || "Student"
        });
      }
      res.json({
        group: { id: req.params.groupId, ...access.group },
        role: access.membership?.role || null,
        members,
        joinRequestStatus: !access.membership && !membershipRequestsSnap
          ? ((await database.ref(`coursemate/joinRequests/${req.params.groupId}/${req.user.uid}`).get()).val() || {}).status || null
          : null
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      const payload = validateCourseMateGroup(req.body);
      if (normalizeCode(access.group.courseCode) !== payload.courseCode) return fail(res, 400, "A group's registered course cannot be changed.");
      const ownerProfile = await getProfile(database, access.group.ownerUid);
      const updated = { ...access.group, ...payload, updatedAt: Date.now() };
      if (access.membership.role === ROLE_OWNER) {
        updated.department = String(ownerProfile.department || "");
        updated.level = String(ownerProfile.level || "");
      }
      await database.ref(`coursemate/groups/${req.params.groupId}`).set(updated);
      res.json({ group: { id: req.params.groupId, ...updated } });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/groups/:groupId/membership", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (access.membership.role === ROLE_OWNER) return fail(res, 409, "Transfer group ownership before leaving the group.");
      await database.ref(`coursemate/memberships/${req.params.groupId}/${req.user.uid}`).remove();
      await database.ref(`coursemate/revisionSessions/${req.params.groupId}`).get().then(async (snap) => {
        const updates = {};
        for (const event of snapshotToList(snap.val())) {
          updates[`coursemate/revisionSessions/${req.params.groupId}/${event.id}/attendees/${req.user.uid}`] = null;
        }
        if (Object.keys(updates).length) await database.ref().update(updates);
      });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/groups/:groupId/join", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid, false);
      if (!access) return;
      if (await getMembership(database, req.params.groupId, req.user.uid)) return fail(res, 409, "You are already a group member.");
      if (access.group.visibility === "public") {
        const added = await addMembership(database, req.params.groupId, req.user.uid, ROLE_MEMBER, access.group);
        if (!added) return fail(res, 409, "Membership already exists or this group is full.");
        const joiningProfile = await getProfile(database, req.user.uid);
        await sendNotification(database, access.group.ownerUid, "New study-group member", `${String(joiningProfile.name || "A student").slice(0, 100)} joined ${access.group.groupName}.`, `coursemate.html?group=${req.params.groupId}`);
        return res.status(201).json({ joined: true });
      }
      const requestRef = database.ref(`coursemate/joinRequests/${req.params.groupId}/${req.user.uid}`);
      const profile = await getProfile(database, req.user.uid);
      const requestResult = await requestRef.transaction((current) => {
        if (current?.status === "pending") return;
        return { status: "pending", requestedAt: Date.now(), requesterName: String(profile.name || "Student").slice(0, 100) };
      });
      if (!requestResult.committed) return fail(res, 409, "A join request is already pending.");
      await sendNotification(database, access.group.ownerUid, "Study-group join request", "A student requested to join your private study group.", `coursemate.html?group=${req.params.groupId}`);
      res.status(201).json({ requested: true });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/groups/:groupId/invitations/:uid", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      const recipientUid = req.params.uid;
      if (!validUid(recipientUid) || recipientUid === req.user.uid) return fail(res, 400, "Student ID is invalid.");
      if (!(await requireRegisteredCourse(database, recipientUid, access.group.courseCode))) return fail(res, 403, "Invitations are limited to students taking this course.");
      if (await getMembership(database, req.params.groupId, recipientUid)) return fail(res, 409, "Student is already a group member.");
      const inviteRef = database.ref(`coursemate/groupInvitations/${recipientUid}/${req.params.groupId}`);
      const invitation = await inviteRef.transaction((current) => {
        if (current?.status === "pending") return;
        return { status: "pending", invitedBy: req.user.uid, createdAt: Date.now() };
      });
      if (!invitation.committed) return fail(res, 409, "A pending invitation already exists.");
      await sendNotification(database, recipientUid, "Study-group invitation", `You were invited to ${access.group.groupName}.`, `coursemate.html?group=${req.params.groupId}`);
      res.status(201).json({ invited: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/invitations", requireAuth, async (req, res, next) => {
    try {
      const snap = await database.ref(`coursemate/groupInvitations/${req.user.uid}`).get();
      const items = [];
      for (const [groupId, invitation] of Object.entries(snap.val() || {})) {
        if (invitation?.status !== "pending") continue;
        const groupSnap = await database.ref(`coursemate/groups/${groupId}`).get();
        if (groupSnap.exists() && groupSnap.val().status === "active") {
          items.push({ groupId, groupName: groupSnap.val().groupName, courseCode: groupSnap.val().courseCode, createdAt: invitation.createdAt });
        }
      }
      res.json({ items: items.slice(0, 50) });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/invitations/:groupId/:decision", requireAuth, async (req, res, next) => {
    try {
      const { groupId, decision } = req.params;
      if (!["accept", "decline"].includes(decision)) return fail(res, 400, "Choose accept or decline.");
      const access = await requireGroupAccess(database, res, groupId, req.user.uid, false);
      if (!access) return;
      const ref = database.ref(`coursemate/groupInvitations/${req.user.uid}/${groupId}`);
      const inviteSnap = await ref.get();
      if (!inviteSnap.exists() || inviteSnap.val().status !== "pending") return fail(res, 404, "Pending invitation not found.");
      if (decision === "accept") {
        const added = await addMembership(database, groupId, req.user.uid, ROLE_MEMBER, access.group);
        if (!added) return fail(res, 409, "This group is full or you are already a member.");
      }
      await ref.update({ status: decision === "accept" ? "accepted" : "declined", respondedAt: Date.now() });
      await sendNotification(database, access.group.ownerUid, "Study-group invitation response", `A student ${decision}ed the invitation to ${access.group.groupName}.`, `coursemate.html?group=${groupId}`);
      res.json({ status: decision === "accept" ? "accepted" : "declined" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/groups/:groupId/requests", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      const snap = await database.ref(`coursemate/joinRequests/${req.params.groupId}`).get();
      const items = snapshotToList(snap.val()).filter((item) => item.status === "pending");
      const withProfiles = [];
      for (const item of items.slice(0, 50)) {
        const profile = await getPublicProfile(database, item.id);
        withProfiles.push({ uid: item.id, requestedAt: item.requestedAt, profile: profile || { displayName: item.requesterName || "Student" } });
      }
      res.json({ items: withProfiles });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/groups/:groupId/join-request", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid, false);
      if (!access) return;
      const requestRef = database.ref(`coursemate/joinRequests/${req.params.groupId}/${req.user.uid}`);
      const snap = await requestRef.get();
      if (!snap.exists() || snap.val().status !== "pending") return fail(res, 404, "Pending join request not found.");
      await requestRef.update({ status: "cancelled", cancelledAt: Date.now() });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId/requests/:uid", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      if (!validRecordId(req.params.uid)) return fail(res, 400, "Student ID is invalid.");
      const decision = req.body?.decision;
      if (!["approve", "reject"].includes(decision)) return fail(res, 400, "Choose approve or reject.");
      const requestRef = database.ref(`coursemate/joinRequests/${req.params.groupId}/${req.params.uid}`);
      const requestSnap = await requestRef.get();
      if (!requestSnap.exists() || requestSnap.val().status !== "pending") return fail(res, 404, "Pending join request not found.");
      if (decision === "approve") {
        const added = await addMembership(database, req.params.groupId, req.params.uid, ROLE_MEMBER, access.group);
        if (!added) return fail(res, 409, "The group is full or the student is already a member.");
      }
      await requestRef.update({ status: decision === "approve" ? "approved" : "rejected", reviewedAt: Date.now(), reviewedBy: req.user.uid });
      await sendNotification(database, req.params.uid, `Study-group request ${decision}d`, `${access.group.groupName}: your request was ${decision}d.`, `coursemate.html?group=${req.params.groupId}`);
      res.json({ decision });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId/members/:uid/role", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (access.membership.role !== ROLE_OWNER) return fail(res, 403, "Only the group owner can assign moderator roles.");
      if (!validRecordId(req.params.uid) || ![ROLE_MODERATOR, ROLE_MEMBER].includes(req.body?.role)) return fail(res, 400, "Choose a valid member role.");
      const memberRef = database.ref(`coursemate/memberships/${req.params.groupId}/${req.params.uid}`);
      const snap = await memberRef.get();
      if (!snap.exists() || snap.val().role === ROLE_OWNER) return fail(res, 404, "Group member not found.");
      await memberRef.update({ role: req.body.role });
      res.json({ uid: req.params.uid, role: req.body.role });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId/owner", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (access.membership.role !== ROLE_OWNER) return fail(res, 403, "Only the current group owner can transfer ownership.");
      const nextOwnerUid = req.body?.uid;
      if (!validUid(nextOwnerUid) || nextOwnerUid === req.user.uid) return fail(res, 400, "Choose another group member.");
      const nextOwnerRef = database.ref(`coursemate/memberships/${req.params.groupId}/${nextOwnerUid}`);
      const nextOwnerSnap = await nextOwnerRef.get();
      if (!nextOwnerSnap.exists()) return fail(res, 404, "The new owner must already be a group member.");
      const nextOwnerProfile = await getProfile(database, nextOwnerUid);
      const now = Date.now();
      await database.ref().update({
        [`coursemate/memberships/${req.params.groupId}/${req.user.uid}/role`]: ROLE_MODERATOR,
        [`coursemate/memberships/${req.params.groupId}/${nextOwnerUid}/role`]: ROLE_OWNER,
        [`coursemate/groups/${req.params.groupId}/ownerUid`]: nextOwnerUid,
        [`coursemate/groups/${req.params.groupId}/ownerName`]: String(nextOwnerProfile.name || "Student").slice(0, 100),
        [`coursemate/groups/${req.params.groupId}/updatedAt`]: now
      });
      res.json({ ownerUid: nextOwnerUid });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/groups/:groupId/members/:uid", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      if (!validRecordId(req.params.uid) || req.params.uid === access.group.ownerUid) return fail(res, 400, "The group owner cannot be removed.");
      const memberRef = database.ref(`coursemate/memberships/${req.params.groupId}/${req.params.uid}`);
      const memberSnap = await memberRef.get();
      if (!memberSnap.exists()) return fail(res, 404, "Group member not found.");
      if (access.membership.role === ROLE_MODERATOR && memberSnap.val().role !== ROLE_MEMBER) {
        return fail(res, 403, "Moderators can only remove regular members.");
      }
      await memberRef.remove();
      await sendNotification(database, req.params.uid, "Removed from study group", `You were removed from ${access.group.groupName}.`, "coursemate.html");
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/groups/:groupId/messages", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      const limit = safePageSize(req.query.limit);
      let query = database.ref(`coursemate/messages/${req.params.groupId}`).orderByChild("createdAt");
      if (req.query.before) {
        const separator = String(req.query.before).indexOf(":");
        const before = Number(String(req.query.before).slice(0, separator));
        const beforeId = String(req.query.before).slice(separator + 1);
        if (separator < 1 || !Number.isFinite(before) || !validRecordId(beforeId)) return fail(res, 400, "Message pagination cursor is invalid.");
        query = query.endAt(before, beforeId);
      }
      const snap = await query.limitToLast(limit + 1).get();
      const all = snapshotToList(snap.val()).sort((a, b) => Number(a.createdAt) - Number(b.createdAt) || a.id.localeCompare(b.id));
      const cursorId = req.query.before ? String(req.query.before).slice(String(req.query.before).indexOf(":") + 1) : "";
      const candidates = cursorId ? all.filter((message) => message.id !== cursorId) : all;
      const hasMore = candidates.length > limit;
      const page = req.query.before
        ? candidates.slice(0, limit)
        : hasMore ? candidates.slice(1) : candidates;
      res.json({
        items: page.filter((message) => message.moderationStatus !== "removed").map((message) => ({
          id: message.id,
          content: message.content,
          noteId: message.noteId || null,
          replyTo: message.replyTo || null,
          authorName: message.authorName || "Student",
          createdAt: message.createdAt,
          updatedAt: message.updatedAt || null,
          isMine: message.userUid === req.user.uid
        })),
        hasMore,
        nextCursor: page.length ? `${page[0].createdAt}:${page[0].id}` : null
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/groups/:groupId/messages", requireAuth, async (req, res, next) => {
    try {
      if (!(await checkRateLimit(req.user.uid, "group-message", 30))) return fail(res, 429, "You are sending messages too quickly. Try again later.");
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      const payload = validateCourseMateMessage(req.body);
      if (payload.replyTo) {
        const replySnap = await database.ref(`coursemate/messages/${req.params.groupId}/${payload.replyTo}`).get();
        if (!replySnap.exists()) return fail(res, 404, "Reply target not found.");
      }
      if (payload.noteId) {
        const noteSnap = await database.ref(`notesync/submissions/${payload.noteId}`).get();
        if (!noteSnap.exists() || noteSnap.val().status !== "Approved" || normalizeCode(noteSnap.val().courseCode) !== normalizeCode(access.group.courseCode)) {
          return fail(res, 400, "Only approved NoteSync notes for this group's course can be shared.");
        }
      }
      const profile = await getProfile(database, req.user.uid);
      const now = Date.now();
      const record = {
        ...payload,
        userUid: req.user.uid,
        authorName: String(profile.name || "Student").slice(0, 100),
        createdAt: now,
        updatedAt: now,
        moderationStatus: "visible"
      };
      const ref = await database.ref(`coursemate/messages/${req.params.groupId}`).push(record);
      res.status(201).json({ id: ref.key, message: { ...record, isMine: true } });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId/messages/:messageId", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!validRecordId(req.params.messageId)) return fail(res, 400, "Message ID is invalid.");
      const ref = database.ref(`coursemate/messages/${req.params.groupId}/${req.params.messageId}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Message not found.");
      const message = snap.val();
      if (message.userUid !== req.user.uid) return fail(res, 403, "You can only edit your own messages.");
      const payload = validateCourseMateMessage({ ...req.body, noteId: message.noteId, replyTo: message.replyTo });
      const updated = { ...message, content: payload.content, updatedAt: Date.now() };
      await ref.set(updated);
      res.json({ message: { id: req.params.messageId, content: updated.content, createdAt: updated.createdAt, updatedAt: updated.updatedAt, isMine: true } });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/groups/:groupId/messages/:messageId", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!validRecordId(req.params.messageId)) return fail(res, 400, "Message ID is invalid.");
      const ref = database.ref(`coursemate/messages/${req.params.groupId}/${req.params.messageId}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Message not found.");
      if (snap.val().userUid !== req.user.uid && !hasGroupManagementRole(access.membership)) return fail(res, 403, "You may only remove your own messages.");
      await ref.update({ moderationStatus: "removed", content: "", removedAt: Date.now(), removedBy: req.user.uid });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/questions", requireAuth, async (req, res, next) => {
    try {
      await refreshCourseIndex(database, req.user.uid);
      const courses = await getOwnCourses(database, req.user.uid);
      const requestedCode = normalizeCode(req.query.courseCode);
      if (requestedCode && !courses.has(requestedCode)) return fail(res, 403, "Questions can only be filtered by your registered courses.");
      const codes = requestedCode ? [requestedCode] : [...courses.keys()];
      const ids = new Set();
      for (const code of codes) {
        const snap = await database.ref(`coursemate/questionsByCourse/${courseKey(code)}`).get();
        Object.keys(snap.val() || {}).forEach((id) => ids.add(id));
      }
      let items = [];
      for (const id of [...ids].slice(0, 500)) {
        const snap = await database.ref(`coursemate/questions/${id}`).get();
        if (snap.exists() && snap.val().moderationStatus !== "removed") items.push({ id, ...snap.val() });
      }
      const search = String(req.query.search || "").trim().toLowerCase();
      if (search) items = items.filter((item) => `${item.title} ${item.details} ${item.topic} ${item.courseCode}`.toLowerCase().includes(search));
      if (req.query.unanswered === "true") items = items.filter((item) => !item.acceptedAnswerId && !(Number(item.answerCount) > 0));
      items.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      const limit = safePageSize(req.query.limit);
      const cursor = Number(req.query.before);
      if (Number.isFinite(cursor) && cursor > 0) items = items.filter((item) => Number(item.createdAt) < cursor);
      const page = items.slice(0, limit);
      res.json({ items: page.map((item) => ({ ...item, isMine: item.userUid === req.user.uid, userUid: undefined })), hasMore: items.length > limit, nextCursor: page.length ? page[page.length - 1].createdAt : null });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/questions", requireAuth, async (req, res, next) => {
    try {
      if (!(await checkRateLimit(req.user.uid, "question", 10))) return fail(res, 429, "You have asked questions too frequently. Try again later.");
      const payload = validateCourseMateQuestion(req.body);
      const course = await requireRegisteredCourse(database, req.user.uid, payload.courseCode);
      if (!course) return fail(res, 403, "Questions can only be created for your registered courses.");
      const profile = await getProfile(database, req.user.uid);
      const now = Date.now();
      const record = {
        ...payload,
        courseTitle: course.title,
        userUid: req.user.uid,
        authorName: String(profile.name || "Student").slice(0, 100),
        department: String(profile.department || ""),
        level: String(profile.level || ""),
        answerCount: 0,
        acceptedAnswerId: null,
        createdAt: now,
        updatedAt: now,
        moderationStatus: "visible"
      };
      const ref = await database.ref("coursemate/questions").push(record);
      await database.ref(`coursemate/questionsByCourse/${courseKey(course.code)}/${ref.key}`).set(true);
      const participantSnap = await database.ref(`coursemate/courseParticipants/${courseKey(course.code)}`).get();
      await Promise.all(Object.keys(participantSnap.val() || {})
        .filter((uid) => uid !== req.user.uid)
        .slice(0, 100)
        .map((uid) => sendNotification(database, uid, "New course question", `A question was posted for ${course.code}: ${payload.title}`, `coursemate.html?question=${ref.key}`)));
      res.status(201).json({ id: ref.key, question: { ...record, isMine: true, userUid: undefined } });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/questions/:questionId", requireAuth, async (req, res, next) => {
    try {
      const question = await getQuestion(database, req.params.questionId);
      if (!question) return fail(res, 404, "Question not found.");
      if (!(await requireRegisteredCourse(database, req.user.uid, question.courseCode))) return fail(res, 403, "You must be registered in this course to view this question.");
      res.json({ question: { ...question, id: req.params.questionId, isMine: question.userUid === req.user.uid, userUid: undefined } });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/questions/:questionId", requireAuth, async (req, res, next) => {
    try {
      const ref = database.ref(`coursemate/questions/${req.params.questionId}`);
      const snap = await ref.get();
      if (!snap.exists() || snap.val().moderationStatus === "removed") return fail(res, 404, "Question not found.");
      const existing = snap.val();
      if (existing.userUid !== req.user.uid) return fail(res, 403, "You can only edit your own question.");
      const payload = validateCourseMateQuestion(req.body);
      if (payload.courseCode !== normalizeCode(existing.courseCode)) return fail(res, 400, "A question's course cannot be changed.");
      const updated = { ...existing, ...payload, updatedAt: Date.now() };
      await ref.set(updated);
      res.json({ question: { id: req.params.questionId, ...updated, userUid: undefined, isMine: true } });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/questions/:questionId", requireAuth, async (req, res, next) => {
    try {
      const ref = database.ref(`coursemate/questions/${req.params.questionId}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Question not found.");
      if (snap.val().userUid !== req.user.uid) return fail(res, 403, "You can only remove your own question.");
      await ref.update({ moderationStatus: "removed", details: "", removedAt: Date.now() });
      await database.ref(`coursemate/answers/${req.params.questionId}`).remove();
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/questions/:questionId/answers", requireAuth, async (req, res, next) => {
    try {
      const question = await getQuestion(database, req.params.questionId);
      if (!question) return fail(res, 404, "Question not found.");
      if (!(await requireRegisteredCourse(database, req.user.uid, question.courseCode))) return fail(res, 403, "You must be registered in this course to view answers.");
      const snap = await database.ref(`coursemate/answers/${req.params.questionId}`).get();
      const items = snapshotToList(snap.val())
        .filter((answer) => answer.moderationStatus !== "removed")
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
        .map((answer) => ({
          id: answer.id,
          content: answer.content,
          authorName: answer.authorName,
          createdAt: answer.createdAt,
          updatedAt: answer.updatedAt || null,
          isMine: answer.userUid === req.user.uid,
          accepted: question.acceptedAnswerId === answer.id
        }));
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/questions/:questionId/answers", requireAuth, async (req, res, next) => {
    try {
      if (!(await checkRateLimit(req.user.uid, "answer", 20))) return fail(res, 429, "You are submitting answers too quickly. Try again later.");
      const question = await getQuestion(database, req.params.questionId);
      if (!question) return fail(res, 404, "Question not found.");
      if (!(await requireRegisteredCourse(database, req.user.uid, question.courseCode))) return fail(res, 403, "You must be registered in this course to answer.");
      if (question.userUid === req.user.uid) return fail(res, 403, "You cannot answer your own question.");
      const payload = validateCourseMateAnswer(req.body);
      const profile = await getProfile(database, req.user.uid);
      const now = Date.now();
      const answer = { ...payload, userUid: req.user.uid, authorName: String(profile.name || "Student").slice(0, 100), createdAt: now, updatedAt: now, moderationStatus: "visible" };
      const ref = await database.ref(`coursemate/answers/${req.params.questionId}`).push(answer);
      await database.ref(`coursemate/questions/${req.params.questionId}`).transaction((current) => {
        if (!current) return;
        current.answerCount = (Number(current.answerCount) || 0) + 1;
        current.updatedAt = now;
        return current;
      });
      await sendNotification(database, question.userUid, "New answer to your question", `A student answered “${question.title}”.`, `coursemate.html?question=${req.params.questionId}`);
      res.status(201).json({ id: ref.key, answer: { ...answer, isMine: true } });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/questions/:questionId/answers/:answerId", requireAuth, async (req, res, next) => {
    try {
      const question = await getQuestion(database, req.params.questionId);
      if (!question) return fail(res, 404, "Question not found.");
      if (!(await requireRegisteredCourse(database, req.user.uid, question.courseCode))) return fail(res, 403, "You must be registered in this course to edit an answer.");
      const ref = database.ref(`coursemate/answers/${req.params.questionId}/${req.params.answerId}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Answer not found.");
      if (snap.val().userUid !== req.user.uid) return fail(res, 403, "You can only edit your own answers.");
      const payload = validateCourseMateAnswer(req.body);
      await ref.update({ ...payload, updatedAt: Date.now() });
      res.json({ id: req.params.answerId, answer: payload });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/questions/:questionId/answers/:answerId", requireAuth, async (req, res, next) => {
    try {
      const question = await getQuestion(database, req.params.questionId);
      if (!question) return fail(res, 404, "Question not found.");
      const ref = database.ref(`coursemate/answers/${req.params.questionId}/${req.params.answerId}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Answer not found.");
      if (snap.val().userUid !== req.user.uid && question.userUid !== req.user.uid) return fail(res, 403, "You may only delete your own answer.");
      await ref.update({ moderationStatus: "removed", content: "", removedAt: Date.now() });
      await database.ref(`coursemate/questions/${req.params.questionId}`).transaction((current) => {
        if (!current) return;
        current.answerCount = Math.max(0, (Number(current.answerCount) || 1) - 1);
        if (current.acceptedAnswerId === req.params.answerId) current.acceptedAnswerId = null;
        return current;
      });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/questions/:questionId/accepted/:answerId", requireAuth, async (req, res, next) => {
    try {
      const ref = database.ref(`coursemate/questions/${req.params.questionId}`);
      const snap = await ref.get();
      if (!snap.exists() || snap.val().moderationStatus === "removed") return fail(res, 404, "Question not found.");
      if (snap.val().userUid !== req.user.uid) return fail(res, 403, "Only the question owner can select a helpful answer.");
      const answerSnap = await database.ref(`coursemate/answers/${req.params.questionId}/${req.params.answerId}`).get();
      if (!answerSnap.exists() || answerSnap.val().moderationStatus === "removed") return fail(res, 404, "Answer not found.");
      await ref.update({ acceptedAnswerId: req.params.answerId, updatedAt: Date.now() });
      await sendNotification(database, answerSnap.val().userUid, "Your answer was marked helpful", `The owner selected your answer for “${snap.val().title}”.`, `coursemate.html?question=${req.params.questionId}`);
      res.json({ acceptedAnswerId: req.params.answerId });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/partner-profile", requireAuth, async (req, res, next) => {
    try {
      const snap = await database.ref(`coursemate/partnerProfiles/${req.user.uid}`).get();
      res.json({ profile: snap.val() || { coursesSeeking: [], coursesOffering: [], discoverable: false } });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/partner-profile", requireAuth, async (req, res, next) => {
    try {
      const profile = validateCourseMatePartnerProfile(req.body);
      const registered = await getOwnCourses(database, req.user.uid);
      const registeredCodes = new Set(registered.keys());
      const unknown = [...profile.coursesSeeking, ...profile.coursesOffering].find((code) => !registeredCodes.has(code));
      if (unknown) return fail(res, 400, `${unknown} is not in your registered course list.`);
      const saved = { ...profile, updatedAt: Date.now() };
      const previousSnap = await database.ref(`coursemate/partnerProfiles/${req.user.uid}`).get();
      const previous = previousSnap.val() || {};
      const updates = { [`coursemate/partnerProfiles/${req.user.uid}`]: saved };
      for (const code of new Set([...(previous.coursesSeeking || []), ...(previous.coursesOffering || []), ...profile.coursesSeeking, ...profile.coursesOffering])) {
        const key = courseKey(code);
        const shouldIndex = profile.discoverable && [...profile.coursesSeeking, ...profile.coursesOffering].includes(code);
        updates[`coursemate/partnerIndex/${key}/${req.user.uid}`] = shouldIndex ? true : null;
      }
      await database.ref().update(updates);
      res.json({ profile: saved });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/partners", requireAuth, async (req, res, next) => {
    try {
      const code = normalizeCode(req.query.courseCode);
      if (!code || !(await requireRegisteredCourse(database, req.user.uid, code))) return fail(res, 403, "Select one of your registered courses to find study partners.");
      const indexSnap = await database.ref(`coursemate/partnerIndex/${courseKey(code)}`).get();
      const ids = Object.keys(indexSnap.val() || {}).filter((uid) => uid !== req.user.uid).slice(0, 100);
      const items = [];
      for (const uid of ids) {
        const [profile, courseMateSnap, partnerSnap] = await Promise.all([
          getProfile(database, uid),
          database.ref(`coursemate/profiles/${uid}`).get(),
          database.ref(`coursemate/partnerProfiles/${uid}`).get()
        ]);
        const partner = partnerSnap.val() || {};
        if (!partner.discoverable || courseMateSnap.val()?.discoverable !== true) continue;
        items.push({
          studentId: uid,
          displayName: String(profile.name || "Student"),
          profilePicture: /^https:\/\//i.test(String(profile.profilePicture || "")) ? String(profile.profilePicture).slice(0, 2000) : "",
          department: String(profile.department || ""),
          level: String(profile.level || ""),
          sharedCourse: code,
          coursesSeeking: partner.coursesSeeking || [],
          coursesOffering: partner.coursesOffering || [],
          method: partner.method || "",
          interests: partner.interests || "",
          availability: partner.availability || "",
          introduction: partner.introduction || ""
        });
      }
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/partner-requests/:uid", requireAuth, async (req, res, next) => {
    try {
      if (!(await checkRateLimit(req.user.uid, "partner-request", 10))) return fail(res, 429, "Study-partner requests are temporarily limited.");
      const recipientUid = req.params.uid;
      const courseCode = normalizeCode(req.body?.courseCode);
      if (!validUid(recipientUid) || recipientUid === req.user.uid) return fail(res, 400, "Choose another student.");
      if (!(await requireRegisteredCourse(database, req.user.uid, courseCode))) return fail(res, 403, "Study-partner requests must be related to one of your registered courses.");
      if (!(await requireRegisteredCourse(database, recipientUid, courseCode))) return fail(res, 403, "You can only request a study partner taking the same course.");
      const [recipientProfile, publicProfileSnap, recipientPartnerSnap] = await Promise.all([
        getProfile(database, recipientUid),
        database.ref(`coursemate/profiles/${recipientUid}`).get(),
        database.ref(`coursemate/partnerProfiles/${recipientUid}`).get()
      ]);
      const partner = recipientPartnerSnap.val() || {};
      if (publicProfileSnap.val()?.discoverable !== true || partner.discoverable !== true) return fail(res, 404, "Study partner not found.");
      const requestRef = database.ref(`coursemate/partnerRequests/${req.user.uid}/${recipientUid}`);
      const blocked = await database.ref(`coursemate/partnerBlocks/${recipientUid}/${req.user.uid}`).get();
      if (blocked.exists()) return fail(res, 403, "This student is not accepting your study-partner requests.");
      const existing = await requestRef.get();
      if (existing.exists() && ["pending", "accepted"].includes(existing.val().status)) return fail(res, 409, "A current request or connection already exists.");
      const incomingExisting = await database.ref(`coursemate/partnerRequests/${recipientUid}/${req.user.uid}`).get();
      if (incomingExisting.exists() && incomingExisting.val().status === "pending") return fail(res, 409, "This student has already requested to connect with you.");
      const profile = await getProfile(database, req.user.uid);
      const requestResult = await requestRef.transaction((current) => {
        if (current && ["pending", "accepted"].includes(current.status)) return;
        return {
        senderUid: req.user.uid,
        recipientUid,
        senderName: String(profile.name || "Student").slice(0, 100),
        courseCode,
        status: "pending",
        createdAt: Date.now()
        };
      });
      if (!requestResult.committed) return fail(res, 409, "A current request or connection already exists.");
      await database.ref(`coursemate/partnerInbox/${recipientUid}/${req.user.uid}`).set(true);
      await sendNotification(database, recipientUid, "Study-partner request", "A student sent you a study-partner request.", "coursemate.html?section=partners");
      res.status(201).json({ requested: true, recipientName: String(recipientProfile.name || "Student") });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/partner-requests", requireAuth, async (req, res, next) => {
    try {
      const [incomingIndexSnap, outgoingSnap, connectionsSnap] = await Promise.all([
        database.ref(`coursemate/partnerInbox/${req.user.uid}`).get(),
        database.ref(`coursemate/partnerRequests/${req.user.uid}`).get(),
        database.ref(`coursemate/partners/${req.user.uid}`).get()
      ]);
      const incoming = [];
      for (const senderUid of Object.keys(incomingIndexSnap.val() || {}).slice(0, 50)) {
        const requestSnap = await database.ref(`coursemate/partnerRequests/${senderUid}/${req.user.uid}`).get();
        const item = requestSnap.val();
        if (!item || !["pending", "accepted"].includes(item.status)) continue;
        const profile = await getPublicProfile(database, senderUid);
        incoming.push({ senderUid, status: item.status, createdAt: item.createdAt, profile });
      }
      const outgoing = snapshotToList(outgoingSnap.val()).filter((item) => ["pending", "accepted", "rejected"].includes(item.status));
      const connections = Object.keys(connectionsSnap.val() || {});
      const connectionProfiles = [];
      for (const uid of connections.slice(0, 50)) {
        const profile = await getPublicProfile(database, uid);
        connectionProfiles.push({ uid, profile: profile || { displayName: "Connected student" } });
      }
      const blockedSnap = await database.ref(`coursemate/partnerBlocks/${req.user.uid}`).get();
      res.json({
        incoming: incoming.slice(0, 50),
        outgoing: outgoing.slice(0, 50),
        connections: connectionProfiles,
        blocked: Object.keys(blockedSnap.val() || {})
      });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/partner-requests/:senderUid/:decision", requireAuth, async (req, res, next) => {
    try {
      const { senderUid, decision } = req.params;
      if (!validUid(senderUid) || !["accept", "decline"].includes(decision)) return fail(res, 400, "Invalid request decision.");
      const ref = database.ref(`coursemate/partnerRequests/${senderUid}/${req.user.uid}`);
      const snap = await ref.get();
      if (!snap.exists() || snap.val().status !== "pending") return fail(res, 404, "Pending study-partner request not found.");
      const status = decision === "accept" ? "accepted" : "rejected";
      await ref.update({ status, respondedAt: Date.now() });
      if (decision === "accept") {
        await database.ref().update({
          [`coursemate/partners/${req.user.uid}/${senderUid}`]: true,
          [`coursemate/partners/${senderUid}/${req.user.uid}`]: true
        });
      }
      await database.ref(`coursemate/partnerInbox/${req.user.uid}/${senderUid}`).remove();
      await sendNotification(database, senderUid, `Study-partner request ${decision}ed`, `Your study-partner request was ${decision}ed.`, "coursemate.html?section=partners");
      res.json({ status });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/partner-requests/:uid", requireAuth, async (req, res, next) => {
    try {
      if (!validUid(req.params.uid)) return fail(res, 400, "Student ID is invalid.");
      const ref = database.ref(`coursemate/partnerRequests/${req.user.uid}/${req.params.uid}`);
      const snap = await ref.get();
      if (!snap.exists() || snap.val().status !== "pending") return fail(res, 404, "Pending outgoing request not found.");
      await ref.update({ status: "cancelled", cancelledAt: Date.now() });
      await database.ref(`coursemate/partnerInbox/${req.params.uid}/${req.user.uid}`).remove();
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/partner-blocks/:uid", requireAuth, async (req, res, next) => {
    try {
      const uid = req.params.uid;
      if (!validUid(uid) || uid === req.user.uid) return fail(res, 400, "Student ID is invalid.");
      await database.ref(`coursemate/partnerBlocks/${req.user.uid}/${uid}`).set({ createdAt: Date.now() });
      await database.ref(`coursemate/partnerRequests/${uid}/${req.user.uid}`).update({ status: "blocked", respondedAt: Date.now() });
      await database.ref(`coursemate/partnerInbox/${req.user.uid}/${uid}`).remove();
      res.json({ blocked: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/partner-blocks/:uid", requireAuth, async (req, res, next) => {
    try {
      if (!validUid(req.params.uid)) return fail(res, 400, "Student ID is invalid.");
      await database.ref(`coursemate/partnerBlocks/${req.user.uid}/${req.params.uid}`).remove();
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/partners/:uid", requireAuth, async (req, res, next) => {
    try {
      if (!validUid(req.params.uid) || req.params.uid === req.user.uid) return fail(res, 400, "Connection ID is invalid.");
      const current = await database.ref(`coursemate/partners/${req.user.uid}/${req.params.uid}`).get();
      if (!current.exists()) return fail(res, 404, "Study-partner connection not found.");
      await database.ref().update({
        [`coursemate/partners/${req.user.uid}/${req.params.uid}`]: null,
        [`coursemate/partners/${req.params.uid}/${req.user.uid}`]: null,
        [`coursemate/partnerRequests/${req.user.uid}/${req.params.uid}`]: null,
        [`coursemate/partnerRequests/${req.params.uid}/${req.user.uid}`]: null
      });
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/groups/:groupId/revisions", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid, false);
      if (!access) return;
      if (!access.membership && access.group.visibility !== "public") return fail(res, 404, "Study group not found.");
      const snap = await database.ref(`coursemate/revisionSessions/${req.params.groupId}`).get();
      const items = snapshotToList(snap.val())
        .filter((item) => item.status !== "cancelled")
        .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/groups/:groupId/revisions", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required to schedule revision.");
      const payload = validateCourseMateRevision(req.body);
      if (payload.courseCode !== normalizeCode(access.group.courseCode)) return fail(res, 400, "Revision course must match the study group's course.");
      const now = Date.now();
      const record = { ...payload, status: "scheduled", createdBy: req.user.uid, createdAt: now, updatedAt: now, attendees: {} };
      const ref = await database.ref(`coursemate/revisionSessions/${req.params.groupId}`).push(record);
      const membersSnap = await database.ref(`coursemate/memberships/${req.params.groupId}`).get();
      await Promise.all(Object.keys(membersSnap.val() || {}).filter((uid) => uid !== req.user.uid).map((uid) =>
        sendNotification(database, uid, "New group revision session", `${payload.title} is scheduled for ${payload.date} at ${payload.start}.`, `coursemate.html?group=${req.params.groupId}&revision=${ref.key}`)
      ));
      res.status(201).json({ id: ref.key, session: record });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId/revisions/:revisionId", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      const ref = database.ref(`coursemate/revisionSessions/${req.params.groupId}/${req.params.revisionId}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Revision session not found.");
      const payload = validateCourseMateRevision(req.body);
      if (payload.courseCode !== normalizeCode(access.group.courseCode)) return fail(res, 400, "Revision course must match the study group's course.");
      const updated = { ...snap.val(), ...payload, updatedAt: Date.now() };
      await ref.set(updated);
      const membersSnap = await database.ref(`coursemate/memberships/${req.params.groupId}`).get();
      await Promise.all(Object.keys(membersSnap.val() || {}).filter((uid) => uid !== req.user.uid).map((uid) =>
        sendNotification(database, uid, "Revision session updated", `${payload.title} now starts ${payload.date} at ${payload.start}.`, `coursemate.html?group=${req.params.groupId}&revision=${req.params.revisionId}`)
      ));
      res.json({ session: updated });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/coursemate/groups/:groupId/revisions/:revisionId", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!hasGroupManagementRole(access.membership)) return fail(res, 403, "Group owner or moderator permissions are required.");
      const session = await getRevision(database, req.params.groupId, req.params.revisionId);
      if (!session) return fail(res, 404, "Revision session not found.");
      await database.ref(`coursemate/revisionSessions/${req.params.groupId}/${req.params.revisionId}`).update({ status: "cancelled", cancelledAt: Date.now(), cancelledBy: req.user.uid });
      const membersSnap = await database.ref(`coursemate/memberships/${req.params.groupId}`).get();
      await Promise.all(Object.keys(membersSnap.val() || {}).filter((uid) => uid !== req.user.uid).map((uid) =>
        sendNotification(database, uid, "Revision session cancelled", `${session.title} has been cancelled.`, `coursemate.html?group=${req.params.groupId}`)
      ));
      res.sendStatus(204);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/groups/:groupId/revisions/:revisionId/rsvp", requireAuth, async (req, res, next) => {
    try {
      const access = await requireGroupAccess(database, res, req.params.groupId, req.user.uid);
      if (!access) return;
      if (!["going", "maybe", "not-going"].includes(req.body?.response)) return fail(res, 400, "Choose going, maybe, or not-going.");
      const session = await getRevision(database, req.params.groupId, req.params.revisionId);
      if (!session || session.status === "cancelled") return fail(res, 404, "Revision session not found.");
      await database.ref(`coursemate/revisionSessions/${req.params.groupId}/${req.params.revisionId}/attendees/${req.user.uid}`).set(req.body.response);
      res.json({ response: req.body.response });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/coursemate/reports", requireAuth, async (req, res, next) => {
    try {
      if (!(await checkRateLimit(req.user.uid, "report", 10))) return fail(res, 429, "You have reported content too frequently.");
      const payload = validateCourseMateReport(req.body);
      if (payload.targetType === "group") {
        const access = await requireGroupAccess(database, res, payload.targetId, req.user.uid, false);
        if (!access) return;
      }
      if (payload.targetType === "message") {
        const access = await requireGroupAccess(database, res, payload.groupId, req.user.uid);
        if (!access) return;
      }
      if (payload.targetType === "question") {
        const question = await getQuestion(database, payload.targetId);
        if (!question || !(await requireRegisteredCourse(database, req.user.uid, question.courseCode))) return fail(res, 404, "Reported question not found.");
      }
      if (payload.targetType === "answer") {
        const question = await getQuestion(database, payload.questionId);
        if (!question || !(await requireRegisteredCourse(database, req.user.uid, question.courseCode))) return fail(res, 404, "Reported answer not found.");
      }
      if (payload.targetType === "profile") {
        const profile = await getPublicProfile(database, payload.targetId);
        if (!profile || !(await requireRegisteredCourse(database, req.user.uid, req.body.courseCode))) return fail(res, 404, "Reported profile not found.");
      }
      const targetRef = payload.targetType === "group"
        ? database.ref(`coursemate/groups/${payload.targetId}`)
        : payload.targetType === "message"
          ? database.ref(`coursemate/messages/${payload.groupId}/${payload.targetId}`)
          : payload.targetType === "question"
            ? database.ref(`coursemate/questions/${payload.targetId}`)
            : payload.targetType === "answer"
                ? database.ref(`coursemate/answers/${payload.questionId}/${payload.targetId}`)
                : database.ref(`coursemate/profiles/${payload.targetId}`);
      const snap = await targetRef.get();
      if (!snap.exists()) return fail(res, 404, "Reported content not found.");
      const now = Date.now();
      const record = { ...payload, reporterUid: req.user.uid, status: "pending", createdAt: now };
      const ref = await database.ref("coursemate/reports").push(record);
      res.status(201).json({ id: ref.key, report: { status: record.status, createdAt: now } });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/coursemate/notifications", requireAuth, async (req, res, next) => {
    try {
      const snap = await database.ref(`notifications/${req.user.uid}`).limitToLast(50).get();
      const items = snapshotToList(snap.val()).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/coursemate/notifications/:id/read", requireAuth, async (req, res, next) => {
    try {
      if (!validRecordId(req.params.id)) return fail(res, 400, "Notification ID is invalid.");
      const ref = database.ref(`notifications/${req.user.uid}/${req.params.id}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Notification not found.");
      await ref.update({ read: true });
      res.json({ read: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications", requireAuth, async (req, res, next) => {
    try {
      const snap = await database.ref(`notifications/${req.user.uid}`).limitToLast(50).get();
      const items = snapshotToList(snap.val()).sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res, next) => {
    try {
      if (!validRecordId(req.params.id)) return fail(res, 400, "Notification ID is invalid.");
      const ref = database.ref(`notifications/${req.user.uid}/${req.params.id}`);
      const snap = await ref.get();
      if (!snap.exists()) return fail(res, 404, "Notification not found.");
      await ref.update({ read: true });
      res.json({ read: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/coursemate/reports", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const snap = await database.ref("coursemate/reports").get();
      const items = snapshotToList(snap.val())
        .filter((report) => report.status === "pending")
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        .slice(0, 100);
      const details = [];
      for (const report of items) {
        let target = null;
        if (report.targetType === "group") target = (await database.ref(`coursemate/groups/${report.targetId}`).get()).val();
        if (report.targetType === "message") target = (await database.ref(`coursemate/messages/${report.groupId}/${report.targetId}`).get()).val();
        if (report.targetType === "question") target = (await database.ref(`coursemate/questions/${report.targetId}`).get()).val();
        if (report.targetType === "answer" && report.questionId) target = (await database.ref(`coursemate/answers/${report.questionId}/${report.targetId}`).get()).val();
        details.push({
          id: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          groupId: report.groupId || null,
          reason: report.reason,
          createdAt: report.createdAt,
          target: target ? {
            content: String(target.content || target.details || target.groupName || "").slice(0, 1000),
            title: String(target.title || "").slice(0, 180),
            authorName: String(target.authorName || target.ownerName || "").slice(0, 100),
            status: target.status || target.moderationStatus || ""
          } : null
        });
      }
      res.json({ items: details });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/coursemate/reports/:reportId", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      const reportRef = database.ref(`coursemate/reports/${req.params.reportId}`);
      const reportSnap = await reportRef.get();
      if (!reportSnap.exists()) return fail(res, 404, "CourseMate report not found.");
      const report = reportSnap.val();
      const action = req.body?.action;
      if (!["dismiss", "remove-content"].includes(action)) return fail(res, 400, "Choose dismiss or remove-content.");
      const now = Date.now();
      if (action === "remove-content") {
        if (report.targetType === "group") await database.ref(`coursemate/groups/${report.targetId}`).update({ status: "suspended", updatedAt: now });
        if (report.targetType === "message") await database.ref(`coursemate/messages/${report.groupId}/${report.targetId}`).update({ moderationStatus: "removed", content: "", removedAt: now });
        if (report.targetType === "question") await database.ref(`coursemate/questions/${report.targetId}`).update({ moderationStatus: "removed", updatedAt: now });
        if (report.targetType === "answer" && report.questionId) await database.ref(`coursemate/answers/${report.questionId}/${report.targetId}`).update({ moderationStatus: "removed", content: "", removedAt: now });
        if (report.targetType === "profile") await database.ref(`coursemate/profiles/${report.targetId}`).update({ discoverable: false, updatedAt: now });
      }
      await reportRef.update({ status: action === "dismiss" ? "dismissed" : "actioned", reviewedBy: req.user.uid, reviewedAt: now, action });
      await database.ref("coursemate/moderationLog").push({
        reportId: req.params.reportId,
        action,
        moderatorUid: req.user.uid,
        targetType: report.targetType,
        targetId: report.targetId,
        createdAt: now
      });
      res.json({ status: action === "dismiss" ? "dismissed" : "actioned" });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = { registerCourseMateRoutes, refreshCourseIndex, courseKey };
