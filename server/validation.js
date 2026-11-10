"use strict";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ASSIGNMENT_STATUSES = ["To do", "In progress", "Complete"];

const definitions = {
  registration: {
    path: "courses/registration",
    fields: { code: ["text", true, 24], name: ["text", true, 100], units: ["units", true] }
  },
  courses: {
    path: "courses/personal",
    fields: { code: ["text", true, 24], name: ["text", true, 100], units: ["units", true] }
  },
  timetable: {
    path: "timetable",
    fields: { course: ["text", true, 100], day: ["day", true], start: ["time", true], end: ["time", true], venue: ["text", false, 100] }
  },
  exams: {
    path: "exams",
    fields: { course: ["text", true, 100], date: ["date", true], time: ["time", false], venue: ["text", false, 100] }
  },
  assignments: {
    path: "assignments",
    fields: { title: ["text", true, 140], course: ["text", false, 100], dueDate: ["date", true], status: ["assignmentStatus", true], notes: ["text", false, 500] }
  },
  deadlines: {
    path: "deadlines",
    fields: { title: ["text", true, 140], category: ["text", false, 80], dueDate: ["date", true], notes: ["text", false, 500] }
  },
  "semester-plan": {
    path: "semesterPlan",
    fields: { title: ["text", true, 140], date: ["date", false], notes: ["text", false, 500] }
  },
  "study-sessions": {
    path: "studySessions",
    fields: { subject: ["text", true, 100], minutes: ["minutes", true], date: ["date", true] }
  },
  "study-plans": {
    path: "studyPlans",
    fields: { title: ["text", true, 160], entries: ["studyPlanEntries", true] }
  },
  flashcards: {
    path: "flashcards",
    fields: { front: ["text", true, 500], back: ["text", true, 1000], deck: ["text", false, 100], tags: ["text", false, 200] }
  },
  notes: {
    path: "notes",
    fields: { title: ["text", true, 150], course: ["text", false, 100], content: ["text", true, 5000], tags: ["text", false, 200] }
  },
  quizzes: {
    path: "quizzes",
    fields: { title: ["text", true, 150], subject: ["text", false, 100], questions: ["quizQuestions", true] }
  },
  "revision-plans": {
    path: "revisionPlans",
    fields: { topic: ["text", true, 150], subject: ["text", false, 100], priority: ["priority", true], targetDate: ["date", true], status: ["revisionStatus", true] }
  },
  "reading-progress": {
    path: "readingProgress",
    fields: { title: ["text", true, 150], subject: ["text", false, 100], totalPages: ["positiveInteger", true], completedPages: ["nonNegativeInteger", true], notes: ["text", false, 500] }
  },
  "topic-checklists": {
    path: "topicChecklist",
    fields: { subject: ["text", true, 100], topic: ["text", true, 150], completed: ["boolean", true] }
  },
  "formula-bookmarks": {
    path: "formulaBookmarks",
    fields: { formulaId: ["text", true, 128], formulaName: ["text", true, 150], subject: ["text", false, 100], formula: ["text", false, 300], topic: ["text", false, 100] }
  },
  "notesync-courses": {
    path: "notesync/courses",
    fields: {
      department: ["text", true, 120],
      level: ["text", true, 20],
      semester: ["text", true, 50],
      session: ["text", true, 60],
      code: ["text", true, 40],
      title: ["text", true, 200],
      active: ["boolean", true],
      createdAt: ["text", false, 30]
    }
  },
  "notesync-submissions": {
    path: "notesync/submissions",
    fields: {
      studentUid: ["text", true, 128],
      studentName: ["text", true, 200],
      department: ["text", true, 120],
      level: ["text", true, 20],
      academicSession: ["text", true, 60],
      semester: ["text", true, 50],
      courseCode: ["text", true, 40],
      courseTitle: ["text", true, 200],
      lectureTopic: ["text", true, 200],
      lectureWeek: ["text", true, 40],
      lectureDate: ["date", true],
      notesText: ["text", true, 20000],
      noteType: ["text", true, 40],
      attachmentCount: ["positiveInteger", true],
      attachmentRefs: ["text", false, 5000],
      status: ["text", true, 60],
      reviewNotes: ["text", false, 2000],
      rejectionReason: ["text", false, 500],
      duplicateHash: ["text", false, 128],
      qualityCategory: ["text", false, 80],
      rewardCoins: ["positiveInteger", false],
      createdAt: ["text", false, 30],
      updatedAt: ["text", false, 30]
    }
  },
  "notesync-library": {
    path: "notesync/library",
    fields: {
      submissionId: ["text", true, 128],
      department: ["text", true, 120],
      level: ["text", true, 20],
      academicSession: ["text", true, 60],
      semester: ["text", true, 50],
      courseCode: ["text", true, 40],
      courseTitle: ["text", true, 200],
      lectureTopic: ["text", true, 200],
      lectureWeek: ["text", true, 40],
      lectureDate: ["date", true],
      contributorName: ["text", true, 200],
      notesPreview: ["text", true, 700],
      fileSummary: ["text", false, 300],
      qualityCategory: ["text", true, 80],
      publishedAt: ["text", true, 30],
      createdAt: ["text", false, 30]
    }
  },
  "notesync-wallets": {
    path: "notesync/wallets",
    fields: {
      studentUid: ["text", true, 128],
      availableCoins: ["positiveInteger", true],
      pendingRewards: ["positiveInteger", true],
      totalEarned: ["positiveInteger", true],
      totalRedeemed: ["positiveInteger", true],
      totalAvailableValue: ["positiveInteger", true],
      lastUpdated: ["text", true, 30],
      withdrawnThisPeriod: ["positiveInteger", true]
    }
  },
  "notesync-transactions": {
    path: "notesync/transactions",
    fields: {
      studentUid: ["text", true, 128],
      type: ["text", true, 80],
      amount: ["positiveInteger", true],
      submissionId: ["text", false, 128],
      status: ["text", true, 40],
      timestamp: ["text", true, 30],
      reference: ["text", false, 200],
      note: ["text", false, 500]
    }
  },
  "notesync-withdrawals": {
    path: "notesync/withdrawals",
    fields: {
      studentUid: ["text", true, 128],
      coins: ["positiveInteger", true],
      nairaAmount: ["positiveInteger", true],
      bankInfo: ["text", true, 4000],
      status: ["text", true, 40],
      rejectionReason: ["text", false, 500],
      requestDate: ["text", true, 30],
      processedAt: ["text", false, 30],
      paymentReference: ["text", false, 200]
    }
  },
  "notesync-applications": {
    path: "notesync/levelApplications",
    fields: {
      studentUid: ["text", true, 128],
      fullName: ["text", true, 200],
      studentNumber: ["text", false, 80],
      department: ["text", true, 120],
      currentLevel: ["text", true, 20],
      email: ["text", true, 200],
      phone: ["text", false, 30],
      coursesRequested: ["text", true, 600],
      justification: ["text", true, 2000],
      status: ["text", true, 40],
      adminNotes: ["text", false, 2000],
      submittedAt: ["text", true, 30],
      updatedAt: ["text", false, 30]
    }
  },
  "notesync-notifications": {
    path: "notesync/notifications",
    fields: {
      userUid: ["text", true, 128],
      title: ["text", true, 200],
      message: ["text", true, 1000],
      read: ["boolean", true],
      destination: ["text", false, 100],
      createdAt: ["text", true, 30]
    }
  }
};

