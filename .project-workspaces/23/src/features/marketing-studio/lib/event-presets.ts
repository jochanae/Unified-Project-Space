import type { TemplateId } from '../types';

export interface EventPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  templateId: TemplateId;
  defaults: {
    headline: string;
    subhead: string;
    cta: string;
  };
  /** Optional placeholder hints shown beneath each input to coach non-marketers. */
  hints?: {
    headline?: string;
    subhead?: string;
    cta?: string;
  };
}

/**
 * Event-specific starter templates for the "Quick Flyer" entry point.
 * Designed for non-marketers (event organizers, pastors, party planners)
 * who need a one-off promotional asset without setting up a project.
 */
export const EVENT_PRESETS: EventPreset[] = [
  {
    id: 'church-service',
    label: 'Church Service',
    emoji: '⛪',
    description: 'Sunday service, holiday gathering, or special sermon',
    templateId: 'gold-flyer',
    defaults: {
      headline: 'Easter Sunday Celebration',
      subhead: 'Join us for worship · Sunday, April 20 · 10:00 AM · Bring a friend.',
      cta: 'All are welcome',
    },
    hints: {
      headline: 'Service name + date',
      subhead: 'Day, time, and a warm invitation',
      cta: 'A welcoming line, not a hard sell',
    },
  },
  {
    id: 'birthday',
    label: 'Birthday Party',
    emoji: '🎂',
    description: 'Birthday celebration invitation',
    templateId: 'obsidian-tile',
    defaults: {
      headline: "Sarah's 30th Birthday",
      subhead: 'Saturday, May 4 · 7:00 PM · 123 Main Street · Cake, drinks, dancing.',
      cta: 'RSVP by April 28',
    },
    hints: {
      headline: 'Whose birthday + age (optional)',
      subhead: 'Date, time, address, vibe',
      cta: 'RSVP deadline or contact',
    },
  },
  {
    id: 'fundraiser',
    label: 'Fundraiser',
    emoji: '💝',
    description: 'Charity drive, donation campaign, or community cause',
    templateId: 'gold-flyer',
    defaults: {
      headline: 'Help Us Raise $10,000',
      subhead: 'Annual community fundraiser · Every dollar supports local families in need.',
      cta: 'Donate today',
    },
    hints: {
      headline: 'The goal or the cause',
      subhead: 'What it funds + why it matters',
      cta: 'Donate, give, sponsor',
    },
  },
  {
    id: 'open-house',
    label: 'Open House',
    emoji: '🏡',
    description: 'Real estate open house, school tour, or business preview',
    templateId: 'gold-flyer',
    defaults: {
      headline: 'Open House Saturday',
      subhead: '4 bed · 3 bath · 2,400 sqft · 123 Oak Avenue · 1:00 – 4:00 PM',
      cta: 'Stop by — no appointment needed',
    },
    hints: {
      headline: 'What + when',
      subhead: 'Key details a visitor needs',
      cta: 'How to attend',
    },
  },
  {
    id: 'workshop',
    label: 'Workshop / Class',
    emoji: '🎓',
    description: 'Class, workshop, training session, or seminar',
    templateId: 'obsidian-tile',
    defaults: {
      headline: 'Beginner Watercolor Workshop',
      subhead: 'Saturday, May 11 · 10 AM – 1 PM · All materials included · Limited to 12 seats.',
      cta: 'Reserve your seat',
    },
    hints: {
      headline: 'Skill or topic + level',
      subhead: 'When, what is included, capacity',
      cta: 'Sign up, register, reserve',
    },
  },
  {
    id: 'wedding',
    label: 'Wedding',
    emoji: '💍',
    description: 'Save-the-date, ceremony, or reception invite',
    templateId: 'gold-flyer',
    defaults: {
      headline: 'Together Forever',
      subhead: 'Sarah & Michael · Saturday, June 15 · 4:00 PM · Rosewood Gardens',
      cta: 'RSVP by May 20',
    },
    hints: {
      headline: 'Couple names or a romantic line',
      subhead: 'Names, date, time, venue',
      cta: 'RSVP deadline + how',
    },
  },
  {
    id: 'graduation',
    label: 'Graduation',
    emoji: '🎓',
    description: 'Grad party, ceremony, or congratulations card',
    templateId: 'obsidian-tile',
    defaults: {
      headline: 'Class of 2026',
      subhead: "Celebrating Jordan's graduation · Sunday, June 8 · 2:00 PM · 456 Maple Lane",
      cta: 'Come celebrate',
    },
    hints: {
      headline: 'Grad name + year or school',
      subhead: 'Honoree, date, time, venue',
      cta: 'RSVP or open invite',
    },
  },
  {
    id: 'grand-opening',
    label: 'Grand Opening',
    emoji: '🎉',
    description: 'New business launch, store opening, or ribbon cutting',
    templateId: 'gold-flyer',
    defaults: {
      headline: 'Grand Opening Saturday',
      subhead: 'Doors open 10 AM · Free coffee, giveaways, and 20% off all weekend.',
      cta: 'Be the first inside',
    },
    hints: {
      headline: 'Business name + the moment',
      subhead: 'Date, time, what to expect',
      cta: 'Visit, shop, claim offer',
    },
  },
  {
    id: 'general-event',
    label: 'General Event',
    emoji: '📣',
    description: 'Any other event — start from a clean slate',
    templateId: 'obsidian-tile',
    defaults: {
      headline: '',
      subhead: '',
      cta: 'Learn more',
    },
  },
];

export function getPresetById(id: string): EventPreset | undefined {
  return EVENT_PRESETS.find((p) => p.id === id);
}
