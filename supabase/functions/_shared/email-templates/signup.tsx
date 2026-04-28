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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token: string
}

export const SignupEmail = ({ siteName, recipient, token }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your email</Heading>
        <Text style={styles.text}>
          Welcome to Motonita! Use the code below to verify your email address
          ({recipient}) and finish creating your account.
        </Text>
        <div style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </div>
        <Text style={styles.smallNote}>
          Enter this 6-character code on the verification page. It expires in 60 minutes.
        </Text>
        <Text style={styles.footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