const PRIORITIES = ["Low", "Medium", "High"];
const REVISION_STATUSES = ["Not started", "In progress", "Completed"];
const NOTE_SYNC_SUBMISSION_STATUSES = ["Draft", "Pending Review", "Under Review", "Approved", "Rejected", "Requires Correction"];
const NOTE_SYNC_APPLICATION_STATUSES = ["Submitted", "Under Review", "Approved", "Rejected"];
const NOTE_SYNC_WITHDRAWAL_STATUSES = ["Pending", "Processing", "Paid", "Rejected", "Cancelled"];
const NOTE_SYNC_REWARD_CATEGORIES = {
  "Basic acceptable notes": 5,
  "Good notes": 10,
  "Very good notes": 15,
  "Excellent notes": 20
};

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = 400;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateStudyPlanEntries(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 70) {
    throw new ValidationError("Study plan must contain between 1 and 70 sessions.");
  }
  return value.map((entry, index) => {
    if (!isPlainObject(entry)) throw new ValidationError(`Study session ${index + 1} is invalid.`);
    const allowed = new Set(["day", "time", "minutes", "subject"]);
    if (Object.keys(entry).some((key) => !allowed.has(key))) {
      throw new ValidationError(`Study session ${index + 1} contains an unsupported field.`);
    }
    const day = entry.day;
    const time = entry.time;
    const subject = typeof entry.subject === "string" ? entry.subject.trim() : "";
    const minutes = entry.minutes;
    if (!DAYS.includes(day) || typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      throw new ValidationError(`Study session ${index + 1} needs a valid day and time.`);
    }
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 180) {
      throw new ValidationError(`Study session ${index + 1} duration must be from 15 to 180 minutes.`);
    }
    if (!subject || subject.length > 100) throw new ValidationError(`Study session ${index + 1} needs a subject under 100 characters.`);
    return { day, time, minutes, subject };
  });
}

