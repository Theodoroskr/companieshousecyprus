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

export interface ContactInquiryProps {
  fullName?: string
  email?: string
  company?: string | null
  message?: string
  receivedAt?: string
}

const Email = ({ fullName, email, company, message, receivedAt }: ContactInquiryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New website enquiry from ${fullName ?? 'a visitor'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>New contact enquiry</Heading>
        <Section style={card}>
          <Text style={row}><strong>Name:</strong> {fullName ?? '—'}</Text>
          <Text style={row}><strong>Email:</strong>{' '}
            {email ? <Link href={`mailto:${email}`} style={link}>{email}</Link> : '—'}
          </Text>
          <Text style={row}><strong>Company / firm:</strong> {company || '—'}</Text>
          {receivedAt ? <Text style={row}><strong>Received:</strong> {receivedAt}</Text> : null}
          <Hr style={hr} />
          <Text style={row}>{message ?? ''}</Text>
        </Section>
        <Text style={footer}>
          Sent from the contact form on{' '}
          <Link href="https://companieshousecyprus.com/contact" style={footerLink}>
            companieshousecyprus.com/contact
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Website enquiry — ${data['fullName'] ?? 'new message'}`,
  displayName: 'Contact enquiry',
  to: 'info@companieshousecyprus.com',
  previewData: {
    fullName: 'Andreas Georgiou',
    email: 'andreas@example.com',
    company: 'Georgiou & Partners LLC',
    message: 'We need certified copies for HE4404 by Friday. Can you quote account pricing?',
    receivedAt: '24/08/2026 21:10 (Asia/Nicosia)',
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
const card = {
  backgroundColor: '#f4f7fb',
  border: '1px solid #dde5f0',
  borderRadius: '10px',
  padding: '16px 18px',
  margin: '18px 0',
}
const row = { fontSize: '14px', lineHeight: '22px', color: '#22314f', margin: '0 0 8px' }
const hr = { borderColor: '#dde5f0', margin: '16px 0' }
const link = { color: '#3b6ea8' }
const footer = { fontSize: '12px', color: '#8794a8' }
const footerLink = { fontSize: '12px', color: '#b8763e', textDecoration: 'none' }
