import type { Contact } from '@/features/contacts';

export type LeadTemperature = 'hot' | 'warm' | 'cold';

export interface TemperatureResult {
  temperature: LeadTemperature;
  signals: string[];
  rationale: string;
}

const HOT_STAGES = new Set(['qualified', 'proposal', 'won']);
const ENGAGED_STAGES = new Set(['contacted', 'qualified', 'proposal']);

/**
 * Client-side lead temperature scoring.
 * Uses signals already on the contact row — no extra fetches.
 *
 * Signals weighted:
 *  - Recency of capture (decays over 14 days)
 *  - Backend `score` field (manually editable on the contact)
 *  - Pipeline stage (qualified/proposal/won = strong heat)
 *  - Tag count (engagement breadth)
 *  - Notes presence (manual investment)
 */
export function classifyLeadTemperature(contact: Contact): TemperatureResult {
  const signals: string[] = [];
  let heat = 0;

  // Recency — capture within 24h is a strong signal
  if (contact.created_at) {
    const ageHours = (Date.now() - new Date(contact.created_at).getTime()) / 3_600_000;
    if (ageHours <= 24) {
      heat += 25;
      signals.push('Captured today');
    } else if (ageHours <= 72) {
      heat += 15;
      signals.push('Recent (≤3d)');
    } else if (ageHours <= 14 * 24) {
      heat += 5;
    } else {
      heat -= 10;
      signals.push('Aging');
    }
  }

  // Backend score
  const score = contact.score || 0;
  if (score >= 60) {
    heat += 35;
    signals.push(`High score (${score})`);
  } else if (score >= 30) {
    heat += 20;
    signals.push(`Moderate score (${score})`);
  } else if (score > 0) {
    heat += 10;
  }

  // Pipeline stage
  if (HOT_STAGES.has(contact.pipeline_stage)) {
    heat += 30;
    signals.push(`Stage: ${contact.pipeline_stage}`);
  } else if (ENGAGED_STAGES.has(contact.pipeline_stage)) {
    heat += 15;
  }

  // Tags = behavioral breadth
  const tagCount = contact.tags?.length || 0;
  if (tagCount >= 3) {
    heat += 10;
    signals.push(`${tagCount} tags`);
  } else if (tagCount >= 1) {
    heat += 5;
  }

  // Notes = manual investment
  if (contact.notes && contact.notes.trim().length > 10) {
    heat += 8;
    signals.push('Has notes');
  }

  let temperature: LeadTemperature;
  let rationale: string;
  if (heat >= 55) {
    temperature = 'hot';
    rationale = 'Strong recency + pipeline movement. Prioritize follow-up.';
  } else if (heat >= 25) {
    temperature = 'warm';
    rationale = 'Active signals but needs nurture to advance.';
  } else {
    temperature = 'cold';
    rationale = 'Low or aging engagement. Consider re-engagement sequence.';
  }

  return { temperature, signals, rationale };
}

export const TEMPERATURE_META: Record<LeadTemperature, { label: string; color: string; bg: string; ring: string; icon: string }> = {
  hot: {
    label: 'Hot',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    ring: 'ring-red-500/30',
    icon: '🔥',
  },
  warm: {
    label: 'Warm',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    ring: 'ring-amber-500/30',
    icon: '☀️',
  },
  cold: {
    label: 'Cold',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    ring: 'ring-sky-500/30',
    icon: '❄️',
  },
};
