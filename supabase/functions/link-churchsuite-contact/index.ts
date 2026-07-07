// Supabase Edge Function: link-churchsuite-contact
// Finds or creates a ChurchSuite contact for the signed-in VineMe user, then
// records the link or review status in public.churchsuite_contact_links.

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LinkChurchSuitePayload {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  churchId?: string;
}

interface ChurchSuiteContact {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  mobile?: string;
  status?: string;
  tags?: string[];
  custom_fields?: {
    vulnerable?: boolean;
  };
}

type MatchStatus =
  | 'linked'
  | 'created'
  | 'manual_review'
  | 'pending_retry'
  | 'sync_failed';

const CHURCHSUITE_API_URL =
  Deno.env.get('CHURCHSUITE_API_URL') ||
  'https://vineme-churchsuite-mock.onrender.com';
const CHURCHSUITE_MOCK_API_KEY = Deno.env.get('CHURCHSUITE_MOCK_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/[^0-9+]/g, '');
  if (!compact) return null;

  if (compact.startsWith('+')) {
    const digits = compact.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }

  const digits = compact.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`;
  return `+${digits}`;
}

function buildName(firstName?: string, lastName?: string): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
}

function dedupeContacts(contacts: ChurchSuiteContact[]): ChurchSuiteContact[] {
  const seen = new Set<string>();
  const deduped: ChurchSuiteContact[] = [];

  for (const contact of contacts) {
    if (!contact.id || seen.has(contact.id)) continue;
    seen.add(contact.id);
    deduped.push(contact);
  }

  return deduped;
}

function contactMatchSignals(
  contact: ChurchSuiteContact,
  email: string | null,
  phone: string | null
): string[] {
  const signals: string[] = [];
  const contactEmail = normalizeEmail(contact.email);
  const contactPhone = normalizePhone(contact.mobile);

  if (email && contactEmail === email) signals.push('email');
  if (phone && contactPhone === phone) signals.push('phone');

  return signals;
}

async function fetchChurchSuiteContacts(
  queryParam: 'email' | 'mobile' | 'q',
  value: string
): Promise<ChurchSuiteContact[]> {
  const url = new URL('/addressbook/contacts', CHURCHSUITE_API_URL);
  url.searchParams.set(queryParam, value);

  const response = await fetch(url.toString(), {
    headers: CHURCHSUITE_MOCK_API_KEY
      ? { 'x-mock-api-key': CHURCHSUITE_MOCK_API_KEY }
      : {},
  });
  if (!response.ok) {
    throw new Error(`ChurchSuite search failed (${response.status})`);
  }

  const body = await response.json();
  return Array.isArray(body?.data) ? body.data : [];
}

async function createChurchSuiteContact(payload: {
  email: string | null;
  phone: string | null;
  firstName?: string;
  lastName?: string;
}): Promise<ChurchSuiteContact> {
  const url = new URL('/addressbook/contacts', CHURCHSUITE_API_URL);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(CHURCHSUITE_MOCK_API_KEY
        ? { 'x-mock-api-key': CHURCHSUITE_MOCK_API_KEY }
        : {}),
    },
    body: JSON.stringify({
      first_name: payload.firstName || '',
      last_name: payload.lastName || '',
      email: payload.email || '',
      mobile: payload.phone || '',
    }),
  });

  if (!response.ok) {
    throw new Error(`ChurchSuite create failed (${response.status})`);
  }

  const body = await response.json();
  if (!body?.data?.id) {
    throw new Error('ChurchSuite create returned no contact id');
  }

  return body.data;
}

async function upsertLink(
  supabase: any,
  input: {
    userId: string;
    churchId: string;
    status: MatchStatus;
    contactId?: string | null;
    reason: string;
    matchedBy?: string[];
    candidates?: ChurchSuiteContact[];
    lastError?: string | null;
  }
) {
  const { error } = await supabase.from('churchsuite_contact_links').upsert(
    {
      user_id: input.userId,
      church_id: input.churchId,
      churchsuite_contact_id: input.contactId || null,
      match_status: input.status,
      match_reason: input.reason,
      matched_by: input.matchedBy || [],
      candidate_contacts: input.candidates || [],
      last_error: input.lastError || null,
      last_synced_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_id,church_id',
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw new Error(`Failed to write ChurchSuite link: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method Not Allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  let payload: LinkChurchSuitePayload;
  try {
    payload = (await req.json()) as LinkChurchSuitePayload;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON payload' }, 400);
  }

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  const churchId = payload.churchId;
  if (!churchId) {
    return jsonResponse({ ok: false, error: 'churchId is required' }, 400);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('church_id, roles')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return jsonResponse({ ok: false, error: 'User profile not found' }, 404);
  }

  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  const isSuperadmin = roles.includes('superadmin');
  if (!isSuperadmin && profile.church_id !== churchId) {
    return jsonResponse(
      { ok: false, error: 'Cannot link ChurchSuite contact for another church' },
      403
    );
  }

  const email = normalizeEmail(payload.email || user.email);
  const phone = normalizePhone(payload.phone || user.phone);
  const firstName = payload.firstName?.trim() || '';
  const lastName = payload.lastName?.trim() || '';

  if (!email && !phone) {
    await upsertLink(adminClient, {
      userId: user.id,
      churchId,
      status: 'manual_review',
      reason: 'No email or phone was available for ChurchSuite matching',
      candidates: [],
    });
    return jsonResponse({
      ok: true,
      status: 'manual_review',
      reason: 'No email or phone available',
    });
  }

  try {
    const candidateSets = await Promise.all([
      email ? fetchChurchSuiteContacts('email', email) : Promise.resolve([]),
      phone ? fetchChurchSuiteContacts('mobile', phone) : Promise.resolve([]),
    ]);
    const candidates = dedupeContacts(candidateSets.flat());

    if (candidates.length === 0) {
      const created = await createChurchSuiteContact({
        email,
        phone,
        firstName,
        lastName,
      });

      await upsertLink(adminClient, {
        userId: user.id,
        churchId,
        status: 'created',
        contactId: created.id,
        reason: 'No existing ChurchSuite contact matched; created a new contact',
        matchedBy: [],
        candidates: [created],
      });

      return jsonResponse({
        ok: true,
        status: 'created',
        churchsuiteContactId: created.id,
      });
    }

    const enriched = candidates.map((contact) => ({
      contact,
      signals: contactMatchSignals(contact, email, phone),
    }));
    const bothMatches = enriched.filter((item) => item.signals.length >= 2);

    if (candidates.length === 1 || bothMatches.length === 1) {
      const selected = bothMatches[0] || enriched[0];
      await upsertLink(adminClient, {
        userId: user.id,
        churchId,
        status: 'linked',
        contactId: selected.contact.id,
        reason:
          candidates.length === 1
            ? 'Single ChurchSuite contact matched'
            : 'One ChurchSuite contact matched both email and phone',
        matchedBy: selected.signals,
        candidates,
      });

      return jsonResponse({
        ok: true,
        status: 'linked',
        churchsuiteContactId: selected.contact.id,
        matchedBy: selected.signals,
        vulnerable: Boolean(selected.contact.custom_fields?.vulnerable),
      });
    }

    await upsertLink(adminClient, {
      userId: user.id,
      churchId,
      status: 'manual_review',
      reason: `Multiple possible ChurchSuite contacts found for ${buildName(firstName, lastName) || 'user'}`,
      matchedBy: [],
      candidates,
    });

    return jsonResponse({
      ok: true,
      status: 'manual_review',
      reason: 'Multiple possible contacts found',
      candidates: candidates.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await upsertLink(adminClient, {
        userId: user.id,
        churchId,
        status: 'pending_retry',
        reason: 'ChurchSuite sync failed and should be retried',
        candidates: [],
        lastError: message,
      });
    } catch (writeError) {
      console.error('Failed to persist ChurchSuite sync failure:', writeError);
    }

    return jsonResponse({
      ok: false,
      status: 'pending_retry',
      error: message,
    });
  }
});
