// Supabase Edge Function: export-groups-csv
// Exports a church's live (approved) VineMe groups and their active members as two CSVs,
// for manually importing into ChurchSuite (whose API can't create small groups):
//  - groups.csv: ChurchSuite's small group import format (name, reference, date_start, ...)
//  - group-members.csv: one row per active member, with their ChurchSuite contact ID
//    where the user has been linked to ChurchSuite (users.churchsuite_id).
//
// Two modes, both restricted to church admins of the requested church (the export
// contains members' names and email addresses):
//  - mode "download": returns the CSV contents for the app to save on the device.
//  - mode "email": emails both CSVs as attachments to the requesting admin.
import '@supabase/functions-js/edge-runtime.d.ts';
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

interface RequestPayload {
  church_id?: string;
  mode?: 'download' | 'email';
}

interface ExportFile {
  filename: string;
  content: string;
}

interface GroupRow {
  id: string;
  title: string;
  description: string | null;
  meeting_day: string;
  meeting_time: string;
  location: {
    address?: string;
    name?: string;
    url?: string;
  } | null;
  created_at: string;
}

// Column order matches ChurchSuite's small group import template.
const GROUP_COLUMNS = [
  'name',
  'reference',
  'date_start',
  'date_end',
  'frequency',
  'day',
  'time',
  'location_type',
  'location_name',
  'location_address',
  'location_url',
  'description',
  'cluster',
] as const;

const MEMBER_COLUMNS = [
  'group_name',
  'first_name',
  'last_name',
  'email',
  'churchsuite_contact_id',
  'role',
  'joined_date',
] as const;

