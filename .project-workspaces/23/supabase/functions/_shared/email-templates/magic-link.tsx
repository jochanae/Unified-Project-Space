/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} login link</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Section style={brand.header}>
          <Heading style={brand.logo}>IntoIQ</Heading>
          <Text style={brand.tagline}>Intelligent Execution Engine</Text>
        </Section>
        <Section style={brand.body}>
          <Heading style={brand.h1}>Your login link</Heading>
          <Text style={brand.text}>
            Click below to log in to {siteName}. This link expires shortly for your security.
          </Text>
          <Button style={brand.button} href={confirmationUrl}>Log in</Button>
          <Text style={{ ...brand.text, marginTop: '32px', fontSize: '13px', color: '#6b7280' }}>
            Didn't request this? Safe to ignore.
          </Text>
        </Section>
        <Section style={brand.footer}>
          IntoIQ — turn any idea into a live lead funnel. Sent from notify.intoiq.app
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
