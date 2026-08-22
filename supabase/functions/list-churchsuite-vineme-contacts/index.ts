// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RequestPayload {
  church_id: string;
  page?: number;
  per_page?: number;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return Response.json(
      { ok: false, error: 'Missing Authorization header' },
      { status: 401 }
    );
  }

  const supabaseAnon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseAnon.auth.getUser(token);

  if (userError || !user) {
    return Response.json(
      { ok: false, error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { church_id, page = 1, per_page = 50 } = payload;

  if (!church_id) {
    return Response.json(
      { ok: false, error: 'church_id is required' },
      { status: 400 }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('roles, church_id')
    .eq('id', user.id)
    .maybeSingle();

  const isChurchAdmin =
    !callerError &&
    !!caller &&
    Array.isArray(caller.roles) &&
    caller.roles.includes('church_admin') &&
    caller.church_id === church_id;

  if (!isChurchAdmin) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from('churchsuite_connections')
    .select('vineme_tag_id')
    .eq('church_id', church_id)
    .maybeSingle();

  if (connectionError || !connection) {
    return Response.json(
      { ok: false, error: 'No ChurchSuite connection found for this church' },
      { status: 404 }
    );
  }

  // No contact has ever been created via VineMe for this church yet, so the tag hasn't
  // been provisioned - nothing to list.
  if (!connection.vineme_tag_id) {
    return Response.json({ ok: true, contacts: [], pagination: null });
  }

  try {
    const accessToken = await getValidAccessToken(supabase, church_id);

    const url = new URL(
      `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/contacts`
    );
    url.searchParams.set('tag_ids[]', String(connection.vineme_tag_id));
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(per_page));

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`ChurchSuite contact list failed: ${response.status}`);
    }

    const data = await response.json();

    return Response.json({
      ok: true,
      contacts: data.data,
      pagination: data.pagination,
    });
  } catch (err) {
    console.error('list-churchsuite-vineme-contacts error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
});

async function getValidAccessToken(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  churchId: string
): Promise<string> {
  const { data: connection, error } = await supabase
    .from('churchsuite_connections')
    .select('access_token, access_token_expires_at')
    .eq('church_id', churchId)
    .single();

  if (error || !connection) {
    throw new Error(`No ChurchSuite connection found for church ${churchId}`);
  }

  const isExpired =
    !connection.access_token_expires_at ||
    new Date(connection.access_token_expires_at) <= new Date();

  if (connection.access_token && !isExpired) {
    return connection.access_token;
  }

  const { data: secret, error: secretError } = await supabase
    .rpc('get_churchsuite_secret', { p_church_id: churchId })
    .maybeSingle();

  if (secretError || !secret) {
    throw new Error(`No ChurchSuite credentials found for church ${churchId}`);
  }

  const credentials = btoa(`${secret.identifier}:${secret.secret}`);
  const CHURCHSUITE_AUTH_API_URL = Deno.env.get('CHURCHSUITE_AUTH_API_URL');
  const tokenResponse = await fetch(
    `${CHURCHSUITE_AUTH_API_URL}/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        scope: 'addressbook.read addressbook.write',
      }),
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to fetch ChurchSuite access token: ${tokenResponse.status}`
    );
  }

  const authData = await tokenResponse.json();
  const expiresAt = authData.expires_in
    ? new Date(Date.now() + authData.expires_in * 1000).toISOString()
    : null;

  await supabase
    .from('churchsuite_connections')
    .update({
      access_token: authData.access_token,
      access_token_expires_at: expiresAt,
    })
    .eq('church_id', churchId);

  return authData.access_token;
}

/* This function is called by church admins from the ChurchSuite admin screen
   (src/app/admin/churchsuite.tsx) to list contacts tagged "VineMe" - i.e. contacts
   created via supabase/functions/create-churchsuite-contact.

   To invoke locally for testing:

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-churchsuite-vineme-contacts' \
     --header 'Authorization: Bearer <church-admin-user-jwt>' \
     --header 'Content-Type: application/json' \
     --data '{"church_id":"<church-uuid>"}'
*/
