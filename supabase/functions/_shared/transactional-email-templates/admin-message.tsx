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
import type { TemplateEntry } from './registry.ts'

interface AdminMessageProps {
  recipientName?: string
  subject?: string
  body?: string
}

const AdminMessageEmail = ({ recipientName, subject, body }: AdminMessageProps) => {
  const paragraphs = (body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject || 'A message from the Motonita team'}</Preview>
      <BodyWrap>
        <Container style={container}>
          <Heading style={h1}>{subject || 'A message from Motonita'}</Heading>
          {recipientName && (
            <Text style={text}>Hi {recipientName},</Text>
          )}
          {paragraphs.length === 0 ? (
            <Text style={text}>{body}</Text>
          ) : (
            paragraphs.map((p, i) => (
              <Text key={i} style={text}>{p}</Text>
            ))
          )}
          <Section style={{ marginTop: '32px' }}>
            <Text style={footer}>— The Motonita team</Text>
          </Section>
        </Container>
      </BodyWrap>
    </Html>
  )
}

const BodyWrap = ({ children }: { children: React.ReactNode }) => (
  <Body style={main}>{children}</Body>
)

export const template = {
  component: AdminMessageEmail,
  subject: (data: Record<string, any>) =>
    (data?.subject as string) || 'A message from Motonita',
  displayName: 'Admin direct message',
  previewData: {
    recipientName: 'Sami',
    subject: 'About your Motonita account',
    body: 'Hello,\n\nThis is a sample message from the Motonita team.\n\nThanks!',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#163300', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#163300', lineHeight: '1.6', margin: '0 0 14px' }
const footer = { fontSize: '12px', color: '#163300', opacity: 0.6, margin: '24px 0 0' }
