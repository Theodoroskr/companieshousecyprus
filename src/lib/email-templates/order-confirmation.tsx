import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Img,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OrderLine {
  name: string
  company?: string | null
  quantity?: number
  total?: string
}

export interface OrderConfirmationProps {
  fullName?: string
  reference?: string
  items?: OrderLine[]
  subtotal?: string
  serviceFee?: string
  vat?: string
  total?: string
  trackUrl?: string
}

const Email = ({
  fullName,
  reference = '—',
  items = [],
  subtotal,
  serviceFee,
  vat,
  total,
  trackUrl,
}: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`We received your order ${reference}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://companieshousecyprus.com/__l5e/assets-v1/5267d511-734b-4e2a-994b-e45c2724c9f4/cyprus-companies-house-logo.png"
          width="180"
          alt="Companies House Cyprus"
          style={{ display: 'block', marginBottom: '18px' }}
        />
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Order received</Heading>
        <Text style={text}>
          {fullName ? `Dear ${fullName},` : 'Hello,'} thank you for your order. We have recorded it
          under reference <strong>{reference}</strong>.
        </Text>

        <Section style={card}>
          {items.length === 0 ? (
            <Text style={muted}>Your order details are available in your client portal.</Text>
          ) : (
            items.map((item, index) => (
              <Text key={index} style={lineItem}>
                <strong>{item.name}</strong>
                {item.quantity && item.quantity > 1 ? ` × ${item.quantity}` : ''}
                {item.company ? <><br />{item.company}</> : null}
                {item.total ? <><br />{item.total}</> : null}
              </Text>
            ))
          )}
          <Hr style={hr} />
          {subtotal ? <Text style={totals}>Documents: {subtotal}</Text> : null}
          {serviceFee ? <Text style={totals}>Service fee: {serviceFee}</Text> : null}
          {vat ? <Text style={totals}>VAT (19%) — reports &amp; service fee: {vat}</Text> : null}
          {total ? <Text style={grandTotal}>Total: {total}</Text> : null}
        </Section>

        {trackUrl ? (
          <Text style={text}>
            You can follow progress here: <Link href={trackUrl} style={link}>{trackUrl}</Link>
          </Text>
        ) : null}

        <Text style={muted}>
          Our team will confirm the next steps by email. Documents are delivered digitally once
          issued by the Registrar.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Companies House Cyprus · Nicosia, Cyprus
          <br />
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
    `Order received — ${data['reference'] ?? 'Companies House Cyprus'}`,
  displayName: 'Order confirmation',
  previewData: {
    fullName: 'Andreas Georgiou',
    reference: 'CHC-2A4B7C',
    items: [
      {
        name: 'Cyprus Company Profile (Structure) Report',
        company: 'INFOCREDIT GROUP LIMITED · HE4404',
        quantity: 1,
        total: '€120.00',
      },
    ],
    subtotal: '€120.00',
    serviceFee: '€50.00',
    vat: '€32.30',
    total: '€202.30',
    trackUrl: 'https://companieshousecyprus.com/order/CHC-2A4B7C',
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
const muted = { fontSize: '13px', lineHeight: '21px', color: '#5d6b85' }
const card = {
  backgroundColor: '#f4f7fb',
  border: '1px solid #dde5f0',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '18px 0',
}
const lineItem = { fontSize: '14px', lineHeight: '21px', color: '#22314f', margin: '0 0 10px' }
const totals = { fontSize: '13px', color: '#5d6b85', margin: '0 0 4px' }
const grandTotal = { fontSize: '16px', color: '#12203a', margin: '8px 0 0', fontWeight: 700 }
const hr = { borderColor: '#dde5f0', margin: '16px 0' }
const link = { color: '#3b6ea8' }
const footer = { fontSize: '12px', color: '#8794a8' }
const footerLink = { fontSize: '12px', color: '#b8763e', textDecoration: 'none' }
