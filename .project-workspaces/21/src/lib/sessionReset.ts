const FRESH_EXPERIENCE_KEYS = [
  'compani-manifesto-seen',
  'compani-founder-insight-seen',
  'compani-welcome-seen',
  'compani-blueprint-announce-seen',
  'compani-first-inscription-seen',
  'compani-first-sanctuary-seen',
  'compani-view-usage',
  'compani-home-anchor',
  'compani_active_companion_idx',
  'compani-just-awakened',
  'compani-naming-ceremony-done',
];

const PROFILE_CACHE_KEYS = [
  'compani-profile',
  'compani-connections',
  'compani-connections-owner',
  'compani-migrated',
];

const LOCATION_CACHE_KEYS = [
  'compani-last-city',
  'compani-last-coords',
];

function removeKeys(keys: string[]) {
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

export function clearFreshExperienceState() {
  removeKeys(FRESH_EXPERIENCE_KEYS);
}

export function clearLocationSessionState() {
  removeKeys(LOCATION_CACHE_KEYS);
}

export function clearProfileSessionState() {
  removeKeys([...PROFILE_CACHE_KEYS, ...LOCATION_CACHE_KEYS]);
}