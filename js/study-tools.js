"use strict";

export class TimerManager {
  constructor(displayElem, onComplete) {
    this.displayElem = displayElem;
    this.onComplete = onComplete;
    this.secondsRemaining = 0;
    this.intervalId = null;
    this.isRunning = false;
  }

  set(minutes) {
    this.stop();
    this.secondsRemaining = minutes * 60;
    this.updateDisplay();
  }

  start() {
    if (this.isRunning || this.secondsRemaining <= 0) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.secondsRemaining--;
      this.updateDisplay();
      if (this.secondsRemaining <= 0) {
        this.stop();
        if (typeof this.onComplete === "function") this.onComplete();
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  stop() {
    this.pause();
    this.secondsRemaining = 0;
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.displayElem) return;
    const mins = Math.floor(this.secondsRemaining / 60);
    const secs = this.secondsRemaining % 60;
    this.displayElem.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}

export function calculateStudyStreak(studySessions = []) {
  if (!Array.isArray(studySessions) || studySessions.length === 0) {
    return { currentStreak: 0, totalDays: 0, totalMinutes: 0 };
  }

  const uniqueDates = new Set();
  let totalMinutes = 0;

  for (const session of studySessions) {
    if (session.date && session.minutes) {
      uniqueDates.add(session.date);
      totalMinutes += Number(session.minutes) || 0;
    }
  }

  const sortedDates = Array.from(uniqueDates).sort().reverse(); // Newest first
  if (sortedDates.length === 0) return { currentStreak: 0, totalDays: 0, totalMinutes: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let currentStreak = 0;
  let checkDate = sortedDates[0] === today ? today : sortedDates[0] === yesterday ? yesterday : null;

  if (checkDate) {
    let curr = new Date(`${checkDate}T00:00:00Z`);
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = curr.toISOString().slice(0, 10);
      if (sortedDates.includes(expected)) {
        currentStreak++;
        curr.setUTCDate(curr.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    totalDays: uniqueDates.size,
    totalMinutes
  };
}
