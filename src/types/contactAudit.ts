// Contact sharing audit types
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