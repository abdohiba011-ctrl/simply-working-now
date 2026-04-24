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
import type { TemplateEntry } from './registry.ts'

interface AdminTestProps {
  triggeredAt?: string
  triggeredBy?: string
}

const AdminTestEmail = ({ triggeredAt, triggeredBy }: AdminTestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Motonita admin test email — delivery check</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Motonita email test ✅</Heading>
        <Text style={text}>
          This is a test email sent from your Motonita admin panel to verify that
          your email infrastructure on <strong>notify.motonita.ma</strong> is
          delivering correctly.
        </Text>
        {triggeredAt && (
          <Text style={meta}>
            Triggered at: {triggeredAt}
          </Text>
        )}
        {triggeredBy && (
          <Text style={meta}>
            Triggered by: {triggeredBy}
          </Text>
        )}
        <Text style={footer}>
          If you received this, your sending domain is healthy. — Motonita
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminTestEmail,
  subject: 'Motonita email test — delivery check',
  displayName: 'Admin test email',
  previewData: {
    triggeredAt: new Date().toISOString(),
    triggeredBy: 'admin@motonita.ma',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#163300',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#163300',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const meta = {
  fontSize: '13px',
  color: '#163300',
  opacity: 0.7,
  margin: '0 0 8px',
}
const footer = {
  fontSize: '12px',
  color: '#163300',
  opacity: 0.6,
  margin: '24px 0 0',
}
