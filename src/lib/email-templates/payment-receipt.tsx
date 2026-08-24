import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface PaymentReceiptProps {
  fullName?: string
  reference?: string
  paidAt?: string
  firm?: string | null
  vatNumber?: string | null
  subtotal?: string
  serviceFee?: string
  vat?: string
  total?: string
  portalUrl?: string
}

const Email = ({
  fullName,
  reference = '—',
  paidAt,
  firm,
  vatNumber,
  subtotal,
  serviceFee,
  vat,
  total,
  portalUrl,
}: PaymentReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Payment receipt for order ${reference}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Payment received</Heading>
        <Text style={text}>
          {fullName ? `Dear ${fullName},` : 'Hello,'} we have received your payment for order{' '}
          <strong>{reference}</strong>. This email is your receipt.
        </Text>

        <Section style={card}>
          <Text style={totals}>Order reference: {reference}</Text>
          {paidAt ? <Text style={totals}>Paid on: {paidAt}</Text> : null}
          {firm ? <Text style={totals}>Billed to: {firm}</Text> : null}
          {vatNumber ? <Text style={totals}>VAT number: {vatNumber}</Text> : null}
          <Hr style={hr} />
          {subtotal ? <Text style={totals}>Documents: {subtotal}</Text> : null}
          {serviceFee ? <Text style={totals}>Service fee: {serviceFee}</Text> : null}
          {vat ? <Text style={totals}>VAT (19%) — reports &amp; service fee: {vat}</Text> : null}
          {total ? <Text style={grandTotal}>Total paid: {total}</Text> : null}
        </Section>

        <Text style={text}>
          Your order is now being processed. Completed documents appear in your client portal
          {portalUrl ? (
            <>
              : <Link href={portalUrl} style={link}>{portalUrl}</Link>
            </>
          ) : (
            '.'
          )}
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Companies House Cyprus · Nicosia, Cyprus</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Payment receipt — ${data['reference'] ?? 'Companies House Cyprus'}`,
  displayName: 'Payment receipt',
  previewData: {
    fullName: 'Andreas Georgiou',
    reference: 'CHC-2A4B7C',
    paidAt: '24/08/2026',
    firm: 'Georgiou & Partners LLC',
    vatNumber: 'CY10123456X',
    subtotal: '€120.00',
    serviceFee: '€50.00',
    vat: '€32.30',
    total: '€202.30',
    portalUrl: 'https://companieshousecyprus.com/account/orders',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '560px' }
const brand = {
  fontSize: '12px',
  letterSpacing: '1.4px',
  textTransform: 'uppercase' as const,
  color: '#3b6ea8',
  margin: '0 0 6px',
}
const h1 = { fontSize: '24px', color: '#12203a', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#22314f' }
const card = {
  backgroundColor: '#f4f7fb',
  border: '1px solid #dde5f0',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '18px 0',
}
const totals = { fontSize: '13px', color: '#5d6b85', margin: '0 0 4px' }
const grandTotal = { fontSize: '16px', color: '#12203a', margin: '8px 0 0', fontWeight: 700 }
const hr = { borderColor: '#dde5f0', margin: '16px 0' }
const link = { color: '#3b6ea8' }
const footer = { fontSize: '12px', color: '#8794a8' }
