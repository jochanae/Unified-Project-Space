export type TemplateCategory = 'Lead Gen' | 'Sales' | 'Launch';

export interface SharedTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  steps: string[];
  popular: boolean;
  /** One-line outcome statement shown on the card (no feature talk). */
  outcome: string;
  /** Approximate build time in minutes — what the user pays for in attention. */
  buildTimeMin: number;
  /** Curated install count — social proof. */
  installs: number;
}

/**
 * Curated launcher catalog. Tight on purpose (≤12). Three categories only.
 * Each card answers: what outcome do I get, how long, how many other operators trust it.
 */
export const TEMPLATES: SharedTemplate[] = [
  {
    id: 'lead-magnet',
    name: 'Coach Lead Magnet',
    description: 'Free download in exchange for an email, with a 5-email nurture sequence.',
    category: 'Lead Gen',
    steps: ['Landing Page', 'Thank You', 'Email Sequence', 'Upsell'],
    popular: true,
    outcome: 'Cold traffic → qualified email list',
    buildTimeMin: 4,
    installs: 1284,
  },
  {
    id: 'coaching',
    name: 'Discovery Call Funnel',
    description: 'Application-style funnel that qualifies prospects and books strategy calls.',
    category: 'Lead Gen',
    steps: ['Promise Page', 'Application', 'Booking', 'Confirmation'],
    popular: true,
    outcome: 'Strangers → booked calls on your calendar',
    buildTimeMin: 6,
    installs: 873,
  },
  {
    id: 'webinar',
    name: 'Webinar Registration',
    description: 'Registration page, confirmation, live event, and replay with CTA.',
    category: 'Lead Gen',
    steps: ['Registration', 'Confirmation', 'Live Page', 'Replay'],
    popular: false,
    outcome: 'Audience → live attendees with replay capture',
    buildTimeMin: 7,
    installs: 412,
  },
  {
    id: 'creator',
    name: 'Newsletter Subscribe',
    description: 'Personal hero, free issue preview, subscribe, and welcome sequence.',
    category: 'Lead Gen',
    steps: ['Creator Hero', 'Issue Preview', 'Subscribe', 'Welcome Sequence'],
    popular: true,
    outcome: 'Visitors → engaged newsletter subscribers',
    buildTimeMin: 4,
    installs: 967,
  },
  {
    id: 'ecommerce',
    name: 'Product Drop Funnel',
    description: 'Product showcase, cart, checkout, and post-purchase upsell flow.',
    category: 'Sales',
    steps: ['Product Page', 'Cart', 'Checkout', 'Upsell'],
    popular: true,
    outcome: 'Drop traffic → checkout + post-purchase upsell',
    buildTimeMin: 8,
    installs: 1102,
  },
  {
    id: 'consulting',
    name: 'Consulting Proposal',
    description: 'Insight-led landing, capability deck, case proof, and proposal request.',
    category: 'Sales',
    steps: ['Authority Page', 'Capabilities', 'Case Proof', 'Proposal'],
    popular: false,
    outcome: 'Inbound → high-ticket proposal requests',
    buildTimeMin: 7,
    installs: 318,
  },
  {
    id: 'agency-portfolio',
    name: 'Agency Pitch Page',
    description: 'Showcase case studies, testimonials, and a contact form for new clients.',
    category: 'Sales',
    steps: ['Hero', 'Case Studies', 'Testimonials', 'Contact'],
    popular: false,
    outcome: 'Referrals → vetted client inquiries',
    buildTimeMin: 5,
    installs: 504,
  },
  {
    id: 'fitness',
    name: '7-Day Challenge',
    description: '7-day challenge opt-in, daily emails, results stories, and program upsell.',
    category: 'Sales',
    steps: ['Challenge Opt-In', 'Daily Sequence', 'Transformations', 'Program Upsell'],
    popular: true,
    outcome: 'Opt-ins → paid program enrollments',
    buildTimeMin: 9,
    installs: 691,
  },
  {
    id: 'saas-launch',
    name: 'SaaS Launch',
    description: 'Pre-launch waitlist, feature showcase, pricing page, and checkout.',
    category: 'Launch',
    steps: ['Waitlist', 'Features', 'Pricing', 'Checkout'],
    popular: true,
    outcome: 'Pre-launch waitlist → first paying users',
    buildTimeMin: 8,
    installs: 1456,
  },
  {
    id: 'course',
    name: 'Course Enrollment',
    description: 'Free lesson preview, curriculum overview, testimonials, and enrollment.',
    category: 'Launch',
    steps: ['Free Lesson', 'Curriculum', 'Testimonials', 'Enroll'],
    popular: true,
    outcome: 'Curious learners → enrolled students',
    buildTimeMin: 7,
    installs: 832,
  },
  {
    id: 'reclaim-your-name',
    name: 'Reclaim Your Name',
    description: 'Personal-brand funnel that ranks YOUR name in Google with Person + ProfessionalService schema.',
    category: 'Launch',
    steps: ['Identity Hero', 'About / Bio', 'Services + Service Areas', 'Contact / Booking'],
    popular: true,
    outcome: 'Outrank old profiles → own your name in search',
    buildTimeMin: 5,
    installs: 547,
  },
  {
    id: 'nonprofit',
    name: 'Nonprofit Campaign',
    description: 'Story-driven donation funnel with impact showcase and recurring giving.',
    category: 'Launch',
    steps: ['Story', 'Impact', 'Donate', 'Thank You'],
    popular: false,
    outcome: 'Supporters → recurring donors',
    buildTimeMin: 6,
    installs: 289,
  },
];
