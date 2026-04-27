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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  token: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  token,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email for {siteName}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your new email</Heading>
        <Text style={styles.text}>
          You requested to change your {siteName} email from{' '}
          <strong>{email}</strong> to <strong>{newEmail}</strong>. Enter this
          6-digit code to confirm the change.
        </Text>
        <Section style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </Section>
        <Text style={styles.smallNote}>
          This code expires in 60 minutes. If you didn't request this change,
          please secure your account immediately.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
