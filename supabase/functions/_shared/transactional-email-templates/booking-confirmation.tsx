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
  pickupDate?: string
  returnDate?: string
  pickupLocation?: string
  totalPrice?: string | number
  bookingId?: string
  bookingUrl?: string
}

const BookingConfirmation = ({
  customerName, bikeName, pickupDate, returnDate, pickupLocation,
  totalPrice, bookingId, bookingUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Motonita booking is confirmed.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Booking confirmed ✅</Heading>
        <Text style={styles.text}>
          Hi {customerName || 'there'}, your booking has been confirmed by the
          agency. Here are the details:
        </Text>
        <Section style={styles.card}>
          {bikeName && (<><Text style={styles.label}>Motorbike</Text><Text style={styles.value}>{bikeName}</Text></>)}
          {pickupDate && (<><Text style={styles.label}>Pickup</Text><Text style={styles.value}>{pickupDate}</Text></>)}
          {returnDate && (<><Text style={styles.label}>Return</Text><Text style={styles.value}>{returnDate}</Text></>)}
          {pickupLocation && (<><Text style={styles.label}>Location</Text><Text style={styles.value}>{pickupLocation}</Text></>)}
          {totalPrice && (<><Text style={styles.label}>Total</Text><Text style={styles.value}>{totalPrice} MAD</Text></>)}
          {bookingId && (<><Text style={styles.label}>Booking ID</Text><Text style={styles.value}>{bookingId}</Text></>)}
        </Section>
        {bookingUrl && (<Button href={bookingUrl} style={styles.button}>View booking</Button>)}
        <Text style={styles.footer}>
          Coordinate pickup with the agency through the in-app chat. Rental
          payment is handled directly between you and the agency.
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: BookingConfirmation,
  subject: (d: Record<string, any>) =>
    d.bikeName ? `Booking confirmed: ${d.bikeName}` : 'Your Motonita booking is confirmed',
  displayName: 'Booking confirmation',
}
export default BookingConfirmation
