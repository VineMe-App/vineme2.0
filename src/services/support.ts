import { supabase } from './supabase';

export interface MissingServiceRequestPayload {
  church_id?: string;
  church_name: string;
  church_location?: string;
  service_name?: string;
  service_time?: string;
  additional_info?: string;
  contact_name: string;
  contact_email: string;
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
      const { error } = await supabase.functions.invoke(
        'notify-missing-service',
        {
          body: payload,
        }
      );

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
