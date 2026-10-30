import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { guideEditSchema } from './weekly-guides';

async function requireAdmin(context: { supabase: import('@supabase/supabase-js').SupabaseClient; userId: string }) {
  const { data, error } = await context.supabase.from('user_roles').select('role').eq('user_id',context.userId).eq('role','admin').maybeSingle();
  if (error || !data) throw new Error('Administrator access required');
}
export const adminGuides = createServerFn({ method:'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireAdmin(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data:guides, error } = await supabaseAdmin.from('weekly_guides').select('*').order('created_at',{ ascending:false }).limit(100);
  if (error) throw error;
  const { data:job, error:jobError } = await supabaseAdmin.from('weekly_guide_job').select('*').eq('id',true).maybeSingle();
  if (jobError) throw jobError;
  return { guides:guides ?? [], job };
});
export const updateWeeklyGuide = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown) => guideEditSchema.extend({ publish:z.boolean() }).parse(input))
  .handler(async ({ data, context }) => { await requireAdmin(context); const { saveGuide } = await import('./weekly-guides.server'); return saveGuide(context.userId,data,data.publish); });
export const rejectWeeklyGuide = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((input:unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => { await requireAdmin(context); const { supabaseAdmin } = await import('@/integrations/supabase/client.server'); const { error } = await supabaseAdmin.from('weekly_guides').update({ status:'rejected', reviewed_by:context.userId }).eq('id',data.id).eq('status','draft'); if(error) throw error; return { ok:true }; });
export const resumeGuideJob = createServerFn({ method:'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requireAdmin(context); const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('weekly_guide_job').update({ paused:false, pause_reason:null, pause_kind:null }).eq('id',true); if(error) throw error; return { ok:true };
});
export const listPublishedGuides = createServerFn({ method:'GET' }).handler(async () => { const { publishedGuides } = await import('./weekly-guides.server'); return publishedGuides(); });
export const getPublishedGuide = createServerFn({ method:'GET' }).inputValidator((input:unknown) => z.object({ slug:z.string().regex(/^registry-insight-\d{4}-\d{2}-\d{2}$/) }).parse(input)).handler(async ({ data }) => { const { publishedGuides } = await import('./weekly-guides.server'); return (await publishedGuides(data.slug))[0] ?? null; });