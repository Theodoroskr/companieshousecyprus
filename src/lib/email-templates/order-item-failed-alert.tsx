import React from 'react'
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OrderItemFailedAlertProps {
  reference?: string
  customerName?: string | null
  customerEmail?: string | null
  firm?: string | null
  productName?: string
  company?: string | null
  reason?: string
  adminUrl?: string
}

const Email = (p: OrderItemFailedAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Action needed: ${p.productName ?? 'document'} for ${p.reference ?? 'an order'} could not be retrieved`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Document retrieval failed — action needed</Heading>
        <Text style={row}>The customer has been told our team will follow up by email.</Text>
        <Section style={card}>
          <Text style={row}><strong>Order:</strong> {p.reference ?? '—'}</Text>
          <Text style={row}><strong>Product:</strong> {p.productName ?? '—'}</Text>
          <Text style={row}><strong>Company:</strong> {p.company || '—'}</Text>
          <Text style={row}><strong>Customer:</strong> {p.customerName || '—'} {p.customerEmail ? `· ${p.customerEmail}` : ''}</Text>
          <Text style={row}><strong>Firm:</strong> {p.firm || '—'}</Text>
          <Text style={row}><strong>Reason:</strong> {p.reason || '—'}</Text>
        </Section>
        <Text style={row}>Please check with the supplier, upload the document manually, or update the customer.</Text>
        {p.adminUrl ? <Link href={p.adminUrl} style={link}>Open orders in admin</Link> : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `Document retrieval failed — ${d['reference'] ?? 'order'}${d['company'] ? ` (${d['company']})` : ''}`,
  displayName: 'Order item failed (office alert)',
  to: 'info@companieshousecyprus.com',
  previewData: {
    reference: 'CHC-3UYBD3-AFE9', customerName: 'Martin Dixon', customerEmail: 'm.dixon@example.com',
    firm: 'Stop Go Networks Ltd', productName: 'Cyprus Credit Report', company: 'BRAINSOME LTD · HE374736',
    reason: 'Gave up after 48 attempts: report not ready', adminUrl: 'https://companieshousecyprus.com/admin/orders',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const brand = { fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }
const h1 = { fontSize: '20px', color: '#111827', margin: '0 0 16px' }
const card = { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', margin: '12px 0' }
const row = { fontSize: '14px', color: '#111827', margin: '4px 0' }
const link = { color: '#1d4ed8', fontSize: '14px' }
