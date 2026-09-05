import type { ComponentType } from 'react'
import { template as orderConfirmationTemplate } from './order-confirmation'
import { template as orderAssistanceTemplate } from './order-assistance'
import { template as paymentReceiptTemplate } from './payment-receipt'
import { template as documentReadyTemplate } from './document-ready'
import { template as contactInquiryTemplate } from './contact-inquiry'
import { template as guideLeadInternalTemplate } from './guide-lead-internal'
import { template as guideLeadConfirmationTemplate } from './guide-lead-confirmation'
import { template as sitemapAlertTemplate } from './sitemap-alert'
import { template as paymentRequestTemplate } from './payment-request'
import { template as companyWatchAlertTemplate } from './company-watch-alert'
import { template as registrySyncReportTemplate } from './registry-sync-report'



export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmationTemplate,
  'order-assistance': orderAssistanceTemplate,
  'payment-receipt': paymentReceiptTemplate,
  'document-ready': documentReadyTemplate,
  'contact-inquiry': contactInquiryTemplate,
  'guide-lead-internal': guideLeadInternalTemplate,
  'guide-lead-confirmation': guideLeadConfirmationTemplate,
  'sitemap-alert': sitemapAlertTemplate,
  'payment-request': paymentRequestTemplate,
  'company-watch-alert': companyWatchAlertTemplate,


}
