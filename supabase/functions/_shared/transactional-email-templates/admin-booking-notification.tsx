/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandFooter, BrandHeader, styles } from './_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  customerName?: string
  customerEmail?: string
  agencyName?: string
  bikeName?: string
  pickupDate?: string
  returnDate?: string
  totalPrice?: string | number
  bookingId?: string
  adminUrl?: string
}

const AdminBookingNotification = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New booking on Motonita.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>New booking 🛵</Heading>
        <Text style={styles.text}>A new booking was just created on the platform.</Text>
        <Section style={styles.card}>
          {p.customerName && (<><Text style={styles.label}>Customer</Text><Text style={styles.value}>{p.customerName} ({p.customerEmail})</Text></>)}
          {p.agencyName && (<><Text style={styles.label}>Agency</Text><Text style={styles.value}>{p.agencyName}</Text></>)}
          {p.bikeName && (<><Text style={styles.label}>Motorbike</Text><Text style={styles.value}>{p.bikeName}</Text></>)}
          {p.pickupDate && (<><Text style={styles.label}>Pickup → Return</Text><Text style={styles.value}>{p.pickupDate} → {p.returnDate}</Text></>)}
          {p.totalPrice && (<><Text style={styles.label}>Total</Text><Text style={styles.value}>{p.totalPrice} MAD</Text></>)}
          {p.bookingId && (<><Text style={styles.label}>Booking ID</Text><Text style={styles.value}>{p.bookingId}</Text></>)}
        </Section>
        {p.adminUrl && (<Button href={p.adminUrl} style={styles.button}>Open in admin panel</Button>)}
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: AdminBookingNotification,
  subject: (d: Record<string, any>) =>
    `[Motonita] New booking${d.bikeName ? ` — ${d.bikeName}` : ''}`,
  displayName: 'Admin booking notification',
}
export default AdminBookingNotification
