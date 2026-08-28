// Supabase Edge Function: sync-churchsuite-vulnerable-tags
// Fetches every ChurchSuite contact carrying the "Vulnerable Person" tag (provisioned in
// create-churchsuite-connection, see _shared/churchsuite.ts) and reconciles
// public.users.is_vulnerable to match - ChurchSuite is treated as the source of truth
// here, since admins may tag/untag contacts directly in ChurchSuite. Only users already
// linked to a ChurchSuite contact (churchsuite_id set) are touched; users never linked
// to ChurchSuite are left as-is.
//
// Callable two ways:
//  - By a church admin from the app, with their own session JWT and a church_id matching
//    their own profile - syncs just that one church.
//  - By the daily cron job (see
//    supabase/migrations/20260828140000_schedule_churchsuite_vulnerable_tags_sync.sql),
//    authenticated with the CHURCHSUITE_WEBHOOK_SECRET shared secret instead of a user
//    JWT - the same secret create-churchsuite-contact verifies. verify_jwt is disabled
//    for this function (see supabase/config.toml) so that call can reach this code at
//    all, since the webhook secret isn't itself a Supabase-issued JWT. This path omits
//    church_id and instead walks every row in churchsuite_connections, syncing each
//    church in turn.
import '@supabase/functions-js/edge-runtime.d.ts';
import {
  createClient,
  SupabaseClient,
} from 'jsr:@supabase/supabase-js@2';
import { getChurchsuiteAccessToken } from '../_shared/churchsuite.ts';

interface RequestPayload {
  church_id?: string;
}

interface ChurchSyncResult {
  church_id: string;
  tagged_contact_count: number;
  marked_vulnerable_count: number;
  cleared_count: number;
}

const PER_PAGE = 100;
// Safety cap on pagination - well beyond any realistic church size, just to guarantee
// this can't loop forever if ChurchSuite's pagination behaves unexpectedly.
const MAX_PAGES = 50;

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return Response.json(
      { ok: false, error: 'Missing Authorization header' },
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

  const churchId = payload.church_id;

  const webhookSecret = Deno.env.get('CHURCHSUITE_WEBHOOK_SECRET');
  const isWebhookCall = !!webhookSecret && token === webhookSecret;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (!isWebhookCall) {
    // Interactive callers always sync a single, specific church - only the trusted
    // cron/webhook caller is allowed to trigger the all-churches sweep below.
    if (!churchId) {
      return Response.json(
        { ok: false, error: 'church_id is required' },
        { status: 400 }
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

    const { data: caller, error: callerError } = await supabaseAdmin
      .from('users')
      .select('roles, church_id')
      .eq('id', user.id)
      .maybeSingle();

    const isChurchAdmin =
      !callerError &&
      !!caller &&
      Array.isArray(caller.roles) &&
      caller.roles.includes('church_admin') &&
      caller.church_id === churchId;

    if (!isChurchAdmin) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    try {
      const result = await syncChurch(supabaseAdmin, churchId);
      return Response.json({ ok: true, ...result });
    } catch (err) {
      console.error('sync-churchsuite-vulnerable-tags error:', err);
      return Response.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
  }

  // Webhook call with a specific church_id (e.g. manual testing) - sync just that one.
  if (churchId) {
    try {
      const result = await syncChurch(supabaseAdmin, churchId);
      return Response.json({ ok: true, ...result });
    } catch (err) {
      console.error('sync-churchsuite-vulnerable-tags error:', err);
      return Response.json(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
  }

  // Webhook call with no church_id - the daily cron path. Walk every church that has
  // made a ChurchSuite connection and sync each in turn, so one church's failure doesn't
  // stop the rest from syncing.
  const { data: connections, error: connectionsError } = await supabaseAdmin
    .from('churchsuite_connections')
    .select('church_id');

  if (connectionsError) {
    return Response.json(
      { ok: false, error: connectionsError.message },
      { status: 500 }
    );
  }

  const results: (ChurchSyncResult | { church_id: string; error: string })[] =
    [];

  for (const { church_id: id } of connections ?? []) {
    try {
      results.push(await syncChurch(supabaseAdmin, id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`sync-churchsuite-vulnerable-tags error (church ${id}):`, err);
      results.push({ church_id: id, error: message });
    }
  }

  return Response.json({
    ok: true,
    churches_synced: results.length,
    results,
  });
});

/**
 * Syncs a single church's is_vulnerable flags against its ChurchSuite "Vulnerable
 * Person" tag membership. Throws on failure - callers decide whether that aborts the
 * whole request (single-church calls) or is just recorded per-church (the all-churches
 * cron sweep).
 */
async function syncChurch(
  supabaseAdmin: SupabaseClient,
  churchId: string
): Promise<ChurchSyncResult> {
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('churchsuite_connections')
    .select('vineme_vulnerable_tag_id')
    .eq('church_id', churchId)
    .maybeSingle();

  if (connectionError || !connection) {
    throw new Error(`No ChurchSuite connection found for church ${churchId}`);
  }

  // Tag has never been provisioned for this church - nothing can be tagged yet.
  if (!connection.vineme_vulnerable_tag_id) {
    return {
      church_id: churchId,
      tagged_contact_count: 0,
      marked_vulnerable_count: 0,
      cleared_count: 0,
    };
  }

  const { access_token: accessToken } = await getChurchsuiteAccessToken(
    supabaseAdmin,
    churchId,
    ['addressbook.read']
  );

  const taggedContactIds = await fetchAllTaggedContactIds(
    accessToken,
    connection.vineme_vulnerable_tag_id
  );

  const { data: linkedUsers, error: linkedUsersError } = await supabaseAdmin
    .from('users')
    .select('id, churchsuite_id, is_vulnerable')
    .eq('church_id', churchId)
    .not('churchsuite_id', 'is', null);

  if (linkedUsersError) {
    throw new Error(linkedUsersError.message);
  }

  const toMarkVulnerable = (linkedUsers ?? [])
    .filter((u) => taggedContactIds.has(u.churchsuite_id!) && !u.is_vulnerable)
    .map((u) => u.id);

  const toClear = (linkedUsers ?? [])
    .filter((u) => !taggedContactIds.has(u.churchsuite_id!) && u.is_vulnerable)
    .map((u) => u.id);

  if (toMarkVulnerable.length > 0) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_vulnerable: true, updated_at: new Date().toISOString() })
      .in('id', toMarkVulnerable);
    if (error) throw new Error(error.message);
  }

  if (toClear.length > 0) {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ is_vulnerable: false, updated_at: new Date().toISOString() })
      .in('id', toClear);
    if (error) throw new Error(error.message);
  }

  return {
    church_id: churchId,
    tagged_contact_count: taggedContactIds.size,
    marked_vulnerable_count: toMarkVulnerable.length,
    cleared_count: toClear.length,
  };
}

