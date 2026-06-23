/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { brand } from './_brand.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to activate {siteName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Section style={brand.header}>
          <Heading style={brand.logo}>IntoIQ</Heading>
          <Text style={brand.tagline}>Intelligent Execution Engine</Text>
        </Section>
        <Section style={brand.body}>
          <Heading style={brand.h1}>Confirm your email</Heading>
          <Text style={brand.text}>
            Welcome to <Link href={siteUrl} style={brand.link}>{siteName}</Link>. Confirm{' '}
            <Link href={`mailto:${recipient}`} style={brand.link}>{recipient}</Link> to activate your workspace and start turning ideas into live funnels.
          </Text>
          <Button style={brand.button} href={confirmationUrl}>Verify email</Button>
          <Text style={{ ...brand.text, marginTop: '32px', fontSize: '13px', color: '#6b7280' }}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={brand.footer}>
          IntoIQ — turn any idea into a live lead funnel. Sent from notify.intoiq.app
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
