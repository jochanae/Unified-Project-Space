/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Section style={brand.header}>
          <Heading style={brand.logo}>IntoIQ</Heading>
          <Text style={brand.tagline}>Intelligent Execution Engine</Text>
        </Section>
        <Section style={brand.body}>
          <Heading style={brand.h1}>Reset your password</Heading>
          <Text style={brand.text}>
            We received a request to reset your password for {siteName}. Click below to choose a new one.
          </Text>
          <Button style={brand.button} href={confirmationUrl}>Reset password</Button>
          <Text style={{ ...brand.text, marginTop: '32px', fontSize: '13px', color: '#6b7280' }}>
            If you didn't request this, your password is safe — just ignore this email.
          </Text>
        </Section>
        <Section style={brand.footer}>
          IntoIQ — turn any idea into a live lead funnel. Sent from notify.intoiq.app
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
