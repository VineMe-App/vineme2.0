// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// TEMPORARY rollout gate - remove this check (and the branch that uses it) once this is
// ready to run for every church, not just internal @vineme.app accounts.
const ALLOWED_EMAIL_DOMAIN = '@vineme.app';

interface WebhookPayload {
  id: string;
  church_id: string;
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('CHURCHSUITE_WEBHOOK_SECRET');
  const authHeader = req.headers.get('Authorization') ?? '';
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id, church_id } = (await req.json()) as WebhookPayload;

  if (!id || !church_id) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: 'missing id or church_id',
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('first_name, last_name, churchsuite_id')
    .eq('id', id)
    .maybeSingle();

  if (profileError || !profile) {
    return Response.json(
      { ok: false, error: 'user profile not found' },
      { status: 404 }
    );
  }

  // Idempotency: the trigger already guards on churchsuite_id IS NULL, but re-check here
  // in case of retries/races.
  if (profile.churchsuite_id) {
    return Response.json({ ok: true, skipped: true, reason: 'already linked' });
  }

  const { data: authUserData, error: authUserError } =
    await supabase.auth.admin.getUserById(id);

  if (authUserError || !authUserData?.user) {
    return Response.json(
      { ok: false, error: 'auth user not found' },
      { status: 404 }
    );
  }

  const { email, phone } = authUserData.user;

  if (!email || !email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: 'email domain not enabled yet',
    });
  }

  if (!email && !phone) {
    return Response.json(
      { ok: false, error: 'user has no email or phone to search/create with' },
      { status: 422 }
    );
  }

  try {
    const accessToken = await getValidAccessToken(supabase, church_id);

    const existingContact = await findChurchsuiteContact(
      accessToken,
      phone || email!
    );

    const churchsuiteContactId = existingContact
      ? existingContact.id
      : await createChurchsuiteContact(accessToken, {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email,
          phone,
        });

    await supabase
      .from('users')
      .update({ churchsuite_id: String(churchsuiteContactId) })
      .eq('id', id);

    return Response.json({
      ok: true,
      churchsuite_id: churchsuiteContactId,
      created: !existingContact,
    });
  } catch (err) {
    console.error('create-churchsuite-contact error:', err);
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
  const tokenResponse = await fetch(
    `${Deno.env.get('CHURCHSUITE_AUTH_API_URL')}/oauth2/token`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        scope: 'full_access',
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

async function findChurchsuiteContact(accessToken: string, query: string) {
  const response = await fetch(
    `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/contacts?q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`ChurchSuite contact search failed: ${response.status}`);
  }

  const data = await response.json();
  const results = Array.isArray(data) ? data : data.data;
  return results && results.length > 0 ? results[0] : null;
}

// TODO: verify this against ChurchSuite's actual "create contact" endpoint and required
// field names (see https://developer.churchsuite.com) - this is an unverified best
// guess based on the shape of the search response used elsewhere in this codebase.
// Confirm before relying on this in production.
async function createChurchsuiteContact(
  accessToken: string,
  contact: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    phone?: string;
  }
) {
  const response = await fetch(
    `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/contacts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        firstname: contact.first_name,
        surname: contact.last_name,
        email: contact.email,
        mobile: contact.phone,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ChurchSuite contact creation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.id;
}

/* This function is invoked by a Postgres trigger (AFTER INSERT / AFTER UPDATE OF
   church_id on public.users), not directly by the frontend. See:
   supabase/migrations/20260812221500_churchsuite_contact_sync_trigger.sql

   To invoke locally for testing:

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-churchsuite-contact' \
     --header 'Authorization: Bearer <CHURCHSUITE_WEBHOOK_SECRET>' \
     --header 'Content-Type: application/json' \
     --data '{"id":"<user-uuid>","church_id":"<church-uuid>"}'
*/
