import { useCallback } from 'react';
import { callQuinnStream, extractJSON } from '../components/SignalAIHelper';

export interface SignalOutputs {
  oneLiner: string;
  elevatorPitch: string;
  socialBio: string;
}

/**
 * Hook that provides a sharpen function to strip buzzwords and tighten copy.
 */
export function useSharpenSignal(projectId: string | null) {
  const sharpen = useCallback(
    async (input: SignalOutputs): Promise<SignalOutputs> => {
      const prompt = `You are MarQ, a ruthless copy editor. Your job: take AI-generated marketing copy and make it sound human.

## Current Copy
- One-Liner: "${input.oneLiner}"
- Elevator Pitch: "${input.elevatorPitch}"  
- Social Bio: "${input.socialBio}"

## Your Rules
1. Remove ALL buzzwords: "transform", "leverage", "empower", "elevate", "innovative", "cutting-edge", "strategic", "holistic", "synergy", "architecture", "streamline", "harness", "unlock", "revolutionary", "game-changing", "scattered"
2. Replace abstract phrases with concrete, specific language
3. Shorten. If you can say it in fewer words, do it.
4. The one-liner MUST be under 12 words
5. The pitch should sound like someone talking, not writing a press release
6. The bio should feel real — something you'd actually post
7. Keep the core meaning. Don't change WHAT they do, change HOW it's said.
8. Prefer active voice and strong verbs

Return ONLY valid JSON (no markdown, no code fences):
{
  "oneLiner": "...",
  "elevatorPitch": "...",
  "socialBio": "..."
}`;

      try {
        const raw = await callQuinnStream(prompt, projectId || 'signal-lab');
        const refined = extractJSON<SignalOutputs>(raw);
        if (refined?.oneLiner && refined?.elevatorPitch && refined?.socialBio) return refined;
        return input;
      } catch {
        return input;
      }
    },
    [projectId],
  );

  return sharpen;
}