function validateField(key, value, [kind, required, maxLength]) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${key} is required.`);
    return undefined;
  }
  if (kind === "text") {
    if (typeof value !== "string") throw new ValidationError(`${key} must be text.`);
    const clean = value.trim();
    if (!clean && required) throw new ValidationError(`${key} is required.`);
    if (clean.length > maxLength) throw new ValidationError(`${key} must be ${maxLength} characters or fewer.`);
    return clean || undefined;
  }
  if (kind === "units") {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0.5 || value > 60 || value % 0.5 !== 0) {
      throw new ValidationError("units must be a number from 0.5 to 60 in half-unit increments.");
    }
    return value;
  }
  if (kind === "minutes") {
    if (!Number.isInteger(value) || value < 1 || value > 600) throw new ValidationError("minutes must be a whole number from 1 to 600.");
    return value;
  }
  if (kind === "date") {
    if (!isDate(value)) throw new ValidationError(`${key} must be a valid YYYY-MM-DD date.`);
    return value;
  }
  if (kind === "time") {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new ValidationError(`${key} must be a valid 24-hour time.`);
    }
    return value;
  }
  if (kind === "day") {
    if (!DAYS.includes(value)) throw new ValidationError("day must be a weekday name.");
    return value;
  }
  if (kind === "assignmentStatus") {
    if (!ASSIGNMENT_STATUSES.includes(value)) throw new ValidationError("Choose a valid assignment status.");
    return value;
  }
  if (kind === "priority") {
    if (!PRIORITIES.includes(value)) throw new ValidationError("Priority must be Low, Medium, or High.");
    return value;
  }
  if (kind === "revisionStatus") {
    if (!REVISION_STATUSES.includes(value)) throw new ValidationError("Status must be Not started, In progress, or Completed.");
    return value;
  }
  if (kind === "positiveInteger") {
    if (!Number.isInteger(value) || value <= 0 || value > 100000) throw new ValidationError(`${key} must be a positive number.`);
    return value;
  }
  if (kind === "nonNegativeInteger") {
    if (!Number.isInteger(value) || value < 0 || value > 100000) throw new ValidationError(`${key} must be 0 or greater.`);
    return value;
  }
  if (kind === "boolean") {
    if (typeof value !== "boolean") throw new ValidationError(`${key} must be true or false.`);
    return value;
  }
  if (kind === "quizQuestions") {
    if (!Array.isArray(value) || value.length < 1 || value.length > 50) {
      throw new ValidationError("Quiz must contain between 1 and 50 questions.");
    }
    return value.map((q, idx) => {
      if (!isPlainObject(q)) throw new ValidationError(`Question ${idx + 1} is invalid.`);
      const question = typeof q.question === "string" ? q.question.trim() : "";
      if (!question || question.length > 500) throw new ValidationError(`Question ${idx + 1} must have a valid question text.`);
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
        throw new ValidationError(`Question ${idx + 1} must have between 2 and 6 options.`);
      }
      const options = q.options.map((opt) => String(opt || "").trim()).filter(Boolean);
      if (options.length < 2) throw new ValidationError(`Question ${idx + 1} options cannot be blank.`);
      const correctIndex = Number(q.correctIndex);
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        throw new ValidationError(`Question ${idx + 1} has an invalid correct option index.`);
      }
      const explanation = typeof q.explanation === "string" ? q.explanation.trim().slice(0, 500) : "";
      return { question, options, correctIndex, explanation };
    });
  }
  if (kind === "studyPlanEntries") return validateStudyPlanEntries(value);
  throw new ValidationError(`Unsupported field: ${key}.`);
}

function getDefinition(type) {
  const definition = definitions[type];
  if (!definition) {
    const error = new Error("Unknown record type.");
    error.statusCode = 404;
    throw error;
  }
  return definition;
}

function validateRecord(type, payload) {
  const definition = getDefinition(type);
  if (!isPlainObject(payload)) throw new ValidationError("Request body must be a JSON object.");
  const fieldNames = Object.keys(definition.fields);
  const unexpected = Object.keys(payload).find((key) => !fieldNames.includes(key));
  if (unexpected) throw new ValidationError(`Unsupported field: ${unexpected}.`);
  const clean = {};
  for (const [key, schema] of Object.entries(definition.fields)) {
    const value = validateField(key, payload[key], schema);
    if (value !== undefined) clean[key] = value;
  }
  if (type === "timetable" && clean.start >= clean.end) {
    throw new ValidationError("Class end time must be later than its start time.");
  }
  return clean;
}

function validRecordId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

function validateFormula(data) {
  if (!isPlainObject(data)) throw new ValidationError("Formula payload must be an object.");
  const cleanString = (val, name, required, maxLen) => {
    if (val === undefined || val === null || val === "") {
      if (required) throw new ValidationError(`${name} is required.`);
      return "";
    }
    if (typeof val !== "string") throw new ValidationError(`${name} must be a string.`);
    const trimmed = val.trim();
    if (!trimmed && required) throw new ValidationError(`${name} is required.`);
    if (trimmed.length > maxLen) throw new ValidationError(`${name} cannot exceed ${maxLen} characters.`);
    return trimmed;
  };

  const name = cleanString(data.name, "name", true, 150);
  const subject = cleanString(data.subject, "subject", true, 100);
  const level = cleanString(data.level, "level", true, 80);
  const topic = cleanString(data.topic, "topic", true, 100);
  const formula = cleanString(data.formula, "formula", true, 300);
  const formulaLatex = cleanString(data.formulaLatex, "formulaLatex", false, 500);
  const description = cleanString(data.description, "description", true, 2000);
  const variables = cleanString(data.variables, "variables", false, 1000);
  const units = cleanString(data.units, "units", false, 200);
  const conditions = cleanString(data.conditions, "conditions", false, 500);
  const examples = cleanString(data.examples, "examples", false, 1500);
  const tags = cleanString(data.tags, "tags", false, 300);
  const relatedFormulaIds = cleanString(data.relatedFormulaIds, "relatedFormulaIds", false, 300);
  const source = cleanString(data.source, "source", false, 200);
  const verified = typeof data.verified === "boolean" ? data.verified : false;

  return {
    name,
    subject,
    level,
    topic,
    formula,
    formulaLatex,
    description,
    variables,
    units,
    conditions,
    examples,
    tags,
    relatedFormulaIds,
    source,
    verified
  };
}

function snapshotToList(value) {
  if (!isPlainObject(value)) return [];
  return Object.entries(value).map(([id, item]) => ({ ...item, id }));
}

function normalizeMatricNumber(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") throw new ValidationError("Matriculation number must be text.");
  const cleaned = value.trim().replace(/\s+/g, "").toUpperCase();
  return cleaned;
}

function validateMatricNumber(value) {
  const normalized = normalizeMatricNumber(value);
  if (!normalized) return "";
  const pattern = new RegExp(process.env.MATRIC_NUMBER_PATTERN || "^[A-Z]{2,10}\\/\\d{2,4}\\/\\d{1,10}$");
  if (!pattern.test(normalized)) {
    throw new ValidationError("Enter a valid matriculation number, for example AFIT/23/1234.");
  }
  return normalized;
}

function validateTextMessage(value, maxLength = 2000) {
  if (typeof value !== "string") throw new ValidationError("Message text must be text.");
  const cleaned = value.trim();
  if (!cleaned) throw new ValidationError("Message cannot be empty.");
  if (cleaned.length > maxLength) throw new ValidationError(`Message must be ${maxLength} characters or fewer.`);
  return cleaned;
}

function validateProfile(data) {
  if (!isPlainObject(data)) throw new ValidationError("Profile payload must be an object.");
  const cleanStr = (val, maxLen) => {
    if (val === undefined || val === null) return "";
    if (typeof val !== "string") throw new ValidationError("Profile fields must be strings.");
    return val.trim().slice(0, maxLen);
  };
  const profile = {
    name: cleanStr(data.name, 100),
    department: cleanStr(data.department, 100),
    level: cleanStr(data.level, 50),
    interests: cleanStr(data.interests, 300),
    skills: cleanStr(data.skills, 300),
    bio: cleanStr(data.bio, 500),
    profilePicture: cleanStr(data.profilePicture, 2000)
  };
  if (Object.prototype.hasOwnProperty.call(data, "matricNumber") || Object.prototype.hasOwnProperty.call(data, "matricVerified")) {
    profile.matricNumber = validateMatricNumber(data.matricNumber || "");
    profile.matricVerified = typeof data.matricVerified === "boolean" ? data.matricVerified : false;
  }
  return profile;
}

function validateDirectoryItem(data) {
  if (!isPlainObject(data)) throw new ValidationError("Directory item must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Title is required and must be under 150 chars.");
  const category = typeof data.category === "string" ? data.category.trim() : "general";
  const description = typeof data.description === "string" ? data.description.trim().slice(0, 1000) : "";
  const location = typeof data.location === "string" ? data.location.trim().slice(0, 150) : "";
  const contactEmail = typeof data.contactEmail === "string" ? data.contactEmail.trim().slice(0, 100) : "";
  const contactPhone = typeof data.contactPhone === "string" ? data.contactPhone.trim().slice(0, 50) : "";
  const hours = typeof data.hours === "string" ? data.hours.trim().slice(0, 100) : "";
  return { title, category, description, location, contactEmail, contactPhone, hours };
}

function validateEvent(data) {
  if (!isPlainObject(data)) throw new ValidationError("Event payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Event title is required.");
  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!description || description.length > 2000) throw new ValidationError("Event description is required (max 2000 chars).");
  if (!isDate(data.date)) throw new ValidationError("Valid event date (YYYY-MM-DD) is required.");
  const time = typeof data.time === "string" ? data.time.trim().slice(0, 50) : "";
  const location = typeof data.location === "string" ? data.location.trim() : "";
  if (!location || location.length > 150) throw new ValidationError("Event location is required.");
  const organizer = typeof data.organizer === "string" ? data.organizer.trim() : "";
  if (!organizer || organizer.length > 100) throw new ValidationError("Event organizer is required.");
  const category = typeof data.category === "string" ? data.category.trim().slice(0, 50) : "General";
  return { title, description, date: data.date, time, location, organizer, category };
}

function validateMarketplaceListing(data) {
  if (!isPlainObject(data)) throw new ValidationError("Marketplace payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Listing title is required.");
  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!description || description.length > 2000) throw new ValidationError("Listing description is required.");
  const price = typeof data.price === "string" ? data.price.trim().slice(0, 50) : (typeof data.price === "number" ? String(data.price) : "Free");
  const category = typeof data.category === "string" ? data.category.trim().slice(0, 50) : "Other";
  const contactInfo = typeof data.contactInfo === "string" ? data.contactInfo.trim() : "";
  if (!contactInfo || contactInfo.length > 150) throw new ValidationError("Contact info is required.");
  const status = data.status === "sold" ? "sold" : "active";
  return { title, description, price, category, contactInfo, status };
}

function validateJobListing(data) {
  if (!isPlainObject(data)) throw new ValidationError("Job payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Job title is required.");
  const type = typeof data.type === "string" ? data.type.trim().slice(0, 50) : "gig";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!description || description.length > 2000) throw new ValidationError("Job description is required.");
  const stipend = typeof data.stipend === "string" ? data.stipend.trim().slice(0, 100) : "";
  const contactInfo = typeof data.contactInfo === "string" ? data.contactInfo.trim() : "";
  if (!contactInfo || contactInfo.length > 150) throw new ValidationError("Contact info is required.");
  const deadline = isDate(data.deadline) ? data.deadline : "";
  return { title, type, description, stipend, contactInfo, deadline };
}

function validateOpportunity(data) {
  if (!isPlainObject(data)) throw new ValidationError("Opportunity payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Title is required.");
  const category = typeof data.category === "string" ? data.category.trim().slice(0, 50) : "Scholarship";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!description || description.length > 2000) throw new ValidationError("Description is required.");
  if (!isDate(data.deadline)) throw new ValidationError("Valid deadline date (YYYY-MM-DD) is required.");
  const link = typeof data.link === "string" ? data.link.trim().slice(0, 500) : "";
  return { title, category, description, deadline: data.deadline, link };
}

function validateLostFoundItem(data) {
  if (!isPlainObject(data)) throw new ValidationError("Lost & found payload must be an object.");

  const sanitizeText = (value, maxLen, required = false, fieldName = "Field") => {
    if (value === undefined || value === null || value === "") {
      if (required) throw new ValidationError(`${fieldName} is required.`);
      return "";
    }
    if (typeof value !== "string") throw new ValidationError(`${fieldName} must be text.`);
    const cleaned = value.trim();
    if (required && !cleaned) throw new ValidationError(`${fieldName} is required.`);
    if (cleaned.length > maxLen) throw new ValidationError(`${fieldName} must be ${maxLen} characters or fewer.`);
    return cleaned;
  };

  const title = sanitizeText(data.title, 150, true, "Title");
  const type = data.type === "found" ? "found" : "lost";
  const category = sanitizeText(data.category, 50, false, "Category") || "Other";
  const location = sanitizeText(data.location, 150, true, "Location");
  const date = data.date;
  if (!isDate(date)) throw new ValidationError("Valid date (YYYY-MM-DD) is required.");
  const time = sanitizeText(data.time, 30, false, "Time");
  const description = sanitizeText(data.description, 2000, false, "Description");
  const identifyingCharacteristics = sanitizeText(data.identifyingCharacteristics, 1000, false, "Identifying characteristics");
  const contactPreference = sanitizeText(data.contactPreference, 50, false, "Contact preference") || "Email";
  const contactInfo = sanitizeText(data.contactInfo, 200, true, "Contact info");
  const imageUrl = typeof data.imageUrl === "string" && /^https?:\/\//i.test(data.imageUrl.trim()) ? data.imageUrl.trim().slice(0, 2000) : "";
  const allowedStatus = ["pending_review", "published", "match_found", "claim_pending", "returned", "recovered", "closed", "rejected", "resolved", "open"];
  const status = allowedStatus.includes(data.status) ? data.status : (data.status === "resolved" ? "resolved" : "published");
  const visibility = data.visibility === "private" ? "private" : "public";

  return {
    title,
    type,
    category,
    location,
    date: String(date),
    time,
    description,
    identifyingCharacteristics,
    contactPreference,
    contactInfo,
    imageUrl,
    status,
    visibility
  };
}

function validateLostFoundClaim(data) {
  if (!isPlainObject(data)) throw new ValidationError("Claim payload must be an object.");
  const targetId = typeof data.targetId === "string" ? data.targetId.trim() : "";
  if (!validRecordId(targetId)) throw new ValidationError("A valid target item ID is required.");
  const claimantName = typeof data.claimantName === "string" ? data.claimantName.trim() : "";
  if (!claimantName || claimantName.length > 120) throw new ValidationError("Your name is required.");
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (!reason || reason.length > 2000) throw new ValidationError("A claim explanation is required.");
  const identifyingDetails = typeof data.identifyingDetails === "string" ? data.identifyingDetails.trim() : "";
  if (!identifyingDetails || identifyingDetails.length > 1000) throw new ValidationError("Private identifying details are required to verify ownership.");
  const allowedStatus = ["pending", "under_review", "approved", "rejected", "completed"];
  const status = allowedStatus.includes(data.status) ? data.status : "pending";
  const contactPreference = typeof data.contactPreference === "string" ? data.contactPreference.trim().slice(0, 50) : "Email";
  return { targetId, claimantName, reason, identifyingDetails, contactPreference, status };
}

function validateAnnouncement(data) {
  if (!isPlainObject(data)) throw new ValidationError("Announcement payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Announcement title is required.");
  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!content || content.length > 3000) throw new ValidationError("Announcement content is required.");
  const date = isDate(data.date) ? data.date : new Date().toISOString().slice(0, 10);
  const author = typeof data.author === "string" ? data.author.trim().slice(0, 100) : "Admin";
  const category = typeof data.category === "string" ? data.category.trim().slice(0, 50) : "General";
  return { title, content, date, author, category };
}

function validateFeedback(data) {
  if (!isPlainObject(data)) throw new ValidationError("Feedback payload must be an object.");
  const type = ["feedback", "complaint", "suggestion"].includes(data.type) ? data.type : "feedback";
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  if (!subject || subject.length > 150) throw new ValidationError("Subject is required.");
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!message || message.length > 2000) throw new ValidationError("Message is required.");
  const status = ["new", "under_review", "resolved"].includes(data.status) ? data.status : "new";
  return { type, subject, message, status };
}

function validateReport(data) {
  if (!isPlainObject(data)) throw new ValidationError("Report payload must be an object.");
  const targetType = typeof data.targetType === "string" ? data.targetType.trim() : "";
  if (!["marketplace", "lostFound", "jobs", "events"].includes(targetType)) {
    throw new ValidationError("Invalid report target type.");
  }
  if (!validRecordId(data.targetId)) throw new ValidationError("Invalid target ID.");
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (!reason || reason.length > 500) throw new ValidationError("Report reason is required (max 500 chars).");
  return { targetType, targetId: data.targetId, reason };
}

function validateNoteSyncCourse(data) {
  if (!isPlainObject(data)) throw new ValidationError("NoteSync course payload must be an object.");
  const department = typeof data.department === "string" ? data.department.trim() : "";
  const level = typeof data.level === "string" ? data.level.trim() : "";
  const semester = typeof data.semester === "string" ? data.semester.trim() : "";
  const session = typeof data.session === "string" ? data.session.trim() : "";
  const code = typeof data.code === "string" ? data.code.trim() : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!department || department.length > 120) throw new ValidationError("Department is required.");
  if (!level || !["100", "200", "300", "400", "500", "Postgraduate"].includes(level)) throw new ValidationError("Select a valid academic level.");
  if (!semester || !["First Semester", "Second Semester"].includes(semester)) throw new ValidationError("Semester must be First or Second Semester.");
  if (!session || session.length > 60) throw new ValidationError("Session is required.");
  if (!code || code.length > 40) throw new ValidationError("Course code is required.");
  if (!title || title.length > 200) throw new ValidationError("Course title is required.");
  const active = typeof data.active === "boolean" ? data.active : true;
  return { department, level, semester, session, code, title, active };
}

function validateNoteSyncSubmission(data) {
  if (!isPlainObject(data)) throw new ValidationError("Submission payload must be an object.");
  const requiredString = (key, value, maxLen) => {
    if (typeof value !== "string") throw new ValidationError(`${key} is required.`);
    const cleaned = value.trim();
    if (!cleaned || cleaned.length > maxLen) throw new ValidationError(`${key} is required and too long.`);
    return cleaned;
  };

  const studentUid = requiredString("studentUid", data.studentUid, 128);
  const studentName = requiredString("studentName", data.studentName, 200);
  const department = requiredString("department", data.department, 120);
  const level = requiredString("level", data.level, 20);
  const academicSession = requiredString("academicSession", data.academicSession, 60);
  const semester = requiredString("semester", data.semester, 50);
  const courseCode = requiredString("courseCode", data.courseCode, 40);
  const courseTitle = requiredString("courseTitle", data.courseTitle, 200);
  const lectureTopic = requiredString("lectureTopic", data.lectureTopic, 200);
  const lectureWeek = requiredString("lectureWeek", data.lectureWeek, 40);
  if (!isDate(data.lectureDate)) throw new ValidationError("Lecture date must be a valid YYYY-MM-DD date.");
  const notesText = requiredString("notesText", data.notesText, 20000);
  const noteType = ["typed", "image", "pdf"].includes(data.noteType) ? data.noteType : "typed";
  const attachmentCount = Number.isInteger(data.attachmentCount) ? Math.max(0, data.attachmentCount) : 0;
  const attachmentRefs = Array.isArray(data.attachmentRefs) ? data.attachmentRefs.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 50) : [];
  const status = NOTE_SYNC_SUBMISSION_STATUSES.includes(data.status) ? data.status : "Draft";
  const reviewNotes = typeof data.reviewNotes === "string" ? data.reviewNotes.trim().slice(0, 2000) : "";
  const rejectionReason = typeof data.rejectionReason === "string" ? data.rejectionReason.trim().slice(0, 500) : "";
  const duplicateHash = typeof data.duplicateHash === "string" ? data.duplicateHash.trim().slice(0, 128) : "";
  const qualityCategory = typeof data.qualityCategory === "string" ? data.qualityCategory.trim().slice(0, 80) : "";
  const rewardCoins = Number.isInteger(data.rewardCoins) && data.rewardCoins >= 0 ? data.rewardCoins : 0;

  return {
    studentUid,
    studentName,
    department,
    level,
    academicSession,
    semester,
    courseCode,
    courseTitle,
    lectureTopic,
    lectureWeek,
    lectureDate: data.lectureDate,
    notesText,
    noteType,
    attachmentCount,
    attachmentRefs,
    status,
    reviewNotes,
    rejectionReason,
    duplicateHash,
    qualityCategory,
    rewardCoins
  };
}

function validateNoteSyncApplication(data) {
  if (!isPlainObject(data)) throw new ValidationError("Application payload must be an object.");
  const fullName = typeof data.fullName === "string" ? data.fullName.trim() : "";
  const studentNumber = typeof data.studentNumber === "string" ? data.studentNumber.trim().slice(0, 80) : "";
  const department = typeof data.department === "string" ? data.department.trim() : "";
  const currentLevel = typeof data.currentLevel === "string" ? data.currentLevel.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim().slice(0, 30) : "";
  const coursesRequested = typeof data.coursesRequested === "string" ? data.coursesRequested.trim() : "";
  const justification = typeof data.justification === "string" ? data.justification.trim() : "";
  const studentUid = typeof data.studentUid === "string" ? data.studentUid.trim() : "";
  if (!fullName || fullName.length > 200) throw new ValidationError("Full name is required.");
  if (!department || department.length > 120) throw new ValidationError("Department is required.");
  if (!currentLevel || currentLevel.length > 20) throw new ValidationError("Current level is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("A valid email is required.");
  if (!coursesRequested || coursesRequested.length > 600) throw new ValidationError("List the courses you want included.");
  if (!justification || justification.length > 2000) throw new ValidationError("Please explain why NoteSync would help your level.");
  const status = NOTE_SYNC_APPLICATION_STATUSES.includes(data.status) ? data.status : "Submitted";
  return { studentUid, fullName, studentNumber, department, currentLevel, email, phone, coursesRequested, justification, status };
}

function validateNoteSyncWithdrawal(data) {
  if (!isPlainObject(data)) throw new ValidationError("Withdrawal payload must be an object.");
  const coins = Number.isInteger(data.coins) ? data.coins : NaN;
  if (!Number.isInteger(coins) || coins < 200) throw new ValidationError("Minimum withdrawal is 200 AFT Coins.");
  const bankInfo = typeof data.bankInfo === "string" ? data.bankInfo.trim() : "";
  if (!bankInfo || bankInfo.length > 4000) throw new ValidationError("Bank details are required.");
  const nairaAmount = Number.isInteger(data.nairaAmount) ? data.nairaAmount : 0;
  const status = NOTE_SYNC_WITHDRAWAL_STATUSES.includes(data.status) ? data.status : "Pending";
  return { coins, bankInfo, nairaAmount, status };
}

function validateNoteSyncNotification(data) {
  if (!isPlainObject(data)) throw new ValidationError("Notification payload must be an object.");
  const userUid = typeof data.userUid === "string" ? data.userUid.trim() : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!userUid || userUid.length > 128) throw new ValidationError("User ID is required.");
  if (!title || title.length > 200) throw new ValidationError("Notification title is required.");
  if (!message || message.length > 1000) throw new ValidationError("Notification message is required.");
  const read = typeof data.read === "boolean" ? data.read : false;
  const destination = typeof data.destination === "string" ? data.destination.trim().slice(0, 100) : "";
  return { userUid, title, message, read, destination };
}

function validateLectureTrackReminder(data) {
  if (!isPlainObject(data)) throw new ValidationError("LectureTrack reminder payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const lecture = typeof data.lecture === "string" ? data.lecture.trim() : "";
  const day = typeof data.day === "string" ? data.day.trim() : "";
  const time = typeof data.time === "string" ? data.time.trim() : "";
  const venue = typeof data.venue === "string" ? data.venue.trim().slice(0, 150) : "";
  if (!title || title.length > 200) throw new ValidationError("Reminder title is required.");
  if (!lecture || lecture.length > 200) throw new ValidationError("Lecture/course name is required.");
  if (!day || !DAYS.includes(day)) throw new ValidationError("Reminder day must be a valid weekday.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ValidationError("Reminder time must be a valid 24-hour time.");
  const channel = ["push", "email", "sms"].includes(data.channel) ? data.channel : "push";
  const leadMinutes = Number.isInteger(data.leadMinutes) ? Math.min(Math.max(data.leadMinutes, 5), 1_440) : 15;
  const active = typeof data.active === "boolean" ? data.active : true;
  return { title, lecture, day, time, venue, channel, leadMinutes, active };
}

function validateLectureTrackAttendance(data) {
  if (!isPlainObject(data)) throw new ValidationError("LectureTrack attendance payload must be an object.");
  const lecture = typeof data.lecture === "string" ? data.lecture.trim() : "";
  const course = typeof data.course === "string" ? data.course.trim() : "";
  const date = isDate(data.date) ? data.date : "";
  const status = ["Present", "Absent", "Excused", "Pending"].includes(data.status) ? data.status : "Pending";
  const notes = typeof data.notes === "string" ? data.notes.trim().slice(0, 500) : "";
  if (!lecture || lecture.length > 200) throw new ValidationError("Lecture name is required.");
  if (!course || course.length > 200) throw new ValidationError("Course name is required.");
  if (!date) throw new ValidationError("Attendance date must be a valid YYYY-MM-DD date.");
  return { lecture, course, date, status, notes };
}

function validateCourseMateGroup(data) {
  if (!isPlainObject(data)) throw new ValidationError("Study group payload must be an object.");
  const groupName = typeof data.groupName === "string" ? data.groupName.trim() : "";
  const courseCode = typeof data.courseCode === "string" ? data.courseCode.trim().toUpperCase() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const rules = typeof data.rules === "string" ? data.rules.trim() : "";
  const visibility = ["public", "private"].includes(data.visibility) ? data.visibility : "";
  const maxMembers = data.maxMembers === undefined || data.maxMembers === "" ? 0 : Number(data.maxMembers);
  if (!groupName || groupName.length > 100) throw new ValidationError("Group name is required and must be 100 characters or fewer.");
  if (!courseCode || courseCode.length > 40) throw new ValidationError("A valid course code is required.");
  if (description.length > 1500) throw new ValidationError("Group description must be 1,500 characters or fewer.");
  if (rules.length > 1500) throw new ValidationError("Group rules must be 1,500 characters or fewer.");
  if (!visibility) throw new ValidationError("Choose public or private group visibility.");
  if (!Number.isInteger(maxMembers) || maxMembers < 0 || maxMembers > 100) {
    throw new ValidationError("Maximum membership must be 0 (unlimited) or a number from 2 to 100.");
  }
  if (maxMembers === 1) throw new ValidationError("A study group must allow at least two members.");
  return { groupName, courseCode, description, rules, visibility, maxMembers };
}

function validateCourseMateMessage(data) {
  if (!isPlainObject(data)) throw new ValidationError("Discussion message payload must be an object.");
  const content = typeof data.content === "string" ? data.content.trim() : "";
  const noteId = typeof data.noteId === "string" ? data.noteId.trim() : "";
  const replyTo = typeof data.replyTo === "string" ? data.replyTo.trim() : "";
  if (!content || content.length > 3000) throw new ValidationError("Message is required and must be 3,000 characters or fewer.");
  if (noteId && !validRecordId(noteId)) throw new ValidationError("Shared NoteSync note ID is invalid.");
  if (replyTo && !validRecordId(replyTo)) throw new ValidationError("Reply target is invalid.");
  return { content, noteId, replyTo };
}

function validateCourseMateQuestion(data) {
  if (!isPlainObject(data)) throw new ValidationError("Academic question payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const details = typeof data.details === "string" ? data.details.trim() : "";
  const courseCode = typeof data.courseCode === "string" ? data.courseCode.trim().toUpperCase() : "";
  const topic = typeof data.topic === "string" ? data.topic.trim() : "";
  if (!title || title.length > 180) throw new ValidationError("Question title is required and must be 180 characters or fewer.");
  if (!details || details.length > 5000) throw new ValidationError("Question details are required and must be 5,000 characters or fewer.");
  if (!courseCode || courseCode.length > 40) throw new ValidationError("A valid course code is required.");
  if (!topic || topic.length > 160) throw new ValidationError("Question topic is required and must be 160 characters or fewer.");
  return { title, details, courseCode, topic };
}

function validateCourseMateAnswer(data) {
  if (!isPlainObject(data)) throw new ValidationError("Answer payload must be an object.");
  const content = typeof data.content === "string" ? data.content.trim() : "";
  if (!content || content.length > 5000) throw new ValidationError("Answer is required and must be 5,000 characters or fewer.");
  return { content };
}

function validateCourseMatePartnerProfile(data) {
  if (!isPlainObject(data)) throw new ValidationError("Study partner profile payload must be an object.");
  const normalizeCourses = (value, field) => {
    if (!Array.isArray(value) || value.length > 20 || value.some((code) => typeof code !== "string")) {
      throw new ValidationError(`${field} must contain up to 20 course codes.`);
    }
    return [...new Set(value.map((code) => code.trim().toUpperCase()).filter(Boolean))];
  };
  const coursesSeeking = normalizeCourses(data.coursesSeeking || [], "Courses seeking help with");
  const coursesOffering = normalizeCourses(data.coursesOffering || [], "Courses offering help with");
  const method = typeof data.method === "string" ? data.method.trim() : "";
  const interests = typeof data.interests === "string" ? data.interests.trim() : "";
  const availability = typeof data.availability === "string" ? data.availability.trim() : "";
  const introduction = typeof data.introduction === "string" ? data.introduction.trim() : "";
  if (method.length > 100 || interests.length > 300 || availability.length > 300 || introduction.length > 500) {
    throw new ValidationError("Study partner profile fields exceed their allowed lengths.");
  }
  const discoverable = typeof data.discoverable === "boolean" ? data.discoverable : false;
  return { coursesSeeking, coursesOffering, method, interests, availability, introduction, discoverable };
}

function validateCourseMateRevision(data) {
  if (!isPlainObject(data)) throw new ValidationError("Revision session payload must be an object.");
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const courseCode = typeof data.courseCode === "string" ? data.courseCode.trim().toUpperCase() : "";
  const topic = typeof data.topic === "string" ? data.topic.trim() : "";
  const date = isDate(data.date) ? data.date : "";
  const start = typeof data.start === "string" ? data.start.trim() : "";
  const end = typeof data.end === "string" ? data.end.trim() : "";
  const location = typeof data.location === "string" ? data.location.trim() : "";
  const meetingUrl = typeof data.meetingUrl === "string" ? data.meetingUrl.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  if (!title || title.length > 160) throw new ValidationError("Revision session title is required.");
  if (!courseCode || courseCode.length > 40) throw new ValidationError("A valid course code is required.");
  if (!topic || topic.length > 160) throw new ValidationError("Revision topic is required.");
  if (!date) throw new ValidationError("Revision date must be a valid YYYY-MM-DD date.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) {
    throw new ValidationError("Revision session must have valid times and end after it starts.");
  }
  if (!location || location.length > 200 || meetingUrl.length > 500 || description.length > 1500) {
    throw new ValidationError("Revision session location or description is invalid.");
  }
  if (meetingUrl && !/^https:\/\/\S+$/i.test(meetingUrl)) throw new ValidationError("Meeting links must use HTTPS.");
  return { title, courseCode, topic, date, start, end, location, meetingUrl, description };
}

function validateCourseMateReport(data) {
  if (!isPlainObject(data)) throw new ValidationError("CourseMate report payload must be an object.");
  const targetType = ["group", "message", "question", "answer", "profile"].includes(data.targetType) ? data.targetType : "";
  const targetId = typeof data.targetId === "string" ? data.targetId.trim() : "";
  const groupId = typeof data.groupId === "string" ? data.groupId.trim() : "";
  const questionId = typeof data.questionId === "string" ? data.questionId.trim() : "";
  const courseCode = typeof data.courseCode === "string" ? data.courseCode.trim().toUpperCase() : "";
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";
  if (!targetType || !validRecordId(targetId)) throw new ValidationError("Report target is invalid.");
  if (groupId && !validRecordId(groupId)) throw new ValidationError("Report group ID is invalid.");
  if (questionId && !validRecordId(questionId)) throw new ValidationError("Report question ID is invalid.");
  if (!reason || reason.length > 1000) throw new ValidationError("Report reason is required and must be 1,000 characters or fewer.");
  if (targetType === "message" && !groupId) throw new ValidationError("Group ID is required for a message report.");
  if (targetType === "answer" && !questionId) throw new ValidationError("Question ID is required for an answer report.");
  if (targetType === "profile" && !courseCode) throw new ValidationError("Course code is required for a profile report.");
  return { targetType, targetId, groupId, questionId, courseCode, reason };
}

module.exports = {
  DAYS,
  ValidationError,
  definitions,
  getDefinition,
  isDate,
  snapshotToList,
  validRecordId,
  validateRecord,
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
  validateLectureTrackReminder,
  validateLectureTrackAttendance,
  validateCourseMateGroup,
  validateCourseMateMessage,
  validateCourseMateQuestion,
  validateCourseMateAnswer,
  validateCourseMatePartnerProfile,
  validateCourseMateRevision,
  validateCourseMateReport,
  NOTE_SYNC_SUBMISSION_STATUSES,
  NOTE_SYNC_APPLICATION_STATUSES,
  NOTE_SYNC_WITHDRAWAL_STATUSES,
  NOTE_SYNC_REWARD_CATEGORIES
};