/**
 * Pages through GET /addressbook/contacts?tag_ids[]=<tagId> and returns the full set of
 * contact IDs (as strings, to match users.churchsuite_id) carrying that tag.
 */
async function fetchAllTaggedContactIds(
  accessToken: string,
  tagId: number
): Promise<Set<string>> {
  const ids = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(
      `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/contacts`
    );
    url.searchParams.set('tag_ids[]', String(tagId));
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(PER_PAGE));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ChurchSuite contact list failed: ${response.status}`);
    }

    const data = await response.json();
    const contacts: { id: number | string }[] = data.data ?? [];

    for (const contact of contacts) {
      ids.add(String(contact.id));
    }

    if (contacts.length < PER_PAGE) {
      break;
    }
  }

  return ids;
}

/* Pulls the current "Vulnerable Person" tag membership from ChurchSuite and reconciles
   it into public.users.is_vulnerable. ChurchSuite is authoritative here: contacts tagged
   there get is_vulnerable set true, and previously-flagged users whose contact is no
   longer tagged get it cleared. Users never linked to ChurchSuite (churchsuite_id IS
   NULL) are untouched, since ChurchSuite has no record of them.

   Runs daily via pg_cron, which calls this with no church_id - see
   supabase/migrations/20260828140000_schedule_churchsuite_vulnerable_tags_sync.sql - and
   this function then walks every row in churchsuite_connections itself, syncing each
   church in turn. Can also be called directly by a church admin for just their own
   church (e.g. a "Sync now" action), by passing church_id.

   To invoke locally for testing (single church, as a church admin):

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-churchsuite-vulnerable-tags' \
     --header 'Authorization: Bearer <church-admin-access-token>' \
     --header 'Content-Type: application/json' \
     --data '{"church_id":"<church-uuid>"}'

   To invoke locally as the cron job would (all churches):

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sync-churchsuite-vulnerable-tags' \
     --header 'Authorization: Bearer <CHURCHSUITE_WEBHOOK_SECRET>' \
     --header 'Content-Type: application/json' \
     --data '{}'
*/
