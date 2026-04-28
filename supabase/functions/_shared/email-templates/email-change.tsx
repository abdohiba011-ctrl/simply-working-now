/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
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
    <Preview>Confirm your new email — code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your new email</Heading>
        <Text style={styles.text}>
          You requested to change your {siteName} email from <strong>{email}</strong>{' '}
          to <strong>{newEmail}</strong>. Use the code below to confirm.
        </Text>
        <div style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </div>
        <Text style={styles.smallNote}>
          Enter this 6-digit code on the verification page. It expires in 60 minutes.
        </Text>
        <Text style={styles.footer}>
          If you didn't request this change, contact support — your account may be at risk.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
