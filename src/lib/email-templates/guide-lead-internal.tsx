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

export interface GuideLeadInternalProps {
  leadType?: string
  fullName?: string
  email?: string
  telephone?: string
  country?: string
  nationality?: string
  businessActivity?: string
  countriesOfOperation?: string
  shareholderCount?: string
  corporateShareholder?: string
  timeframe?: string
  services?: string
  notes?: string
  formSource?: string
  landingPage?: string
  utm?: string
  consentText?: string
  consentVersion?: string
  receivedAt?: string
}

const Row = ({ label, value }: { label: string; value?: string | undefined }) =>
  value ? (
    <Text style={row}>
      <strong>{label}:</strong> {value}
    </Text>
  ) : null

const Email = (props: GuideLeadInternalProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${props.leadType ?? 'New lead'} — ${props.fullName ?? 'website visitor'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>{props.leadType ?? 'New lead'}</Heading>
        <Section style={card}>
          <Row label="Name" value={props.fullName} />
          <Text style={row}>
            <strong>Email:</strong>{' '}
            {props.email ? (
              <Link href={`mailto:${props.email}`} style={link}>
                {props.email}
              </Link>
            ) : (
              '—'
            )}
          </Text>
          <Row label="Telephone" value={props.telephone} />
          <Row label="Country of residence" value={props.country} />
          <Row label="Nationality" value={props.nationality} />
          <Row label="Registration timeframe" value={props.timeframe} />
          <Row label="Shareholders" value={props.shareholderCount} />
          <Row label="Corporate shareholder" value={props.corporateShareholder} />
          <Row label="Countries of operation" value={props.countriesOfOperation} />
          <Row label="Services required" value={props.services} />
          <Hr style={hr} />
          <Text style={row}>
            <strong>Proposed business activity</strong>
          </Text>
          <Text style={row}>{props.businessActivity ?? '—'}</Text>
          {props.notes ? (
            <>
              <Text style={row}>
                <strong>Additional information</strong>
              </Text>
              <Text style={row}>{props.notes}</Text>
            </>
          ) : null}
          <Hr style={hr} />
          <Row label="Form" value={props.formSource} />
          <Row label="Landing page" value={props.landingPage} />
          <Row label="Campaign" value={props.utm} />
          <Row label="Received" value={props.receivedAt} />
          <Row label="Consent version" value={props.consentVersion} />
          {props.consentText ? <Text style={consent}>“{props.consentText}”</Text> : null}
        </Section>
        <Text style={footer}>
          Review and assign this lead in the admin area before any introduction is made.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `${data['leadType'] ?? 'New lead'} — ${data['fullName'] ?? 'website visitor'}`,
  displayName: 'Guide lead (internal)',
  to: 'info@companieshousecyprus.com',
  previewData: {
    leadType: 'Specialist introduction request',
    fullName: 'Maria Ivanova',
    email: 'maria@example.com',
    country: 'Germany',
    businessActivity: 'Software licensing and IT consultancy',
    timeframe: 'Within 30 days',
    services: 'Company formation, Registered office, VAT registration',
    formSource: 'guides/register-company-cyprus#introduction',
    receivedAt: '24/08/2026 21:40 (Asia/Nicosia)',
    consentVersion: 'specialist-introduction-2026.1',
  },
}

const main = { backgroundColor: '#f4f6f9', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '32px 20px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8a6a48' }
const h1 = { fontSize: '22px', color: '#0d2137', margin: '8px 0 20px' }
const card = { backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #e3e8ee' }
const row = { fontSize: '14px', color: '#26374a', margin: '6px 0', lineHeight: '22px' }
const consent = { fontSize: '12px', color: '#5c6b7d', margin: '6px 0', fontStyle: 'italic' as const }
const hr = { borderColor: '#e3e8ee', margin: '16px 0' }
const link = { color: '#1c4e80' }
const footer = { fontSize: '12px', color: '#5c6b7d', marginTop: '18px' }
