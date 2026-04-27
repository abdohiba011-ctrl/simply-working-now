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
import { BrandHeader, BrandFooter, styles } from './_brand.tsx'

interface RecoveryEmailProps {
  siteName: string
  token: string
}

export const RecoveryEmail = ({ token }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Motonita password reset code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Reset your password</Heading>
        <Text style={styles.text}>
          We received a request to reset your <strong>Motonita</strong>{' '}
          password. Enter the 6-digit code below on the password reset page.
        </Text>

        <Section style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </Section>

        <Text style={styles.smallNote}>
          This code expires in 60 minutes. Never share it — the Motonita team
          will never ask for your code.
        </Text>
        <Text style={styles.smallNote}>
          If you didn't request a password reset, you can safely ignore this
          email — your password will not change.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
