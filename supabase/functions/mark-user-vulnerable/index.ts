// Supabase Edge Function: mark-user-vulnerable
// Called by a church admin to flag a member as vulnerable: sets users.is_vulnerable and
// applies the "Vulnerable Person" ChurchSuite tag (provisioned up front in
// create-churchsuite-connection) to their linked ChurchSuite contact, if they have one.
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  ensureVinemeTagId,
  getChurchsuiteAccessToken,
  tagChurchsuiteContact,
} from '../_shared/churchsuite.ts';

interface RequestPayload {
  user_id: string;
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
    data: { user: callingUser },
    error: userError,
  } = await supabaseAnon.auth.getUser(token);

  if (userError || !callingUser) {
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

  const { user_id: userId } = payload;
  if (!userId) {
    return Response.json(
      { ok: false, error: 'user_id is required' },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: caller, error: callerError } = await supabaseAdmin
    .from('users')
    .select('roles, church_id')
    .eq('id', callingUser.id)
    .maybeSingle();

  const isChurchAdmin =
    !callerError &&
    !!caller &&
    Array.isArray(caller.roles) &&
    caller.roles.includes('church_admin');

  if (!isChurchAdmin) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { data: targetUser, error: targetUserError } = await supabaseAdmin
    .from('users')
    .select('church_id, churchsuite_id')
    .eq('id', userId)
    .maybeSingle();

  if (targetUserError || !targetUser) {
    return Response.json(
      { ok: false, error: 'User not found' },
      { status: 404 }
    );
  }

  if (!targetUser.church_id || targetUser.church_id !== caller.church_id) {
    return Response.json(
      { ok: false, error: 'Cannot modify users from other churches' },
      { status: 403 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ is_vulnerable: true, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (updateError) {
    return Response.json(
      { ok: false, error: updateError.message },
      { status: 500 }
    );
  }

  if (!targetUser.churchsuite_id) {
    return Response.json({
      ok: true,
      is_vulnerable: true,
      tag_error: 'User is not linked to a ChurchSuite contact yet',
    });
  }

  // The is_vulnerable flag above is the source of truth - ChurchSuite tagging is
  // supplementary, so a failure here is reported but doesn't fail the request.
  let tagError: string | null = null;
  try {
    const { access_token: accessToken } = await getChurchsuiteAccessToken(
      supabaseAdmin,
      targetUser.church_id,
      ['addressbook.read', 'addressbook.write']
    );
    const tagId = await ensureVinemeTagId(
      supabaseAdmin,
      accessToken,
      targetUser.church_id,
      'vulnerable'
    );
    await tagChurchsuiteContact(
      accessToken,
      Number(targetUser.churchsuite_id),
      tagId
    );
  } catch (err) {
    tagError = err instanceof Error ? err.message : String(err);
    console.error('mark-user-vulnerable tag error:', err);
  }

  return Response.json({
    ok: true,
    is_vulnerable: true,
    ...(tagError ? { tag_error: tagError } : {}),
  });
});

/* Called by church admins to flag a member as vulnerable, e.g. from an admin user
   management screen. Requires the caller to hold the church_admin role and the target
   user to belong to the caller's church.

   To invoke locally for testing:

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/mark-user-vulnerable' \
     --header 'Authorization: Bearer <church-admin-access-token>' \
     --header 'Content-Type: application/json' \
     --data '{"user_id":"<user-uuid>"}'
*/
