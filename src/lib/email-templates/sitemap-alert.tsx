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

export interface SitemapAlertProps {
  state?: 'failure' | 'recovery'
  checkedAt?: string
  checked?: number
  failing?: number
  failures?: Array<{ path: string; status: string; error: string }>
  dashboardUrl?: string
}

const Email = (props: SitemapAlertProps) => {
  const recovered = props.state === 'recovery'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {recovered
          ? 'Sitemaps are responding normally again'
          : `${props.failing ?? 0} sitemap URL(s) are failing`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Companies House Cyprus</Text>
          <Heading style={h1}>
            {recovered ? 'Sitemap health restored' : 'Sitemap health check failed'}
          </Heading>
          <Section style={card}>
            <Text style={row}>
              <strong>Checked:</strong> {props.checkedAt ?? '—'}
            </Text>
            <Text style={row}>
              <strong>Sitemaps probed:</strong> {props.checked ?? 0}
            </Text>
            <Text style={row}>
              <strong>Failing:</strong> {props.failing ?? 0}
            </Text>
            {recovered ? (
              <Text style={row}>
                Every sitemap URL now returns a valid XML response with a 200 status.
              </Text>
            ) : (
              <>
                <Hr style={hr} />
                {(props.failures ?? []).map((failure) => (
                  <Text key={failure.path} style={fail}>
                    <strong>{failure.path}</strong> — status {failure.status}: {failure.error}
                  </Text>
                ))}
              </>
            )}
            <Hr style={hr} />
            <Text style={row}>
              <Link href={props.dashboardUrl ?? 'https://companieshousecyprus.com/admin/sitemap'} style={link}>
                Open the sitemap health dashboard
              </Link>
            </Text>
          </Section>
          <Text style={footer}>
            Automated check — runs every 15 minutes against the published sitemaps.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data['state'] === 'recovery'
      ? 'Sitemap health restored — Companies House Cyprus'
      : `Sitemap alert: ${data['failing'] ?? 0} failing URL(s) — Companies House Cyprus`,
  displayName: 'Sitemap health alert',
  to: 'info@companieshousecyprus.com',
  previewData: {
    state: 'failure',
    checkedAt: '25/08/2026, 14:30:00',
    checked: 14,
    failing: 2,
    failures: [
      { path: '/sitemaps/companies/3.xml', status: '500', error: 'HTTP 500' },
      { path: '/sitemaps/pages.xml', status: 'no response', error: 'fetch failed' },
    ],
    dashboardUrl: 'https://companieshousecyprus.com/admin/sitemap',
  },
}

const main = { backgroundColor: '#f4f6f9', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '32px 20px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#8a6a48' }
const h1 = { fontSize: '22px', color: '#0d2137', margin: '8px 0 20px' }
const card = { backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #e3e8ee' }
const row = { fontSize: '14px', color: '#26374a', margin: '6px 0', lineHeight: '22px' }
const fail = { fontSize: '13px', color: '#8c2f2f', margin: '6px 0', lineHeight: '20px' }
const hr = { borderColor: '#e3e8ee', margin: '16px 0' }
const link = { color: '#1c4e80' }
const footer = { fontSize: '12px', color: '#5c6b7d', marginTop: '18px' }
