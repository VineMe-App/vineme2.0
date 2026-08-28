// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getChurchsuiteAccessToken } from '../_shared/churchsuite.ts';

interface RequestPayload {
  church_id: string;
  page?: number;
  per_page?: number;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
//console.log(token)

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
console.log(church_id)

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
    .select('vineme_tag_id, vineme_matched_tag_id')
    .eq('church_id', church_id)
    .maybeSingle();

  if (connectionError || !connection) {
    return Response.json(
      { ok: false, error: 'No ChurchSuite connection found for this church' },
      { status: 404 }
    );
  }

  // Neither tag has ever been provisioned for this church yet (no contact created or
  // matched via VineMe) - nothing to list.
  if (!connection.vineme_tag_id && !connection.vineme_matched_tag_id) {
    return Response.json({ ok: true, contacts: [], pagination: null });
  }

  try {
    const { access_token: accessToken } = await getChurchsuiteAccessToken(supabase, church_id, ['addressbook.read']);

    const tagQueries: { tagId: number; status: 'created' | 'matched' }[] = [];
    if (connection.vineme_tag_id) {
      tagQueries.push({ tagId: connection.vineme_tag_id, status: 'created' });
    }
    if (connection.vineme_matched_tag_id) {
      tagQueries.push({
        tagId: connection.vineme_matched_tag_id,
        status: 'matched',
      });
    }

    const contactsByStatus = await Promise.all(
      tagQueries.map(async ({ tagId, status }) => {
        const url = new URL(
          `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/contacts`
        );
        url.searchParams.set('tag_ids[]', String(tagId));
        url.searchParams.set('page', String(page));
        url.searchParams.set('per_page', String(per_page));

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
        return (data.data ?? []).map((contact: Record<string, unknown>) => ({
          ...contact,
          status,
        }));
      })
    );

    // Each ChurchSuite tag is queried (and paginated) independently since a contact only
    // ever carries one of the two tags, so results are merged here rather than relying on
    // ChurchSuite-side pagination across both tags.
    const contacts = contactsByStatus
      .flat()
      .sort((a, b) =>
        String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
      );

    return Response.json({
      ok: true,
      contacts,
      pagination: null,
    });
  } catch (err) {
    console.error('list-churchsuite-vineme-contacts error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
});

/* This function is called by church admins from the ChurchSuite admin screen
   (src/app/admin/churchsuite.tsx) to list contacts tagged "VineMe (created)" or
   "VineMe (matched)" - i.e. contacts touched via
   supabase/functions/create-churchsuite-contact. Each returned contact carries a
   `status: 'created' | 'matched'` field indicating which tag it came from.

   To invoke locally for testing:

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/list-churchsuite-vineme-contacts' \
     --header 'Authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYxLTIxZDgtNGYyZS1iNzE5LWMyMjQwYTg0MGQ5MCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vMTI3LjAuMC4xOjU0MzIxL2F1dGgvdjEiLCJzdWIiOiI3ZDFjZGQ1NC00ZjAwLTQ2ZTQtODMzZS1hN2E4ZDFiNGQyZjIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg3NTAzNTk0LCJpYXQiOjE3ODc0OTk5OTQsImVtYWlsIjoiIiwicGhvbmUiOiI0NDc3MTIzNDU2NzgiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJwaG9uZSIsInByb3ZpZGVycyI6WyJwaG9uZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiN2QxY2RkNTQtNGYwMC00NmU0LTgzM2UtYTdhOGQxYjRkMmYyIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib3RwIiwidGltZXN0YW1wIjoxNzg3MzQ2OTgzfV0sInNlc3Npb25faWQiOiJjM2YwYjlhOC1mMWNmLTQ4MDAtOTgyNC02NDNjZDQ0MTA5YmUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.-dgscWqnlzZVKbGmVtwSEtOQZO3wyuvTDNzAC5eW6H95RHL_XgW24YRmrztnA5upeCDJfkkqn1vkQkufwCTKlQ
2026-08-23T15:56:14.930781287Z
' \
     --header 'Content-Type: application/json' \
     --data '{"church_id":"<church-uuid>"}'
*/
