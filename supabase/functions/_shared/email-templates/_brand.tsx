/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Section, Text } from 'npm:@react-email/components@0.0.22'

export const brand = {
  bg: '#ffffff',
  forest: '#163300',
  forestMuted: 'rgba(22, 51, 0, 0.7)',
  forestSubtle: 'rgba(22, 51, 0, 0.55)',
  forestBorder: 'rgba(22, 51, 0, 0.1)',
  lime: '#9FE870',
  limeTint: 'rgba(159, 232, 112, 0.18)',
  font:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  mono: "'SF Mono', Menlo, Consolas, monospace",
}

export const styles = {
  main: { backgroundColor: brand.bg, fontFamily: brand.font },
  container: { padding: '32px 28px', maxWidth: '480px' as const },
  h1: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: brand.forest,
    letterSpacing: '-0.01em',
    margin: '0 0 16px',
  },
  text: {
    fontSize: '15px',
    color: brand.forest,
    lineHeight: '1.6',
    margin: '0 0 20px',
  },
  link: { color: brand.forest, textDecoration: 'underline' },
  button: {
    backgroundColor: brand.lime,
    color: brand.forest,
    fontSize: '15px',
    fontWeight: 'bold' as const,
    borderRadius: '12px',
    padding: '14px 24px',
    textDecoration: 'none',
    display: 'inline-block' as const,
    margin: '4px 0 24px',
  },
  codeWrap: {
    backgroundColor: brand.limeTint,
    border: `1px solid ${brand.forestBorder}`,
    borderRadius: '12px',
    padding: '20px 16px',
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  code: {
    fontFamily: brand.mono,
    fontSize: '36px',
    fontWeight: 'bold' as const,
    color: brand.forest,
    letterSpacing: '0.4em',
    margin: 0,
    paddingLeft: '0.4em',
  },
  smallNote: {
    fontSize: '13px',
    color: brand.forestMuted,
    lineHeight: '1.5',
    margin: '0 0 24px',
  },
  footer: {
    fontSize: '12px',
    color: brand.forestSubtle,
    lineHeight: '1.5',
    margin: '24px 0 0',
  },
  headerWrap: {
    padding: '0 0 24px',
    borderBottom: `1px solid ${brand.forestBorder}`,
    margin: '0 0 28px',
  },
  brandRow: {
    display: 'inline-block' as const,
    fontSize: '20px',
    fontWeight: 'bold' as const,
    color: brand.forest,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  brandDot: {
    display: 'inline-block' as const,
    width: '10px',
    height: '10px',
    backgroundColor: brand.lime,
    borderRadius: '999px',
    marginRight: '8px',
    verticalAlign: 'middle' as const,
  },
  brandFooter: {
    fontSize: '11px',
    color: brand.forestSubtle,
    lineHeight: '1.5',
    margin: '32px 0 0',
    borderTop: `1px solid ${brand.forestBorder}`,
    paddingTop: '16px',
  },
}

export const BrandHeader = () => (
  <Section style={styles.headerWrap}>
    <Text style={styles.brandRow}>
      <span style={styles.brandDot} />
      Motonita
    </Text>
  </Section>
)

export const BrandFooter = () => (
  <Text style={styles.brandFooter}>
    Motonita SARLAU · Casablanca, Morocco · motonita.ma
    <br />
    Morocco's first peer-to-peer motorbike rental marketplace.
  </Text>
)
