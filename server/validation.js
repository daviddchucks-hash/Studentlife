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
  }
};

const PRIORITIES = ["Low", "Medium", "High"];
const REVISION_STATUSES = ["Not started", "In progress", "Completed"];

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

function validateProfile(data) {
  if (!isPlainObject(data)) throw new ValidationError("Profile payload must be an object.");
  const cleanStr = (val, maxLen) => {
    if (val === undefined || val === null) return "";
    if (typeof val !== "string") throw new ValidationError("Profile fields must be strings.");
    return val.trim().slice(0, maxLen);
  };
  return {
    name: cleanStr(data.name, 100),
    department: cleanStr(data.department, 100),
    level: cleanStr(data.level, 50),
    interests: cleanStr(data.interests, 300),
    skills: cleanStr(data.skills, 300),
    bio: cleanStr(data.bio, 500),
    profilePicture: cleanStr(data.profilePicture, 2000)
  };
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
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length > 150) throw new ValidationError("Title is required.");
  const type = data.type === "found" ? "found" : "lost";
  const category = typeof data.category === "string" ? data.category.trim().slice(0, 50) : "Personal";
  const location = typeof data.location === "string" ? data.location.trim() : "";
  if (!location || location.length > 150) throw new ValidationError("Location is required.");
  if (!isDate(data.date)) throw new ValidationError("Valid date (YYYY-MM-DD) is required.");
  const contactInfo = typeof data.contactInfo === "string" ? data.contactInfo.trim() : "";
  if (!contactInfo || contactInfo.length > 150) throw new ValidationError("Contact info is required.");
  const description = typeof data.description === "string" ? data.description.trim().slice(0, 1000) : "";
  const status = data.status === "resolved" ? "resolved" : "open";
  return { title, type, category, location, date: data.date, contactInfo, description, status };
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
  validateAnnouncement,
  validateFeedback,
  validateReport
};
