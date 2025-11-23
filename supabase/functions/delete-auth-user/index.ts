// Supabase Edge Function: delete-auth-user
// Safely deletes a user from auth.users using the Admin API
// This ensures proper cleanup of sessions, refresh tokens, and related auth data

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DeleteAuthUserPayload {
  userId: string;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header to verify the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Authorization header' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    const payload = (await req.json()) as DeleteAuthUserPayload;

    if (!payload?.userId || typeof payload.userId !== 'string') {
      return new Response(
        JSON.stringify({ ok: false, error: 'User ID is required' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the anon key to verify the user's session
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Verify the user's session and ensure the caller owns the account being deleted
    let userId: string | null = null;
    try {
      const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
      if (userError || !user) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid or expired session' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      userId = user.id;

      // Verify the user is deleting their own account
      if (user.id !== payload.userId) {
        return new Response(
          JSON.stringify({ ok: false, error: 'You can only delete your own account' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (verifyError) {
      console.warn('User verification failed:', verifyError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Unable to verify user session' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unable to verify user session' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete the user from auth.users using Admin API
    // This properly cleans up sessions, refresh tokens, and related auth data
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Failed to delete auth user: ${deleteError.message}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Auth user deleted successfully',
        userId: userId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

