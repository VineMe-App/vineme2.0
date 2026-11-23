// Shared database schema types for @vineme/mobile and @vineme/web.
// Generated Supabase types can be placed alongside this file via `npm run db:types`.

export interface User {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string;
  phone?: string;
  church_id?: string;
  avatar_url?: string;
  service_id?: string;
  bio?: string;
  marketing_opt_in?: boolean;
  cannot_find_group?: boolean;
  cannot_find_group_requested_at?: string;
  cannot_find_group_contacted_at?: string;
  cannot_find_group_resolved_at?: string;
  roles: string[];
  newcomer?: boolean;
  onboarding_complete?: boolean;
  email_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Church {
  id: string;
  name: string;
  address?: unknown;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  visible?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  church_id: string;
  day_of_week: number;
  start_time: string;
  end_time?: string;
  location?: unknown;
  created_at: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  title: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: unknown;
  whatsapp_link?: string;
  image_url?: string;
  service_id: string;
  church_id: string;
  status: 'pending' | 'approved' | 'denied' | 'closed';
  at_capacity: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export type MembershipJourneyStatus = 1 | 2 | 3;

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'leader' | 'admin';
  joined_at: string | null;
  status: 'active' | 'inactive' | 'pending' | 'archived';
  referral_id?: string | null;
  journey_status?: MembershipJourneyStatus | null;
}

export type GroupMembershipNoteType =
  | 'manual'
  | 'request_approved'
  | 'request_archived'
  | 'member_left'
  | 'journey_status_change'
  | 'role_change';

export interface GroupMembershipNote {
  id: string;
  membership_id: string;
  group_id: string;
  user_id: string;
  created_by_user_id: string;
  note_type: GroupMembershipNoteType;
  note_text?: string | null;
  previous_status?: 'active' | 'inactive' | 'pending' | 'archived' | null;
  new_status?: 'active' | 'inactive' | 'pending' | 'archived' | null;
  previous_journey_status?: MembershipJourneyStatus | null;
  new_journey_status?: MembershipJourneyStatus | null;
  previous_role?: 'member' | 'leader' | 'admin' | null;
  new_role?: 'member' | 'leader' | 'admin' | null;
  reason?: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referred_user_id: string | null;
  referred_by_user_id: string | null;
  group_id: string | null;
  church_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
}
