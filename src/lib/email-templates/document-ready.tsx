import React from 'react'
import {
  Body,
  Button,
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

export interface DocumentReadyProps {
  fullName?: string
  reference?: string
  documentName?: string
  productName?: string
  companyName?: string | null
  companyNumber?: string | null
  deliveredAt?: string
  sentAt?: string
  portalUrl?: string
  documents?: { name: string; url?: string | null }[]
}

const Email = ({
  fullName,
  reference = '—',
  documentName,
  productName,
  companyName,
  companyNumber,
  deliveredAt,
  sentAt,
  portalUrl,
  documents,
}: DocumentReadyProps) => (

  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your document for order ${reference} is ready to download`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://companieshousecyprus.lovable.app/__l5e/assets-v1/5267d511-734b-4e2a-994b-e45c2724c9f4/cyprus-companies-house-logo.png"
          width="180"
          alt="Companies House Cyprus"
          style={{ display: 'block', marginBottom: '18px' }}
        />
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

        {documents && documents.length > 0 ? (
          <Section style={card}>
            <Text style={{ ...meta, fontWeight: 600, color: '#12203a' }}>
              {documents.length === 1 ? 'Your document' : `Your documents (${documents.length})`}
            </Text>
            {documents.map((doc) => (
              <Text key={doc.name} style={meta}>
                {doc.url ? (
                  <Link href={doc.url} style={link}>
                    {doc.name}
                  </Link>
                ) : (
                  doc.name
                )}
              </Text>
            ))}
            <Text style={meta}>These secure download links stay valid for 7 days.</Text>
          </Section>
        ) : null}


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
const footerLink = { fontSize: '12px', color: '#b8763e', textDecoration: 'none' }
