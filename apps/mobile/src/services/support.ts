import { supabase } from './supabase';

export interface MissingServiceRequestPayload {
  church_id?: string;
  church_name: string;
  church_location?: string;
  service_name?: string;
  service_time?: string;
  additional_info?: string;
  contact_name: string;
  contact_email?: string;
  requester_name?: string;
  requester_id?: string;
  requester_email?: string;
}

export interface MissingServiceRequestResult {
  success: boolean;
  error?: string;
}

export const supportService = {
  async submitMissingServiceRequest(
    payload: MissingServiceRequestPayload
  ): Promise<MissingServiceRequestResult> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        return {
          success: false,
          error: 'You must be signed in to submit a church request.',
        };
      }

      const { error } = await supabase.from('new_church_requests').insert({
        church_id: payload.church_id ?? null,
        church_name: payload.church_name,
        church_location: payload.church_location ?? null,
        service_name: payload.service_name ?? null,
        service_time: payload.service_time ?? null,
        additional_info: payload.additional_info ?? null,
        contact_name: payload.contact_name,
        contact_email: payload.contact_email ?? null,
        requester_id: user.id,
        requester_email:
          payload.contact_email ?? payload.requester_email ?? null,
      });

      if (error) {
        console.error('submitMissingServiceRequest error:', error);
        return {
          success: false,
          error: error.message || 'Failed to submit request',
        };
      }

      return { success: true };
    } catch (err) {
      console.error('submitMissingServiceRequest unexpected error:', err);
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to submit missing service request',
      };
    }
  },
};
