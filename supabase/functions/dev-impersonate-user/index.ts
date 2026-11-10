// Supabase Edge Function: dev-impersonate-user
// Allows developers in development environments to log in as any user
// without needing an SMS OTP or access to the user's phone.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ImpersonatePayload {
  action?: 'login' | 'list';
  userId?: string;
  search?: string;
  limit?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const environment = Deno.env.get('ENVIRONMENT') || Deno.env.get('APP_ENV');
    if (environment === 'production') {
      return Response.json(
        {
          ok: false,
          error: 'Dev user impersonation is disabled in production.',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return Response.json(
        {
          ok: false,
          error: 'Server configuration error: missing Supabase credentials',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let payload: ImpersonatePayload = {};
    if (req.method === 'POST') {
      try {
        payload = await req.json();
      } catch {
        // empty body is ok if defaults apply
      }
    }

    const action = payload.action || 'login';

    // -------------------------------------------------------------
    // ACTION: list
    // -------------------------------------------------------------
    if (action === 'list') {
      let query = supabaseAdmin
        .from('users')
        .select(
          `
          id,
          first_name,
          last_name,
          name,
          roles,
          church_id,
          service_id,
          avatar_url,
          newcomer,
          created_at,
          church:churches(id, name),
          service:services(id, name)
        `
        )
        .order('created_at', { ascending: false });

      if (payload.search && payload.search.trim()) {
        const s = payload.search.trim();
        query = query.or(
          `first_name.ilike.%${s}%,last_name.ilike.%${s}%,name.ilike.%${s}%`
        );
      }

      const { data: users, error: usersError } = await query.limit(
        payload.limit || 50
      );

      if (usersError) {
        return Response.json(
          { ok: false, error: usersError.message },
          { status: 200, headers: corsHeaders }
        );
      }

      // Fetch auth users to correlate phone / email
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });

      const authMap = new Map<string, { email?: string; phone?: string }>();
      if (authData?.users) {
        for (const u of authData.users) {
          authMap.set(u.id, {
            email: u.email,
            phone: u.phone,
          });
        }
      }

      const hydratedUsers = (users || []).map((u: any) => {
        const authInfo = authMap.get(u.id);
        return {
          ...u,
          email: authInfo?.email ?? null,
          phone: authInfo?.phone ?? null,
        };
      });

      return Response.json(
        { ok: true, users: hydratedUsers },
        { status: 200, headers: corsHeaders }
      );
    }

    // -------------------------------------------------------------
    // ACTION: login
    // -------------------------------------------------------------
    const userId = payload.userId;
    if (!userId || typeof userId !== 'string') {
      return Response.json(
        { ok: false, error: 'userId is required to impersonate a user' },
        { status: 200, headers: corsHeaders }
      );
    }

    // 1. Fetch user from auth.users
    const { data: userData, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (getUserError || !userData?.user) {
      return Response.json(
        {
          ok: false,
          error:
            getUserError?.message ||
            `User not found in auth.users for ID: ${userId}`,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const authUser = userData.user;

    // 2. Generate an ephemeral dev password
    const tempPassword = `Dev_${crypto.randomUUID()}!`;

    // 3. Prepare update payload ensuring phone/email are confirmed so password login succeeds
    const updatePayload: Record<string, any> = {
      password: tempPassword,
    };
    if (authUser.email && !authUser.email_confirmed_at) {
      updatePayload.email_confirm = true;
    }
    if (authUser.phone && !authUser.phone_confirmed_at) {
      updatePayload.phone_confirm = true;
    }
    if (!authUser.email && !authUser.phone) {
      const dummyEmail = `dev_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}@vineme.internal`;
      updatePayload.email = dummyEmail;
      updatePayload.email_confirm = true;
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

    if (updateError) {
      return Response.json(
        {
          ok: false,
          error: `Failed to prepare auth user for sign in: ${updateError.message}`,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 4. Exchange identifier + password for genuine GoTrue access & refresh tokens
    const tokenIdentifier: Record<string, string> = {};
    if (authUser.email || updatePayload.email) {
      tokenIdentifier.email = authUser.email || updatePayload.email;
    } else if (authUser.phone) {
      tokenIdentifier.phone = authUser.phone;
    }

    const tokenUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...tokenIdentifier,
        password: tempPassword,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.json(
        {
          ok: false,
          error:
            tokenData.error_description ||
            tokenData.msg ||
            tokenData.error ||
            'Failed to authenticate password grant with GoTrue',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 5. Fetch profile details from public.users to return helpful debug info
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select(
        `
        id,
        first_name,
        last_name,
        name,
        roles,
        church_id,
        service_id,
        church:churches(id, name),
        service:services(id, name)
      `
      )
      .eq('id', userId)
      .maybeSingle();

    return Response.json(
      {
        ok: true,
        session: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          expires_at: tokenData.expires_at,
        },
        user: tokenData.user,
        profile: profile ?? null,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || String(err) },
      { status: 200, headers: corsHeaders }
    );
  }
});
