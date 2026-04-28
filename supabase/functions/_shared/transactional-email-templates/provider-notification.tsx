/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandFooter, BrandHeader, styles } from './_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  agencyName?: string
  customerName?: string
  bikeName?: string
  pickupDate?: string
  returnDate?: string
  pickupLocation?: string
  totalPrice?: string | number
  bookingId?: string
  agencyUrl?: string
}

const ProviderNotification = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have a new booking request on Motonita.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>New booking request 🛎️</Heading>
        <Text style={styles.text}>
          Hi {p.agencyName || 'there'}, you have a new booking request. You
          have 24 hours to confirm or decline it from your dashboard.
        </Text>
        <Section style={styles.card}>
          {p.customerName && (<><Text style={styles.label}>Customer</Text><Text style={styles.value}>{p.customerName}</Text></>)}
          {p.bikeName && (<><Text style={styles.label}>Motorbike</Text><Text style={styles.value}>{p.bikeName}</Text></>)}
          {p.pickupDate && (<><Text style={styles.label}>Pickup → Return</Text><Text style={styles.value}>{p.pickupDate} → {p.returnDate}</Text></>)}
          {p.pickupLocation && (<><Text style={styles.label}>Location</Text><Text style={styles.value}>{p.pickupLocation}</Text></>)}
          {p.totalPrice && (<><Text style={styles.label}>Total</Text><Text style={styles.value}>{p.totalPrice} MAD</Text></>)}
          {p.bookingId && (<><Text style={styles.label}>Booking ID</Text><Text style={styles.value}>{p.bookingId}</Text></>)}
        </Section>
        {p.agencyUrl && (<Button href={p.agencyUrl} style={styles.button}>Review booking</Button>)}
        <Text style={styles.footer}>
          Reminder: confirming a booking deducts 50 MAD from your wallet. You
          keep 100% of the rental price — no commission.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: ProviderNotification,
  subject: (d: Record<string, any>) =>
    `New booking request${d.bikeName ? ` — ${d.bikeName}` : ''}`,
  displayName: 'Provider booking notification',
}
export default ProviderNotification
