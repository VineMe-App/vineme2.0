import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface ChurchsuiteAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Tag applied to every contact this app creates, so ChurchSuite admins can see (and filter
// on, via GET /addressbook/contacts?tag_ids[]=) which contacts originated from VineMe.
const VINEME_TAG_NAME = 'VineMe';

/**
 * Exchanges a church's stored ChurchSuite credentials for a live access
 * token via the client_credentials grant.
 *
 * `supabaseAdmin` must be a service-role client - `get_churchsuite_secret`
 * is only grantable to service_role, since it returns a decrypted secret
 * for whatever church_id it's given with no ownership check of its own.
 * Callers are responsible for verifying the invoking user is authorized
 * for `churchId` and for passing the minimum scopes needed *before*
 * calling this - never forward client-supplied scopes here.
 */
export async function getChurchsuiteAccessToken(
  supabaseAdmin: SupabaseClient,
  churchId: string,
  scopes: string[]
): Promise<ChurchsuiteAccessToken> {
  const CHURCHSUITE_AUTH_API_URL = Deno.env.get('CHURCHSUITE_AUTH_API_URL');

  /* const { data: connection, error } = await supabase
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
  } */

  const { data, error } = await supabaseAdmin
    .rpc('get_churchsuite_secret', { p_church_id: churchId })
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('No ChurchSuite connection found for this church');
  }

  const credentials = btoa(`${data.identifier}:${data.secret}`);

  const response = await fetch(`${CHURCHSUITE_AUTH_API_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      scope: scopes.join(' '),
    }),
  });

  if (!response.ok) {
    throw new Error(`ChurchSuite token request failed (${response.status})`);
  }

  /* code to store token in db. also would need to score scope
  const expiresAt = authData.expires_in
    ? new Date(Date.now() + authData.expires_in * 1000).toISOString()
    : null;

  await supabase
    .from('churchsuite_connections')
    .update({
      access_token: authData.access_token,
      access_token_expires_at: expiresAt,
    })
    .eq('church_id', churchId); */

  const authData = await response.json();

  if (!authData.access_token) {
    throw new Error('ChurchSuite token response missing access_token');
  }

  return authData;
}

/**
 * Looks up the church's cached VineMe tag ID, creating (or finding, if it already exists
 * in ChurchSuite) the tag on first use and caching its ID on churchsuite_connections.
 */
export async function ensureVinemeTagId(
  supabaseAdmin: SupabaseClient,
  accessToken: string,
  churchId: string
): Promise<number> {
  const { data: connection, error } = await supabaseAdmin
    .from('churchsuite_connections')
    .select('vineme_tag_id')
    .eq('church_id', churchId)
    .single();

  if (error || !connection) {
    throw new Error(`No ChurchSuite connection found for church ${churchId}`);
  }

  if (connection.vineme_tag_id) {
    return connection.vineme_tag_id;
  }

  const tagId = await findOrCreateVinemeTag(accessToken);

  await supabaseAdmin
    .from('churchsuite_connections')
    .update({ vineme_tag_id: tagId })
    .eq('church_id', churchId);

  return tagId;
}

async function findOrCreateVinemeTag(accessToken: string): Promise<number> {
  const createResponse = await fetch(
    `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/tags`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: VINEME_TAG_NAME, is_smart: false }),
    }
  );

  if (createResponse.ok) {
    const data = await createResponse.json();
    return data.data.id;
  }

  // 409 means a tag with this name already exists (e.g. created by an earlier call, or
  // manually by an admin) - look it up instead of failing.
  if (createResponse.status === 409) {
    const searchResponse = await fetch(
      `${Deno.env.get('CHURCHSUITE_API_URL')}/addressbook/tags?q=${encodeURIComponent(VINEME_TAG_NAME)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!searchResponse.ok) {
      throw new Error(
        `ChurchSuite tag lookup failed: ${searchResponse.status}`
      );
    }

    const searchData = await searchResponse.json();
    const existing = (searchData.data ?? []).find(
      (tag: { name: string }) => tag.name === VINEME_TAG_NAME
    );

    if (existing) {
      return existing.id;
    }

    throw new Error(
      'ChurchSuite tag creation conflicted but no matching tag was found'
    );
  }

  throw new Error(`ChurchSuite tag creation failed: ${createResponse.status}`);
}
