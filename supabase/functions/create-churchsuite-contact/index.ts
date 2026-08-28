// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  ensureVinemeTagId,
  getChurchsuiteAccessToken,
} from '../_shared/churchsuite.ts';

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

  const rawBody = await req.text();
  const { id, church_id } = JSON.parse(rawBody) as WebhookPayload;
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
    .select('first_name, last_name, churchsuite_id, service_id')
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

  const { new_email: email, phone } = authUserData.user;

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
    const accessTokenData = await getChurchsuiteAccessToken(supabase, church_id, ['addressbook.read', 'addressbook.write']);
    const { access_token: accessToken } = accessTokenData

    const normalisedPhone = phone ? phone.replace('44', '0') : undefined;
    const existingContact = await findChurchsuiteContact(
      accessToken,
      normalisedPhone || email!
    );

    const { data: serviceData } = existingContact
      ? { data: null }
      : await supabase
          .from('services')
          .select('churchsuite_site_id')
          .eq('id', profile.service_id)
          .maybeSingle();

    const churchsuiteContactId = existingContact
      ? existingContact.id
      : await createChurchsuiteContact(accessToken, {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email,
          phone: normalisedPhone,
          site_id: serviceData?.churchsuite_site_id
        });

    await supabase
      .from('users')
      .update({ churchsuite_id: String(churchsuiteContactId) })
      .eq('id', id);

    // Tag every contact we touch, so admins can distinguish brand new contacts from
    // existing ones VineMe just linked to. Tagging is supplementary to the
    // churchsuite_id link above, so failures here are logged but don't fail the request.
    let tagError: string | null = null;
    try {
      const vinemeTagId = await ensureVinemeTagId(
        supabase,
        accessToken,
        church_id,
        existingContact ? 'matched' : 'created'
      );
      await tagChurchsuiteContact(
        accessToken,
        churchsuiteContactId,
        vinemeTagId
      );
    } catch (err) {
      tagError = err instanceof Error ? err.message : String(err);
      console.error('create-churchsuite-contact tag error:', err);
    }

    return Response.json({
      ok: true,
      churchsuite_id: churchsuiteContactId,
      created: !existingContact,
      ...(tagError ? { tag_error: tagError } : {}),
    });
  } catch (err) {
    console.error('create-churchsuite-contact error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
});

async function tagChurchsuiteContact(
  accessToken: string,
  contactId: number,
  tagId: number
): Promise<void> {
  const response = await fetch(
    `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/tag_resources`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        person: { type: 'addressbook_contact', id: contactId },
        tag_id: tagId,
      }),
    }
  );

  // 409 means the contact is already tagged - treat as success.
  if (!response.ok && response.status !== 409) {
    throw new Error(
      `ChurchSuite tag resource creation failed: ${response.status}`
    );
  }
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
    site_id?: string
  }
) {
  const siteInfo = contact.site_id
  ? { all_sites: false, site_ids: [contact.site_id]}
  : { all_sites: true, site_ids: [] }
  const response = await fetch(
    `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/contacts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        ...siteInfo,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        mobile: contact.phone,
        communication: {
          general_email: false,
          general_sms: false,
          phone: false,
          post: false,
          rota_email: false,
          rota_sms: false,
        },
      }),
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`ChurchSuite contact creation failed: ${response.status}`);
  }

  return data.data.id;
}

/* This function is invoked by a Postgres trigger (AFTER INSERT / AFTER UPDATE OF
   church_id on public.users), not directly by the frontend. See:
   supabase/migrations/20260812221500_churchsuite_contact_sync_trigger.sql

   To invoke locally for testing:

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-churchsuite-contact' \
     --header 'Authorization: Bearer <CHURCHSUITE_WEBHOOK_SECRET>' \
     --header 'Content-Type: application/json' \
     --data '{"id":"<user-uuid>","church_id":"<church-uuid>"}'

   Contacts are tagged in ChurchSuite depending on whether they were newly created or
   an existing contact was matched: "VineMe (created)" or "VineMe (matched)" (each tag
   created on first use, and its ID cached on churchsuite_connections.vineme_tag_id /
   vineme_matched_tag_id respectively). Admins can list them via
   GET /addressbook/contacts?tag_ids[]=<tag_id> - see the
   list-churchsuite-vineme-contacts function.
*/
