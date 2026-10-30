import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';

export const Route = createFileRoute('/api/public/weekly-guides')({ server:{ handlers:{ POST:async ({ request }) => {
  const body = await request.clone().json().catch(() => null);
  if (!body || !['weekly','manual'].includes(body.kind)) return Response.json({ error:'Invalid request' },{ status:400 });
  if (body.kind === 'weekly') {
    const failure = await authenticateCronRequest(request); if(failure) return failure;
  } else {
    const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!bearer) return Response.json({ error:'Sign in required' },{ status:401 });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error } = await supabaseAdmin.auth.getUser(bearer);
    if (error || !data.user) return Response.json({ error:'Sign in required' },{ status:401 });
    // Authenticated role query, not an admin client deciding authorization.
    const { createClient } = await import('@supabase/supabase-js');
    const url=process.env['SUPABASE_URL']; const key=process.env['SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) return Response.json({ error:'Service unavailable' },{ status:500 });
    const client=createClient(url,key,{ global:{ headers:{ Authorization:`Bearer ${bearer}` } }, auth:{ persistSession:false } });
    const { data:role, error:roleError }=await client.from('user_roles').select('role').eq('user_id',data.user.id).eq('role','admin').maybeSingle();
    if (roleError || !role) return Response.json({ error:'Administrator access required' },{ status:403 });
  }
  const { claimGeneration, generateWeeklyGuide } = await import('@/lib/weekly-guides.server');
  const token=await claimGeneration();
  if (!token) return Response.json({ message:'Generation is paused or already running.' },{ status:409 });
  const { runBackground } = await import('@/lib/execution-context.server');
  // Separate request signal: a scheduler response ending must not cancel durable work.
  runBackground(generateWeeklyGuide(token,new Request(request.url)));
  return Response.json({ message:'Draft generation started.' },{ status:202, headers:{ 'cache-control':'no-store' } });
} } } });