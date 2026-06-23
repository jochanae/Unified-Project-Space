/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Section style={brand.header}>
          <Heading style={brand.logo}>IntoIQ</Heading>
          <Text style={brand.tagline}>Intelligent Execution Engine</Text>
        </Section>
        <Section style={brand.body}>
          <Heading style={brand.h1}>Confirm your email change</Heading>
          <Text style={brand.text}>
            You requested to change your {siteName} email from{' '}
            <Link href={`mailto:${email}`} style={brand.link}>{email}</Link> to{' '}
            <Link href={`mailto:${newEmail}`} style={brand.link}>{newEmail}</Link>.
          </Text>
          <Button style={brand.button} href={confirmationUrl}>Confirm change</Button>
          <Text style={{ ...brand.text, marginTop: '32px', fontSize: '13px', color: '#6b7280' }}>
            Didn't request this? Secure your account immediately.
          </Text>
        </Section>
        <Section style={brand.footer}>
          IntoIQ — turn any idea into a live lead funnel. Sent from notify.intoiq.app
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
