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

interface InviteEmailProps {
  siteName: string
  token: string
}

export const InviteEmail = ({ siteName, token }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {siteName} — code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>You're invited to {siteName}</Heading>
        <Text style={styles.text}>
          You've been invited to join Motonita. Use the code below to accept your
          invitation and set up your account.
        </Text>
        <div style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </div>
        <Text style={styles.smallNote}>
          Enter this 6-digit code on the verification page. It expires in 60 minutes.
        </Text>
        <Text style={styles.footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
