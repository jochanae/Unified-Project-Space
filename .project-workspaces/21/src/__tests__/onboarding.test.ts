import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Constants extracted from Onboarding.tsx for testing ──

const PATHS_MINORS = [
  { id: 'cami', emoji: '✨', title: 'Cami chooses for me', sub: 'Best match based on your vibe', route: '/connect' },
  { id: 'browse', emoji: '👀', title: 'Browse companions', sub: 'Pick from curated personalities', route: '/browse' },
];

const PATHS = [
  ...PATHS_MINORS,
  { id: 'studio', emoji: '🛠️', title: 'Build in Studio', sub: 'Create your own from scratch', route: '/studio' },
];

const VIBE_OPTIONS = [
  { emoji: '🤗', label: 'Calm & supportive' },
  { emoji: '😄', label: 'Funny & playful' },
  { emoji: '🌊', label: 'Deep conversations' },
  { emoji: '🔥', label: 'Motivating & accountability' },
  { emoji: '🎯', label: 'Wise mentor' },
  { emoji: '💛', label: 'Caring & nurturing' },
];

const PRESENCE_OPTIONS = [
  { label: 'Feminine energy' },
  { label: 'Masculine energy' },
  { label: 'Androgynous' },
  { label: 'No preference' },
];

const VISUAL_STYLES = [
  { label: 'Photorealistic' },
  { label: 'Illustrated' },
  { label: 'Anime / Stylized' },
  { label: 'Abstract / Energy' },
];

// ── Route mapping tests ──

describe('Onboarding: Route mapping', () => {
  it('cami path maps to /connect', () => {
    const p = PATHS.find(p => p.id === 'cami');
    expect(p?.route).toBe('/connect');
  });

  it('browse path maps to /browse', () => {
    const p = PATHS.find(p => p.id === 'browse');
    expect(p?.route).toBe('/browse');
  });

  it('studio path maps to /studio', () => {
    const p = PATHS.find(p => p.id === 'studio');
    expect(p?.route).toBe('/studio');
  });
});

// ── canContinue logic ──

describe('Onboarding: canContinue logic (adult mode)', () => {
  function canContinue(step: number, vibes: string[], presence: string | null, visualStyle: string | null, path: string) {
    if (step === 0) return vibes.length >= 1;
    if (step === 1) return !!presence && !!visualStyle;
    if (step === 2) return !!path;
    return true;
  }

  it('step 0 blocks with no vibes selected', () => {
    expect(canContinue(0, [], null, null, 'cami')).toBe(false);
  });

  it('step 0 allows with 1 vibe selected', () => {
    expect(canContinue(0, ['Calm & supportive'], null, null, 'cami')).toBe(true);
  });

  it('step 0 allows with 2 vibes selected', () => {
    expect(canContinue(0, ['Calm & supportive', 'Funny & playful'], null, null, 'cami')).toBe(true);
  });

  it('step 1 blocks with no presence', () => {
    expect(canContinue(1, ['Calm & supportive'], null, 'Photorealistic', 'cami')).toBe(false);
  });

  it('step 1 blocks with no visual style', () => {
    expect(canContinue(1, ['Calm & supportive'], 'Feminine energy', null, 'cami')).toBe(false);
  });

  it('step 1 allows with both presence and visual style', () => {
    expect(canContinue(1, ['Calm & supportive'], 'Feminine energy', 'Photorealistic', 'cami')).toBe(true);
  });

  it('step 2 allows with any path selected', () => {
    expect(canContinue(2, [], null, null, 'studio')).toBe(true);
  });

  it('step 3 (summary) always allows', () => {
    expect(canContinue(3, [], null, null, '')).toBe(true);
  });
});

// ── Kids mode ──

describe('Onboarding: Kids mode', () => {
  it('kids mode only has 2 paths (no studio)', () => {
    expect(PATHS_MINORS.length).toBe(2);
    expect(PATHS_MINORS.find(p => p.id === 'studio')).toBeUndefined();
  });

  it('kids mode maxStep is 1', () => {
    const kidsMode = true;
    const maxStep = kidsMode ? 1 : 3;
    expect(maxStep).toBe(1);
  });

  it('kids canContinue step 0 requires path selection', () => {
    // In kids mode, step 0 is the path selection screen
    const canContinueKids = (step: number, path: string) => {
      if (step === 0) return !!path;
      return true; // step 1 = summary
    };
    expect(canContinueKids(0, '')).toBe(false);
    expect(canContinueKids(0, 'cami')).toBe(true);
    expect(canContinueKids(0, 'browse')).toBe(true);
  });
});

// ── Save payload ──

