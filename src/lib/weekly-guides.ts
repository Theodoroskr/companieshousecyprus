import { z } from 'zod';

export const guideContentSchema = z.object({
  introduction: z.string().min(20).max(4000),
  sections: z.array(z.object({ heading: z.string().min(3).max(180), paragraphs: z.array(z.string().min(10).max(5000)).min(1).max(6) })).min(2).max(8),
  faqs: z.array(z.object({ question: z.string().min(5).max(300), answer: z.string().min(10).max(2000) })).min(2).max(6),
});
export const guideEditSchema = z.object({ id: z.string().uuid(), title: z.string().trim().min(10).max(180), description: z.string().trim().min(20).max(300), content: guideContentSchema });
export type GuideContent = z.infer<typeof guideContentSchema>;
export function guideWeek(date = new Date()) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
export function canPublishGuide(status: string) { return status === 'draft'; }
