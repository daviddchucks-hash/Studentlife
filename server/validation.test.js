"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validRecordId,
  normalizeMatricNumber,
  validateMatricNumber,
  validateTextMessage,
  validateRecord,
  snapshotToList,
  validateFormula,
  validateProfile,
  validateDirectoryItem,
  validateEvent,
  validateMarketplaceListing,
  validateJobListing,
  validateOpportunity,
  validateLostFoundItem,
  validateLostFoundClaim,
  validateAnnouncement,
  validateFeedback,
  validateReport,
  validateNoteSyncCourse,
  validateNoteSyncSubmission,
  validateNoteSyncApplication,
  validateNoteSyncWithdrawal,
  validateNoteSyncNotification,
  validateCourseMateGroup,
  validateCourseMateMessage,
  validateCourseMateQuestion,
  validateCourseMateAnswer,
  validateCourseMatePartnerProfile,
  validateCourseMateRevision,
  validateCourseMateReport
} = require("./validation");

test("matriculation numbers normalize consistently without assuming one institution format", () => {
  assert.equal(normalizeMatricNumber(" afit / 23 / 1234 "), "AFIT/23/1234");
  assert.equal(validateMatricNumber(" 2026-1234 "), "2026-1234");
  assert.equal(validateMatricNumber("AFIT12345"), "AFIT12345");
  assert.equal(validateMatricNumber(""), "");
  assert.throws(() => validateMatricNumber("bad value!"), /letters, numbers|common separators/);
  assert.throws(() => validateMatricNumber("A123456789"), /9 characters or fewer/);
});

test("text message validation rejects empty and oversized payloads", () => {
  assert.equal(validateTextMessage("  Hello student  "), "Hello student");
  assert.throws(() => validateTextMessage("  "), /cannot be empty/);
  assert.throws(() => validateTextMessage("x".repeat(5), 4), /4 characters or fewer/);
  assert.throws(() => validateTextMessage({ text: "hello" }), /must be text/);
});

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

