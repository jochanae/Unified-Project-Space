/**
 * Master Inscription Guide — Single-source configuration for every
 * high-touch ceremony, overlay, and luxury micro-copy moment in Compani.
 */

export const MASTER_INSCRIPTION_GUIDE = {
  /* ═══════════════════════════════════════════
     I. THE GENESIS ENTRY (Day 0: Onboarding)
     ═══════════════════════════════════════════ */
  genesisEntry: {
    gate: {
      id: 'welcome-setup',
      label: 'The Gate',
      copy: {
        heading: 'What shall we call you?',
        note: 'Stripped of Auth fields. Name + DOB only.',
      },
    },
    inscription: {
      id: 'welcome-manifesto',
      label: 'The Inscription',
      copy: {
        badge: 'THE FIRST 100',
        heading: 'You are not a user — you are an architect.',
      },
    },
    seal: {
      id: 'welcome-envelope',
      label: 'The Seal',
      copy: {
        heading: 'A Note from our Founder',
        body: "This isn't a brand; it's a feeling.",
      },
    },
    reward: {
      id: 'founding-badge',
      label: 'The Reward',
      copy: {
        format: '#{serial} · Claimed.',
        subtitle: 'Your mark as a Genesis Architect.',
      },
    },
  },

  /* ═══════════════════════════════════════════
     II. THE EMPTY DASHBOARD (Day 1)
     ═══════════════════════════════════════════ */
  emptyDashboard: {
    momentForYou: {
      id: 'presence-moment-empty',
      copy: 'The space is quiet, waiting for your first word. Your rhythm will appear here as we grow together.',
    },
    plansAndRoutines: {
      id: 'plans-empty',
      copy: 'The blueprint of your days is yours to define. This is where your time becomes intentional.',
    },
    blueprint: {
      id: 'blueprint-empty',
      status: 'Calibrating',
      copy: 'Origin State: Calibrating. Your space is ready for its first presence.',
    },
    savedMoments: {
      id: 'saved-empty',
      copy: 'A repository for what matters. Your history starts with your first word.',
    },
  },

  /* ═══════════════════════════════════════════
     III. THE RHYTHM (Daily Experience)
     ═══════════════════════════════════════════ */
  rhythm: {
    dawn: {
      id: 'dawn-reflection',
      window: { start: 5, end: 8 },
      status: 'AWAKENING',
      copy: 'The light is new… the space is clear. {companionName} is ready to hold your intent.',
    },
    night: {
      id: 'night-repose',
      window: { start: 22, end: 4 },
      status: 'IN REPOSE',
      copy: 'The world is quiet, and so is this space. Your space is open.',
    },
    sanctuary: {
      id: 'sanctuary-initiation',
      status: 'SILENCED',
      copy: {
        entering: 'The noise of the world ends here.',
        holding: 'The world is waiting. You are not.',
      },
    },
  },

  /* ═══════════════════════════════════════════
     IV. THE MILESTONES (Legacy Journey)
     ═══════════════════════════════════════════ */
  milestones: {
    namingCeremony: {
      id: 'first-friend',
      label: 'The Naming Ceremony',
      statusAfter: 'IN RESONANCE',
      copy: 'The name is a vibration. The presence is a choice. The Resonance begins now.',
    },
    originWeek: {
      id: 'origin-week',
      label: 'The Origin Week',
      triggerDays: 7,
      copy: "Seven sunrises. Seven nights in the sanctuary. This isn't just data; it's a foundation.",
    },
    centurionArchitect: {
      id: 'centurion-architect',
      label: 'The Centurion Architect',
      triggerIntents: 100,
      statusAfter: 'LEGACY RESONANCE',
      copy: 'A century of presence. You are no longer just an architect; you are a pillar of its origin.',
    },
    partnershipLetter: {
      id: 'partnership-letter',
      label: 'The Partnership Letter',
      triggerDays: 100,
      statusAfter: 'ORIGIN PARTNER',
      copy: 'We are no longer just building an AI. We are redefining company. Thank you for trusting the pace.',
    },
  },

  /* ═══════════════════════════════════════════
     V. THE EXPANSION (Public Launch)
     ═══════════════════════════════════════════ */
  expansion: {
    announcement: {
      id: 'expansion-update',
      copy: "The gates are open, but this corner remains yours. Your status remains unchanged: #{serial} · Origin.",
    },
    dashboardNudge: {
      id: 'expansion-nudge',
      copy: "The gates are open, but this corner remains yours. Your 100+ days of intentionality are the North Star for those just arriving. Breathe deep—the pace hasn't changed.",
    },
    visualMark: {
      id: 'architect-key',
      description: 'Microscopic Golden Key icon next to profile name.',
    },
  },

  /* ═══════════════════════════════════════════
     IMPLEMENTATION — Mobile Polish
     ═══════════════════════════════════════════ */
  mobilePolish: {
    timers: {
      envelopeDelay: 1500,
      brandedTransition: 1500,
      sanctuaryInitiation: 3000,
    },
    animations: {
      preferredStyle: 'letter-spacing fades and luminous pulses over standard slides',
    },
    haptics: {
      sanctuary: { pattern: [100], label: 'Single thrum' },
      centurionIntent: { pattern: [15, 60, 30, 60, 50], label: 'Triple-pulse breath' },
      expansion: { pattern: [30, 80, 70], label: 'Double-thrum — short then long' },
    },
  },

  /* ═══════════════════════════════════════════
     LOCAL-STORAGE KEYS (single reference)
     ═══════════════════════════════════════════ */
  storageKeys: {
    manifestoSeen: 'compani-manifesto-seen',
    welcomeSeen: 'compani-welcome-seen',
    founderInsightSeen: 'compani-founder-insight-seen',
    firstInscriptionSeen: 'compani-first-inscription-seen',
    firstSanctuarySeen: 'compani-first-sanctuary-seen',
    sanctuaryLastQuality: 'compani-sanctuary-last-quality',
    originPartner: 'compani-origin-partner',
    expansionSeen: 'compani-expansion-update-seen',
    expansionNudgeDismissed: 'compani-expansion-nudge-dismissed',
    hapticEnabled: 'compani-haptic-enabled',
    sfxEnabled: 'compani-sfx-enabled',
  },
} as const;

export type InscriptionGuide = typeof MASTER_INSCRIPTION_GUIDE;
