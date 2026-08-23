// Supabase Edge Function: get-churchsuite-sites
// Looks up the caller's own church, fetches a ChurchSuite access token
// server-side with a fixed minimal scope, and returns just the shaped
// list of sites. The access token itself never leaves this function.
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getChurchsuiteAccessToken } from '../_shared/churchsuite.ts';

// Fixed, minimal scope for this lookup - never accepted from the caller.
// NOTE: confirm this matches ChurchSuite's actual scope name for reading sites.
const SITES_SCOPE = 'account';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  // Scoped as the calling user, so auth.uid() inside these RPCs resolves to
  // them - church_id always comes from their own profile, never the request.
  const supabaseAsUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const [
    { data: isChurchAdmin, error: roleError },
    { data: churchId, error: churchError },
  ] = await Promise.all([
    supabaseAsUser.rpc('current_user_has_role', { role: 'church_admin' }),
    supabaseAsUser.rpc('current_user_church_id'),
  ]);

  if (roleError || churchError || !isChurchAdmin || !churchId) {
    return Response.json(
      { error: 'Only a church admin can view ChurchSuite sites' },
      { status: 403 }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let accessToken: string;
  try {
    const tokenData = await getChurchsuiteAccessToken(supabaseAdmin, churchId, [
      SITES_SCOPE,
    ]);
    accessToken = tokenData.access_token;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not obtain a ChurchSuite access token';
    const status = message.includes('No ChurchSuite connection') ? 404 : 502;
    return Response.json({ error: message }, { status });
  }

  const sitesResponse = await fetch(`${Deno.env.get('CHURCHSUITE_API_URL')}/account/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!sitesResponse.ok) {
    return Response.json(
      { error: 'Failed to fetch sites from ChurchSuite' },
      { status: 502 }
    );
  }

  const sitesData = await sitesResponse.json();
  const rawSites: { id: number; name: string }[] = sitesData.data ?? [];

  const sites = rawSites.map((site) => ({
    id: String(site.id),
    name: site.name,
  }));

  return Response.json({ sites });
});