test("formula bookmarks validate correctly", () => {
  assert.deepEqual(validateRecord("formula-bookmarks", { formulaId: "form123", formulaName: "Ohm's Law", subject: "Physics" }), {
    formulaId: "form123", formulaName: "Ohm's Law", subject: "Physics"
  });
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

test("new entity validation functions sanitize and check payload inputs", () => {
  assert.deepEqual(validateProfile({ name: "Alice", department: "Computer Science", level: "300" }), {
    name: "Alice", department: "Computer Science", level: "300", interests: "", skills: "", bio: "", profilePicture: ""
  });
  assert.equal(validateEvent({ title: "Hackathon", description: "Coding contest", date: "2026-06-01", location: "Hall A", organizer: "CSC Dept" }).title, "Hackathon");
  assert.throws(() => validateEvent({ title: "Hackathon", description: "Coding contest", date: "invalid-date", location: "Hall A", organizer: "CSC Dept" }), /Valid event date/);
  assert.equal(validateMarketplaceListing({ title: "Textbook", description: "Used book", price: "₦3000", contactInfo: "08012345678" }).price, "₦3000");
  assert.equal(validateJobListing({ title: "Web Dev Gig", description: "Build landing page", contactInfo: "email@test.com" }).type, "gig");
  assert.equal(validateOpportunity({ title: "Scholarship A", category: "Scholarship", description: "Full ride", deadline: "2026-09-01" }).title, "Scholarship A");
  assert.equal(validateLostFoundItem({ title: "Keys", type: "lost", category: "Personal", location: "Library", date: "2026-05-01", contactInfo: "08000", status: "published" }).type, "lost");
  assert.equal(validateLostFoundClaim({ targetId: "item123", claimantName: "Student A", reason: "It has my initials on it.", identifyingDetails: "Blue key holder with silver ring" }).status, "pending");
  assert.equal(validateAnnouncement({ title: "Exam Schedule Out", content: "Check portal", date: "2026-05-01", author: "Dean" }).author, "Dean");
  assert.equal(validateFeedback({ type: "complaint", subject: "Water issue", message: "No water in hostel" }).type, "complaint");
  assert.equal(validateReport({ targetType: "marketplace", targetId: "item123", reason: "Spam listing" }).targetType, "marketplace");
});

test("NoteSync validation rules enforce 100-level access and safe submission payloads", () => {
  const course = validateNoteSyncCourse({ department: "Computer Science", level: "100", semester: "First Semester", session: "2025/2026", code: "CSC 101", title: "Introduction to Computing", active: true });
  assert.equal(course.code, "CSC 101");
  assert.throws(() => validateNoteSyncCourse({ department: "Math", level: "700", semester: "First Semester", session: "2025/2026", code: "MTH 101", title: "Math" }), /Select a valid academic level/);

  const submission = validateNoteSyncSubmission({
    studentUid: "uid-123",
    studentName: "Ada Lovelace",
    department: "Computer Science",
    level: "100",
    academicSession: "2025/2026",
    semester: "First Semester",
    courseCode: "CSC 101",
    courseTitle: "Introduction to Computing",
    lectureTopic: "Algorithms",
    lectureWeek: "Week 2",
    lectureDate: "2025-02-12",
    notesText: "Sorting algorithm overview",
    noteType: "typed",
    attachmentCount: 0,
    attachmentRefs: [],
    status: "Pending Review"
  });

  test("CourseMate validates groups and discussion payloads without accepting client ownership", () => {
    assert.deepEqual(validateCourseMateGroup({
      groupName: "  Study Circle  ",
      courseCode: "mth 101",
      description: "Weekly revision",
      rules: "Be respectful",
      visibility: "private",
      maxMembers: 12,
      ownerUid: "forged"
    }), {
      groupName: "Study Circle",
      courseCode: "MTH 101",
      description: "Weekly revision",
      rules: "Be respectful",
      visibility: "private",
      maxMembers: 12
    });
    assert.throws(() => validateCourseMateGroup({
      groupName: "Group", courseCode: "CSC 101", visibility: "public", maxMembers: 1
    }), /at least two members/);
    assert.deepEqual(validateCourseMateMessage({ content: " Explain this step ", noteId: "note-123", userUid: "spoofed" }), {
      content: "Explain this step",
      noteId: "note-123",
      replyTo: ""
    });
    assert.throws(() => validateCourseMateMessage({ content: " " }), /Message is required/);
  });

  test("CourseMate validates academic questions, partner profiles, revision sessions, and reports", () => {
    assert.deepEqual(validateCourseMateQuestion({
      title: "Newton's second law", details: "Explain with an example.", courseCode: "phy 101", topic: "Dynamics"
    }), {
      title: "Newton's second law", details: "Explain with an example.", courseCode: "PHY 101", topic: "Dynamics"
    });
    assert.deepEqual(validateCourseMateAnswer({ content: "Force equals mass times acceleration." }), {
      content: "Force equals mass times acceleration."
    });
    assert.deepEqual(validateCourseMatePartnerProfile({
      coursesSeeking: ["mth 101", "MTH 101"],
      coursesOffering: ["PHY 101"],
      method: "Online",
      interests: "Calculus",
      availability: "Weekends",
      introduction: "Happy to study together.",
      discoverable: true,
      privateEmail: "not accepted"
    }), {
      coursesSeeking: ["MTH 101"],
      coursesOffering: ["PHY 101"],
      method: "Online",
      interests: "Calculus",
      availability: "Weekends",
      introduction: "Happy to study together.",
      discoverable: true
    });
    assert.deepEqual(validateCourseMateRevision({
      title: "Problem set review",
      courseCode: "csc 101",
      topic: "Loops",
      date: "2026-11-12",
      start: "16:00",
      end: "17:00",
      location: "Library",
      meetingUrl: "https://meet.example.edu/study"
    }).courseCode, "CSC 101");
    assert.throws(() => validateCourseMateRevision({
      title: "Bad time", courseCode: "CSC 101", topic: "Loops", date: "2026-11-12",
      start: "17:00", end: "16:00", location: "Library"
    }), /end after it starts/);
    assert.equal(validateCourseMateReport({
      targetType: "message", targetId: "message-1", groupId: "group-1", reason: "Abuse"
    }).targetType, "message");
    assert.throws(() => validateCourseMateReport({
      targetType: "answer", targetId: "answer-1", reason: "Abuse"
    }), /Question ID is required/);
  });
  assert.equal(submission.noteType, "typed");
  assert.throws(() => validateNoteSyncSubmission({ ...submission, courseCode: "" }), /courseCode/);
  assert.throws(() => validateNoteSyncSubmission({ ...submission, noteType: "pdf" }), /Only typed notes are supported/);
  assert.throws(() => validateNoteSyncSubmission({ ...submission, attachmentRefs: ["https://untrusted.example/file"] }), /File uploads are not configured/);

  const application = validateNoteSyncApplication({
    fullName: "Grace Hopper",
    department: "Electrical Engineering",
    currentLevel: "200",
    email: "grace@example.com",
    coursesRequested: "EEE 201",
    justification: "Need broader access for revision notes."
  });
  assert.equal(application.status, "Submitted");

  const withdrawal = validateNoteSyncWithdrawal({ coins: 200, bankInfo: "First Bank, 1234567890", nairaAmount: 1000 });
  assert.equal(withdrawal.coins, 200);

  const notification = validateNoteSyncNotification({ userUid: "uid-123", title: "Approved", message: "Your note was approved." });
  assert.equal(notification.title, "Approved");
});
