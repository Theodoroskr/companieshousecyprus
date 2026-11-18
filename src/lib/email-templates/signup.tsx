import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Companies House Cyprus</Text>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Confirm email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#3b6ea8', textDecoration: 'underline' }
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
