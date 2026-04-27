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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your email</Heading>
        <Text style={styles.text}>
          Welcome to {siteName}! Enter this 6-digit code on the verification
          page to activate your account
          {recipient ? <> ({recipient})</> : null}.
        </Text>
        <Section style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </Section>
        <Text style={styles.smallNote}>
          This code expires in 60 minutes. If you didn't sign up, you can
          safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
