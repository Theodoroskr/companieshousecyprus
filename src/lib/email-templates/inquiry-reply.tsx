import React from 'react'
import { Body, Container, Head, Hr, Img, Html, Link, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface InquiryReplyProps {
  subject?: string
  greeting?: string
  paragraphs?: string[]
  signOff?: string
}

const Email = ({
  greeting = 'Hello,',
  paragraphs = [],
  signOff = 'Kind regards,',
}: InquiryReplyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{paragraphs[0] ?? 'A reply from Companies House Cyprus'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://companieshousecyprus.com/__l5e/assets-v1/5267d511-734b-4e2a-994b-e45c2724c9f4/cyprus-companies-house-logo.png"
          width="180"
          alt="Companies House Cyprus"
          style={{ display: 'block', marginBottom: '18px' }}
        />
        <Text style={text}>{greeting}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={text}>{p}</Text>
        ))}
        <Text style={text}>
          {signOff}
          <br />
          Companies House Cyprus
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
  subject: (data: Record<string, any>) => String(data?.['subject'] ?? 'Your enquiry to Companies House Cyprus'),
  displayName: 'Reply to customer enquiry',
  previewData: {
    subject: 'Your enquiry to Companies House Cyprus',
    greeting: 'Dear Ms Ioannou,',
    paragraphs: ['Thank you for your message. Our records show the company as active.'],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '600px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#26313f', margin: '0 0 14px' }
const hr = { borderColor: '#e6eaef', margin: '22px 0 14px' }
const footer = { fontSize: '12px', color: '#7a838f', margin: '0 0 4px' }
const link = { color: '#8a6a45' }
