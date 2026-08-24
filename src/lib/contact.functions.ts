import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address').max(255),
  company: z.string().trim().max(160).optional().default(''),
  message: z.string().trim().min(5, 'Please add a few details').max(4000),
})

export const submitContactInquiry = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { deliverContactInquiry } = await import('./contact.server')
    return deliverContactInquiry(data)
  })
