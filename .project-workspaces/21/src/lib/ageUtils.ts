/**
 * Calculate age from a date of birth string (YYYY-MM-DD or Date).
 * Returns null if invalid.
 */
export function calculateAge(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const date = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--;
  }
  return age;
}

/**
 * Check if user is 18 or older based on their DOB.
 */
export function isAdult(dob: string | Date | null | undefined): boolean {
  const age = calculateAge(dob);
  return age !== null && age >= 18;
}

/**
 * Check if user is under 13 based on their DOB.
 */
export function isUnder13(dob: string | Date | null | undefined): boolean {
  const age = calculateAge(dob);
  return age !== null && age < 13;
}

/**
 * Check if user is a minor (13-17) based on their DOB.
 */
export function isMinor(dob: string | Date | null | undefined): boolean {
  const age = calculateAge(dob);
  return age !== null && age >= 13 && age < 18;
}

/**
 * Treat user as minor for safety/moderation when DOB is unknown.
 * Unknown DOB = assume minor (fail-safe for child safety).
 */
export function treatAsMinor(dob: string | Date | null | undefined): boolean {
  return !dob || !isAdult(dob);
}
