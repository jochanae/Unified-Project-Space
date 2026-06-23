/**
 * Service Mode helpers — pure functions for previewing manual service windows.
 *
 * A manual service window is a weekly recurring band: { day (0-6), start (0-23), end (0-23) }.
 * Wraps midnight if end <= start.
 */

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export interface ServiceWindow {
  day: number;
  start: number;
  end: number;
}

export interface NextWindowResult {
  starts: Date;
  ends: Date;
  inProgress: boolean;
}

/**
 * Compute the next occurrence of the given weekly window, relative to `now`.
 * If currently inside the window, returns that window with inProgress=true.
 * For wrap-midnight windows, the "day" is the day the window opens.
 */
export function computeNextServiceWindow(
  win: ServiceWindow,
  now: Date = new Date(),
): NextWindowResult {
  const { day, start, end } = win;
  const wraps = end <= start;
  const todayDow = now.getDay();
  const hour = now.getHours();

  // If today matches the window's day, check if we're inside.
  if (todayDow === day) {
    const inWindowToday = wraps ? hour >= start || hour < end : hour >= start && hour < end;
    if (inWindowToday && (wraps ? hour >= start : true)) {
      const startDate = new Date(now);
      startDate.setHours(start, 0, 0, 0);
      const endDate = new Date(now);
      if (wraps) {
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(end, 0, 0, 0);
      } else {
        endDate.setHours(end, 0, 0, 0);
      }
      return { starts: startDate, ends: endDate, inProgress: true };
    }
    // Wrap-midnight tail (e.g. window Sun 22→2; now is Mon 1am).
    if (wraps && todayDow !== day) {
      // handled below
    }
  }

  // Wrap-midnight tail check: the previous day's window may still be active.
  if (wraps) {
    const prevDow = (todayDow + 6) % 7;
    if (prevDow === day && hour < end) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(start, 0, 0, 0);
      const endDate = new Date(now);
      endDate.setHours(end, 0, 0, 0);
      return { starts: startDate, ends: endDate, inProgress: true };
    }
  }

  // Otherwise, find the next future occurrence.
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(0);
  let daysAhead = (day - todayDow + 7) % 7;
  if (daysAhead === 0) {
    // Today, but window already passed (start hour <= now hour and not in-progress above)
    if (hour >= start) daysAhead = 7;
  }
  candidate.setDate(candidate.getDate() + daysAhead);
  candidate.setHours(start, 0, 0, 0);

  const endDate = new Date(candidate);
  if (wraps) {
    endDate.setDate(endDate.getDate() + 1);
  }
  endDate.setHours(end, 0, 0, 0);

  return { starts: candidate, ends: endDate, inProgress: false };
}

export function formatRelative(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hr`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
