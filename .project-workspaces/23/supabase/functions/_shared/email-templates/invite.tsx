/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're invited to {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Section style={brand.header}>
          <Heading style={brand.logo}>IntoIQ</Heading>
          <Text style={brand.tagline}>Intelligent Execution Engine</Text>
        </Section>
        <Section style={brand.body}>
          <Heading style={brand.h1}>You've been invited</Heading>
          <Text style={brand.text}>
            You've been invited to join <Link href={siteUrl} style={brand.link}><strong>{siteName}</strong></Link>. Accept below to set up your account and start building.
          </Text>
          <Button style={brand.button} href={confirmationUrl}>Accept invitation</Button>
          <Text style={{ ...brand.text, marginTop: '32px', fontSize: '13px', color: '#6b7280' }}>
            Not expecting this? You can safely ignore it.
          </Text>
        </Section>
        <Section style={brand.footer}>
          IntoIQ — turn any idea into a live lead funnel. Sent from notify.intoiq.app
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
