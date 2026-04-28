/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandFooter, BrandHeader, styles } from './_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  bikeName?: string
  status?: string         // e.g. confirmed, cancelled, rejected, completed
  reason?: string
  bookingId?: string
  bookingUrl?: string
}

const STATUS_COPY: Record<string, { title: string; line: string }> = {
  confirmed: { title: 'Booking confirmed ✅', line: 'Your booking has been confirmed by the agency.' },
  cancelled: { title: 'Booking cancelled', line: 'Your booking has been cancelled.' },
  rejected:  { title: 'Booking declined', line: 'Unfortunately, the agency could not accept your booking.' },
  completed: { title: 'Booking completed 🎉', line: 'Hope you enjoyed the ride! Leave a review to help other riders.' },
  pending:   { title: 'Booking received', line: 'We received your booking. The agency has 24h to confirm.' },
}

const BookingStatusUpdate = (p: Props) => {
  const key = (p.status || '').toLowerCase()
  const meta = STATUS_COPY[key] || { title: 'Booking update', line: `Your booking status changed to ${p.status || 'updated'}.` }
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{meta.title}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <BrandHeader />
          <Heading style={styles.h1}>{meta.title}</Heading>
          <Text style={styles.text}>Hi {p.customerName || 'there'}, {meta.line}</Text>
          <Section style={styles.card}>
            {p.bikeName && (<><Text style={styles.label}>Motorbike</Text><Text style={styles.value}>{p.bikeName}</Text></>)}
            {p.status && (<><Text style={styles.label}>Status</Text><Text style={styles.value}>{p.status}</Text></>)}
            {p.reason && (<><Text style={styles.label}>Reason</Text><Text style={styles.value}>{p.reason}</Text></>)}
            {p.bookingId && (<><Text style={styles.label}>Booking ID</Text><Text style={styles.value}>{p.bookingId}</Text></>)}
          </Section>
          {p.bookingUrl && (<Button href={p.bookingUrl} style={styles.button}>View booking</Button>)}
          <BrandFooter />
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: BookingStatusUpdate,
  subject: (d: Record<string, any>) => {
    const key = (d.status || '').toLowerCase()
    return STATUS_COPY[key]?.title || 'Booking update'
  },
  displayName: 'Booking status update',
}
export default BookingStatusUpdate
