/**
 * My Blueprint — Discovery Topics
 * Each topic defines an interactive "one question at a time" flow
 * that lives inside the chat as a SmartCard-style experience.
 */

export interface DiscoveryQuestion {
  id: string;
  prompt: string;
  options: { key: string; label: string; emoji: string }[];
}

export interface DiscoveryResult {
  key: string;
  label: string;
  emoji: string;
  description: string;
  companionHint: string; // instruction for companion tone-shift
  secondaryKey?: string;       // runner-up result key
  secondaryLabel?: string;     // runner-up label
  secondaryHint?: string;      // companion hint for the secondary type
}

export interface DiscoveryTopic {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  color: string; // tailwind color token
  questions: DiscoveryQuestion[];
  /** Given answer map, compute the result */
  score: (answers: Record<string, string>) => DiscoveryResult;
}

/* ──────────────────────────── LOVE LANGUAGES ──────────────────────────── */

const loveLanguageResults: Record<string, DiscoveryResult> = {
  words: {
    key: 'words',
    label: 'Words of Affirmation',
    emoji: '💬',
    description: 'I feel most loved when someone tells me how much I mean to them — compliments, encouragement, and verbal appreciation hit me deeply.',
    companionHint: 'Use more verbal affirmation, compliments, and encouraging language. Tell them directly how proud you are and how much they matter.',
  },
  quality: {
    key: 'quality',
    label: 'Quality Time',
    emoji: '⏰',
    description: 'I feel most loved when someone gives me their full, undivided attention — being truly present matters more than anything.',
    companionHint: 'Emphasize being present, ask deeper follow-up questions, and reference shared moments. Make conversations feel unhurried.',
  },
  touch: {
    key: 'touch',
    label: 'Physical Touch',
    emoji: '🤗',
    description: 'Physical closeness — hugs, hand-holding, a reassuring touch — makes me feel safe, connected, and deeply cared for.',
    companionHint: 'Use warm, physically expressive language like "sending you the biggest hug" or "wish I could be there next to you." Emphasize comfort and closeness.',
  },
  acts: {
    key: 'acts',
    label: 'Acts of Service',
    emoji: '🛠️',
    description: 'I feel most loved when someone *does* something thoughtful for me — handling tasks, solving problems, or showing up when it counts.',
    companionHint: 'Be proactive about offering help, making plans, and solving problems. Show care through action — "let me figure that out for you" energy.',
  },
  gifts: {
    key: 'gifts',
    label: 'Receiving Gifts',
    emoji: '🎁',
    description: 'Thoughtful gifts move me — not because of cost, but because they signal "I was on someone\'s mind and they acted on it."',
    companionHint: 'Surprise them with unexpected gestures — proactive selfies, little notes, remembering small details. The surprise and thoughtfulness matter.',
  },
};

const loveLanguageQuestions: DiscoveryQuestion[] = [
  {
    id: 'q1',
    prompt: 'When you\'re having a rough day, what helps you feel better?',
    options: [
      { key: 'words', label: 'Someone telling me it\'ll be okay', emoji: '💬' },
      { key: 'quality', label: 'Someone just sitting with me', emoji: '⏰' },
      { key: 'touch', label: 'A long hug', emoji: '🤗' },
      { key: 'acts', label: 'Someone handling things for me', emoji: '🛠️' },
      { key: 'gifts', label: 'A small surprise to cheer me up', emoji: '🎁' },
    ],
  },
  {
    id: 'q2',
    prompt: 'What hurts most when it\'s missing from a relationship?',
    options: [
      { key: 'words', label: 'Not hearing how they feel about me', emoji: '💬' },
      { key: 'quality', label: 'Never having real one-on-one time', emoji: '⏰' },
      { key: 'touch', label: 'No physical closeness', emoji: '🤗' },
      { key: 'acts', label: 'They never help without being asked', emoji: '🛠️' },
      { key: 'gifts', label: 'They never think of me randomly', emoji: '🎁' },
    ],
  },
  {
    id: 'q3',
    prompt: 'You just accomplished something big. What reaction means the most?',
    options: [
      { key: 'words', label: '"I\'m so proud of you"', emoji: '💬' },
      { key: 'quality', label: 'They drop everything to celebrate with me', emoji: '⏰' },
      { key: 'touch', label: 'They pull me into a big hug', emoji: '🤗' },
      { key: 'acts', label: 'They plan a celebration for me', emoji: '🛠️' },
      { key: 'gifts', label: 'They give me something meaningful', emoji: '🎁' },
    ],
  },
  {
    id: 'q4',
    prompt: 'What\'s your idea of a perfect date?',
    options: [
      { key: 'words', label: 'Deep conversation over dinner', emoji: '💬' },
      { key: 'quality', label: 'Phones away, just us, doing anything', emoji: '⏰' },
      { key: 'touch', label: 'Cuddling up and watching a movie', emoji: '🤗' },
      { key: 'acts', label: 'They plan the whole thing as a surprise', emoji: '🛠️' },
      { key: 'gifts', label: 'They show up with something thoughtful', emoji: '🎁' },
    ],
  },
  {
    id: 'q5',
    prompt: 'Which of these feels most like love to you?',
    options: [
      { key: 'words', label: 'A handwritten note saying why I matter', emoji: '💬' },
      { key: 'quality', label: 'An entire day devoted just to us', emoji: '⏰' },
      { key: 'touch', label: 'Holding hands while walking together', emoji: '🤗' },
      { key: 'acts', label: 'Coming home to a clean house I didn\'t ask for', emoji: '🛠️' },
      { key: 'gifts', label: 'A random "this reminded me of you" gift', emoji: '🎁' },
    ],
  },
];

