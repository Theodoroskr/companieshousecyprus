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

export interface CompanyWatchAlertProps {
  company?: string
  changes?: { field: string; previous: string; current: string }[]
  companyUrl?: string
  accountUrl?: string
}

const Email = ({ company, changes = [], companyUrl, accountUrl }: CompanyWatchAlertProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Registry change detected — ${company ?? ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Registry change detected</Heading>
        <Text style={paragraph}>
          A change has been detected in the Cyprus registry for a company you are monitoring:
        </Text>

        <Section style={card}>
          <Text style={row}><strong>Company:</strong> {company ?? '—'}</Text>
          <Hr style={hr} />
          {changes.map((change, index) => (
            <Text style={row} key={index}>
              <strong>{change.field}:</strong> {change.previous} → <strong>{change.current}</strong>
            </Text>
          ))}
        </Section>

        {companyUrl ? (
          <Section style={{ margin: '22px 0' }}>
            <Button href={companyUrl} style={button}>View company record</Button>
          </Section>
        ) : null}

        <Text style={paragraph}>
          {accountUrl ? (
            <>
              Manage your watched companies in{' '}
              <Link href={accountUrl} style={link}>your account</Link>.
            </>
          ) : (
            'You can manage your watched companies from your account.'
          )}{' '}
          Alerts are based on daily checks against the public registry.
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
    `Registry change detected — ${data['company'] ?? 'watched company'}`,
  displayName: 'Company watch alert',
  previewData: {
    company: 'ADRANUS INVESTMENTS LIMITED · HE327816',
    changes: [
      { field: 'Registry status', previous: 'Registered', current: 'Under strike-off' },
      { field: 'Registered office', previous: '1 Example Street, Nicosia', current: '2 New Avenue, Limassol' },
    ],
    companyUrl: 'https://companieshousecyprus.com/company/adranus-investments-limited-he327816',
    accountUrl: 'https://companieshousecyprus.com/account/monitoring',
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
const link = { color: '#3b6ea8' }
const footer = { fontSize: '12px', color: '#8794a8', marginTop: '18px' }
const footerLink = { fontSize: '12px', color: '#b8763e', textDecoration: 'none' }
