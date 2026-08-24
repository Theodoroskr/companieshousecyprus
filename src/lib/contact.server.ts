import { sendTemplateEmail } from './email-templates/send-email'

export interface ContactInquiryInput {
  name: string
  email: string
  company?: string
  message: string
}

/** Sends a contact-form enquiry to the office inbox. Throws if delivery fails. */
export async function deliverContactInquiry(input: ContactInquiryInput) {
  const receivedAt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Nicosia',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())

  await sendTemplateEmail('contact-inquiry', 'info@companieshousecyprus.com', {
    replyTo: input.email,
    templateData: {
      fullName: input.name,
      email: input.email,
      company: input.company ?? '',
      message: input.message,
      receivedAt: `${receivedAt} (Asia/Nicosia)`,
    },
  })

  return { ok: true as const }
}
