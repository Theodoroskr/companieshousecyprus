import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface FileSummary {
  file: string
  rowsProcessed: number
  rowsFailed: number
  runId: string
}

interface Props {
  status?: 'completed' | 'failed'
  files?: FileSummary[]
  error?: string | null
  startedAt?: string
  finishedAt?: string
  durationMin?: number
}

const LABELS: Record<string, string> = {
  addresses: 'Registered office addresses',
  organisations: 'Companies & organisations',
  officials: 'Directors & officials',
}

const RegistrySyncReport = ({ status = 'completed', files = [], error, startedAt, finishedAt, durationMin }: Props) => {
  const failed = status === 'failed'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {failed
          ? 'The automated Cyprus registry refresh failed'
          : 'The automated Cyprus registry refresh completed'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Companies House Cyprus</Heading>
          <Text style={subheading}>Automated registry refresh — {failed ? 'failed' : 'completed'}</Text>
          <Hr style={hr} />
          <Text style={text}>
            {failed
              ? 'The scheduled refresh of the Cyprus companies registry could not be completed. The stored data is unchanged and the next scheduled run will retry.'
              : 'The scheduled refresh of the Cyprus companies registry has finished. New registrations, status changes, address updates and official changes are now live, and company monitoring alerts will pick up any watched changes.'}
          </Text>
          {files.length > 0 && (
            <Section>
              {files.map((file) => (
                <Text key={file.file} style={text}>
                  <strong>{LABELS[file.file] ?? file.file}</strong>
                  {' — '}
                  {file.rowsProcessed.toLocaleString('en-GB')} rows written
                  {file.rowsFailed > 0 ? `, ${file.rowsFailed.toLocaleString('en-GB')} skipped` : ''}
                </Text>
              ))}
            </Section>
          )}
          {error ? <Text style={errorText}>Error: {error}</Text> : null}
          <Hr style={hr} />
          <Text style={meta}>
            Started: {startedAt ? new Date(startedAt).toUTCString() : '—'}
            <br />
            Finished: {finishedAt ? new Date(finishedAt).toUTCString() : '—'}
            {durationMin ? (
              <>
                <br />
                Duration: ~{durationMin} min
              </>
            ) : null}
          </Text>
          <Text style={meta}>
            Full details are in the admin import history (kind: registry_auto).
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RegistrySyncReport,
  subject: (data: Record<string, any>) =>
    data?.['status'] === 'failed'
      ? 'Registry refresh failed — action needed'
      : 'Registry refresh completed',
  displayName: 'Registry sync report',
  previewData: {
    status: 'completed',
    files: [
      { file: 'organisations', rowsProcessed: 571218, rowsFailed: 3, runId: 'x' },
      { file: 'officials', rowsProcessed: 1044552, rowsFailed: 12, runId: 'y' },
    ],
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMin: 42,
  },
  to: 'info@companieshousecyprus.com',
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { fontSize: '20px', margin: '0 0 4px' }
const subheading = { fontSize: '14px', color: '#555555', margin: '0' }
const hr = { borderColor: '#e5e5e5', margin: '16px 0' }
const text = { fontSize: '14px', lineHeight: '22px', color: '#222222' }
const errorText = { fontSize: '14px', lineHeight: '22px', color: '#b91c1c' }
const meta = { fontSize: '12px', lineHeight: '18px', color: '#666666' }