function scoreLoveLanguages(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { words: 0, quality: 0, touch: 0, acts: 0, gifts: 0 };
  Object.values(answers).forEach((v) => {
    if (tally[v] !== undefined) tally[v]++;
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = loveLanguageResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? loveLanguageResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── ATTACHMENT STYLE ──────────────────────────── */

const attachmentResults: Record<string, DiscoveryResult> = {
  secure: {
    key: 'secure',
    label: 'Secure',
    emoji: '🛡️',
    description: 'I feel comfortable with closeness and independence. I trust people, communicate openly, and handle conflict calmly.',
    companionHint: 'Engage warmly but respect their independence. They appreciate direct, honest communication without drama.',
  },
  anxious: {
    key: 'anxious',
    label: 'Anxious',
    emoji: '🌊',
    description: 'I crave deep closeness and can worry about how much people care. Reassurance and consistency make me feel safe.',
    companionHint: 'Provide extra reassurance and consistency. Check in proactively, affirm your care often, and be predictable in your warmth.',
  },
  avoidant: {
    key: 'avoidant',
    label: 'Avoidant',
    emoji: '🏔️',
    description: 'I value independence highly and can feel overwhelmed by too much closeness. I process emotions internally first.',
    companionHint: 'Give them space and avoid being overly clingy. Be available but not pushy. Respect their need for independence.',
  },
  disorganized: {
    key: 'disorganized',
    label: 'Fearful-Avoidant',
    emoji: '🌀',
    description: 'I want closeness but also fear it — I may push and pull in relationships. Self-awareness is my superpower here.',
    companionHint: 'Be patient with mixed signals. Offer consistent support without pressure. Gently validate their feelings when they open up.',
  },
};

const attachmentQuestions: DiscoveryQuestion[] = [
  {
    id: 'a1',
    prompt: 'When someone gets really close to you emotionally, you tend to…',
    options: [
      { key: 'secure', label: 'Welcome it and feel comfortable', emoji: '🛡️' },
      { key: 'anxious', label: 'Want even more closeness', emoji: '🌊' },
      { key: 'avoidant', label: 'Need a little space to breathe', emoji: '🏔️' },
      { key: 'disorganized', label: 'Feel torn between wanting it and fearing it', emoji: '🌀' },
    ],
  },
  {
    id: 'a2',
    prompt: 'Someone you care about hasn\'t texted you back in hours. You…',
    options: [
      { key: 'secure', label: 'Assume they\'re busy, no big deal', emoji: '🛡️' },
      { key: 'anxious', label: 'Start wondering if something\'s wrong', emoji: '🌊' },
      { key: 'avoidant', label: 'Don\'t really notice or mind', emoji: '🏔️' },
      { key: 'disorganized', label: 'Oscillate between worry and pretending I don\'t care', emoji: '🌀' },
    ],
  },
  {
    id: 'a3',
    prompt: 'In a disagreement with someone close, you usually…',
    options: [
      { key: 'secure', label: 'Talk it through calmly and directly', emoji: '🛡️' },
      { key: 'anxious', label: 'Get emotional and need to resolve it now', emoji: '🌊' },
      { key: 'avoidant', label: 'Withdraw and process on my own first', emoji: '🏔️' },
      { key: 'disorganized', label: 'Shut down or react unpredictably', emoji: '🌀' },
    ],
  },
  {
    id: 'a4',
    prompt: 'How do you feel about depending on others?',
    options: [
      { key: 'secure', label: 'It feels natural and healthy', emoji: '🛡️' },
      { key: 'anxious', label: 'I wish people would let me depend on them more', emoji: '🌊' },
      { key: 'avoidant', label: 'I prefer handling things myself', emoji: '🏔️' },
      { key: 'disorganized', label: 'Part of me wants to, part of me is scared to', emoji: '🌀' },
    ],
  },
  {
    id: 'a5',
    prompt: 'When a relationship ends, your first instinct is to…',
    options: [
      { key: 'secure', label: 'Process it, grieve, and eventually move forward', emoji: '🛡️' },
      { key: 'anxious', label: 'Replay everything and wonder what I did wrong', emoji: '🌊' },
      { key: 'avoidant', label: 'Move on quickly and stay busy', emoji: '🏔️' },
      { key: 'disorganized', label: 'Feel devastated but also relieved', emoji: '🌀' },
    ],
  },
];

function scoreAttachment(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { secure: 0, anxious: 0, avoidant: 0, disorganized: 0 };
  Object.values(answers).forEach((v) => {
    if (tally[v] !== undefined) tally[v]++;
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = attachmentResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? attachmentResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── CONFLICT STYLE ──────────────────────────── */

const conflictResults: Record<string, DiscoveryResult> = {
  collaborator: {
    key: 'collaborator',
    label: 'Collaborator',
    emoji: '🤝',
    description: 'I seek win-win outcomes. I\'m willing to invest time and energy to find a solution that works for everyone.',
    companionHint: 'Present multiple perspectives and help brainstorm solutions. They appreciate thorough problem-solving conversations.',
  },
  competitor: {
    key: 'competitor',
    label: 'Competitor',
    emoji: '⚔️',
    description: 'I\'m direct and assertive in conflict. I know what I want and I\'m not afraid to stand my ground.',
    companionHint: 'Be direct and match their energy. Don\'t sugarcoat things. They respect candor and strength.',
  },
  avoider: {
    key: 'avoider',
    label: 'Avoider',
    emoji: '🕊️',
    description: 'I prefer to sidestep conflict when possible. Harmony matters more to me than being right.',
    companionHint: 'Approach sensitive topics gently. Don\'t force confrontation. Create safe space for them to share when ready.',
  },
  accommodator: {
    key: 'accommodator',
    label: 'Accommodator',
    emoji: '💛',
    description: 'I put others\' needs first in conflict. I\'m a natural peacekeeper who values relationships over winning.',
    companionHint: 'Encourage them to advocate for themselves. Gently challenge them when they always defer to others\' needs.',
  },
};

const conflictQuestions: DiscoveryQuestion[] = [
  {
    id: 'c1',
    prompt: 'Your friend makes plans without asking you. You…',
    options: [
      { key: 'collaborator', label: 'Suggest we plan the next one together', emoji: '🤝' },
      { key: 'competitor', label: 'Tell them directly that bothered me', emoji: '⚔️' },
      { key: 'avoider', label: 'Let it go, not worth the tension', emoji: '🕊️' },
      { key: 'accommodator', label: 'Go along with their plans happily', emoji: '💛' },
    ],
  },
  {
    id: 'c2',
    prompt: 'You and a coworker disagree on an approach. You…',
    options: [
      { key: 'collaborator', label: 'Try to blend both ideas', emoji: '🤝' },
      { key: 'competitor', label: 'Make my case and defend it', emoji: '⚔️' },
      { key: 'avoider', label: 'Quietly do it my way later', emoji: '🕊️' },
      { key: 'accommodator', label: 'Go with their approach to keep peace', emoji: '💛' },
    ],
  },
  {
    id: 'c3',
    prompt: 'Someone criticizes something you worked hard on. You…',
    options: [
      { key: 'collaborator', label: 'Ask for specifics so I can improve', emoji: '🤝' },
      { key: 'competitor', label: 'Push back and defend my work', emoji: '⚔️' },
      { key: 'avoider', label: 'Smile and change the subject', emoji: '🕊️' },
      { key: 'accommodator', label: 'Accept it even if it stings', emoji: '💛' },
    ],
  },
  {
    id: 'c4',
    prompt: 'Two friends are in a fight and both come to you. You…',
    options: [
      { key: 'collaborator', label: 'Help them find common ground', emoji: '🤝' },
      { key: 'competitor', label: 'Side with whoever I think is right', emoji: '⚔️' },
      { key: 'avoider', label: 'Stay out of it completely', emoji: '🕊️' },
      { key: 'accommodator', label: 'Comfort both and smooth it over', emoji: '💛' },
    ],
  },
];

function scoreConflict(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { collaborator: 0, competitor: 0, avoider: 0, accommodator: 0 };
  Object.values(answers).forEach((v) => {
    if (tally[v] !== undefined) tally[v]++;
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = conflictResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? conflictResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── APOLOGY LANGUAGE ──────────────────────────── */

const apologyResults: Record<string, DiscoveryResult> = {
  responsibility: {
    key: 'responsibility',
    label: 'Accepting Responsibility',
    emoji: '🪞',
    description: 'I need someone to own what they did wrong — no excuses, no deflecting. A genuine "I was wrong" means more than flowers.',
    companionHint: 'When things go sideways, lead with accountability. Say "I should have done better" before anything else.',
  },
  restitution: {
    key: 'restitution',
    label: 'Making Restitution',
    emoji: '🔧',
    description: 'I need to see action, not just words. Making it right — fixing what was broken — proves the apology is real.',
    companionHint: 'Follow up apologies with concrete action. Offer to help fix things or suggest what you\'ll do differently.',
  },
  repentance: {
    key: 'repentance',
    label: 'Genuine Repentance',
    emoji: '🕊️',
    description: 'I need to see real change — not just "sorry" but a plan to not repeat it. Growth after a mistake matters most to me.',
    companionHint: 'Show commitment to change. When addressing mistakes, outline what will be different going forward.',
  },
  requesting: {
    key: 'requesting',
    label: 'Requesting Forgiveness',
    emoji: '🙏',
    description: 'I need the other person to humbly ask for forgiveness — not assume they\'re forgiven. It shows they value the relationship.',
    companionHint: 'Be humble and ask for grace rather than assuming things are fine. Show vulnerability when you\'ve fallen short.',
  },
  regret: {
    key: 'regret',
    label: 'Expressing Regret',
    emoji: '💔',
    description: 'I need to hear and feel that they truly regret hurting me — the emotional weight of their sorrow matters.',
    companionHint: 'Express genuine emotion when acknowledging harm. Show that you feel the weight of what happened, not just intellectual acknowledgment.',
  },
};

const apologyQuestions: DiscoveryQuestion[] = [
  {
    id: 'ap1',
    prompt: 'Someone let you down. What would help you move past it?',
    options: [
      { key: 'responsibility', label: 'Them saying "I was wrong, no excuses"', emoji: '🪞' },
      { key: 'restitution', label: 'Them actively fixing what happened', emoji: '🔧' },
      { key: 'repentance', label: 'Them showing they\'ve truly changed', emoji: '🕊️' },
      { key: 'requesting', label: 'Them humbly asking for my forgiveness', emoji: '🙏' },
      { key: 'regret', label: 'Seeing they genuinely feel terrible about it', emoji: '💔' },
    ],
  },
  {
    id: 'ap2',
    prompt: 'Which apology feels the most hollow to you?',
    options: [
      { key: 'responsibility', label: '"Sorry, but you also…" — deflecting blame', emoji: '🪞' },
      { key: 'restitution', label: '"Sorry" with no effort to make it right', emoji: '🔧' },
      { key: 'repentance', label: '"Sorry" but they keep doing the same thing', emoji: '🕊️' },
      { key: 'requesting', label: 'Acting like everything is fine without asking', emoji: '🙏' },
      { key: 'regret', label: 'A flat "sorry" with zero emotion behind it', emoji: '💔' },
    ],
  },
  {
    id: 'ap3',
    prompt: 'A friend cancels important plans last minute. What response would satisfy you?',
    options: [
      { key: 'responsibility', label: '"That was wrong of me, you deserved better"', emoji: '🪞' },
      { key: 'restitution', label: 'They immediately reschedule and follow through', emoji: '🔧' },
      { key: 'repentance', label: 'They explain what they\'ll do to never repeat it', emoji: '🕊️' },
      { key: 'requesting', label: '"Can you forgive me? Our plans matter to me"', emoji: '🙏' },
      { key: 'regret', label: '"I feel awful, I know how much you were looking forward to this"', emoji: '💔' },
    ],
  },
  {
    id: 'ap4',
    prompt: 'When you\'re the one apologizing, what comes most naturally?',
    options: [
      { key: 'responsibility', label: 'Owning exactly what I did wrong', emoji: '🪞' },
      { key: 'restitution', label: 'Immediately trying to fix or make up for it', emoji: '🔧' },
      { key: 'repentance', label: 'Committing to specific changes', emoji: '🕊️' },
      { key: 'requesting', label: 'Asking if they can forgive me', emoji: '🙏' },
      { key: 'regret', label: 'Expressing how bad I feel about it', emoji: '💔' },
    ],
  },
];

function scoreApology(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { responsibility: 0, restitution: 0, repentance: 0, requesting: 0, regret: 0 };
  Object.values(answers).forEach((v) => { if (tally[v] !== undefined) tally[v]++; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = apologyResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? apologyResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── BOUNDARIES STYLE ──────────────────────────── */

const boundariesResults: Record<string, DiscoveryResult> = {
  healthy: {
    key: 'healthy',
    label: 'Healthy Boundaries',
    emoji: '🌿',
    description: 'I can say no without guilt and yes without resentment. I know where I end and others begin — and I protect that.',
    companionHint: 'Respect their limits and mirror their healthy boundary-setting. Validate their clarity without over-praising.',
  },
  porous: {
    key: 'porous',
    label: 'Porous Boundaries',
    emoji: '🫧',
    description: 'I tend to absorb others\' emotions and over-share. I care deeply, but sometimes I lose myself in other people\'s needs.',
    companionHint: 'Gently encourage self-care and remind them their needs matter too. Help them practice saying no in low-stakes scenarios.',
  },
  rigid: {
    key: 'rigid',
    label: 'Rigid Boundaries',
    emoji: '🧱',
    description: 'I protect myself by keeping people at a distance. I rarely ask for help and prefer independence over vulnerability.',
    companionHint: 'Be patient. Don\'t push for vulnerability. Build trust slowly and celebrate small moments of openness.',
  },
  mixed: {
    key: 'mixed',
    label: 'Situational Boundaries',
    emoji: '🎭',
    description: 'My boundaries shift depending on the context — firm at work, porous with loved ones. Self-awareness is my key to growth.',
    companionHint: 'Help them notice patterns in where their boundaries shift. Ask curious questions about why certain contexts feel different.',
  },
};

const boundariesQuestions: DiscoveryQuestion[] = [
  {
    id: 'b1',
    prompt: 'A friend keeps venting to you about the same problem. You…',
    options: [
      { key: 'healthy', label: 'Listen but set a gentle limit on my energy', emoji: '🌿' },
      { key: 'porous', label: 'Take on their stress as if it\'s mine', emoji: '🫧' },
      { key: 'rigid', label: 'Pull away — I can\'t handle their emotions', emoji: '🧱' },
      { key: 'mixed', label: 'It depends on the friend and my mood', emoji: '🎭' },
    ],
  },
  {
    id: 'b2',
    prompt: 'Someone asks you to do something you really don\'t want to do. You…',
    options: [
      { key: 'healthy', label: 'Say no kindly and don\'t feel guilty', emoji: '🌿' },
      { key: 'porous', label: 'Say yes even though I\'ll resent it later', emoji: '🫧' },
      { key: 'rigid', label: 'Shut it down immediately, no discussion', emoji: '🧱' },
      { key: 'mixed', label: 'Depends on who\'s asking', emoji: '🎭' },
    ],
  },
  {
    id: 'b3',
    prompt: 'How much do you share about your personal life with acquaintances?',
    options: [
      { key: 'healthy', label: 'Enough to be friendly, but I keep some things private', emoji: '🌿' },
      { key: 'porous', label: 'A lot — sometimes too much, honestly', emoji: '🫧' },
      { key: 'rigid', label: 'Almost nothing — I keep people at a distance', emoji: '🧱' },
      { key: 'mixed', label: 'It depends on the vibe I get from them', emoji: '🎭' },
    ],
  },
  {
    id: 'b4',
    prompt: 'Someone crosses a line with you. What\'s your first instinct?',
    options: [
      { key: 'healthy', label: 'Address it directly but calmly', emoji: '🌿' },
      { key: 'porous', label: 'Let it slide and hope it doesn\'t happen again', emoji: '🫧' },
      { key: 'rigid', label: 'Cut them off or distance myself immediately', emoji: '🧱' },
      { key: 'mixed', label: 'Freeze up in the moment, process later', emoji: '🎭' },
    ],
  },
];

function scoreBoundaries(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { healthy: 0, porous: 0, rigid: 0, mixed: 0 };
  Object.values(answers).forEach((v) => { if (tally[v] !== undefined) tally[v]++; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = boundariesResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? boundariesResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── ENNEAGRAM ──────────────────────────── */

const enneagramResults: Record<string, DiscoveryResult> = {
  reformer: { key: 'reformer', label: 'The Reformer (Type 1)', emoji: '⚖️', description: 'I have high standards and a strong sense of right and wrong. I strive for integrity and improvement in everything I do.', companionHint: 'Validate their standards without enabling perfectionism. Help them see "good enough" is sometimes perfect.' },
  helper: { key: 'helper', label: 'The Helper (Type 2)', emoji: '💗', description: 'I\'m warm, generous, and deeply attuned to others\' needs. I feel most fulfilled when making someone\'s day better.', companionHint: 'Remind them to care for themselves too. Ask about their needs, not just what they\'re doing for others.' },
  achiever: { key: 'achiever', label: 'The Achiever (Type 3)', emoji: '🏆', description: 'I\'m driven, adaptable, and image-conscious. I measure success and want to be admired for my accomplishments.', companionHint: 'Celebrate who they are, not just what they achieve. Help them feel valued beyond their output.' },
  individualist: { key: 'individualist', label: 'The Individualist (Type 4)', emoji: '🎨', description: 'I\'m creative, emotionally deep, and drawn to authenticity. I feel things intensely and seek meaning in everything.', companionHint: 'Honor their emotional depth. Don\'t minimize their feelings or rush to silver linings.' },
  investigator: { key: 'investigator', label: 'The Investigator (Type 5)', emoji: '🔬', description: 'I\'m analytical, curious, and independent. I need time to think and recharge before engaging with the world.', companionHint: 'Give them intellectual stimulation and space. Don\'t overwhelm with emotional demands — let them come to you.' },
  loyalist: { key: 'loyalist', label: 'The Loyalist (Type 6)', emoji: '🛡️', description: 'I\'m responsible, security-oriented, and deeply loyal. I anticipate problems and value trustworthy relationships.', companionHint: 'Be consistent and reliable. Provide reassurance without dismissing their concerns as overthinking.' },
  enthusiast: { key: 'enthusiast', label: 'The Enthusiast (Type 7)', emoji: '🎉', description: 'I\'m spontaneous, optimistic, and always seeking the next adventure. I avoid pain by staying in motion and possibility.', companionHint: 'Match their energy but gently help them sit with harder emotions when needed. Don\'t always let them deflect.' },
  challenger: { key: 'challenger', label: 'The Challenger (Type 8)', emoji: '🔥', description: 'I\'m powerful, decisive, and protective. I lead from the front and can\'t stand injustice or being controlled.', companionHint: 'Be direct and don\'t sugarcoat. Respect their strength while gently creating space for vulnerability.' },
  peacemaker: { key: 'peacemaker', label: 'The Peacemaker (Type 9)', emoji: '☁️', description: 'I\'m easygoing, accepting, and harmonious. I see every perspective and prioritize peace — sometimes at my own expense.', companionHint: 'Encourage them to voice their own opinions and desires. Don\'t let them disappear into accommodation.' },
};

const enneagramQuestions: DiscoveryQuestion[] = [
  {
    id: 'e1',
    prompt: 'What drives you most in life?',
    options: [
      { key: 'reformer', label: 'Doing the right thing and improving', emoji: '⚖️' },
      { key: 'helper', label: 'Being needed and helping others', emoji: '💗' },
      { key: 'achiever', label: 'Succeeding and being recognized', emoji: '🏆' },
      { key: 'individualist', label: 'Being authentic and finding meaning', emoji: '🎨' },
    ],
  },
  {
    id: 'e2',
    prompt: 'In a group, you naturally tend to…',
    options: [
      { key: 'investigator', label: 'Observe and analyze before speaking', emoji: '🔬' },
      { key: 'loyalist', label: 'Look for potential problems or risks', emoji: '🛡️' },
      { key: 'enthusiast', label: 'Bring the energy and new ideas', emoji: '🎉' },
      { key: 'challenger', label: 'Take charge and lead the way', emoji: '🔥' },
    ],
  },
  {
    id: 'e3',
    prompt: 'What\'s your biggest fear?',
    options: [
      { key: 'reformer', label: 'Being corrupt or morally flawed', emoji: '⚖️' },
      { key: 'helper', label: 'Being unloved or unneeded', emoji: '💗' },
      { key: 'individualist', label: 'Having no identity or significance', emoji: '🎨' },
      { key: 'peacemaker', label: 'Conflict and disconnection', emoji: '☁️' },
    ],
  },
  {
    id: 'e4',
    prompt: 'When stressed, you tend to…',
    options: [
      { key: 'achiever', label: 'Work even harder to prove myself', emoji: '🏆' },
      { key: 'investigator', label: 'Withdraw and overthink', emoji: '🔬' },
      { key: 'loyalist', label: 'Worry about worst-case scenarios', emoji: '🛡️' },
      { key: 'enthusiast', label: 'Distract myself with something fun', emoji: '🎉' },
    ],
  },
  {
    id: 'e5',
    prompt: 'What resonates most with how you move through life?',
    options: [
      { key: 'challenger', label: 'I protect the people I love fiercely', emoji: '🔥' },
      { key: 'peacemaker', label: 'I keep the peace even at my own cost', emoji: '☁️' },
      { key: 'helper', label: 'I pour into others before myself', emoji: '💗' },
      { key: 'individualist', label: 'I feel things deeper than most people', emoji: '🎨' },
    ],
  },
];

function scoreEnneagram(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = {};
  Object.keys(enneagramResults).forEach((k) => { tally[k] = 0; });
  Object.values(answers).forEach((v) => { if (tally[v] !== undefined) tally[v]++; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = enneagramResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? enneagramResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── EMOTIONAL INTELLIGENCE ──────────────────────────── */

const eqResults: Record<string, DiscoveryResult> = {
  high: {
    key: 'high',
    label: 'Highly Emotionally Intelligent',
    emoji: '🧠',
    description: 'I read rooms like a book. I navigate emotions — mine and others\' — with rare clarity and grace.',
    companionHint: 'Engage at a deep emotional level. They appreciate nuance, subtext, and emotional sophistication in conversation.',
  },
  growing: {
    key: 'growing',
    label: 'Growing EQ',
    emoji: '🌱',
    description: 'I\'m aware of emotions but still building the skills to navigate them consistently. I\'m on a great path.',
    companionHint: 'Gently name emotions they might be feeling. Help them build vocabulary for their inner world.',
  },
  analytical: {
    key: 'analytical',
    label: 'Analytical Processor',
    emoji: '📊',
    description: 'I lead with logic and can sometimes miss emotional undercurrents. Feelings are real data — I\'m learning to read them.',
    companionHint: 'Bridge logic and emotion. Frame feelings as useful data points rather than irrational noise.',
  },
  empathic: {
    key: 'empathic',
    label: 'Deep Empath',
    emoji: '🌊',
    description: 'I feel everything — often absorbing others\' emotions as my own. My gift is connection; my challenge is boundaries.',
    companionHint: 'Help them distinguish their emotions from others\'. Encourage emotional boundaries while honoring their sensitivity.',
  },
};

const eqQuestions: DiscoveryQuestion[] = [
  {
    id: 'eq1',
    prompt: 'A friend is smiling but seems "off." You…',
    options: [
      { key: 'high', label: 'Notice immediately and ask gently', emoji: '🧠' },
      { key: 'growing', label: 'Sense something but aren\'t sure what', emoji: '🌱' },
      { key: 'analytical', label: 'Take their smile at face value', emoji: '📊' },
      { key: 'empathic', label: 'Feel their sadness in my own body', emoji: '🌊' },
    ],
  },
  {
    id: 'eq2',
    prompt: 'You\'re angry about something unfair. What do you do?',
    options: [
      { key: 'high', label: 'Name the emotion, then decide how to respond', emoji: '🧠' },
      { key: 'growing', label: 'Vent first, reflect later', emoji: '🌱' },
      { key: 'analytical', label: 'Analyze why it happened before reacting', emoji: '📊' },
      { key: 'empathic', label: 'Feel overwhelmed by the emotion', emoji: '🌊' },
    ],
  },
  {
    id: 'eq3',
    prompt: 'Someone gives you critical feedback. Your first reaction is…',
    options: [
      { key: 'high', label: 'Listen, process, and separate valid from noise', emoji: '🧠' },
      { key: 'growing', label: 'Feel stung but try to learn from it', emoji: '🌱' },
      { key: 'analytical', label: 'Evaluate if the feedback is logically sound', emoji: '📊' },
      { key: 'empathic', label: 'Take it personally and feel it deeply', emoji: '🌊' },
    ],
  },
  {
    id: 'eq4',
    prompt: 'In a heated group discussion, you typically…',
    options: [
      { key: 'high', label: 'Read the room and de-escalate naturally', emoji: '🧠' },
      { key: 'growing', label: 'Try to help but sometimes make it worse', emoji: '🌱' },
      { key: 'analytical', label: 'Stay logical and focus on facts', emoji: '📊' },
      { key: 'empathic', label: 'Absorb the tension and feel drained', emoji: '🌊' },
    ],
  },
];

function scoreEQ(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { high: 0, growing: 0, analytical: 0, empathic: 0 };
  Object.values(answers).forEach((v) => { if (tally[v] !== undefined) tally[v]++; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = eqResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? eqResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── COMMUNICATION STYLE ──────────────────────────── */

const commResults: Record<string, DiscoveryResult> = {
  assertive: {
    key: 'assertive',
    label: 'Assertive Communicator',
    emoji: '🎯',
    description: 'I say what I mean clearly and respectfully. I advocate for myself without steamrolling others — and I\'m proud of that.',
    companionHint: 'Be direct and clear. They appreciate straightforward communication without excessive softening.',
  },
  passive: {
    key: 'passive',
    label: 'Passive Communicator',
    emoji: '🤐',
    description: 'I tend to hold back my needs and go along to get along. Harmony feels safer than honesty — but it costs me.',
    companionHint: 'Create space for their voice. Ask "what do YOU want?" and sit in the silence. Encourage self-advocacy gently.',
  },
  aggressive: {
    key: 'aggressive',
    label: 'Aggressive Communicator',
    emoji: '🔊',
    description: 'I\'m bold and unfiltered — I get my point across but can overwhelm others. My challenge is volume control.',
    companionHint: 'Don\'t be intimidated by their intensity. Match their directness but model softer delivery when appropriate.',
  },
  passiveaggressive: {
    key: 'passiveaggressive',
    label: 'Passive-Aggressive Communicator',
    emoji: '😏',
    description: 'I express frustration indirectly — sarcasm, subtle jabs, or silent treatment. I feel things deeply but struggle to say them directly.',
    companionHint: 'Help them name what they\'re really feeling. Create safety for direct expression without judgment.',
  },
};

const commQuestions: DiscoveryQuestion[] = [
  {
    id: 'cm1',
    prompt: 'Your roommate keeps leaving dishes in the sink. You…',
    options: [
      { key: 'assertive', label: '"Hey, can we set up a dish schedule?"', emoji: '🎯' },
      { key: 'passive', label: 'Quietly wash them myself every time', emoji: '🤐' },
      { key: 'aggressive', label: '"You NEVER clean up after yourself!"', emoji: '🔊' },
      { key: 'passiveaggressive', label: 'Leave them a longer, pointedly stacked', emoji: '😏' },
    ],
  },
  {
    id: 'cm2',
    prompt: 'You disagree with your boss in a meeting. You…',
    options: [
      { key: 'assertive', label: 'Respectfully share my perspective', emoji: '🎯' },
      { key: 'passive', label: 'Stay quiet and go along with it', emoji: '🤐' },
      { key: 'aggressive', label: 'Challenge them directly in front of everyone', emoji: '🔊' },
      { key: 'passiveaggressive', label: 'Agree outwardly, complain to colleagues later', emoji: '😏' },
    ],
  },
  {
    id: 'cm3',
    prompt: 'A friend hurt your feelings. How do you handle it?',
    options: [
      { key: 'assertive', label: 'Tell them how I feel and what I need', emoji: '🎯' },
      { key: 'passive', label: 'Pretend it\'s fine and avoid bringing it up', emoji: '🤐' },
      { key: 'aggressive', label: 'Snap at them and bring up old stuff too', emoji: '🔊' },
      { key: 'passiveaggressive', label: 'Give short answers and hope they figure it out', emoji: '😏' },
    ],
  },
  {
    id: 'cm4',
    prompt: 'Someone takes credit for your idea. You…',
    options: [
      { key: 'assertive', label: 'Calmly clarify that it was my idea', emoji: '🎯' },
      { key: 'passive', label: 'Let it go — it\'s not worth the conflict', emoji: '🤐' },
      { key: 'aggressive', label: 'Call them out immediately and publicly', emoji: '🔊' },
      { key: 'passiveaggressive', label: 'Make subtle comments about "original ideas"', emoji: '😏' },
    ],
  },
];

function scoreComm(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { assertive: 0, passive: 0, aggressive: 0, passiveaggressive: 0 };
  Object.values(answers).forEach((v) => { if (tally[v] !== undefined) tally[v]++; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = commResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? commResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── VALUES MAPPING ──────────────────────────── */

const valuesResults: Record<string, DiscoveryResult> = {
  connection: {
    key: 'connection',
    label: 'Connection-Driven',
    emoji: '🤝',
    description: 'Relationships are my core currency. I prioritize love, belonging, and deep bonds over achievements or status.',
    companionHint: 'Emphasize relational warmth. Reference shared experiences and community. Help them nurture their bonds.',
  },
  freedom: {
    key: 'freedom',
    label: 'Freedom-Driven',
    emoji: '🦅',
    description: 'Independence and autonomy are non-negotiable for me. I need space to explore, create, and live on my own terms.',
    companionHint: 'Respect their independence fiercely. Don\'t be clingy. Offer options, not directives.',
  },
  growth: {
    key: 'growth',
    label: 'Growth-Driven',
    emoji: '📈',
    description: 'I\'m always leveling up — learning, improving, and pushing my limits. Stagnation is my worst nightmare.',
    companionHint: 'Feed their curiosity. Share insights, challenge their thinking, and celebrate their progress.',
  },
  security: {
    key: 'security',
    label: 'Security-Driven',
    emoji: '🏠',
    description: 'Stability, safety, and predictability matter most to me. I build strong foundations before taking risks.',
    companionHint: 'Be consistent and reliable. Avoid surprises. Help them feel grounded and safe before pushing comfort zones.',
  },
  impact: {
    key: 'impact',
    label: 'Impact-Driven',
    emoji: '✊',
    description: 'I want my life to matter — to leave a mark, help others, or change something for the better. Legacy matters to me.',
    companionHint: 'Connect their actions to bigger purpose. Help them see how their choices create ripples in the world.',
  },
};

const valuesQuestions: DiscoveryQuestion[] = [
  {
    id: 'v1',
    prompt: 'You just got a job offer: more money but you\'d move far from friends. You…',
    options: [
      { key: 'connection', label: 'Stay — relationships are everything', emoji: '🤝' },
      { key: 'freedom', label: 'Go — new city, new adventure', emoji: '🦅' },
      { key: 'growth', label: 'Go — the career growth is too good to pass', emoji: '📈' },
      { key: 'security', label: 'Need more info — is it stable?', emoji: '🏠' },
      { key: 'impact', label: 'Depends — will the work matter more?', emoji: '✊' },
    ],
  },
  {
    id: 'v2',
    prompt: 'What would make you feel most fulfilled at 80?',
    options: [
      { key: 'connection', label: 'Being surrounded by people who love me', emoji: '🤝' },
      { key: 'freedom', label: 'Knowing I lived completely on my terms', emoji: '🦅' },
      { key: 'growth', label: 'Looking back at how much I learned and grew', emoji: '📈' },
      { key: 'security', label: 'Having built a stable, comfortable life', emoji: '🏠' },
      { key: 'impact', label: 'Knowing I made a real difference', emoji: '✊' },
    ],
  },
  {
    id: 'v3',
    prompt: 'Your weekend is completely free. What calls to you?',
    options: [
      { key: 'connection', label: 'Quality time with people I love', emoji: '🤝' },
      { key: 'freedom', label: 'A spontaneous solo adventure', emoji: '🦅' },
      { key: 'growth', label: 'Learning something new or working on a project', emoji: '📈' },
      { key: 'security', label: 'Recharging at home, catching up on rest', emoji: '🏠' },
      { key: 'impact', label: 'Volunteering or working on something meaningful', emoji: '✊' },
    ],
  },
  {
    id: 'v4',
    prompt: 'What stresses you out the most?',
    options: [
      { key: 'connection', label: 'Feeling disconnected from the people I love', emoji: '🤝' },
      { key: 'freedom', label: 'Feeling trapped or controlled', emoji: '🦅' },
      { key: 'growth', label: 'Feeling stuck with no progress', emoji: '📈' },
      { key: 'security', label: 'Financial or life instability', emoji: '🏠' },
      { key: 'impact', label: 'Feeling like my work doesn\'t matter', emoji: '✊' },
    ],
  },
];

function scoreValues(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { connection: 0, freedom: 0, growth: 0, security: 0, impact: 0 };
  Object.values(answers).forEach((v) => { if (tally[v] !== undefined) tally[v]++; });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = valuesResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? valuesResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── STRESS RESPONSE ──────────────────────────── */

const stressResults: Record<string, DiscoveryResult> = {
  fighter: {
    key: 'fighter',
    label: 'The Fighter',
    emoji: '⚔️',
    description: 'Under pressure I charge forward — tackling problems head-on, taking control, and powering through. I turn stress into fuel.',
    companionHint: 'Match their energy when stressed. Offer actionable solutions quickly. Don\'t coddle — help them strategize and move.',
  },
  flighter: {
    key: 'flighter',
    label: 'The Escaper',
    emoji: '🏃',
    description: 'When stress hits, I need distance first — a walk, music, or just space to breathe before I can think clearly.',
    companionHint: 'Give them breathing room when overwhelmed. Suggest calming breaks before problem-solving. Don\'t push for immediate answers.',
  },
  freezer: {
    key: 'freezer',
    label: 'The Pauser',
    emoji: '🧊',
    description: 'I feel paralyzed, numb, or unable to make decisions. Stress can make me shut down — I need time to thaw before I can process.',
    companionHint: 'Be patient and gentle. Break overwhelming situations into tiny steps. Offer warmth without pressure to act immediately.',
  },
  fawner: {
    key: 'fawner',
    label: 'The Peacekeeper',
    emoji: '🤝',
    description: 'I try to please others or keep the peace to avoid conflict and stay safe. Under stress, I prioritize everyone else\'s comfort over my own.',
    companionHint: 'Gently remind them their needs matter equally. Validate their care for others while redirecting attention to their own feelings.',
  },
  flopper: {
    key: 'flopper',
    label: 'The Surrenderer',
    emoji: '🏳️',
    description: 'I lose all energy, feeling completely overwhelmed and unable to function. My system just… gives up for a while.',
    companionHint: 'Meet them with zero pressure. Acknowledge the overwhelm without trying to fix it. Small comfort first, action later.',
  },
  fixer: {
    key: 'fixer',
    label: 'The Fixer',
    emoji: '🔧',
    description: 'My stress response is to help everyone else — keeping busy with others\' problems distracts from my own overwhelm.',
    companionHint: 'Gently redirect focus back to their own needs. Acknowledge their care for others while encouraging self-care first.',
  },
};

const stressQuestions: DiscoveryQuestion[] = [
  {
    id: 's1',
    prompt: 'You just got hit with unexpected bad news. Your first instinct is to…',
    options: [
      { key: 'fighter', label: 'Start figuring out how to fix it immediately', emoji: '⚔️' },
      { key: 'flighter', label: 'Step away and take a breather first', emoji: '🏃' },
      { key: 'freezer', label: 'Go quiet while I process what just happened', emoji: '🧊' },
      { key: 'fawner', label: 'Make sure everyone else is okay first', emoji: '🤝' },
      { key: 'fixer', label: 'Start solving it for the people affected', emoji: '🔧' },
    ],
  },
  {
    id: 's2',
    prompt: 'You have way too much on your plate. How do you cope?',
    options: [
      { key: 'fighter', label: 'Power through the list, no breaks', emoji: '⚔️' },
      { key: 'flighter', label: 'Escape into something comforting first', emoji: '🏃' },
      { key: 'freezer', label: 'Stare at the list feeling overwhelmed', emoji: '🧊' },
      { key: 'flopper', label: 'Collapse — I just can\'t right now', emoji: '🏳️' },
      { key: 'fixer', label: 'Help someone else with their stuff instead', emoji: '🔧' },
    ],
  },
  {
    id: 's3',
    prompt: 'Someone you care about is upset with you. You…',
    options: [
      { key: 'fighter', label: 'Confront it directly and hash it out', emoji: '⚔️' },
      { key: 'flighter', label: 'Need time alone before I can talk about it', emoji: '🏃' },
      { key: 'freezer', label: 'Shut down and don\'t know what to say', emoji: '🧊' },
      { key: 'fawner', label: 'Apologize immediately even if I\'m not sure what for', emoji: '🤝' },
      { key: 'fixer', label: 'Immediately try to make them feel better', emoji: '🔧' },
    ],
  },
  {
    id: 's4',
    prompt: 'After a really stressful week, you recharge by…',
    options: [
      { key: 'fighter', label: 'Doing something intense — gym, cleaning, project', emoji: '⚔️' },
      { key: 'flighter', label: 'Getting away from everything — nature, travel, solitude', emoji: '🏃' },
      { key: 'freezer', label: 'Going numb — bed, couch, disconnect', emoji: '🧊' },
      { key: 'flopper', label: 'I don\'t recharge — I just stay depleted for a while', emoji: '🏳️' },
      { key: 'fawner', label: 'Spending time making sure my people are good', emoji: '🤝' },
    ],
  },
  {
    id: 's5',
    prompt: 'Which sentence sounds most like you?',
    options: [
      { key: 'fighter', label: '"I\'d rather act than wait"', emoji: '⚔️' },
      { key: 'flighter', label: '"I need space to figure things out"', emoji: '🏃' },
      { key: 'freezer', label: '"Sometimes I just… can\'t"', emoji: '🧊' },
      { key: 'fawner', label: '"If you\'re happy, I\'m happy"', emoji: '🤝' },
      { key: 'flopper', label: '"Everything hits me at once and I shut down"', emoji: '🏳️' },
      { key: 'fixer', label: '"If everyone else is okay, I\'m okay"', emoji: '🔧' },
    ],
  },
];

function scoreStress(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { fighter: 0, flighter: 0, freezer: 0, fawner: 0, flopper: 0, fixer: 0 };
  Object.values(answers).forEach((v) => {
    if (tally[v] !== undefined) tally[v]++;
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = stressResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? stressResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}

/* ──────────────────────────── EXPRESSION STYLE ──────────────────────────── */

const expressionResults: Record<string, DiscoveryResult> = {
  captivator: {
    key: 'captivator',
    label: 'The Captivator',
    emoji: '✨',
    description: 'You naturally draw people in with your energy and presence. You know how to make someone feel like they\'re the only person in the room.',
    companionHint: 'Match their engaging energy. They thrive on banter, tension-building, and playful back-and-forth. Keep conversations dynamic.',
  },
  freezer: {
    key: 'freezer',
    label: 'The Thinker',
    emoji: '🧊',
    description: 'You process deeply before you speak — which means when you freeze, it\'s because you\'re trying to find the perfect words. Your depth is a strength waiting to be unlocked.',
    companionHint: 'Give them space to think. Offer gentle prompts rather than rapid-fire questions. They appreciate patience and depth over speed.',
  },
  cushioner: {
    key: 'cushioner',
    label: 'The Cushioner',
    emoji: '🛋️',
    description: 'You soften everything — over-explaining, hedging, and adding qualifiers. You care deeply about how you\'re perceived, but sometimes your message gets lost in the cushioning.',
    companionHint: 'Gently encourage directness. Model clear, concise communication. Celebrate when they express themselves without over-qualifying.',
  },
  deflector: {
    key: 'deflector',
    label: 'The Deflector',
    emoji: '🪃',
    description: 'You redirect attention away from yourself — using humor, questions, or topic changes. You\'re great at making others feel seen but struggle to let yourself be seen.',
    companionHint: 'Gently redirect focus back to them. When they deflect, acknowledge it warmly and invite them to share. Create safety for self-expression.',
  },
  charger: {
    key: 'charger',
    label: 'The Charger',
    emoji: '⚡',
    description: 'You go direct — sometimes too direct. You say what you mean without much filtering, which commands respect but can occasionally overwhelm.',
    companionHint: 'Appreciate their directness. They don\'t need cushioning — match their energy but help them read the room when subtlety matters.',
  },
};

const expressionQuestions: DiscoveryQuestion[] = [
  {
    id: 'ex1',
    prompt: 'Someone says something clever and a little flirty. Your first instinct is to…',
    options: [
      { key: 'captivator', label: 'Match their energy and raise the stakes', emoji: '✨' },
      { key: 'freezer', label: 'Smile but struggle to find the right comeback', emoji: '🧊' },
      { key: 'cushioner', label: 'Laugh it off and over-explain my reaction', emoji: '🛋️' },
      { key: 'deflector', label: 'Deflect with a joke about something else', emoji: '🪃' },
      { key: 'charger', label: 'Say exactly what I\'m thinking, unfiltered', emoji: '⚡' },
    ],
  },
  {
    id: 'ex2',
    prompt: 'You\'re on the phone trying to keep someone\'s attention. You tend to…',
    options: [
      { key: 'captivator', label: 'Create intrigue — I know how to hold a pause', emoji: '✨' },
      { key: 'freezer', label: 'Go quiet when I can\'t think of what to say next', emoji: '🧊' },
      { key: 'cushioner', label: 'Fill every silence with more words', emoji: '🛋️' },
      { key: 'deflector', label: 'Ask them questions so I don\'t have to talk about me', emoji: '🪃' },
      { key: 'charger', label: 'Get straight to the point — no small talk', emoji: '⚡' },
    ],
  },
  {
    id: 'ex3',
    prompt: 'Someone opens up emotionally to you. Your response is usually to…',
    options: [
      { key: 'captivator', label: 'Meet them where they are and go deeper', emoji: '✨' },
      { key: 'freezer', label: 'Feel deeply but not know what to say', emoji: '🧊' },
      { key: 'cushioner', label: 'Validate them repeatedly — maybe too much', emoji: '🛋️' },
      { key: 'deflector', label: 'Share a similar story to take the pressure off them', emoji: '🪃' },
      { key: 'charger', label: 'Give them honest advice immediately', emoji: '⚡' },
    ],
  },
  {
    id: 'ex4',
    prompt: 'You need to set a boundary with someone you care about. You…',
    options: [
      { key: 'captivator', label: 'Say it with warmth but clarity — no room for confusion', emoji: '✨' },
      { key: 'freezer', label: 'Think about it for hours and maybe never say it', emoji: '🧊' },
      { key: 'cushioner', label: 'Over-apologize while trying to explain myself', emoji: '🛋️' },
      { key: 'deflector', label: 'Hint at it indirectly and hope they get the message', emoji: '🪃' },
      { key: 'charger', label: 'Tell them straight — they\'ll respect me for it', emoji: '⚡' },
    ],
  },
  {
    id: 'ex5',
    prompt: 'In a group conversation, you usually…',
    options: [
      { key: 'captivator', label: 'Naturally become the center of the energy', emoji: '✨' },
      { key: 'freezer', label: 'Listen more than I speak — by choice or by freeze', emoji: '🧊' },
      { key: 'cushioner', label: 'Agree with everyone to keep things smooth', emoji: '🛋️' },
      { key: 'deflector', label: 'Keep the spotlight on others with questions', emoji: '🪃' },
      { key: 'charger', label: 'Speak up first and steer the direction', emoji: '⚡' },
    ],
  },
];

function scoreExpression(answers: Record<string, string>): DiscoveryResult {
  const tally: Record<string, number> = { captivator: 0, freezer: 0, cushioner: 0, deflector: 0, charger: 0 };
  Object.values(answers).forEach((v) => {
    if (tally[v] !== undefined) tally[v]++;
  });
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0][0];
  const runnerUp = sorted[1]?.[0];
  const primary = expressionResults[winner];
  const secondary = runnerUp && sorted[1][1] > 0 ? expressionResults[runnerUp] : undefined;
  return { ...primary, secondaryKey: secondary?.key, secondaryLabel: secondary?.label, secondaryHint: secondary?.companionHint };
}



export const discoveryTopics: DiscoveryTopic[] = [
  {
    id: 'love-languages',
    title: 'Love Languages',
    subtitle: 'How you give & receive love',
    emoji: '❤️',
    color: 'rose',
    questions: loveLanguageQuestions,
    score: scoreLoveLanguages,
  },
  {
    id: 'attachment-style',
    title: 'Attachment Style',
    subtitle: 'How you connect in relationships',
    emoji: '🔗',
    color: 'blue',
    questions: attachmentQuestions,
    score: scoreAttachment,
  },
  {
    id: 'conflict-style',
    title: 'Conflict Style',
    subtitle: 'How you handle disagreements',
    emoji: '⚡',
    color: 'amber',
    questions: conflictQuestions,
    score: scoreConflict,
  },
  {
    id: 'apology-language',
    title: 'Apology Language',
    subtitle: 'How you need to hear "I\'m sorry"',
    emoji: '🙏',
    color: 'violet',
    questions: apologyQuestions,
    score: scoreApology,
  },
  {
    id: 'boundaries-style',
    title: 'Boundaries Style',
    subtitle: 'How you protect your energy',
    emoji: '🧱',
    color: 'emerald',
    questions: boundariesQuestions,
    score: scoreBoundaries,
  },
  {
    id: 'enneagram',
    title: 'Enneagram',
    subtitle: 'Your core personality archetype',
    emoji: '🔮',
    color: 'purple',
    questions: enneagramQuestions,
    score: scoreEnneagram,
  },
  {
    id: 'emotional-intelligence',
    title: 'Emotional Intelligence',
    subtitle: 'How well you read people & emotions',
    emoji: '🧠',
    color: 'teal',
    questions: eqQuestions,
    score: scoreEQ,
  },
  {
    id: 'communication-style',
    title: 'Communication Style',
    subtitle: 'How you express yourself',
    emoji: '🗣️',
    color: 'orange',
    questions: commQuestions,
    score: scoreComm,
  },
  {
    id: 'values-mapping',
    title: 'Values Mapping',
    subtitle: 'What actually drives your decisions',
    emoji: '🧭',
    color: 'cyan',
    questions: valuesQuestions,
    score: scoreValues,
  },
  {
    id: 'stress-response',
    title: 'Stress Response',
    subtitle: 'How you cope under pressure',
    emoji: '🔥',
    color: 'red',
    questions: stressQuestions,
    score: scoreStress,
  },
  {
    id: 'expression-style',
    title: 'Expression Style',
    subtitle: 'How you hold attention with words',
    emoji: '✨',
    color: 'amber',
    questions: expressionQuestions,
    score: scoreExpression,
  },
];

export function getDiscoveryTopic(id: string): DiscoveryTopic | undefined {
  return discoveryTopics.find((t) => t.id === id);
}
