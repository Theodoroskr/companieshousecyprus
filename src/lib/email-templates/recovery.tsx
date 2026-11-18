import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click
          the button below to choose a new password.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '28px 26px', maxWidth: '560px' }
const brand = {
  fontSize: '12px',
  letterSpacing: '1.4px',
  textTransform: 'uppercase' as const,
  color: '#3b6ea8',
  margin: '0 0 6px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#12203a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#22314f',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#b8763e',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  border: '1px solid #b8763e',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#8794a8', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #b8763e !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #b8763e !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #b8763e !important; color: #ffffff !important; }
`
