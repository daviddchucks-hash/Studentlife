export function parseCourseRows(text, scoreMode = false) {
  const rows = String(text).split(/\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const parts = line.split(",").map((part) => part.trim());
    const units = Number(parts[1]);
    const value = Number(parts[2]);
    if (parts.length < 3 || !parts[0] || !Number.isFinite(units) || units <= 0 || !Number.isFinite(value) || value < 0 || (scoreMode && value > 100) || (!scoreMode && value > 5)) {
      throw new Error(`Check line ${index + 1}: use course, positive units, and a ${scoreMode ? "score from 0 to 100" : "grade point from 0 to 5"}.`);
    }
    return { name: parts[0], units, value };
  });
  if (!rows.length) throw new Error("Add at least one course.");
  return rows;
}

export function calculateGpa(courses) {
  const totalUnits = courses.reduce((sum, course) => sum + course.units, 0);
  const qualityPoints = courses.reduce((sum, course) => sum + course.units * course.value, 0);
  return { value: qualityPoints / totalUnits, totalUnits, qualityPoints };
}

export function calculateCgpa(courses, previousPoints = 0, previousUnits = 0) {
  if (!Number.isFinite(previousUnits) || !Number.isFinite(previousPoints) || previousUnits < 0 || previousPoints < 0 || (!previousUnits && previousPoints)) {
    throw new Error("Enter valid prior totals. Use 0 for a first semester.");
  }
  const semester = calculateGpa(courses);
  const totalUnits = semester.totalUnits + previousUnits;
  const qualityPoints = semester.qualityPoints + previousPoints;
  return { value: qualityPoints / totalUnits, totalUnits, qualityPoints, semester };
}

export function calculateSemesterAverage(courses) {
  const totalUnits = courses.reduce((sum, course) => sum + course.units, 0);
  const weightedScore = courses.reduce((sum, course) => sum + course.units * course.value, 0);
  return { value: weightedScore / totalUnits, totalUnits, courseCount: courses.length };
}

export function calculateGrade(score, total) {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) {
    throw new Error("Score must be between zero and the maximum score.");
  }
  const percentage = score / total * 100;
  const letter = percentage >= 70 ? "A" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 45 ? "D" : percentage >= 40 ? "E" : "F";
  return { percentage, letter };
}

export function sumCourseUnits(input) {
  const units = String(input).split(/[,\n]/).map((value) => Number(value.trim()));
  if (!units.length || units.some((unit) => !Number.isFinite(unit) || unit <= 0)) {
    throw new Error("Enter positive numbers separated by commas or new lines.");
  }
  return { total: units.reduce((sum, unit) => sum + unit, 0), count: units.length };
}

export function generateStudyPlan({ subjects: subjectText, days: dayText, sessions, minutes, start }) {
  const subjects = String(subjectText).split(/\n/).map((item) => item.trim()).filter(Boolean);
  const days = String(dayText).split(",").map((item) => item.trim()).filter(Boolean);
  const count = Number(sessions);
  const duration = Number(minutes);
  const firstStart = String(start || "");
  if (!subjects.length || !days.length || !Number.isInteger(count) || count < 1 || count > 8 || !Number.isInteger(duration) || duration < 15 || duration > 180 || !/^\d{2}:\d{2}$/.test(firstStart)) {
    throw new Error("Check the subjects, study days, session count, and duration.");
  }
  const week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  if (days.length > 7 || days.some((day) => !week.includes(day)) || new Set(days).size !== days.length) {
    throw new Error("Choose each valid weekday no more than once.");
  }
  const [hour, minute] = firstStart.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error("Enter a valid first session start time.");
  const entries = [];
  let subjectIndex = 0;
  days.forEach((day) => {
    for (let index = 0; index < count; index++) {
      const offset = hour * 60 + minute + index * (duration + 15);
      if (offset + duration > 1440) throw new Error("Reduce the sessions or duration so the study plan fits within each day.");
      const time = `${String(Math.floor(offset / 60) % 24).padStart(2, "0")}:${String(offset % 60).padStart(2, "0")}`;
      entries.push({ day, time, minutes: duration, subject: subjects[subjectIndex % subjects.length] });
      subjectIndex++;
    }
  });
  return entries;
}
