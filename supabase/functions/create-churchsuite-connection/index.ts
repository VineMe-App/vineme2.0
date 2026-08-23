// Supabase Edge Function: create-churchsuite-connection
// Saves a church admin's ChurchSuite credentials (via the create_churchsuite_connection
// RPC) and provisions the VineMe tag up front, so it doesn't need to be created lazily
// the first time a contact is synced.
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  ensureVinemeTagId,
  getChurchsuiteAccessToken,
} from '../_shared/churchsuite.ts';

interface RequestPayload {
  identifier: string;
  secret: string;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { identifier, secret } = payload;
  if (!identifier || !secret) {
    return Response.json(
      { error: 'identifier and secret are required' },
      { status: 400 }
    );
  }

  // Scoped as the calling user, so auth.uid() inside these RPCs resolves to them - the
  // church_admin check and church_id always come from their own profile.
  const supabaseAsUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: isChurchAdmin, error: roleError } = await supabaseAsUser.rpc(
    'current_user_has_role',
    { role: 'church_admin' }
  );

  if (roleError || !isChurchAdmin) {
    return Response.json(
      { error: 'Only a church admin can create a ChurchSuite connection' },
      { status: 403 }
    );
  }

  const { data: connectionId, error: createError } = await supabaseAsUser.rpc(
    'create_churchsuite_connection',
    { p_identifier: identifier, p_secret: secret }
  );

  if (createError || !connectionId) {
    return Response.json(
      {
        error:
          createError?.message || 'Could not save the ChurchSuite connection',
      },
      { status: 400 }
    );
  }

  const { data: churchId, error: churchError } = await supabaseAsUser.rpc(
    'current_user_church_id'
  );

  if (churchError || !churchId) {
    await supabaseAsUser.rpc('delete_churchsuite_connection');
    return Response.json(
      { error: 'Could not resolve church for this connection' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let accessToken: string;
  try {
    const tokenData = await getChurchsuiteAccessToken(supabaseAdmin, churchId, [
      'addressbook.read',
      'addressbook.write',
    ]);
    accessToken = tokenData.access_token;
  } catch (err) {
    // The identifier/secret didn't actually authenticate against ChurchSuite - don't
    // leave a broken connection behind for the admin to notice and delete themselves.
    console.error('create-churchsuite-connection auth error:', err);
    await supabaseAsUser.rpc('delete_churchsuite_connection');
    return Response.json(
      {
        error:
          'Could not authenticate with ChurchSuite using these credentials. Please check them and try again.',
      },
      { status: 400 }
    );
  }

  // Credentials are valid, so keep the connection either way from here - tagging is
  // supplementary and can still be provisioned lazily on first contact sync if this fails.
  let tagError: string | null = null;
  try {
    await ensureVinemeTagId(supabaseAdmin, accessToken, churchId);
  } catch (err) {
    tagError = err instanceof Error ? err.message : String(err);
    console.error('create-churchsuite-connection tag error:', err);
  }

  return Response.json({
    ok: true,
    connection_id: connectionId,
    ...(tagError ? { tag_error: tagError } : {}),
  });
});
