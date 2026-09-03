import React from 'react'
import {
  Body,
  Button,
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

export interface PaymentRequestProps {
  fullName?: string
  reference?: string
  sourceReference?: string | null
  description?: string
  company?: string | null
  subtotal?: string
  vat?: string
  total?: string
  payUrl?: string
}

const Email = ({
  fullName,
  reference,
  sourceReference,
  description,
  company,
  subtotal,
  vat,
  total,
  payUrl,
}: PaymentRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Payment request ${reference ?? ''} — ${total ?? ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Payment request</Heading>
        <Text style={paragraph}>{fullName ? `Dear ${fullName},` : 'Dear Sirs,'}</Text>
        <Text style={paragraph}>
          Thank you for confirming. Below are the details for the additional service you requested
          {sourceReference ? ` in relation to order ${sourceReference}` : ''}. You can settle it securely online
          using the button below.
        </Text>

        <Section style={card}>
          <Text style={row}><strong>Order reference:</strong> {reference ?? '—'}</Text>
          <Text style={row}><strong>Service:</strong> {description ?? 'Apostille certification'}</Text>
          {company ? <Text style={row}><strong>Company:</strong> {company}</Text> : null}
          <Hr style={hr} />
          <Text style={row}><strong>Amount:</strong> {subtotal ?? '—'}</Text>
          <Text style={row}><strong>VAT (19%):</strong> {vat ?? '—'}</Text>
          <Text style={rowTotal}><strong>Total due:</strong> {total ?? '—'}</Text>
        </Section>

        {payUrl ? (
          <Section style={{ margin: '22px 0' }}>
            <Button href={payUrl} style={button}>Pay securely online</Button>
            <Text style={small}>
              Or open: <Link href={payUrl} style={link}>{payUrl}</Link>
            </Text>
          </Section>
        ) : null}

        <Text style={paragraph}>
          A VAT receipt is issued automatically once the payment clears, and we begin the apostille process
          immediately afterwards.
        </Text>
        <Text style={footer}>
          Questions? Reply to this email or write to{' '}
          <Link href="mailto:info@companieshousecyprus.com" style={footerLink}>
            info@companieshousecyprus.com
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Payment request ${data['reference'] ?? ''} — ${data['description'] ?? 'additional service'}`.trim(),
  displayName: 'Payment request',
  previewData: {
    fullName: 'Ing. Eduard Vojtek',
    reference: 'CHC-ABC123-4D5E',
    sourceReference: 'CHC-9Y00LG-F749',
    description: 'Apostille certification × 1',
    company: 'ADRANUS INVESTMENTS LIMITED · HE327816',
    subtotal: '€100.00',
    vat: '€19.00',
    total: '€119.00',
    payUrl: 'https://companieshousecyprus.com/order/CHC-ABC123-4D5E?token=example',
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
const paragraph = { fontSize: '14px', lineHeight: '22px', color: '#22314f', margin: '0 0 12px' }
const card = {
  backgroundColor: '#f4f7fb',
  border: '1px solid #dde5f0',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '18px 0',
}
const row = { fontSize: '14px', lineHeight: '22px', color: '#22314f', margin: '0 0 6px' }
const rowTotal = { ...row, fontSize: '16px', color: '#12203a', margin: '6px 0 0' }
const hr = { borderColor: '#dde5f0', margin: '14px 0' }
const button = {
  backgroundColor: '#b8763e',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 22px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
}
const small = { fontSize: '12px', color: '#8794a8', margin: '12px 0 0' }
const link = { color: '#3b6ea8' }
const footer = { fontSize: '12px', color: '#8794a8', marginTop: '18px' }
const footerLink = { fontSize: '12px', color: '#b8763e', textDecoration: 'none' }
