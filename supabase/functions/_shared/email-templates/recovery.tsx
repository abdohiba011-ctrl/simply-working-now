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
import { BrandFooter, BrandHeader, styles } from './_brand.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token: string
}

export const RecoveryEmail = ({ siteName, token }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} password reset code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Reset your password</Heading>
        <Text style={styles.text}>
          We received a request to reset your password for {siteName}. Enter
          this 6-digit code on the reset page to choose a new password.
        </Text>
        <Section style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </Section>
        <Text style={styles.smallNote}>
          This code expires in 60 minutes. If you didn't request a password
          reset, you can safely ignore this email — your password will not
          change.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
