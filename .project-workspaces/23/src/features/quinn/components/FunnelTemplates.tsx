import { useState } from 'react';
import { BuildStreamResult } from '@/features/quinn/hooks/use-build-stream';
import { Home, BookOpen, Users, Monitor, Calendar, Mail, ChevronDown, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FunnelTemplatesProps {
  onSelect: (result: BuildStreamResult) => void;
}

interface Template {
  name: string;
  description: string;
  icon: React.ReactNode;
  data: BuildStreamResult;
}

const TEMPLATES: Template[] = [
  {
    name: 'Real Estate Lead Gen',
    description: 'Capture buyer/seller leads with a home valuation offer.',
    icon: <Home className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'Homeowners considering selling in the next 6-12 months',
        offer: 'Free instant home valuation report with local market insights',
        positioning: 'The neighborhood expert who knows your area inside out',
        hook: "Most homeowners leave $20K+ on the table — know your home's real value before listing.",
      },
      funnel_steps: [
        { title: 'Home Valuation Landing Page', step_type: 'page', description: 'Captures seller leads' },
        { title: 'Thank You & Report', step_type: 'page', description: 'Confirms and delivers valuation' },
        { title: 'Follow-Up Sequence', step_type: 'email', description: 'Nurtures toward listing consultation' },
      ],
      landing_page: {
        headline: "What's Your Home Really Worth?",
        subheadline: 'Get a free, instant valuation based on real neighborhood data — not Zillow estimates.',
        cta_text: 'Get My Free Valuation',
        features: [
          { title: 'Hyperlocal Data', description: 'Based on actual recent sales within a 1-mile radius of your property.' },
          { title: 'Market Trend Analysis', description: 'See whether your neighborhood is trending up, down, or holding steady.' },
          { title: 'No Obligation', description: 'Completely free — no strings attached, no pushy sales calls.' },
        ],
        social_proof: 'Over 1,200 homeowners have used our valuation tool this year.',
      },
      thank_you_page: {
        headline: 'Your Valuation Is on the Way!',
        subheadline: 'Check your email for your personalized home valuation report.',
        cta_text: 'Book a Free Consultation',
        bonus_message: 'Want to sell for top dollar? Book a free 15-minute strategy call.',
      },
      social_promo: {
        instagram_caption: "🏡 Thinking about selling your home? Don't guess what it's worth — know it.\n\nOur free home valuation tool uses real neighborhood data (not algorithms) to give you an accurate picture.\n\nTap the link in bio to get yours 👆\n\n#RealEstate #HomeValue #SellingAHome #FreeValuation",
        linkedin_post: "Most homeowners have no idea what their property is actually worth in today's market.\n\nWe built a free valuation tool that uses hyperlocal sales data to give you an accurate, no-obligation estimate.\n\nIf you're even thinking about selling in the next year, this is the first step → [link]",
        twitter_post: "🏡 Thinking about selling? Get a free home valuation based on real local sales data — not guesswork. Takes 30 seconds 👇",
        email_teaser: "Curious what your home is worth right now? We built a free tool that gives you an instant valuation based on actual neighborhood sales. No strings attached — check it out.",
      },
    },
  },
  {
    name: 'Course Launch',
    description: 'Pre-sell an online course with a free training preview.',
    icon: <BookOpen className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'Ambitious professionals looking to learn a high-value skill',
        offer: 'Free 45-minute masterclass preview of the full course',
        positioning: 'The practical, results-oriented instructor who teaches by doing',
        hook: 'Stop watching tutorials that go nowhere — learn the skill that actually moves the needle.',
      },
      funnel_steps: [
        { title: 'Masterclass Landing Page', step_type: 'page', description: 'Captures student leads' },
        { title: 'Thank You & Access', step_type: 'page', description: 'Delivers free training' },
        { title: 'Email Sequence', step_type: 'email', description: 'Nurtures toward course enrollment' },
      ],
      landing_page: {
        headline: 'Learn the Skill in 30 Days',
        subheadline: 'Join 5,000+ students in the free masterclass — then decide if the full course is right for you.',
        cta_text: 'Join the Free Masterclass',
        features: [
          { title: 'Project-Based Learning', description: 'Build a real portfolio project as you learn — not just theory.' },
          { title: 'Expert-Led Curriculum', description: 'Designed by an industry practitioner with 10+ years of experience.' },
          { title: 'Community Access', description: 'Join a private community of motivated learners for accountability.' },
        ],
        social_proof: '5,000+ students enrolled with a 4.9★ average rating.',
      },
      thank_you_page: {
        headline: "You're In! 🎉",
        subheadline: 'Your free masterclass access link is headed to your inbox right now.',
        cta_text: 'Join the Community',
        bonus_message: 'Early bird bonus: enroll in the full course within 48 hours and save 30%.',
      },
      social_promo: {
        instagram_caption: "📚 I spent 6 months building this course. Now you can preview it for free.\n\nThe masterclass covers the fundamentals that most tutorials skip — the stuff that actually matters.\n\nLink in bio to join 👆\n\n#OnlineLearning #FreeCourse #SkillUp #Education",
        linkedin_post: "I've been teaching this skill for 10 years. I distilled everything into a structured 30-day course.\n\nBefore you commit, try the free 45-minute masterclass. No credit card, no catch.\n\nJoin 5,000+ students → [link]",
        twitter_post: "📚 Free masterclass: learn the fundamentals most tutorials skip. 45 minutes, zero fluff. Join 5,000+ students 👇",
        email_teaser: "I just opened free access to a 45-minute masterclass that previews my full course. It covers the foundations most people get wrong. Grab your spot before it fills up.",
      },
    },
  },
  {
    name: 'Coaching Consultation',
    description: 'Book discovery calls for coaches and consultants.',
    icon: <Users className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'Entrepreneurs and professionals who feel stuck and want expert guidance',
        offer: 'Free 30-minute strategy call to diagnose bottlenecks',
        positioning: 'The accountability partner who delivers measurable outcomes',
        hook: "You don't need more information — you need the right strategy, applied consistently.",
      },
      funnel_steps: [
        { title: 'Strategy Call Landing Page', step_type: 'page', description: 'Books discovery calls' },
        { title: 'Thank You & Prep', step_type: 'page', description: 'Confirms booking' },
        { title: 'Pre-Call Sequence', step_type: 'email', description: 'Warms up before the call' },
      ],
      landing_page: {
        headline: 'Ready to 10X Your Results?',
        subheadline: "Book a free 30-minute strategy call. We'll diagnose what's holding you back and map out your next move.",
        cta_text: 'Book My Free Strategy Call',
        features: [
          { title: 'Personalized Roadmap', description: 'Walk away with a clear, actionable plan tailored to your situation.' },
          { title: 'Proven Framework', description: 'The same methodology used by 200+ clients to break through plateaus.' },
          { title: 'No Pressure', description: "This isn't a sales pitch — it's a genuine strategy session." },
        ],
        social_proof: '200+ clients coached with an average 3X ROI within 90 days.',
      },
      thank_you_page: {
        headline: "You're Booked! 🎯",
        subheadline: 'Check your email for confirmation and a short prep questionnaire.',
        cta_text: 'Complete the Questionnaire',
        bonus_message: 'Fill out the prep form so we can make the most of our 30 minutes together.',
      },
      social_promo: {
        instagram_caption: "🎯 Feeling stuck? Let's fix that.\n\nI'm opening up free 30-minute strategy calls this week. We'll diagnose what's holding you back and build a clear action plan.\n\nLink in bio to book 👆\n\n#Coaching #BusinessGrowth #StrategyCall #Entrepreneurship",
        linkedin_post: "After coaching 200+ professionals, I've noticed the same 3 bottlenecks show up again and again.\n\nI'm offering free 30-minute strategy calls to help you identify which one is holding you back — and how to fix it.\n\nBook yours → [link]",
        twitter_post: "🎯 Free strategy call: 30 minutes, zero fluff. Let's diagnose what's holding you back and map out your next move 👇",
        email_teaser: "I'm opening a few free strategy call slots this week. In 30 minutes, we'll pinpoint exactly what's stalling your growth and create a clear action plan. Book yours before they're gone.",
      },
    },
  },
  {
    name: 'SaaS Free Trial',
    description: 'Drive trial signups for your software product.',
    icon: <Monitor className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'Teams and professionals tired of clunky, outdated tools',
        offer: '14-day free trial with full feature access, no credit card required',
        positioning: 'The modern, intuitive alternative that just works',
        hook: 'Your current tool is costing you hours every week — switch in 5 minutes.',
      },
      funnel_steps: [
        { title: 'Free Trial Landing Page', step_type: 'page', description: 'Drives trial signups' },
        { title: 'Welcome & Onboarding', step_type: 'page', description: 'Activates new users' },
        { title: 'Trial Nurture Sequence', step_type: 'email', description: 'Drives activation and conversion' },
      ],
      landing_page: {
        headline: 'The Fastest Way to Solve the Problem',
        subheadline: 'Start your free 14-day trial — no credit card, no setup hassle, just results.',
        cta_text: 'Start Free Trial',
        features: [
          { title: 'Set Up in 5 Minutes', description: 'Import your data and start working immediately — no migration headaches.' },
          { title: 'Built for Teams', description: 'Real-time collaboration, shared workspaces, and granular permissions.' },
          { title: 'No Credit Card', description: 'Try everything for 14 days. Only pay if you love it.' },
        ],
        social_proof: '10,000+ teams trust us to run their operations.',
      },
      thank_you_page: {
        headline: 'Welcome Aboard! 🚀',
        subheadline: 'Your free trial is active. Check your email for login details and a quick-start guide.',
        cta_text: 'Open Dashboard',
        bonus_message: 'Pro tip: import your existing data in Settings → Import to see value immediately.',
      },
      social_promo: {
        instagram_caption: "🚀 Tired of clunky tools that slow you down?\n\nWe built the alternative. Fast, intuitive, and designed for modern teams.\n\nTry it free for 14 days — no credit card needed.\n\nLink in bio 👆\n\n#SaaS #Productivity #StartupLife #FreeTrial",
        linkedin_post: "Your team spends 5+ hours/week fighting with outdated tools. We built a modern alternative that just works.\n\n14-day free trial, no credit card, full feature access.\n\n10,000+ teams already made the switch → [link]",
        twitter_post: "🚀 Your current tool is slowing you down. Try the modern alternative — 14-day free trial, no credit card needed 👇",
        email_teaser: "We just launched a 14-day free trial with full feature access — no credit card required. If you've been meaning to upgrade your workflow, now's the time.",
      },
    },
  },
  {
    name: 'Event Registration',
    description: 'Capture RSVPs for webinars, workshops, or live events.',
    icon: <Calendar className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'Professionals and enthusiasts interested in the event topic',
        offer: 'Free registration to an exclusive live event with expert speakers',
        positioning: 'The must-attend event for anyone serious about the topic',
        hook: "This isn't another boring webinar — it's the event everyone will be talking about.",
      },
      funnel_steps: [
        { title: 'Event Registration Page', step_type: 'page', description: 'Captures RSVPs' },
        { title: 'Confirmation & Calendar', step_type: 'page', description: 'Confirms registration' },
        { title: 'Reminder Sequence', step_type: 'email', description: 'Drives attendance' },
      ],
      landing_page: {
        headline: "You're Invited: The Live Event",
        subheadline: 'Join industry leaders for an exclusive session packed with actionable insights. Limited spots available.',
        cta_text: 'Reserve My Spot',
        features: [
          { title: 'Expert Speakers', description: 'Learn from practitioners who have done it — not just theorists.' },
          { title: 'Live Q&A', description: 'Get your specific questions answered in real-time during the session.' },
          { title: 'Replay Access', description: "Can't make it live? Register anyway to get the replay sent to your inbox." },
        ],
        social_proof: '500+ professionals have already registered.',
      },
      thank_you_page: {
        headline: "You're Registered! 🎉",
        subheadline: 'Check your email for the calendar invite and joining details.',
        cta_text: 'Add to Calendar',
        bonus_message: 'Share with a colleague — great events are better with company.',
      },
      social_promo: {
        instagram_caption: "📅 Mark your calendar!\n\nWe're hosting a live event with expert speakers, live Q&A, and actionable takeaways.\n\nFree to attend. Limited spots.\n\nLink in bio to register 👆\n\n#LiveEvent #Webinar #ProfessionalDevelopment #FreeEvent",
        linkedin_post: "I'm hosting a free live event for professionals who want to level up.\n\nExpect: expert speakers, actionable frameworks, and a live Q&A.\n\n500+ people have already registered. Reserve your spot → [link]",
        twitter_post: "📅 Free live event — expert speakers, live Q&A, actionable insights. 500+ registered. Grab your spot 👇",
        email_teaser: "We're hosting a free live event with top industry speakers and a live Q&A. Spots are limited — register now to save yours (you'll get the replay either way).",
      },
    },
  },
  {
    name: 'Newsletter / Community',
    description: 'Grow an email list or community with a compelling lead magnet.',
    icon: <Mail className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'Curious professionals who want curated insights delivered to their inbox',
        offer: 'A weekly newsletter with exclusive insights, tools, and opportunities',
        positioning: 'The one email you actually look forward to reading',
        hook: "10,000 smart people start their week with this newsletter — here's why.",
      },
      funnel_steps: [
        { title: 'Subscribe Landing Page', step_type: 'page', description: 'Captures email subscribers' },
        { title: 'Welcome & First Issue', step_type: 'page', description: 'Delivers instant value' },
        { title: 'Welcome Sequence', step_type: 'email', description: 'Onboards new subscribers' },
      ],
      landing_page: {
        headline: 'Join 10,000 Smart People',
        subheadline: 'Get the best insights, tools, and opportunities delivered to your inbox every week. Free, always.',
        cta_text: 'Subscribe Free',
        features: [
          { title: 'Curated, Not Automated', description: 'Every issue is hand-picked and written by a human — never AI-generated filler.' },
          { title: '5-Minute Read', description: "Designed to be valuable in a single coffee break. No fluff, no filler." },
          { title: 'Unsubscribe Anytime', description: 'No lock-in, no spam, no tricks. If it stops being useful, one click and you\'re out.' },
        ],
        social_proof: '10,000+ subscribers with a 55% open rate.',
      },
      thank_you_page: {
        headline: 'Welcome to the Community! 👋',
        subheadline: 'Your first issue is headed to your inbox right now.',
        cta_text: 'Check Your Inbox',
        bonus_message: 'Pro tip: move us to your Primary tab so you never miss an issue.',
      },
      social_promo: {
        instagram_caption: "📬 10,000 people start their week with this newsletter.\n\nCurated insights, useful tools, and opportunities — in a 5-minute read.\n\nFree to subscribe. Link in bio 👆\n\n#Newsletter #CuratedContent #WeeklyInsights #JoinTheCommunity",
        linkedin_post: "I started a newsletter 2 years ago. Today, 10,000+ professionals read it every week.\n\nNo fluff, no filler — just curated insights you can actually use.\n\nSubscribe free → [link]",
        twitter_post: "📬 10,000 smart people read this newsletter weekly. Curated insights in a 5-minute read. Subscribe free 👇",
        email_teaser: "I write a free weekly newsletter that 10,000+ professionals swear by. Curated insights, tools, and opportunities — all in a 5-minute read. Join us.",
      },
    },
  },
  {
    name: 'Reclaim Your Name',
    description: 'Outrank old employer profiles. Ranks YOUR name + city in Google.',
    icon: <UserCheck className="h-5 w-5" />,
    data: {
      strategy: {
        audience: 'People searching your name, your city + your profession, or your previous employer + your name',
        offer: 'Direct access to YOU — your current services, philosophy, and how to work with you today',
        positioning: 'The definitive, current source of truth for your professional identity — not an outdated corporate profile',
        hook: "Stop letting old employers own your search results. This is who you are now.",
      },
      funnel_steps: [
        { title: 'Identity Hero — Name + Current Role', step_type: 'page', description: 'Optimized for "Your Name" + "Your Name + City" searches' },
        { title: 'About — Story, Credentials, Philosophy', step_type: 'page', description: 'Schema-tagged Person + Credentials' },
        { title: 'Services + Service Areas', step_type: 'page', description: 'ProfessionalService schema with geo-coverage' },
        { title: 'Direct Contact / Booking', step_type: 'page', description: 'Calendly or form — owned conversion' },
      ],
      landing_page: {
        headline: "[Your Full Name] — [Your Current Title]",
        subheadline: "Serving [Your City / Region]. Independent. Current. Reachable directly here.",
        cta_text: 'Book a Conversation With Me',
        features: [
          { title: 'Independent & Current', description: 'I am no longer affiliated with previous employers shown elsewhere online. This page is my official identity.' },
          { title: 'Direct Access', description: 'No call centers, no agent locator forms — reach me personally through this page.' },
          { title: 'Verified Credentials', description: 'Active licenses, certifications, and current service areas — all kept up to date here.' },
        ],
        social_proof: 'Trusted by clients across [Your City] and surrounding areas for over [X] years.',
      },
      thank_you_page: {
        headline: "Thanks — I'll Be In Touch Personally",
        subheadline: "You'll hear from me directly within one business day. No call center, no auto-routing.",
        cta_text: 'Connect on LinkedIn',
        bonus_message: 'Bookmark this page — it\'s the canonical source for my current work, not the older profiles search engines may still show.',
      },
      social_promo: {
        instagram_caption: "Quick note: if you\'ve searched my name and seen old profiles from previous employers — this is my current, official page.\n\nIndependent. Current. Reachable directly.\n\nLink in bio 👆\n\n#PersonalBrand #IndependentProfessional",
        linkedin_post: "If you\'ve Googled my name recently, you may have seen older profiles from previous employers still ranking high. Those aren\'t current.\n\nThis is my official, up-to-date identity → [link]\n\nIndependent. Current. Direct.",
        twitter_post: "If you\'ve searched my name and found outdated profiles — this is the current me 👇 Independent, reachable, here.",
        email_teaser: "Quick heads up — I\'ve launched my official personal page so anyone searching my name finds my CURRENT work, not outdated employer profiles. Bookmark it: [link]",
      },
    },
  },
];

export function FunnelTemplates({ onSelect }: FunnelTemplatesProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
        Or start from a template
      </button>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => onSelect(t.data)}
              className="glass rounded-xl p-4 border border-border/50 text-left space-y-2 hover:border-primary/40 transition-colors card-hover-glow group"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                {t.icon}
              </div>
              <p className="text-sm font-medium leading-tight">{t.name}</p>
              <p className="text-xs text-muted-foreground leading-snug">{t.description}</p>
              <span className="inline-block text-[10px] font-semibold text-primary uppercase tracking-wider">
                Use Template →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
