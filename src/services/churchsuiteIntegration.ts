import { supabase } from './supabase';

export type ChurchSuiteLinkStatus =
  | 'linked'
  | 'created'
  | 'manual_review'
  | 'pending_retry'
  | 'sync_failed';

export interface LinkChurchSuiteContactInput {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  churchId: string;
}

export interface LinkChurchSuiteContactResult {
  ok: boolean;
  status?: ChurchSuiteLinkStatus;
  churchsuiteContactId?: string;
  matchedBy?: string[];
  vulnerable?: boolean;
  reason?: string;
  error?: string;
}

export class ChurchSuiteIntegrationService {
  async linkContact(
    input: LinkChurchSuiteContactInput
  ): Promise<LinkChurchSuiteContactResult> {
    const { data, error } =
      await supabase.functions.invoke<LinkChurchSuiteContactResult>(
        'link-churchsuite-contact',
        {
          body: input,
        }
      );

    if (error) {
      return {
        ok: false,
        status: 'pending_retry',
        error: error.message,
      };
    }

    return data || { ok: false, status: 'pending_retry' };
  }
}

export const churchSuiteIntegrationService =
  new ChurchSuiteIntegrationService();
