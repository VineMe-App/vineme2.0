import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface ChurchsuiteAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

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

  return response.json();
}