const FROM_EMAIL =
  Deno.env.get('EXPORT_FROM_EMAIL') ||
  Deno.env.get('MISSING_SERVICE_FROM_EMAIL') ||
  'connect@vineme.app';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return Response.json(
      { ok: false, error: 'Missing Authorization header' },
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

  const { church_id: churchId, mode } = payload;

  if (!churchId) {
    return Response.json(
      { ok: false, error: 'church_id is required' },
      { status: 400 }
    );
  }

  if (mode !== 'download' && mode !== 'email') {
    return Response.json(
      { ok: false, error: 'mode must be "download" or "email"' },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const supabaseAnon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const {
    data: { user },
    error: userError,
  } = await supabaseAnon.auth.getUser(token);

  if (userError || !user) {
    return Response.json(
      { ok: false, error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  const { data: caller, error: callerError } = await supabaseAdmin
    .from('users')
    .select('roles, church_id')
    .eq('id', user.id)
    .maybeSingle();

  const isChurchAdmin =
    !callerError &&
    !!caller &&
    Array.isArray(caller.roles) &&
    caller.roles.includes('church_admin') &&
    caller.church_id === churchId;

  if (!isChurchAdmin) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const files = await buildExport(supabaseAdmin, churchId);

    if (mode === 'download') {
      return Response.json({ ok: true, files });
    }

    if (!user.email) {
      return Response.json(
        { ok: false, error: 'Your account has no email address to send to' },
        { status: 400 }
      );
    }

    const { data: church } = await supabaseAdmin
      .from('churches')
      .select('name')
      .eq('id', churchId)
      .maybeSingle();

    await sendExportEmail(user.email, church?.name ?? 'your church', files);

    return Response.json({ ok: true, sent_to: user.email });
  } catch (err) {
    console.error('export-groups-csv error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
});

async function buildExport(
  supabaseAdmin: SupabaseClient,
  churchId: string
): Promise<ExportFile[]> {
  const { data: groups, error: groupsError } = await supabaseAdmin
    .from('groups')
    .select(
      'id, title, description, meeting_day, meeting_time, location, created_at'
    )
    .eq('church_id', churchId)
    .eq('status', 'approved')
    .order('title');

  if (groupsError) throw new Error(groupsError.message);

  const groupRows = (groups ?? []) as GroupRow[];
  const groupTitles = new Map(groupRows.map((g) => [g.id, g.title]));

  const memberships =
    groupRows.length > 0 ? await fetchMemberships(supabaseAdmin, groupRows) : [];

  const emails = await fetchEmails(
    supabaseAdmin,
    memberships.map((m) => m.user_id)
  );

  const groupsCsv = toCsv(
    GROUP_COLUMNS,
    groupRows.map((group) => mapGroupRow(group))
  );

  const membersCsv = toCsv(
    MEMBER_COLUMNS,
    memberships.map((m) => ({
      group_name: groupTitles.get(m.group_id) ?? '',
      first_name: m.user?.first_name ?? '',
      last_name: m.user?.last_name ?? '',
      email: emails.get(m.user_id) ?? '',
      churchsuite_contact_id: m.user?.churchsuite_id ?? '',
      role: m.role,
      joined_date: m.joined_at ? formatDate(m.joined_at) : '',
    }))
  );

  return [
    { filename: 'groups.csv', content: groupsCsv },
    { filename: 'group-members.csv', content: membersCsv },
  ];
}

interface MembershipRow {
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  user: {
    first_name: string | null;
    last_name: string | null;
    churchsuite_id: string | null;
  } | null;
}

async function fetchMemberships(
  supabaseAdmin: SupabaseClient,
  groups: GroupRow[]
): Promise<MembershipRow[]> {
  const { data, error } = await supabaseAdmin
    .from('group_memberships')
    .select(
      'group_id, user_id, role, joined_at, user:users(first_name, last_name, churchsuite_id)'
    )
    .in(
      'group_id',
      groups.map((g) => g.id)
    )
    .eq('status', 'active');

  if (error) throw new Error(error.message);

  const titleOrder = new Map(groups.map((g, i) => [g.id, i]));
  return ((data ?? []) as unknown as MembershipRow[]).sort(
    (a, b) =>
      (titleOrder.get(a.group_id) ?? 0) - (titleOrder.get(b.group_id) ?? 0) ||
      (a.user?.last_name ?? '').localeCompare(b.user?.last_name ?? '')
  );
}

/** Emails live in auth.users, so look each member up through the admin API. */
async function fetchEmails(
  supabaseAdmin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();

  for (const id of new Set(userIds)) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
    if (error) {
      console.warn(`export-groups-csv: could not load email for ${id}:`, error);
      continue;
    }
    if (data.user?.email) emails.set(id, data.user.email);
  }

  return emails;
}

function mapGroupRow(group: GroupRow): Record<string, string> {
  const location = group.location ?? {};
  const isOnline = !!location.url;

  return {
    name: group.title,
    reference: '',
    date_start: formatDate(group.created_at),
    date_end: '',
    // VineMe has no meeting frequency; every group is treated as weekly.
    frequency: 'Weekly',
    day: group.meeting_day,
    time: group.meeting_time.slice(0, 5),
    location_type: isOnline ? 'online' : 'physical',
    location_name: location.name || location.address || '',
    location_address: isOnline ? '' : (location.address ?? ''),
    location_url: location.url ?? '',
    description: group.description ?? '',
    cluster: '',
  };
}

// ChurchSuite's template uses DD-MM-YYYY.
function formatDate(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getUTCFullYear()}`;
}

function toCsv(
  columns: readonly string[],
  rows: Record<string, string>[]
): string {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsv(row[col] ?? '')).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function sendExportEmail(
  to: string,
  churchName: string,
  files: ExportFile[]
) {
  if (!SENDGRID_API_KEY) {
    throw new Error('Email service unavailable (SENDGRID_API_KEY not set)');
  }

  const text =
    `Attached are the current groups and members for ${churchName} from VineMe.\n\n` +
    '- groups.csv is in ChurchSuite\'s small group import format.\n' +
    '- group-members.csv lists each group\'s active members.';

  const response = await fetch(SENDGRID_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: 'VineMe' },
      subject: `VineMe groups export - ${churchName}`,
      content: [{ type: 'text/plain', value: text }],
      attachments: files.map((file) => ({
        content: base64Encode(file.content),
        filename: file.filename,
        type: 'text/csv',
        disposition: 'attachment',
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('SendGrid email error:', { status: response.status, body });
    throw new Error(`Failed to send email (${response.status})`);
  }
}

function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/* To invoke locally (as a church admin):

   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/export-groups-csv' \
     --header 'Authorization: Bearer <church-admin-access-token>' \
     --header 'Content-Type: application/json' \
     --data '{"church_id":"<church-uuid>","mode":"download"}'
*/
