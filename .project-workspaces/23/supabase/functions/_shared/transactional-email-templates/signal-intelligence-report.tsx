/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface SignalIntelligenceReportProps {
  snippet?: string
  signal?: string
  positioning?: string
  voidLine?: string
  hook?: string
  funnel?: string
}

const NARRATIVE_ARC = [
  { day: 1, title: 'The Authority Anchor' },
  { day: 2, title: 'The Pattern Break' },
  { day: 3, title: 'The Receipt' },
  { day: 4, title: 'The Counterintuitive Truth' },
  { day: 5, title: 'The Behind-the-Curtain' },
  { day: 6, title: 'The Conversion Pivot' },
  { day: 7, title: 'The Quiet Close' },
]

const SignalIntelligenceReport = ({
  snippet,
  signal,
  positioning,
  voidLine,
  hook,
  funnel,
}: SignalIntelligenceReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{signal ? `MarQ locked your signal: ${signal}` : 'MarQ locked your signal.'}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Heading style={logo}>IntoIQ</Heading>
          <Text style={tagline}>Signal Audit · Intelligence Report</Text>
        </Section>

        {/* Hero */}
        <Section style={heroSection}>
          <Text style={eyebrow}>STRATEGY LOCKED</Text>
          <Heading as="h1" style={hero}>
            {signal || 'Your Signal'}
          </Heading>
          {positioning ? <Text style={heroSub}>{positioning}</Text> : null}
        </Section>

        {/* The 3 Signals */}
        <Section style={blockSection}>
          {voidLine ? (
            <>
              <Text style={blockLabel}>THE MISSING LINK</Text>
              <Text style={blockBody}>{voidLine}</Text>
            </>
          ) : null}

          {hook ? (
            <>
              <Text style={blockLabel}>DAY 1 HOOK</Text>
              <Text style={blockBody}>{hook}</Text>
            </>
          ) : null}

          {funnel ? (
            <>
              <Text style={blockLabel}>3-STEP FUNNEL</Text>
              <Text style={blockBody}>{funnel}</Text>
            </>
          ) : null}
        </Section>

        <Hr style={divider} />

        {/* The 7-Day Narrative Arc Teaser */}
        <Section style={teaserSection}>
          <Text style={eyebrow}>QUEUED · 7-DAY NARRATIVE ARC</Text>
          <Heading as="h2" style={teaserHero}>
            MarQ outlined your first 7 days of authority.
          </Heading>
          {NARRATIVE_ARC.map((d) => (
            <Text key={d.day} style={arcRow}>
              <span style={arcDay}>Day {d.day}</span>
              <span style={arcTitle}>{d.title}</span>
              <span style={arcLock}>· locked</span>
            </Text>
          ))}
          <Text style={teaserBody}>
            The full calendar, the deployable posts, the lead magnet, and the email sequence
            wait inside your dashboard. Claim them in one click.
          </Text>
        </Section>

        {/* CTA */}
        <Section style={ctaSection}>
          <Button href="https://intoiq.app/login?mode=signup" style={ctaBtn}>
            Claim Your Dashboard
          </Button>
          <Text style={ctaNote}>Free to start. No card required.</Text>
        </Section>

        {/* Source */}
        {snippet ? (
          <Section style={sourceSection}>
            <Text style={sourceLabel}>YOUR SUBMISSION</Text>
            <Text style={sourceBody}>&ldquo;{snippet}&rdquo;</Text>
          </Section>
        ) : null}

        <Section style={footer}>
          <Text style={footerText}>
            Sent by MarQ · IntoIQ Strategy Engine · notify.intoiq.app
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SignalIntelligenceReport,
  subject: (data: Record<string, any>) =>
    data?.signal ? `Strategy locked: ${data.signal}` : 'Your Intelligence Report from MarQ',
  displayName: 'Signal Intelligence Report',
  previewData: {
    snippet: 'A premium coaching program for executives navigating burnout.',
    signal: 'The Executive Resilience Framework',
    positioning:
      'Senior leaders are publicly admitting burnout for the first time — the market is hungry for a clinical, non-fluffy framework.',
    voidLine:
      'Most competitors push generic mindfulness; your edge is a structured operating system for high-stakes decision-makers.',
    hook: 'Your highest-paid year was also your most exhausted. That is not a coincidence — it is a system error.',
    funnel:
      'Step 1: Hook page (Resilience Diagnostic) → Step 2: PDF lead magnet (5 Levers) → Step 3: 30-min strategy call.',
  },
} satisfies TemplateEntry

