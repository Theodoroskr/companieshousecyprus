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

export interface DocumentReadyProps {
  fullName?: string
  reference?: string
  documentName?: string
  productName?: string
  companyName?: string | null
  companyNumber?: string | null
  deliveredAt?: string
  portalUrl?: string
}

const Email = ({
  fullName,
  reference = '—',
  documentName,
  productName,
  companyName,
  companyNumber,
  deliveredAt,
  portalUrl,
}: DocumentReadyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your document for order ${reference} is ready to download`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Your document is ready</Heading>
        <Text style={text}>
          {fullName ? `Dear ${fullName},` : 'Hello,'} we have completed part of your order{' '}
          <strong>{reference}</strong>. The document below is now available in your client portal.
        </Text>

        <Section style={card}>
          {productName ? <Text style={meta}>Document: {productName}</Text> : null}
          {companyName ? (
            <Text style={meta}>
              Company: {companyName}
              {companyNumber ? ` · ${companyNumber}` : ''}
            </Text>
          ) : null}
          {documentName ? <Text style={meta}>File: {documentName}</Text> : null}
          {deliveredAt ? <Text style={meta}>Delivered on: {deliveredAt}</Text> : null}
        </Section>

        {portalUrl ? (
          <Section style={{ margin: '20px 0' }}>
            <Button href={portalUrl} style={button}>
              Download from your portal
            </Button>
            <Text style={meta}>
              Or open <Link href={portalUrl} style={link}>{portalUrl}</Link>
            </Text>
          </Section>
        ) : null}

        <Text style={text}>
          Downloads are protected by your account, so please sign in with the email address that
          received this message.
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
    `Document ready — ${data['reference'] ?? 'Companies House Cyprus'}`,
  displayName: 'Document ready',
  previewData: {
    fullName: 'Andreas Georgiou',
    reference: 'CHC-2A4B7C',
    documentName: 'certificate-of-incorporation.pdf',
    productName: 'Certificate of Incorporation',
    companyName: 'INFOCREDIT GROUP LIMITED',
    companyNumber: 'HE4404',
    deliveredAt: '24/08/2026',
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
const meta = { fontSize: '13px', color: '#5d6b85', margin: '0 0 4px' }
const button = {
  backgroundColor: '#12203a',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
}
const hr = { borderColor: '#dde5f0', margin: '16px 0' }
const link = { color: '#3b6ea8' }
const footer = { fontSize: '12px', color: '#8794a8' }
