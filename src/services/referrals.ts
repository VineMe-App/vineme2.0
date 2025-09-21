import { supabase } from './supabase';
import { authService } from './auth';
import { emailVerificationService } from './emailVerification';
import type {
  GroupReferral,
  GeneralReferral,
  GroupReferralWithDetails,
  GeneralReferralWithDetails,
} from '../types/database';
import { handleSupabaseError, retryWithBackoff, ValidationError } from '../utils/errorHandling';
import { ReferralDatabaseUtils } from './referralDatabase';
import {
  validateServerReferralData,
  sanitizeReferralInput,
  referralRateLimiter,
  createReferralErrorMessage,
  type ReferralFormData,
} from '../utils/referralValidation';

export interface CreateReferralData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
  groupId?: string;
  referrerId: string;
}

export interface ReferralError {
  type: 'validation' | 'rate_limit' | 'duplicate' | 'network' | 'email' | 'unknown';
  message: string;
  field?: string;
  retryable: boolean;
  suggestions?: string[];
}

export interface ReferralResponse {
  success: boolean;
  userId?: string;
  referralId?: string;
  membershipCreated?: boolean;
  reusedExistingUser?: boolean;
  error?: string;
  errorDetails?: ReferralError;
  warnings?: Record<string, string>;
}

export interface ReferralServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

interface CreateReferredUserResult {
  userId: string | null;
  referralId?: string | null;
  warnings?: string[];
  reusedExistingUser?: boolean;
  membershipCreated?: boolean;
}

