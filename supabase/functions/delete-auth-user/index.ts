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
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header to verify the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract the token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Create a client with the anon key to verify the user's session
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Verify the user's session
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = (await req.json()) as DeleteAuthUserPayload;

    if (!payload?.userId || typeof payload.userId !== 'string') {
      return new Response(
        JSON.stringify({ ok: false, error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is deleting their own account
    if (user.id !== payload.userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'You can only delete your own account' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Delete the user from auth.users using Admin API
    // This properly cleans up sessions, refresh tokens, and related auth data
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(payload.userId);

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
        userId: payload.userId,
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

