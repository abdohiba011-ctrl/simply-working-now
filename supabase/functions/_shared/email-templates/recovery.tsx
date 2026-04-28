/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

import { BrandFooter, BrandHeader, styles } from './_brand.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Reset your password</Heading>
        <Text style={styles.text}>
          We received a request to reset your Motonita password. Click the
          button below to choose a new one.
        </Text>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button
            href={confirmationUrl}
            style={{
              backgroundColor: '#9FE870',
              color: '#163300',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Reset password
          </Button>
        </div>
        <Text style={styles.smallNote}>
          Or copy and paste this link into your browser:
          <br />
          <Link href={confirmationUrl}>{confirmationUrl}</Link>
        </Text>
        <Text style={styles.smallNote}>
          This link expires in 60 minutes.
        </Text>
        <Text style={styles.footer}>
          If you didn't request a password reset, you can safely ignore this email —
          your password will stay the same.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
