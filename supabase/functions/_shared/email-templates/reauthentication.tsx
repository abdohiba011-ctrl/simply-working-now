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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Motonita verification code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm it's you</Heading>
        <Text style={styles.text}>
          Use the 6-digit code below to confirm your identity on{' '}
          <strong>Motonita</strong>.
        </Text>

        <Section style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </Section>

        <Text style={styles.smallNote}>
          This code expires shortly. Never share it — the Motonita team will
          never ask for your code.
        </Text>
        <Text style={styles.smallNote}>
          If you didn't request this, please reset your password right away.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
