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

interface MagicLinkEmailProps {
  siteName: string
  token: string
}

export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} login code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Sign in to {siteName}</Heading>
        <Text style={styles.text}>
          Use the code below to sign in to your Motonita account.
        </Text>
        <div style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </div>
        <Text style={styles.smallNote}>
          Enter this 6-digit code on the sign-in page. It expires in 60 minutes.
        </Text>
        <Text style={styles.footer}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
