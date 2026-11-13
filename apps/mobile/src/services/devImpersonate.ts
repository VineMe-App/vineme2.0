import { supabase } from './supabase';
import { useAuthStore } from '../stores/auth';
import { permissionService } from './permissions';
import { queryClient } from '../providers/QueryProvider';

export interface DevUserItem {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  roles: string[];
  church_id: string | null;
  service_id: string | null;
  avatar_url: string | null;
  newcomer: boolean;
  created_at: string;
  email: string | null;
  phone: string | null;
  church?: { id: string; name: string } | null;
  service?: { id: string; name: string } | null;
}

export async function fetchDevUsers(search?: string): Promise<DevUserItem[]> {
  try {
    // 1. Try calling the edge function first (it provides phone & email from auth.users)
    const { data: fnData, error: fnError } = await supabase.functions.invoke<{
      ok: boolean;
      users?: DevUserItem[];
      error?: string;
    }>('dev-impersonate-user', {
      body: { action: 'list', search },
    });

    if (!fnError && fnData?.ok && Array.isArray(fnData.users)) {
      return fnData.users;
    }
  } catch (err) {
    console.warn(
      '[devImpersonate] Edge function list failed, falling back to database query:',
      err
    );
  }

  // 2. Fallback: query public.users directly
  let query = supabase
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

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,name.ilike.%${s}%`
    );
  }

  const { data, error } = await query.limit(50);
  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((u: any) => ({
    ...u,
    email: null,
    phone: null,
  })) as DevUserItem[];
}

export async function impersonateUser(userId: string): Promise<{
  success: boolean;
  error?: string;
  user?: any;
  profile?: any;
}> {
  try {
    const trimmedId = userId.trim();
    if (!trimmedId) {
      return { success: false, error: 'User ID cannot be empty' };
    }

    const { data, error } = await supabase.functions.invoke<{
      ok: boolean;
      session?: {
        access_token: string;
        refresh_token: string;
      };
      user?: any;
      profile?: any;
      error?: string;
    }>('dev-impersonate-user', {
      body: { action: 'login', userId: trimmedId },
    });

    if (error || !data?.ok || !data?.session) {
      let detailedMsg = data?.error;
      if (!detailedMsg && error) {
        if ('context' in (error as any)) {
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              const parsed = await ctx.json();
              detailedMsg =
                parsed.error || parsed.message || JSON.stringify(parsed);
            } else if (ctx && typeof ctx.text === 'function') {
              detailedMsg = await ctx.text();
            }
          } catch {
            // ignore JSON parse errors
          }
        }
        if (!detailedMsg) {
          detailedMsg = error.message;
        }
      }
      const msg = detailedMsg || 'Failed to impersonate user';
      return { success: false, error: msg };
    }

    // Set the live session in the Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      return { success: false, error: sessionError.message };
    }

    // Invalidate client-side caches and reload state
    permissionService.clearUserCache();
    queryClient.clear();
    await useAuthStore.getState().loadUserProfile();

    return {
      success: true,
      user: data.user,
      profile: data.profile,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error while impersonating user',
    };
  }
}
