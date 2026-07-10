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

const allowedTestDomains = (
  process.env.EXPO_PUBLIC_CHURCHSUITE_TEST_EMAIL_DOMAINS || ''
)
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

function isAllowedTestEmail(email?: string): boolean {
  if (!email || allowedTestDomains.length === 0) return false;

  const normalizedEmail = email.trim().toLowerCase();
  return allowedTestDomains.some((domain) => {
    const normalizedDomain = domain.startsWith('@') ? domain.slice(1) : domain;
    return normalizedEmail.endsWith(`@${normalizedDomain}`);
  });
}

export class ChurchSuiteIntegrationService {
  shouldLinkContact(email?: string): boolean {
    return isAllowedTestEmail(email);
  }

  async linkContact(
    input: LinkChurchSuiteContactInput
  ): Promise<LinkChurchSuiteContactResult> {
    if (!this.shouldLinkContact(input.email)) {
      return {
        ok: true,
        reason: 'Skipped ChurchSuite linking for non-test email domain',
      };
    }

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
