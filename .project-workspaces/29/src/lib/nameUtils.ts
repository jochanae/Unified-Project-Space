/**
 * Extracts a friendly display name from profile data.
 * Handles Apple private relay emails and other edge cases.
 */
export function getDisplayName(profile: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null): string | null {
  if (!profile) return null;
  
  // Priority 1: Use full_name if available and not an email
  if (profile.full_name && !profile.full_name.includes('@')) {
    return profile.full_name.split(' ')[0];
  }
  
  // Priority 2: Use username if available
  if (profile.username) {
    return profile.username;
  }
  
  // Priority 3: Extract from email, but handle edge cases
  if (profile.email) {
    const emailPrefix = profile.email.split('@')[0];
    const domain = profile.email.split('@')[1] || '';
    
    // Skip Apple private relay emails - they look like random characters
    if (domain.includes('privaterelay.appleid.com')) {
      return null;
    }
    
    // Skip if the prefix looks like a random ID (all lowercase letters/numbers, no real name pattern)
    // Real names usually have some pattern like "john.doe" or "johndoe123"
    const looksLikeRandomId = /^[a-z0-9]{20,}$/i.test(emailPrefix);
    if (looksLikeRandomId) {
      return null;
    }
    
    // Clean up email prefix to make it more name-like
    // Replace dots, underscores, numbers with spaces, then capitalize
    const cleanedName = emailPrefix
      .replace(/[._]/g, ' ')  // Replace dots and underscores with spaces
      .replace(/\d+/g, '')    // Remove numbers
      .trim();
    
    if (cleanedName.length >= 2) {
      // Capitalize first letter of each word
      return cleanedName
        .split(' ')
        .filter(part => part.length > 0)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
        .split(' ')[0]; // Return just the first name
    }
  }
  
  return null;
}

/**
 * Gets a friendly greeting name, with a fallback.
 */
export function getGreetingName(profile: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
} | null, fallback: string = 'there'): string {
  return getDisplayName(profile) || fallback;
}
