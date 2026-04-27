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

interface MagicLinkEmailProps {
  siteName: string
  token: string
}

export const MagicLinkEmail = ({ token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Motonita login code: {token}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Your login code</Heading>
        <Text style={styles.text}>
          Use the 6-digit code below to log in to <strong>Motonita</strong>.
        </Text>

        <Section style={styles.codeWrap}>
          <Text style={styles.code}>{token}</Text>
        </Section>

        <Text style={styles.smallNote}>
          This code expires in 60 minutes. Never share it — the Motonita team
          will never ask for your code.
        </Text>
        <Text style={styles.smallNote}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
