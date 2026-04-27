/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandHeader, BrandFooter, styles } from './_brand.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({ recipient, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Motonita confirmation code{token ? `: ${token}` : ''}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your account</Heading>
        <Text style={styles.text}>
          Welcome to <strong>Motonita</strong> — Morocco's peer-to-peer motorbike rental marketplace.
          Enter the 6-digit code below to confirm <strong>{recipient}</strong> and activate your account.
        </Text>
        {token ? (
          <Section style={styles.codeWrap}>
            <Text style={styles.code}>{token}</Text>
          </Section>
        ) : null}
        <Text style={styles.smallNote}>
          This code expires in 60 minutes. Never share it — the Motonita team will never ask for your code.
        </Text>
        <Text style={styles.smallNote}>
          If you didn't sign up for Motonita, you can safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
