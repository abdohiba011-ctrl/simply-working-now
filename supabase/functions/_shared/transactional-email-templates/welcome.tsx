/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { BrandFooter, BrandHeader, styles } from './_brand.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  siteUrl?: string
}

const Welcome = ({ name, siteUrl = 'https://motonita.ma' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Motonita — let's get you riding.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Welcome{name ? `, ${name}` : ''} 👋</Heading>
        <Text style={styles.text}>
          Your Motonita account is ready. You can now browse motorbikes and
          scooters across 16 cities in Morocco, book in 60 seconds, and pay a
          flat fee — no commission on the rental price.
        </Text>
        <Button href={siteUrl} style={styles.button}>Browse motorbikes</Button>
        <Text style={styles.text}>
          Verified agencies · Booked in 60 seconds · Cash Plus accepted
        </Text>
        <BrandFooter />
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: Welcome,
  subject: 'Welcome to Motonita',
  displayName: 'Welcome',
}
export default Welcome
