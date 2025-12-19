// Supabase Edge Function: push-notify
// Sends Expo push notifications to all device tokens for a given user.
// Expects JSON: { userId: string, title: string, body: string, data?: object }

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Allow authenticated users to send to themselves OR privileged service callers
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceHeader = req.headers.get('x-service-role-key');
    const isServiceRequest = Boolean(
      serviceHeader && serviceHeader.trim() === serviceRoleKey,
    );

    let authenticatedUserId: string | null = null;

    if (!isServiceRequest) {
      // Authenticate BEFORE parsing request body to prevent unauthenticated processing
      const authHeader = req.headers.get('Authorization') ?? '';
      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) {
        return new Response('Unauthorized', { status: 401 });
      }

      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` },
          },
        },
      );

      // Verify authentication BEFORE parsing body
      const {
        data: { user },
        error: authError,
      } = await supabaseAuth.auth.getUser();

      if (authError || !user) {
        console.error('Auth error validating caller', authError);
        return new Response('Unauthorized', { status: 401 });
      }

      authenticatedUserId = user.id;
    } else if (serviceHeader?.trim() !== serviceRoleKey) {
      return new Response('Forbidden', { status: 403 });
    }

    // Now safe to parse and validate request body
    const { userId, title, body, data } = await req.json();
    if (!userId || !title || !body) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Verify the authenticated user matches the userId in the request unless
    // the caller is an authorized service request
    if (!isServiceRequest && authenticatedUserId !== userId) {
      return new Response('Forbidden', { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch all device tokens for the user
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching push tokens:', error);
      return new Response(JSON.stringify({ ok: false, error }), {
        status: 500,
      });
    }

    const pushTokens = (tokens || []).map((t) => t.push_token).filter(Boolean);
    if (pushTokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
      });
    }

    // Build Expo messages (batching up to 100 per request if needed)
    const messages = pushTokens.map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data,
    }));

    // Send in a single batch (opt: split into chunks of 100)
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error('Expo push error:', result);
      return new Response(JSON.stringify({ ok: false, result }), {
        status: 502,
      });
    }

    return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
  } catch (e) {
    console.error('push-notify error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
    });
  }
});
