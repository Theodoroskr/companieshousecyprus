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

export interface AssistanceLine {
  name: string
  company?: string | null
  total?: string
}

export interface OrderAssistanceProps {
  fullName?: string
  reference?: string
  items?: AssistanceLine[]
  total?: string
  checkoutUrl?: string
}

const Email = ({
  fullName,
  reference = '—',
  items = [],
  total,
  checkoutUrl = 'https://companieshousecyprus.com/cart',
}: OrderAssistanceProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Need help completing your order ${reference}?`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://companieshousecyprus.com/__l5e/assets-v1/5267d511-734b-4e2a-994b-e45c2724c9f4/cyprus-companies-house-logo.png"
          width="180"
          alt="Companies House Cyprus"
          style={{ display: 'block', marginBottom: '18px' }}
        />
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Can we help you finish your order?</Heading>
        <Text style={text}>
          {fullName ? `Dear ${fullName},` : 'Hello,'} we noticed your selection
          (reference <strong>{reference}</strong>) is still waiting for payment, so nothing has been
          ordered yet. If you would like help choosing the right documents or paying by bank
          transfer, just reply to this email.
        </Text>

        {items.length > 0 && (
          <Section style={{ marginTop: '8px' }}>
            {items.map((item, index) => (
              <Section key={`${item.name}-${index}`} style={row}>
                <Text style={itemName}>{item.name}</Text>
                {item.company ? <Text style={itemMeta}>{item.company}</Text> : null}
                {item.total ? <Text style={itemMeta}>{item.total}</Text> : null}
              </Section>
            ))}
          </Section>
        )}

        {total ? <Text style={text}>Estimated total: <strong>{total}</strong></Text> : null}

        <Text style={text}>
          <Link href={checkoutUrl} style={link}>
            Complete your order securely
          </Link>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>Companies House Cyprus · Nicosia, Cyprus</Text>
        <Text style={footer}>
          <Link href="mailto:info@companieshousecyprus.com" style={link}>
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
    `Need help completing your order ${data?.['reference'] ?? ''}`.trim(),
  displayName: 'Order assistance (unpaid basket)',
  previewData: {
    fullName: 'Nicos Ioannou',
    reference: 'CHC-7CR2L6-4E50',
    items: [
      { name: 'Certificate of Good Standing', company: 'INFOCREDIT GROUP LIMITED · HE4404', total: '€99.50' },
    ],
    total: '€99.50',
    checkoutUrl: 'https://companieshousecyprus.com/cart',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const brand = { fontSize: '12px', letterSpacing: '1.5px', color: '#8a6a45', textTransform: 'uppercase' as const, margin: '0 0 6px' }
const h1 = { fontSize: '22px', color: '#0d2137', margin: '0 0 14px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#26313f', margin: '0 0 14px' }
const row = { borderTop: '1px solid #e6eaef', padding: '10px 0' }
const itemName = { fontSize: '15px', color: '#0d2137', margin: '0' }
const itemMeta = { fontSize: '13px', color: '#5b6673', margin: '2px 0 0' }
const hr = { borderColor: '#e6eaef', margin: '22px 0 14px' }
const footer = { fontSize: '12px', color: '#7a838f', margin: '0 0 4px' }
const link = { color: '#8a6a45' }
