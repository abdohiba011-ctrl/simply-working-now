/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  token: string
}

export const RecoveryEmail = ({ siteName, token }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Motonita password reset code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for{' '}
          <strong>Motonita</strong>. Enter the 6-digit code below on the
          password reset page to choose a new password.
        </Text>

        <Section style={codeWrap}>
          <Text style={codeStyle}>{token}</Text>
        </Section>

        <Text style={smallNote}>
          This code expires in 60 minutes. Do not share it with anyone — the
          Motonita team will never ask for it.
        </Text>

        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email — your password will not change.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
}
const container = { padding: '32px 28px', maxWidth: '480px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#163300',
  letterSpacing: '-0.01em',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#163300',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const codeWrap = {
  backgroundColor: 'rgba(159, 232, 112, 0.18)',
  border: '1px solid rgba(22, 51, 0, 0.1)',
  borderRadius: '12px',
  padding: '20px 16px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '36px',
  fontWeight: 'bold' as const,
  color: '#163300',
  letterSpacing: '0.4em',
  margin: 0,
  paddingLeft: '0.4em',
}
const smallNote = {
  fontSize: '13px',
  color: 'rgba(22, 51, 0, 0.7)',
  lineHeight: '1.5',
  margin: '0 0 24px',
}
const footer = {
  fontSize: '12px',
  color: 'rgba(22, 51, 0, 0.55)',
  lineHeight: '1.5',
  margin: '24px 0 0',
}
