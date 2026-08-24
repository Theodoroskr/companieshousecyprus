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

export interface GuideLeadConfirmationProps {
  firstName?: string
  isDownload?: boolean
  guideUrl?: string
  consentText?: string
}

const Email = ({ firstName, isDownload, guideUrl, consentText }: GuideLeadConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isDownload
        ? 'Your Cyprus Company Formation Guide 2026'
        : 'We have received your specialist introduction request'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>
          {isDownload
            ? 'Your Cyprus Company Formation Guide 2026'
            : 'Your introduction request has been received'}
        </Heading>
        <Section style={card}>
          <Text style={row}>{firstName ? `Hello ${firstName},` : 'Hello,'}</Text>
          {isDownload ? (
            <>
              <Text style={row}>
                Thank you for requesting our guide. It covers the incorporation process, the
                documents typically required, indicative timelines and ongoing company obligations,
                together with a registration checklist, KYC document list and post-incorporation
                compliance checklist.
              </Text>
              <Button style={button} href={guideUrl ?? 'https://companieshousecyprus.com/guides/register-company-cyprus'}>
                Open and download the guide
              </Button>
            </>
          ) : (
            <>
              <Text style={row}>
                Thank you for your enquiry. Our team will review the details you provided and, where
                appropriate, introduce you to an independent Cyprus company-formation specialist.
              </Text>
              <Text style={row}>
                Submitting the form does not create a professional-client relationship and does not
                guarantee acceptance, incorporation or bank-account approval.
              </Text>
              <Button style={button} href={guideUrl ?? 'https://companieshousecyprus.com/guides/register-company-cyprus'}>
                Read the 2026 guide while you wait
              </Button>
            </>
          )}
          <Hr style={hr} />
          <Text style={small}>
            Companies House Cyprus is an independent information service and is not affiliated with
            the Government of the Republic of Cyprus. This email and the guide are general
            information only and do not constitute legal, tax, accounting or investment advice.
          </Text>
          {consentText ? <Text style={small}>You told us: “{consentText}”</Text> : null}
        </Section>
        <Text style={footer}>
          Questions? Reply to this email or write to{' '}
          <Link href="mailto:info@companieshousecyprus.com" style={link}>
            info@companieshousecyprus.com
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data['isDownload']
      ? 'Your Cyprus Company Formation Guide 2026'
      : 'We have received your specialist introduction request',
  displayName: 'Guide lead confirmation',
  previewData: {
    firstName: 'Maria',
    isDownload: true,
    guideUrl: 'https://companieshousecyprus.com/guides/register-company-cyprus',
  },
}

const main = { backgroundColor: '#f4f6f9', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '32px 20px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8a6a48' }
const h1 = { fontSize: '22px', color: '#0d2137', margin: '8px 0 20px' }
const card = { backgroundColor: '#ffffff', borderRadius: '10px', padding: '24px', border: '1px solid #e3e8ee' }
const row = { fontSize: '15px', color: '#26374a', margin: '10px 0', lineHeight: '24px' }
const small = { fontSize: '12px', color: '#5c6b7d', margin: '8px 0', lineHeight: '18px' }
const button = {
  backgroundColor: '#0d2137',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '14px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '10px 0',
}
const hr = { borderColor: '#e3e8ee', margin: '18px 0' }
const link = { color: '#1c4e80' }
const footer = { fontSize: '12px', color: '#5c6b7d', marginTop: '18px' }
