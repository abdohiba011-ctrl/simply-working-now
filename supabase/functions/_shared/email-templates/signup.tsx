/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandHeader, BrandFooter, styles } from './_brand.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your Motonita account</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your account</Heading>
        <Text style={styles.text}>
          Welcome to <strong>Motonita</strong> — Morocco's peer-to-peer
          motorbike rental marketplace. Please confirm <strong>{recipient}</strong>{' '}
          to activate your account.
        </Text>
        <Button style={styles.button} href={confirmationUrl}>
          Confirm my account
        </Button>
        <Text style={styles.smallNote}>
          This link expires in 24 hours. If you didn't sign up for Motonita,
          you can safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
