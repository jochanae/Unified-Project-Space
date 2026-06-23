/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface QuinnFollowupProps {
  message?: string
  senderName?: string
  /** 1x1 open-tracking pixel URL (server-rendered, transparent). */
  trackingPixelUrl?: string
}

const QuinnFollowupEmail = ({ message, senderName, trackingPixelUrl }: QuinnFollowupProps) => {
  const lines = (message ?? '').split('\n')
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{(message ?? '').slice(0, 120)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>IntoIQ</Heading>
            <Text style={tagline}>From {senderName || 'the IntoIQ team'}</Text>
          </Section>
          <Section style={body}>
            {lines.map((line, i) => (
              <Text key={i} style={line.trim() === '' ? spacer : text}>
                {line || '\u00A0'}
              </Text>
            ))}
          </Section>
          <Section style={footer}>
            Sent via IntoIQ — notify.intoiq.app
          </Section>
          {trackingPixelUrl ? (
            <Img
              src={trackingPixelUrl}
              alt=""
              width="1"
              height="1"
              style={{ display: 'block', width: '1px', height: '1px', opacity: 0 }}
            />
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: QuinnFollowupEmail,
  subject: (data: Record<string, any>) => data?.subject || 'Following up',
  displayName: 'MarQ lead follow-up',
  previewData: {
    senderName: 'Jane Doe',
    subject: 'Quick follow-up on your interest',
    message:
      "Hi there,\n\nThanks for reaching out yesterday. I wanted to follow up and see if you had any questions about the funnel we discussed.\n\nHappy to jump on a quick call this week.\n\nBest,\nJane",
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  margin: 0,
  padding: '40px 0',
}
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff' }
const header = { padding: '0 32px 24px', borderBottom: '1px solid #e5e7eb' }
const logo = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: '28px',
  fontWeight: 400 as const,
  color: '#0a1f24',
  letterSpacing: '-0.02em',
  margin: 0,
}
const tagline = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '4px 0 0',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}
const body = { padding: '32px' }
const text = { fontSize: '15px', color: '#1f2937', lineHeight: 1.6, margin: '0 0 12px' }
const spacer = { fontSize: '15px', lineHeight: 1.6, margin: '0 0 12px' }
const footer = {
  padding: '24px 32px',
  borderTop: '1px solid #e5e7eb',
  fontSize: '12px',
  color: '#9ca3af',
}
