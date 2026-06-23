import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, MessageSquare, Shield, FileText, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FAQ_ITEMS = [
  // Navigating IntoIQ
  {
    q: 'How is the app organized? (Map of IntoIQ)',
    a: 'The left sidebar (or hamburger menu on mobile) is grouped into five sections. Workspace — Dashboard (your home base), Projects (every brand/funnel you own), Analytics (performance across all funnels). Intelligence — Builder (the Build Stream where MarQ assembles funnels), Quick Launch (one-shot funnel from a single prompt), Signal Lab (clarify your message + visual identity), Strategy (your locked blueprint). Create — Brand Vault (assets) and Brand Studio (logo generator). Account — Learn, Help, Settings. System — Admin Hub (super admins only). Tip: every page also has a back-to-Dashboard route via the IntoIQ logo in the top left.',
  },
  {
    q: 'What is the ⌘K command palette?',
    a: 'Press ⌘K (Mac) or Ctrl+K (Windows) anywhere in the app to open Global Search. From there you can jump to any project, page, lead, or feature without clicking through the sidebar. It is the fastest way to navigate once you know the names of things.',
  },
  {
    q: 'What is the MarQ HUD at the bottom of the screen?',
    a: 'The glassy bar fixed at the bottom of every screen is the MarQ HUD — your AI co-pilot is reachable from anywhere. Tap it to ask MarQ a question about whatever you are currently looking at; she reads your route context and answers accordingly. On mobile it doubles as the primary navigation dock.',
  },
  {
    q: 'How do I navigate on mobile?',
    a: 'Tap the hamburger (☰) icon in the top-left to open the slide-in drawer. It mirrors the desktop sidebar — the same five groups (Workspace / Intelligence / Create / Account / System). The active page is highlighted in teal. Tap any item to jump there; the drawer closes automatically. Press Escape (or tap outside) to dismiss without navigating.',
  },
  // Getting Started
  {
    q: 'What is IntoIQ?',
    a: 'IntoIQ is an AI-powered funnel intelligence platform by Into Innovations. It takes you from a raw idea to a live, lead-capturing funnel — complete with brand strategy, landing pages, email sequences, CRM, commerce, analytics, and a logo generator — all guided by MarQ, your AI co-pilot.',
  },
  {
    q: 'I am brand new — what do I do first?',
    a: 'Open the Dashboard — the "Start Here" rail at the top walks you through your first 30 minutes in three moves: (1) Create your first project, (2) Run Signal Lab to lock your message + visual identity, (3) Quick Launch your first funnel. If you ever dismissed the rail and want it back, scroll to the bottom of this page and click "Show me around again".',
  },
  {
    q: 'How do I create my first project?',
    a: 'After signing in, you\'ll be guided through a quick 3-step onboarding: set your display name, describe your goal, and create your first project. You can also create new projects anytime from the Projects page or the Dashboard using the "+" button.',
  },
  {
    q: 'How do I sign in?',
    a: 'You can sign in with Google, Apple, or email and password. Google and Apple sign-in are one-tap — no extra setup needed. If you use email, you\'ll need to verify your email address before signing in.',
  },
  {
    q: 'I didn\'t receive my verification email. What do I do?',
    a: 'Check your spam/junk folder first. If it\'s not there, go back to the sign-in page, attempt to log in, and you\'ll see a "Resend verification email" option.',
  },
  // Signal Lab & Brand Identity
  {
    q: 'What is Signal Lab?',
    a: 'Signal Lab is your brand strategy accelerator. It walks you through three stages — Message Clarity, Signal Sharpening, and Identity/Vibe — to distill your raw ideas into a polished, high-fidelity brand signal. The output includes your refined message, social hooks, audience persona, and visual identity, all locked to your project.',
  },
  {
    q: 'How does Style Signal work?',
    a: 'Style Signal is the visual identity layer inside Signal Lab. Describe your aesthetic vibe — like "Vintage 80s CHANEL" or "Desert Modernism" — and MarQ translates that into a complete visual DNA: color palette, typography pairings, mood keywords, and design direction. This style data flows into every funnel page MarQ generates.',
  },
  {
    q: 'What is Identity Lock?',
    a: 'Identity Lock saves your Style Signal output (vibe description, palette, typography, and visual direction) as persistent project context. Once locked, every AI-generated piece of content — from landing pages to email sequences — is infused with your unique aesthetic. You can update it anytime by running a new Style Signal.',
  },
  // Build Stream & Workspace
  {
    q: 'How does the Build Stream work?',
    a: 'The Build Stream is your AI-powered workspace. Describe your goal and MarQ generates a complete funnel strategy, landing page content, email sequences, and funnel steps — all in a single vertical canvas. It includes Ghost Intelligence (inline suggestions accepted via Tab) and multi-level undo (Cmd+Z).',
  },
  {
    q: 'What are Funnel Templates?',
    a: 'Funnel Templates let you skip the blank-canvas phase. Choose from pre-built structures like Lead Magnet, SaaS Launch, E-Commerce, Webinar, Course Launch, and more. Each template instantly populates your Build Stream with a proven funnel architecture. You\'ll also find a Template Marketplace on your Dashboard.',
  },
  {
    q: 'How does MarQ work?',
    a: 'MarQ is your AI co-pilot across the entire platform. In Signal Lab, she refines your brand strategy. In the Build Stream, she generates funnel content infused with your locked signal. In the workspace, you can chat with her to refine ideas iteratively. In Insights, she provides strategic briefings. MarQ adapts to your project context — the more you refine your signal, the sharper her output becomes.',
  },
  // Pulse Command Map & Analytics
  {
    q: 'What is the Pulse Command Map?',
    a: 'The Pulse Command Map is a cinematic visualization of how visitors move through your funnel. It shows real-time energy flow between your funnel steps — views, conversions, and drop-off rates — with animated pipes and pulsing nodes. It sits in the hero position of your workspace so you can see your funnel\'s heartbeat at a glance.',
  },
  {
    q: 'How do I read my analytics?',
    a: 'Your Insights dashboard shows the Pulse Command Map (traffic flow visualization) and Performance Metrics (page views, form submissions, conversion rates, and trends). The Funnel Analytics and Experiment Dashboard give you deeper conversion insights, A/B test results, and cohort analysis.',
  },
  {
    q: 'Can I see where my leads are coming from geographically?',
    a: 'Yes. The Geo Insights panel on the Analytics page breaks down your leads by country, region, city, and ZIP/postal code — pulled from contacts that converted. Click any location chip to filter the rest of your dashboard down to that area, so you can see how a specific city or ZIP performs against the whole funnel. This is especially useful for local businesses or geo-targeted campaigns.',
  },
  {
    q: 'Can I generate a full marketing campaign bundle?',
    a: 'Yes. Open Marketing Studio → Quick Start, and MarQ will generate a complete campaign bundle — landing copy, email sequence, social posts, hashtags, and hooks — packaged as a downloadable .zip aligned to your locked brand signal. Use it to hand off to a team or import into other tools.',
  },
  // Pages & Publishing
  {
    q: 'Can I publish my landing pages?',
    a: 'Yes — on the Operator plan and above. Once published, your pages get a live URL at yourproject.intoiq.app and can capture leads in real time. The page builder supports rich content blocks including text, images, video embeds (YouTube, TikTok, HeyGen), Calendly widgets, and Stripe checkout buttons.',
  },
  {
    q: 'What are rich embeds?',
    a: 'Rich embeds let you drop YouTube videos, TikTok clips, HeyGen avatars, Calendly scheduling widgets, and Stripe checkout buttons directly into your landing pages. Just paste the URL or embed code into the page builder.',
  },
  // What else can IntoIQ do? — power features
  {
    q: 'What is Brand Voice Cloning?',
    a: 'On the Innovation plan, you can upload a short audio sample of yourself (or a voice you have rights to) and MarQ clones it via ElevenLabs Instant Voice Cloning. The cloned voice then appears as a "You" tile in MarQ Studio Video alongside the curated presets, so every generated VSL or video sounds unmistakably you. Manage your cloned voices in Marketing Studio → Brand Vault.',
  },
  {
    q: 'How does Marketing Studio work?',
    a: 'Marketing Studio is your production ecosystem — the Brand Vault (logos, colors, fonts), Brand Environments (multi-brand kits), Asset Library (everything MarQ has generated), Template Gallery, and the Strategist (MarQ drafts a 3-asset launch campaign — awareness, desire, action — locked to your brand). Open it from the Create group in the sidebar.',
  },
  {
    q: 'What are Webhooks?',
    a: 'On the Innovation plan, open Settings → Webhooks to register external endpoints that fire on funnel events (new lead, form submission, payment). Use this to pipe leads into Zapier, Make, your own CRM, or Slack in real time.',
  },
  {
    q: 'Do you have an affiliate program?',
    a: 'Yes — separate from referrals. The Affiliate Manager (Settings → Affiliates) lets you generate trackable affiliate links, monitor clicks and conversions, and earn recurring commission on customers you refer. Payouts are processed monthly via your linked Stripe account.',
  },
  {
    q: 'Can I invite teammates?',
    a: 'Yes. On the Innovation plan, open Settings → Team Collaboration to invite teammates by email and assign roles (Owner, Editor, Viewer). All projects, leads, and analytics inside your organization become visible to invited members based on their role.',
  },
  {
    q: 'Can IntoIQ send me push notifications?',
    a: 'Yes. From Settings → Notifications you can enable browser push notifications for new leads, form submissions, and MarQ briefings. Works on desktop browsers and on mobile when IntoIQ is installed as a PWA.',
  },
  {
    q: 'Can I export my Strategy Blueprint?',
    a: 'Yes. After Signal Lab locks your strategy, open the Strategy page and use the export button to download your blueprint as PDF or Markdown — or generate a read-only public URL you can share with collaborators, investors, or clients without granting them access to your account.',
  },
  // Logo Generator
  {
    q: 'What is the Logo Generator?',
    a: 'The Logo Generator is a built-in design studio for creating professional logos. It features a drag-and-drop canvas, text elements with gradient fills, brand templates (Premium Real Estate, Tech Startup, Wellness Coach, Creative Agency, Luxury Fashion), MarQ AI logo suggestions, and the ability to save logos directly to your project assets.',
  },
  // CRM & Contacts
  {
    q: 'How does the CRM work?',
    a: 'The CRM Dashboard tracks every lead captured through your funnels. You can view contacts, manage pipeline stages, and add notes and tags. Contacts are automatically created when someone submits a form on your published landing pages.',
  },
  // Email Marketing
  {
    q: 'What are Email Sequences?',
    a: 'Email Sequences are automated multi-day drip campaigns generated by MarQ. They include Welcome, Recovery, Onboarding, and Re-Engagement strategies — all written in your brand\'s tone using your Identity Lock. The Subscriber Dashboard shows engagement scores and lifecycle status (Hot, Warm, Cold) for each subscriber.',
  },
  // Social Lab
  {
    q: 'What is Social Lab?',
    a: 'Social Lab is your dedicated hub for generating multi-platform promotional content — Instagram, TikTok, LinkedIn, X/Twitter, and email teasers — all aligned to your brand signal. It includes campaign themes, narrative day plans, hooks, hashtags, and media suggestions, so you can go from "funnel built" to "funnel promoted" without leaving IntoIQ.',
  },
  // Compani / Multi-Brand Projects
  {
    q: 'Can I run multiple brands or projects in one account?',
    a: 'Yes. Every project acts as its own "Universal Folder" — assets, videos, pages, and brand overrides stay scoped to the project they were created in. This lets you run a financial-strategy brand (e.g., IntoIQ) and a wellness brand (e.g., Compani Sanctuary) side-by-side without bleed-through.',
  },
  // Custom Domains
  {
    q: 'How do I add a custom domain?',
    a: 'On the Growth plan, open your project settings and add your custom domain (e.g., yourbrand.com). You\'ll get DNS instructions to point your domain to IntoIQ. Once verified, your published pages serve from your domain instead of yourproject.intoiq.app. Multiple domains per project and primary-domain toggling are supported.',
  },
  // PWA Install
  {
    q: 'Can I install IntoIQ as an app on my phone?',
    a: 'Yes — IntoIQ is a Progressive Web App (PWA). On mobile, tap the "Install App" prompt in the footer or your browser\'s "Add to Home Screen" option. You\'ll get a full-screen, app-like experience with offline shell loading and faster startup.',
  },
  // Zero-Trace
  {
    q: 'What is Zero-Trace (Clear Workspace)?',
    a: 'Zero-Trace is a privacy feature that wipes all locally cached data — chat history, dismissed hints, search recents, and onboarding state — without touching your saved projects, leads, or pages on the server. Use it when handing your device to someone or starting fresh on a shared machine.',
  },
  // Morning Briefing
  {
    q: 'What is the Morning Briefing?',
    a: 'On the Growth plan, MarQ delivers a daily strategic briefing summarizing overnight funnel activity — new leads, conversion shifts, friction warnings, and recommended next moves. If a leak is detected (e.g., high CTR but low time-on-page), she takes you straight to the affected step with a prescribed fix.',
  },
  // Referrals
  {
    q: 'Do you have a referral program?',
    a: 'Yes. Each user has a unique referral code in Settings. Share it — when someone signs up using your code and stays active, you both unlock reward credits applied to your next billing cycle.',
  },
  // Navigation
  {
    q: 'What are Signals, Build, Funnels, and Insights?',
    a: 'These are the four stages of the IntoIQ Intelligence Journey, reflected in the global navigation: Signals (Signal Lab — find your voice and visual identity), Build (Workspace — MarQ generates your funnel), Funnels (Projects — your asset library), and Insights (Analytics — real-time performance and MarQ\'s strategic recommendations).',
  },
  // Plans & Billing
  {
    q: "What's the difference between the plans?",
    a: 'IntoIQ has three tiers. Signal/Architect (free) — MarQ AI, Signal flow, funnel mapping, basic page builder, and Logo Generator. Identity/Operator ($39/mo) — adds Style Signal & Identity Lock, unlimited publishing, lead capture, CRM, email sequences, analytics, subscriber intelligence, social export, and MarQ IQ Audits. Innovation/Growth ($79/mo) — adds A/B testing, custom domains, AI social images, advanced analytics, funnel code export, and priority AI.',
  },
  {
    q: 'Can I export my funnel?',
    a: 'Yes — Growth plan subscribers can export their funnel as a standalone HTML code bundle. Operator subscribers can copy their share URL and use the built-in deployment.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Billing from your avatar menu, then click "Manage" to access your subscription portal where you can cancel anytime.',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-serif mb-2">Help & Support</h1>
        <p className="text-muted-foreground text-sm mb-8">Find answers to common questions or reach out to us directly.</p>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="glass rounded-xl border border-border/30 px-4">
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Show me around again */}
        <section className="mb-12">
          <div className="glass rounded-2xl border border-primary/20 p-5 sm:p-6 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Lost? Replay the welcome tour.</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Re-enables the "Start Here" rail on your Dashboard so MarQ can walk you through your first three moves again.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                try {
                  localStorage.removeItem('intoiq_start_here_dismissed');
                  // Also reset MarQ contextual hints so first-visit tips reappear
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith('quinn_hint_seen_'))
                    .forEach((k) => localStorage.removeItem(k));
                  toast.success('Welcome tour restored', { description: 'Head to the Dashboard — MarQ is waiting.' });
                } catch {
                  toast.error('Could not restore the tour. Try again.');
                }
              }}
            >
              Show me around again
            </Button>
          </div>
        </section>

        {/* Legal */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Legal</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/privacy"
              className="glass rounded-xl border border-border/30 p-5 flex items-start gap-3 hover:border-primary/30 transition-colors"
            >
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Privacy Policy</p>
                <p className="text-xs text-muted-foreground mt-0.5">How we handle your data</p>
              </div>
            </a>
            <a
              href="/terms"
              className="glass rounded-xl border border-border/30 p-5 flex items-start gap-3 hover:border-primary/30 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Terms of Service</p>
                <p className="text-xs text-muted-foreground mt-0.5">Rules of using IntoIQ</p>
              </div>
            </a>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Still need help?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:support@intoiq.com"
              className="glass rounded-xl border border-border/30 p-5 flex items-start gap-3 hover:border-primary/30 transition-colors"
            >
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Email Us</p>
                <p className="text-xs text-muted-foreground mt-0.5">support@intoiq.com</p>
              </div>
            </a>
            <div className="glass rounded-xl border border-border/30 p-5 flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Community</p>
                <p className="text-xs text-muted-foreground mt-0.5">Join our community for tips and support.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
