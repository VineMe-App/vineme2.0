// Database schema types based on existing Supabase tables
// These types represent the structure of data in the database

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  church_id?: string;
  avatar_url?: string;
  service_id?: string;
  roles: string[];
  created_at: string;
  updated_at?: string;
}

export interface Church {
  id: string;
  name: string;
  address?: any; // JSONB
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  church_id: string;
  day_of_week: number; // 0-6, Sunday = 0
  start_time: string;
  end_time?: string;
  location?: any; // JSONB
  created_at: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  title: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: any; // JSONB
  whatsapp_link?: string;
  image_url?: string;
  service_id: string;
  church_id: string;
  status: 'pending' | 'approved' | 'denied' | 'closed';
  created_at: string;
  updated_at?: string;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'leader' | 'admin';
  joined_at: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  contact_consent: boolean;
  message?: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  updated_at?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  church_id?: string;
  host_id: string;
  category: string;
  start_date: string;
  end_date?: string;
  location: any; // JSONB
  image_url?: string;
  price?: number;
  requires_ticket: boolean;
  is_public: boolean;
  whatsapp_link?: string;
  recurrence_pattern?: any; // JSONB
  created_at: string;
  updated_at?: string;
}

export interface EventCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at?: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  user_id: string;
  qr_code?: string;
  status: 'active' | 'used' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

// Joined/Extended types for queries with relationships
export interface GroupMembershipWithUser extends GroupMembership {
  user?: User;
}

export interface GroupJoinRequestWithUser extends GroupJoinRequest {
  user?: User;
  group?: Group;
}

export interface GroupWithDetails extends Group {
  service?: Service;
  church?: Church;
  memberships?: GroupMembershipWithUser[];
  join_requests?: GroupJoinRequestWithUser[];
  member_count?: number;
  pending_requests_count?: number;
}

export interface EventWithDetails extends Event {
  category_info?: EventCategory;
  host?: User;
  church?: Church;
  ticket_count?: number;
}

export interface FriendshipWithUser extends Friendship {
  user?: User;
  friend?: User;
}

export interface UserWithDetails extends User {
  church?: Church;
  service?: Service;
  group_memberships?: GroupMembership[];
  friendships?: Friendship[];
}

// Contact sharing and privacy types
export interface ContactAuditLog {
  id: string;
  user_id: string; // User whose contact was accessed
  accessor_id: string; // User who accessed the contact
  group_id: string; // Group context for the access
  join_request_id?: string; // Related join request if applicable
  access_type: 'view' | 'call' | 'email' | 'message';
  contact_fields: string[]; // Which fields were accessed (email, phone, etc.)
  created_at: string;
}

export interface ContactPrivacySettings {
  id: string;
  user_id: string;
  allow_email_sharing: boolean;
  allow_phone_sharing: boolean;
  allow_contact_by_leaders: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ContactAuditLogWithDetails extends ContactAuditLog {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  accessor?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    title: string;
  };
}

// Database response types
export type DatabaseUser = User;
export type DatabaseChurch = Church;
export type DatabaseService = Service;
export type DatabaseGroup = Group;
export type DatabaseEvent = Event;
export type DatabaseFriendship = Friendship;
export type DatabaseTicket = Ticket;
