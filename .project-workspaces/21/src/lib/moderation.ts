const MODERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moderate-content`;

export interface ModerationResult {
  approved: boolean;
  message?: string;
  crisis?: boolean;
  distress?: boolean;
  signals?: string;
  tier?: 0 | 1 | 2 | 3;
}

export const CRISIS_RESOURCES = {
  title: "You're not alone",
  message: "If you're going through a tough time, please know that help is available. You matter, and people care about you.",
  resources: [
    { label: '988 Suicide & Crisis Lifeline', value: '988', type: 'phone' as const },
    { label: 'Crisis Text Line', value: 'Text HOME to 741741', type: 'text' as const },
    { label: 'International Association for Suicide Prevention', value: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'link' as const },
  ],
};

export async function moderateContent(content: string, contentType: 'post' | 'comment' | 'message' = 'post', matureMode = false): Promise<ModerationResult> {
  try {
    const resp = await fetch(MODERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ content, contentType, matureMode }),
    });

    if (!resp.ok) {
      return { approved: true, tier: 0 };
    }

    return await resp.json();
  } catch {
    return { approved: true, tier: 0 };
  }
}