// ─── Styles ────────────────────────────────────────────────────────
const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  margin: 0,
  padding: '40px 0',
}
const container = {
  maxWidth: '580px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
}
const header = {
  padding: '0 32px 20px',
  borderBottom: '1px solid #e5e7eb',
}
const logo = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: '30px',
  fontWeight: 400 as const,
  color: '#0a0e14',
  letterSpacing: '-0.02em',
  margin: 0,
}
const tagline = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '4px 0 0',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
}
const heroSection = {
  padding: '36px 32px 28px',
  backgroundColor: '#0a0e14',
  borderRadius: '0',
}
const eyebrow = {
  fontSize: '10px',
  color: '#c9a84c',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  fontWeight: 600 as const,
  margin: '0 0 12px',
}
const hero = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: '32px',
  fontWeight: 400 as const,
  color: '#ffffff',
  lineHeight: 1.15,
  margin: '0 0 14px',
  letterSpacing: '-0.01em',
}
const heroSub = {
  fontSize: '15px',
  color: '#cbd5e1',
  lineHeight: 1.55,
  margin: 0,
}
const blockSection = {
  padding: '28px 32px 8px',
}
const blockLabel = {
  fontSize: '10px',
  color: '#c9a84c',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  fontWeight: 600 as const,
  margin: '20px 0 8px',
}
const blockBody = {
  fontSize: '15px',
  color: '#1f2937',
  lineHeight: 1.6,
  margin: '0 0 6px',
}
const divider = {
  borderColor: '#e5e7eb',
  margin: '28px 32px',
}
const teaserSection = {
  padding: '4px 32px 20px',
}
const teaserHero = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: '22px',
  fontWeight: 400 as const,
  color: '#0a0e14',
  lineHeight: 1.25,
  margin: '0 0 18px',
  letterSpacing: '-0.01em',
}
const arcRow = {
  fontSize: '14px',
  color: '#1f2937',
  lineHeight: 1.6,
  margin: '0 0 6px',
  display: 'block',
}
const arcDay = {
  display: 'inline-block',
  width: '54px',
  color: '#c9a84c',
  fontWeight: 600 as const,
  fontSize: '12px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
}
const arcTitle = {
  color: '#0a0e14',
  fontWeight: 500 as const,
}
const arcLock = {
  color: '#9ca3af',
  fontSize: '12px',
  marginLeft: '6px',
  fontStyle: 'italic' as const,
}
const teaserBody = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: 1.6,
  margin: '18px 0 0',
}
const ctaSection = {
  padding: '12px 32px 32px',
  textAlign: 'center' as const,
}
const ctaBtn = {
  backgroundColor: '#c9a84c',
  color: '#0a0e14',
  padding: '14px 32px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: 600 as const,
  letterSpacing: '0.02em',
  textDecoration: 'none',
  display: 'inline-block',
}
const ctaNote = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '12px 0 0',
}
const sourceSection = {
  padding: '20px 32px',
  borderTop: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
}
const sourceLabel = {
  fontSize: '10px',
  color: '#9ca3af',
  letterSpacing: '0.22em',
  textTransform: 'uppercase' as const,
  fontWeight: 600 as const,
  margin: '0 0 8px',
}
const sourceBody = {
  fontSize: '13px',
  color: '#4b5563',
  fontStyle: 'italic' as const,
  lineHeight: 1.5,
  margin: 0,
}
const footer = {
  padding: '20px 32px 0',
  borderTop: '1px solid #e5e7eb',
}
const footerText = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: 0,
  textAlign: 'center' as const,
}