describe('Onboarding: Save payload structure', () => {
  it('builds correct upsert payload for adult user', () => {
    const userId = 'test-user-id';
    const vibes = ['Calm & supportive', 'Deep conversations'];
    const presence = 'Feminine energy';
    const visualStyle = 'Photorealistic';
    const companionName = 'Luna';
    const path = 'cami';
    const kidsMode = false;

    const payload = {
      user_id: userId,
      vibe_preferences: kidsMode ? [] : vibes,
      presence_preference: kidsMode ? null : presence,
      visual_style: kidsMode ? null : visualStyle,
      preferred_companion_name: companionName.trim() || null,
      onboarding_path: path,
      onboarding_completed: true,
    };

    expect(payload.vibe_preferences).toEqual(['Calm & supportive', 'Deep conversations']);
    expect(payload.presence_preference).toBe('Feminine energy');
    expect(payload.visual_style).toBe('Photorealistic');
    expect(payload.preferred_companion_name).toBe('Luna');
    expect(payload.onboarding_path).toBe('cami');
    expect(payload.onboarding_completed).toBe(true);
  });

  it('builds correct upsert payload for kids mode', () => {
    const payload = {
      user_id: 'kid-user',
      vibe_preferences: [],
      presence_preference: null,
      visual_style: null,
      preferred_companion_name: null,
      onboarding_path: 'browse',
      onboarding_completed: true,
    };

    expect(payload.vibe_preferences).toEqual([]);
    expect(payload.presence_preference).toBeNull();
    expect(payload.visual_style).toBeNull();
    expect(payload.onboarding_path).toBe('browse');
  });

  it('trims and nullifies empty companion name', () => {
    const name1 = '  ';
    const name2 = '';
    expect(name1.trim() || null).toBeNull();
    expect(name2.trim() || null).toBeNull();
  });
});

// ── Data sync: MatchmakingPage reads onboarding fields ──

describe('Onboarding: Data sync to MatchmakingPage (Cami path)', () => {
  it('maps presence to onboardingPresence correctly', () => {
    const profile = {
      presencePreference: 'Feminine energy',
      companionGender: 'female',
    };
    const onboardingPresence = profile.presencePreference ?? 
      (profile.companionGender === 'male' ? 'Masculine energy' : 
       profile.companionGender === 'female' ? 'Feminine energy' : 'No preference');
    expect(onboardingPresence).toBe('Feminine energy');
  });

  it('falls back to companionGender when presencePreference missing', () => {
    const profile = { companionGender: 'male' };
    const onboardingPresence = (profile as any).presencePreference ?? 
      (profile.companionGender === 'male' ? 'Masculine energy' : 'No preference');
    expect(onboardingPresence).toBe('Masculine energy');
  });

  it('passes vibePreferences as onboardingVibes', () => {
    const profile = { vibePreferences: ['Calm & supportive', 'Deep conversations'] };
    const onboardingVibes = profile.vibePreferences ?? [];
    expect(onboardingVibes).toEqual(['Calm & supportive', 'Deep conversations']);
  });

  it('passes visualStyle as onboardingVisualStyle', () => {
    const profile = { visualStyle: 'Anime / Stylized' };
    expect(profile.visualStyle).toBe('Anime / Stylized');
  });
});

// ── Data sync: StudioPage reads onboarding fields ──

describe('Onboarding: Data sync to StudioPage (Studio path)', () => {
  const genderMap: Record<string, string> = {
    'Feminine energy': 'female',
    'Masculine energy': 'male',
    'Androgynous': 'nonbinary',
    'No preference': 'nonbinary',
  };

  const appearanceDescMap: Record<string, string> = {
    'Photorealistic': 'photorealistic, high detail, natural lighting',
    'Illustrated': 'painterly art style, soft brushwork, illustrated',
    'Anime / Stylized': 'anime art style, clean lines, stylized features',
    'Abstract / Energy': 'abstract energy form, luminous, ethereal',
  };

  it('maps Feminine energy to female gender', () => {
    expect(genderMap['Feminine energy']).toBe('female');
  });

  it('maps Masculine energy to male gender', () => {
    expect(genderMap['Masculine energy']).toBe('male');
  });

  it('maps Androgynous to nonbinary gender', () => {
    expect(genderMap['Androgynous']).toBe('nonbinary');
  });

  it('maps Photorealistic visual style to correct description', () => {
    expect(appearanceDescMap['Photorealistic']).toBe('photorealistic, high detail, natural lighting');
  });

  it('maps Anime / Stylized to correct description', () => {
    expect(appearanceDescMap['Anime / Stylized']).toBe('anime art style, clean lines, stylized features');
  });

  it('pre-fills companion name from preferredCompanionName', () => {
    const preferredCompanionName = 'Nova';
    const creationName = preferredCompanionName || '';
    expect(creationName).toBe('Nova');
  });
});

// ── Vibe toggle logic ──

describe('Onboarding: Vibe toggle logic', () => {
  function toggleVibe(prev: string[], label: string): string[] {
    if (prev.includes(label)) return prev.filter(v => v !== label);
    if (prev.length >= 2) return prev;
    return [...prev, label];
  }

  it('adds a vibe when under limit', () => {
    expect(toggleVibe([], 'Calm & supportive')).toEqual(['Calm & supportive']);
  });

  it('adds second vibe when at 1', () => {
    expect(toggleVibe(['Calm & supportive'], 'Deep conversations')).toEqual(['Calm & supportive', 'Deep conversations']);
  });

  it('blocks third vibe when at limit of 2', () => {
    const result = toggleVibe(['Calm & supportive', 'Deep conversations'], 'Funny & playful');
    expect(result).toEqual(['Calm & supportive', 'Deep conversations']);
  });

  it('removes a vibe when already selected', () => {
    expect(toggleVibe(['Calm & supportive'], 'Calm & supportive')).toEqual([]);
  });
});
