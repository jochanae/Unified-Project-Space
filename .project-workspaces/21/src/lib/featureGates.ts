import type { FoundingTier } from '@/hooks/useFoundingMemberStatus';

/**
 * Returns true if the user's founding tier qualifies for early access features.
 * Wrap unreleased UI in: {isEarlyAccess(tier) && <NewFeature />}
 */
export function isEarlyAccess(tier: FoundingTier | null): boolean {
  return tier === 'genesis';
}