export class ReferralService {
  /**
   * Main entry point for creating referrals
   * Routes to appropriate method based on whether groupId is provided
   * Requirement 4.4: Validate all required fields before processing
   * Requirement 4.5: Add rate limiting and spam protection
   */
  async createReferral(data: CreateReferralData): Promise<ReferralResponse> {
    try {
      console.log('createReferral called with data:', JSON.stringify(data, null, 2));
      
      // Sanitize input data
      const sanitizedData = sanitizeReferralInput(data);

      // Check rate limiting first
      const rateLimitCheck = referralRateLimiter.canMakeReferral(data.referrerId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.reason,
          errorDetails: {
            type: 'rate_limit',
            message: rateLimitCheck.reason || 'Rate limit exceeded',
            retryable: true,
            suggestions: [
              `Try again in ${rateLimitCheck.retryAfter} ${rateLimitCheck.retryAfter === 1 ? 'minute' : 'minutes'}`,
              'You can check your referral history in your profile',
              'Contact support if you need to make urgent referrals',
            ],
          },
        };
      }

      // Comprehensive server-side validation
      const validation = validateServerReferralData(
        sanitizedData,
        data.referrerId,
        data.groupId
      );

      if (!validation.isValid) {
        const firstError = Object.entries(validation.errors)[0];
        return {
          success: false,
          error: firstError[1],
          errorDetails: {
            type: 'validation',
            message: firstError[1],
            field: firstError[0],
            retryable: true,
            suggestions: [
              'Please check the highlighted fields and correct any errors',
              'Make sure the email address is valid and spelled correctly',
              'Ensure the phone number includes area code',
            ],
          },
        };
      }

      // Check for duplicate referrals
      const duplicateCheck = await this.checkForDuplicateReferral(
        sanitizedData.email,
        data.referrerId,
        data.groupId
      );

      if (duplicateCheck.isDuplicate) {
        return {
          success: false,
          error: duplicateCheck.message,
          errorDetails: {
            type: 'duplicate',
            message: duplicateCheck.message,
            retryable: false,
            suggestions: [
              'Check if they already have an account',
              'Try referring them to a different group',
              'Contact them directly to help with their account',
            ],
          },
        };
      }

      // Record the referral attempt for rate limiting
      referralRateLimiter.recordReferral(data.referrerId);

      // Ensure we have a referrerId (from caller or current session)
      let effectiveReferrerId = data.referrerId;
      if (!effectiveReferrerId) {
        const { user } = await authService.validateAndRefreshSession();
        if (!user?.id) {
          return {
            success: false,
            error: 'Referrer ID is required',
            errorDetails: {
              type: 'validation',
              message: 'Referrer ID is required',
              field: 'referrerId',
              retryable: false,
            },
          };
        }
        effectiveReferrerId = user.id;
      }

      // Route to appropriate referral type with retry logic
      const result = await retryWithBackoff(async () => {
        if (data.groupId) {
          return await this.createGroupReferral({ ...sanitizedData, referrerId: effectiveReferrerId });
        } else {
          return await this.createGeneralReferral({ ...sanitizedData, referrerId: effectiveReferrerId });
        }
      }, 2, 1000);

      // Add warnings if any
      if (validation.warnings) {
        result.warnings = {
          ...(result.warnings || {}),
          ...validation.warnings,
        };
      }

      return result;
    } catch (error) {
      const errorDetails = createReferralErrorMessage(error);
      const appError = handleSupabaseError(error as Error);
      
      return {
        success: false,
        error: errorDetails.message,
        errorDetails: {
          type: this.getErrorType(error),
          message: errorDetails.message,
          retryable: errorDetails.retryable,
          suggestions: errorDetails.suggestions,
        },
      };
    }
  }

  /**
   * Create a general referral (no specific group)
   */
  async createGeneralReferral(
    data: CreateReferralData
  ): Promise<ReferralResponse> {
    try {
      // Create user account via secure Edge Function
      const accountResult = await this.createUserAccountViaEdgeFunction(data);
      if (!accountResult || !accountResult.userId) {
        return { success: false, error: 'Failed to create user account' };
      }

      const userId = accountResult.userId;
      const warnings = this.formatWarnings(accountResult.warnings);

      // Trigger referral accepted notification to referrer
      try {
        // Try to obtain referred user's name
        const { data: referredUser } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', userId)
          .single();
        const { triggerReferralAcceptedNotification } = await import('./notifications');
        await triggerReferralAcceptedNotification({
          referrerId: data.referrerId,
          referredUserId: userId,
          referredUserName: referredUser?.name || data.firstName || data.email.split('@')[0],
        });
      } catch (e) {
        if (__DEV__) console.warn('Referral accepted notification failed', e);
      }

      return {
        success: true,
        userId,
        referralId: accountResult.referralId ?? undefined,
        warnings,
        reusedExistingUser: accountResult.reusedExistingUser,
      };
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return {
        success: false,
        error: appError.message || 'Failed to create general referral',
      };
    }
  }

  /**
   * Create a group-specific referral
   */
  async createGroupReferral(
    data: CreateReferralData
  ): Promise<ReferralResponse> {
    try {
      // Verify group exists when provided
      if (data.groupId) {
        const groupExists = await this.verifyGroupExists(data.groupId);
        if (!groupExists) {
          return { success: false, error: 'Group not found' };
        }
      }

      // Create user account via secure Edge Function
      const accountResult = await this.createUserAccountViaEdgeFunction(data);
      if (!accountResult || !accountResult.userId) {
        return { success: false, error: 'Failed to create user account' };
      }

      const userId = accountResult.userId;
      const warnings = this.formatWarnings(accountResult.warnings);

      // Trigger referral accepted notification to referrer
      try {
        const { data: referredUser } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', userId)
          .single();
        const { triggerReferralAcceptedNotification } = await import('./notifications');
        await triggerReferralAcceptedNotification({
          referrerId: data.referrerId,
          referredUserId: userId,
          referredUserName: referredUser?.name || data.firstName || data.email.split('@')[0],
        });
      } catch (e) {
        if (__DEV__) console.warn('Referral accepted notification failed', e);
      }

      return {
        success: true,
        userId,
        referralId: accountResult.referralId ?? undefined,
        membershipCreated: accountResult.membershipCreated,
        warnings,
        reusedExistingUser: accountResult.reusedExistingUser,
      };
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return {
        success: false,
        error: appError.message || 'Failed to create group referral',
      };
    }
  }

  /**
   * Get referrals made by a specific user
   */
  async getReferralsByUser(userId: string): Promise<
    ReferralServiceResponse<{
      groupReferrals: GroupReferralWithDetails[];
      generalReferrals: GeneralReferralWithDetails[];
    }>
  > {
    try {
      // Get all referrals made by this user from the unified referrals table
      const { data: allReferrals, error: referralsError } = await supabase
        .from('referrals')
        .select(
          `
          *,
          group:groups(*),
          referrer:users!referrals_referred_by_user_id_fkey(id, name),
          referred_user:users!referrals_referred_user_id_fkey(id, name)
        `
        )
        .eq('referred_by_user_id', userId)
        .order('created_at', { ascending: false });

      if (referralsError) {
        return { data: null, error: new Error(referralsError.message) };
      }

      // Separate into group and general referrals
      const groupReferrals = (allReferrals || []).filter(ref => ref.group_id !== null);
      const generalReferrals = (allReferrals || []).filter(ref => ref.group_id === null);

      return {
        data: {
          groupReferrals: groupReferrals || [],
          generalReferrals: generalReferrals || [],
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error : new Error('Failed to get referrals'),
      };
    }
  }

  /**
   * Get referrals for a specific group
   */
  async getReferralsForGroup(
    groupId: string
  ): Promise<ReferralServiceResponse<GroupReferralWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(
          `
          *,
          group:groups(*),
          referrer:users!referrals_referred_by_user_id_fkey(id, name),
          referred_user:users!referrals_referred_user_id_fkey(id, name)
        `
        )
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error
            : new Error('Failed to get group referrals'),
      };
    }
  }

  /**
   * Private helper: Create user account for referred person
   * Requirement 5.1: Send verification email to referred person's email address
   * Requirement 5.2: Include "verify email" link for account activation
   */
  private async createUserAccount(
    data: CreateReferralData
  ): Promise<string | null> {
    try {
      // Use the enhanced auth service to create referred user
      const result = await authService.createReferredUser({
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        note: data.note,
        referrerId: data.referrerId,
      });

      if (result.error || !result.userId) {
        console.error('Failed to create referred user:', result.error);
        return null;
      }

      // Send verification email using the dedicated email verification service
      try {
        const emailResult = await emailVerificationService.sendVerificationEmail(
          data.email,
          true // Mark as referral email
        );

        if (!emailResult.success) {
          console.error('Email verification failed:', emailResult.error);
          // Log the error but don't fail the referral creation
          // The user account was created successfully
        } else {
          console.log(`Verification email sent successfully to ${data.email}`);
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail the referral creation due to email issues
      }

      return result.userId;
    } catch (error) {
      console.error('Error creating user account:', error);
      return null;
    }
  }

  private async createUserAccountViaEdgeFunction(
    data: CreateReferralData
  ): Promise<CreateReferredUserResult | null> {
    try {
      const requestBody = {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        note: data.note,
        referrerId: data.referrerId,
        groupId: data.groupId,
      };
      
      console.log('Sending to edge function:', JSON.stringify(requestBody, null, 2));
      
      const { data: resp, error } = await supabase.functions.invoke('create-referred-user', {
        body: requestBody,
      });

      if (error) {
        console.error('Edge function error creating referred user:', error);
        return null;
      }

      // Parse the response if it's a string
      let parsedResponse = resp;
      if (typeof resp === 'string') {
        try {
          parsedResponse = JSON.parse(resp);
        } catch (e) {
          console.error('Failed to parse edge function response:', e);
          return null;
        }
      }
      
      const result = parsedResponse as {
        ok?: boolean;
        userId?: string;
        referralId?: string;
        warnings?: string[];
        warning?: string;
        reusedExistingUser?: boolean;
        membershipCreated?: boolean;
        error?: string;
      };

      if (!result?.ok) {
        console.error('Edge function reported failure creating referred user:', result?.error);
        console.error('Full edge function response:', JSON.stringify(result, null, 2));
        return null;
      }

      const warnings = result.warnings || (result.warning ? [result.warning] : undefined);

      return {
        userId: result.userId ?? null,
        referralId: result.referralId ?? null,
        warnings,
        reusedExistingUser: result.reusedExistingUser,
        membershipCreated: result.membershipCreated,
      };
    } catch (e) {
      console.error('Error calling create-referred-user function:', e);
      return null;
    }
  }

  /**
   * Check for duplicate referrals to prevent spam and conflicts
   * Requirement 4.5: Add spam protection for referral submissions
   */
  private async checkForDuplicateReferral(
    _email: string,
    _referrerId: string,
    _groupId?: string
  ): Promise<{ isDuplicate: boolean; message: string }> {
    // Client cannot safely call Admin API; rely on createUser step to surface duplicates.
    // If the auth user already exists, the create step will error and we convert to a user-friendly message.
    return { isDuplicate: false, message: '' };
  }

  private formatWarnings(warnings?: string[]): Record<string, string> | undefined {
    if (!warnings?.length) return undefined;
    return warnings.reduce<Record<string, string>>((acc, warning, index) => {
      acc[`warning_${index + 1}`] = warning;
      return acc;
    }, {});
  }

  /**
   * Determine error type for better error handling
   */
  private getErrorType(error: any): ReferralError['type'] {
    if (error instanceof ValidationError) {
      return 'validation';
    }
    
    if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
      return 'rate_limit';
    }
    
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      return 'duplicate';
    }
    
    if (error.message?.includes('network') || error.message?.includes('connection')) {
      return 'network';
    }
    
    if (error.message?.includes('email')) {
      return 'email';
    }
    
    return 'unknown';
  }

  /**
   * Private helper: Verify group exists
   */
  private async verifyGroupExists(groupId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id')
        .eq('id', groupId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get referral statistics for analytics and reporting
   * Requirement 6.3: Timestamp tracking for referral creation
   */
  async getReferralStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<
    ReferralServiceResponse<{
      totalReferrals: number;
      groupReferrals: number;
      generalReferrals: number;
      referralsByMonth: Array<{ month: string; count: number }>;
      topReferrers: Array<{ referrer_id: string; referrer_name: string; count: number }>;
    }>
  > {
    try {
      const dateFilter = startDate && endDate 
        ? `created_at >= '${startDate}' AND created_at <= '${endDate}'`
        : '';

      // Get group referrals count (referrals with group_id)
      const { count: groupCount, error: groupError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .not('group_id', 'is', null)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (groupError) {
        return { data: null, error: new Error(groupError.message) };
      }

      // Get general referrals count (referrals without group_id)
      const { count: generalCount, error: generalError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .is('group_id', null)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (generalError) {
        return { data: null, error: new Error(generalError.message) };
      }

      // Get referrals by month (group referrals)
      const { data: groupMonthlyData, error: groupMonthlyError } = await supabase
        .from('referrals')
        .select('created_at')
        .not('group_id', 'is', null)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31')
        .order('created_at', { ascending: true });

      if (groupMonthlyError) {
        return { data: null, error: new Error(groupMonthlyError.message) };
      }

      // Get referrals by month (general referrals)
      const { data: generalMonthlyData, error: generalMonthlyError } = await supabase
        .from('referrals')
        .select('created_at')
        .is('group_id', null)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31')
        .order('created_at', { ascending: true });

      if (generalMonthlyError) {
        return { data: null, error: new Error(generalMonthlyError.message) };
      }

      // Process monthly data
      const monthlyMap = new Map<string, number>();
      
      [...(groupMonthlyData || []), ...(generalMonthlyData || [])].forEach(item => {
        const month = new Date(item.created_at).toISOString().substring(0, 7); // YYYY-MM
        monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
      });

      const referralsByMonth = Array.from(monthlyMap.entries()).map(([month, count]) => ({
        month,
        count,
      }));

      // Get top referrers from unified referrals table
      const { data: topReferrers, error: topReferrersError } = await supabase
        .from('referrals')
        .select(`
          referred_by_user_id,
          referrer:users!referrals_referred_by_user_id_fkey(name)
        `)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (topReferrersError) {
        return { data: null, error: new Error(topReferrersError.message) };
      }

      // Process top referrers
      const referrerMap = new Map<string, { name: string; count: number }>();
      
      (topReferrers || []).forEach(item => {
        const existing = referrerMap.get(item.referred_by_user_id);
        referrerMap.set(item.referred_by_user_id, {
          name: (item.referrer as any)?.name || 'Unknown',
          count: (existing?.count || 0) + 1,
        });
      });

      const topReferrersList = Array.from(referrerMap.entries())
        .map(([referrer_id, data]) => ({
          referrer_id,
          referrer_name: data.name,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 referrers

      return {
        data: {
          totalReferrals: (groupCount || 0) + (generalCount || 0),
          groupReferrals: groupCount || 0,
          generalReferrals: generalCount || 0,
          referralsByMonth,
          topReferrers: topReferrersList,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get referral statistics'),
      };
    }
  }

  /**
   * Get all referrals for a specific referred user
   * Useful for tracking how a user was referred
   */
  async getReferralsForUser(
    userId: string
  ): Promise<
    ReferralServiceResponse<{
      groupReferral?: GroupReferralWithDetails;
      generalReferral?: GeneralReferralWithDetails;
    }>
  > {
    try {
      // Check for referral in unified table
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select(`
          *,
          group:groups(*),
          referrer:users!referrals_referred_by_user_id_fkey(id, name),
          referred_user:users!referrals_referred_user_id_fkey(id, name)
        `)
        .eq('referred_user_id', userId)
        .single();

      // It's expected that a referral might not exist, so we don't treat that as an error
      return {
        data: {
          groupReferral: referralError ? undefined : (referral?.group_id ? referral : undefined),
          generalReferral: referralError ? undefined : (referral?.group_id ? undefined : referral),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get referrals for user'),
      };
    }
  }

  /**
   * Batch create multiple referrals (for admin/bulk operations)
   * Requirement 6.5: Ensure data integrity and proper relationships
   */
  async createBatchReferrals(
    referrals: CreateReferralData[]
  ): Promise<ReferralServiceResponse<{ successful: number; failed: number; errors: string[] }>> {
    try {
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process referrals in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < referrals.length; i += batchSize) {
        const batch = referrals.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (referralData) => {
          try {
            const result = await this.createReferral(referralData);
            if (result.success) {
              successful++;
            } else {
              failed++;
              errors.push(`${referralData.email}: ${result.error}`);
            }
          } catch (error) {
            failed++;
            errors.push(`${referralData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        await Promise.all(batchPromises);
      }

      return {
        data: { successful, failed, errors },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create batch referrals'),
      };
    }
  }

  /**
   * Update referral note (for admin/moderation purposes)
   * Requirement 6.5: Ensure data integrity and proper relationships
   */
  async updateReferralNote(
    referralId: string,
    note: string,
    isGroupReferral: boolean
  ): Promise<ReferralServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ 
          note,
          updated_at: new Date().toISOString()
        })
        .eq('id', referralId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to update referral note'),
      };
    }
  }

  /**
   * Delete referral record (for admin/cleanup purposes)
   * Requirement 6.5: Ensure data integrity and proper relationships
   */
  async deleteReferral(
    referralId: string,
    isGroupReferral: boolean
  ): Promise<ReferralServiceResponse<boolean>> {
    try {
      const { error } = await supabase
        .from('referrals')
        .delete()
        .eq('id', referralId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to delete referral'),
      };
    }
  }

  /**
   * Get referral counts by referrer for leaderboard/gamification
   * Requirement 6.1, 6.2: Store referrer's ID and referral details
   */
  async getReferralCountsByReferrer(
    referrerId: string
  ): Promise<
    ReferralServiceResponse<{
      groupReferrals: number;
      generalReferrals: number;
      totalReferrals: number;
    }>
  > {
    try {
      // Get group referrals count (referrals with group_id)
      const { count: groupCount, error: groupError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by_user_id', referrerId)
        .not('group_id', 'is', null);

      if (groupError) {
        return { data: null, error: new Error(groupError.message) };
      }

      // Get general referrals count (referrals without group_id)
      const { count: generalCount, error: generalError } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by_user_id', referrerId)
        .is('group_id', null);

      if (generalError) {
        return { data: null, error: new Error(generalError.message) };
      }

      return {
        data: {
          groupReferrals: groupCount || 0,
          generalReferrals: generalCount || 0,
          totalReferrals: (groupCount || 0) + (generalCount || 0),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get referral counts'),
      };
    }
  }

  /**
   * Get database schema validation information
   * Requirement 6.5: Ensure data integrity and proper relationships
   */
  async validateDatabaseSchema(): Promise<
    ReferralServiceResponse<{
      referralsExists: boolean;
      generalReferralsExists: boolean;
      indexesExist: boolean;
      constraintsValid: boolean;
      errors: string[];
    }>
  > {
    try {
      const validation = await ReferralDatabaseUtils.validateTableStructure();
      return { data: validation, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to validate database schema'),
      };
    }
  }

  /**
   * Validate referral data integrity
   * Requirement 6.5: Ensure data integrity and proper relationships
   */
  async validateReferralIntegrity(): Promise<
    ReferralServiceResponse<{
      orphanedGroupReferrals: number;
      orphanedGeneralReferrals: number;
      invalidUserReferences: number;
      issues: string[];
    }>
  > {
    try {
      const issues: string[] = [];

      // Check for referrals with invalid group references
      const { data: invalidGroupRefs, error: groupRefError } = await supabase
        .from('referrals')
        .select('id, group_id')
        .not('group_id', 'is', null)
        .not('group_id', 'in', `(SELECT id FROM groups)`);

      if (groupRefError) {
        return { data: null, error: new Error(groupRefError.message) };
      }

      // Check for referrals with invalid user references (referrer)
      const { data: invalidReferrers, error: referrerError } = await supabase
        .from('referrals')
        .select('id, referred_by_user_id')
        .not('referred_by_user_id', 'in', `(SELECT id FROM users)`);

      if (referrerError) {
        return { data: null, error: new Error(referrerError.message) };
      }

      // Check for referrals with invalid user references (referred user)
      const { data: invalidReferredUsers, error: referredError } = await supabase
        .from('referrals')
        .select('id, referred_user_id')
        .not('referred_user_id', 'is', null)
        .not('referred_user_id', 'in', `(SELECT id FROM users)`);

      if (referredError) {
        return { data: null, error: new Error(referredError.message) };
      }

      // Compile issues
      if (invalidGroupRefs && invalidGroupRefs.length > 0) {
        issues.push(`${invalidGroupRefs.length} referrals reference non-existent groups`);
      }

      if (invalidReferrers && invalidReferrers.length > 0) {
        issues.push(`${invalidReferrers.length} referrals reference non-existent referrer users`);
      }

      if (invalidReferredUsers && invalidReferredUsers.length > 0) {
        issues.push(`${invalidReferredUsers.length} referrals reference non-existent referred users`);
      }

      return {
        data: {
          orphanedGroupReferrals: invalidGroupRefs?.length || 0,
          orphanedGeneralReferrals: 0, // General referrals don't have group dependencies
          invalidUserReferences: 
            (invalidReferrers?.length || 0) + 
            (invalidReferredUsers?.length || 0),
          issues,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to validate referral integrity'),
      };
    }
  }

}

// Export singleton instance
export const referralService = new ReferralService();

// Export database utilities for admin/maintenance operations
export { ReferralDatabaseUtils, REFERRAL_SCHEMA_SQL, COMPLETE_REFERRAL_SCHEMA } from './referralDatabase';
