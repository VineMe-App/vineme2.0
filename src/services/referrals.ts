import { supabase } from './supabase';
import { authService } from './auth';
import type {
  GroupReferral,
  GeneralReferral,
  GroupReferralWithDetails,
  GeneralReferralWithDetails,
} from '../types/database';
import { handleSupabaseError, retryWithBackoff } from '../utils/errorHandling';
import { ReferralDatabaseUtils } from './referralDatabase';

export interface CreateReferralData {
  email: string;
  phone: string;
  note: string;
  firstName?: string;
  lastName?: string;
  groupId?: string;
  referrerId: string;
}

export interface ReferralResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface ReferralServiceResponse<T = any> {
  data: T | null;
  error: Error | null;
}

export class ReferralService {
  /**
   * Main entry point for creating referrals
   * Routes to appropriate method based on whether groupId is provided
   */
  async createReferral(data: CreateReferralData): Promise<ReferralResponse> {
    try {
      // Validate required fields
      const validationError = this.validateReferralData(data);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Route to appropriate referral type
      if (data.groupId) {
        return await this.createGroupReferral(data);
      } else {
        return await this.createGeneralReferral(data);
      }
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return {
        success: false,
        error: appError.message || 'Failed to create referral',
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
      // Create user account first
      const userId = await this.createUserAccount(data);
      if (!userId) {
        return { success: false, error: 'Failed to create user account' };
      }

      // Create general referral record
      await this.createGeneralReferralRecord(userId, data);

      return { success: true, userId };
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
      if (!data.groupId) {
        return {
          success: false,
          error: 'Group ID is required for group referrals',
        };
      }

      // Verify group exists
      const groupExists = await this.verifyGroupExists(data.groupId);
      if (!groupExists) {
        return { success: false, error: 'Group not found' };
      }

      // Create user account first
      const userId = await this.createUserAccount(data);
      if (!userId) {
        return { success: false, error: 'Failed to create user account' };
      }

      // Create group referral record
      await this.createGroupReferralRecord(userId, data);

      return { success: true, userId };
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
      // Get group referrals
      const { data: groupReferrals, error: groupError } = await supabase
        .from('group_referrals')
        .select(
          `
          *,
          group:groups(*),
          referrer:users!group_referrals_referrer_id_fkey(id, name, email),
          referred_user:users!group_referrals_referred_user_id_fkey(id, name, email)
        `
        )
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (groupError) {
        return { data: null, error: new Error(groupError.message) };
      }

      // Get general referrals
      const { data: generalReferrals, error: generalError } = await supabase
        .from('general_referrals')
        .select(
          `
          *,
          referrer:users!general_referrals_referrer_id_fkey(id, name, email),
          referred_user:users!general_referrals_referred_user_id_fkey(id, name, email)
        `
        )
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (generalError) {
        return { data: null, error: new Error(generalError.message) };
      }

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
        .from('group_referrals')
        .select(
          `
          *,
          group:groups(*),
          referrer:users!group_referrals_referrer_id_fkey(id, name, email),
          referred_user:users!group_referrals_referred_user_id_fkey(id, name, email)
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

      return result.userId;
    } catch (error) {
      console.error('Error creating user account:', error);
      return null;
    }
  }

  /**
   * Private helper: Create general referral record
   * Requirement 6.1: Store referrer's ID and referral details
   * Requirement 6.3: Timestamp tracking for referral creation
   */
  private async createGeneralReferralRecord(
    userId: string,
    data: CreateReferralData
  ): Promise<void> {
    const now = new Date().toISOString();
    
    const { error } = await supabase.from('general_referrals').insert({
      referrer_id: data.referrerId,
      referred_user_id: userId,
      note: data.note || null, // Explicitly handle empty notes
      created_at: now,
      updated_at: now,
    });

    if (error) {
      // Handle specific constraint violations
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('This user has already been referred by you');
      } else if (error.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid referrer or user reference');
      } else if (error.code === '23514') { // Check constraint violation
        throw new Error('Cannot refer yourself');
      }
      
      throw new Error(
        `Failed to create general referral record: ${error.message}`
      );
    }
  }

  /**
   * Private helper: Create group referral record
   * Requirement 6.2: Store referrer's ID, group ID, and referral details in group_referrals table
   * Requirement 6.3: Timestamp tracking for referral creation
   * Requirement 6.5: Ensure data integrity and proper relationships
   */
  private async createGroupReferralRecord(
    userId: string,
    data: CreateReferralData
  ): Promise<void> {
    if (!data.groupId) {
      throw new Error('Group ID is required for group referral record');
    }

    const now = new Date().toISOString();

    const { error } = await supabase.from('group_referrals').insert({
      group_id: data.groupId,
      referrer_id: data.referrerId,
      referred_user_id: userId,
      note: data.note || null, // Explicitly handle empty notes
      created_at: now,
      updated_at: now,
    });

    if (error) {
      // Handle specific constraint violations
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('This user has already been referred to this group by you');
      } else if (error.code === '23503') { // Foreign key constraint violation
        if (error.message.includes('group_id')) {
          throw new Error('Group not found or has been deleted');
        } else {
          throw new Error('Invalid referrer or user reference');
        }
      } else if (error.code === '23514') { // Check constraint violation
        throw new Error('Cannot refer yourself');
      }
      
      throw new Error(
        `Failed to create group referral record: ${error.message}`
      );
    }
  }

  /**
   * Private helper: Validate referral data
   */
  private validateReferralData(data: CreateReferralData): string | null {
    if (!data.email || !data.email.trim()) {
      return 'Email is required';
    }

    if (!data.phone || !data.phone.trim()) {
      return 'Phone number is required';
    }

    if (!data.referrerId || !data.referrerId.trim()) {
      return 'Referrer ID is required';
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return 'Invalid email format';
    }

    // Basic phone validation (allow various formats)
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      return 'Invalid phone number format';
    }

    return null;
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

      // Get group referrals count
      const { count: groupCount, error: groupError } = await supabase
        .from('group_referrals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (groupError) {
        return { data: null, error: new Error(groupError.message) };
      }

      // Get general referrals count
      const { count: generalCount, error: generalError } = await supabase
        .from('general_referrals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (generalError) {
        return { data: null, error: new Error(generalError.message) };
      }

      // Get referrals by month (group referrals)
      const { data: groupMonthlyData, error: groupMonthlyError } = await supabase
        .from('group_referrals')
        .select('created_at')
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31')
        .order('created_at', { ascending: true });

      if (groupMonthlyError) {
        return { data: null, error: new Error(groupMonthlyError.message) };
      }

      // Get referrals by month (general referrals)
      const { data: generalMonthlyData, error: generalMonthlyError } = await supabase
        .from('general_referrals')
        .select('created_at')
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

      // Get top referrers from both tables
      const { data: topGroupReferrers, error: topGroupError } = await supabase
        .from('group_referrals')
        .select(`
          referrer_id,
          referrer:users!group_referrals_referrer_id_fkey(name)
        `)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (topGroupError) {
        return { data: null, error: new Error(topGroupError.message) };
      }

      const { data: topGeneralReferrers, error: topGeneralError } = await supabase
        .from('general_referrals')
        .select(`
          referrer_id,
          referrer:users!general_referrals_referrer_id_fkey(name)
        `)
        .gte('created_at', startDate || '1970-01-01')
        .lte('created_at', endDate || '2099-12-31');

      if (topGeneralError) {
        return { data: null, error: new Error(topGeneralError.message) };
      }

      // Process top referrers
      const referrerMap = new Map<string, { name: string; count: number }>();
      
      [...(topGroupReferrers || []), ...(topGeneralReferrers || [])].forEach(item => {
        const existing = referrerMap.get(item.referrer_id);
        referrerMap.set(item.referrer_id, {
          name: item.referrer?.name || 'Unknown',
          count: (existing?.count || 0) + 1,
        });
      });

      const topReferrers = Array.from(referrerMap.entries())
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
          topReferrers,
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
      // Check for group referral
      const { data: groupReferral, error: groupError } = await supabase
        .from('group_referrals')
        .select(`
          *,
          group:groups(*),
          referrer:users!group_referrals_referrer_id_fkey(id, name, email),
          referred_user:users!group_referrals_referred_user_id_fkey(id, name, email)
        `)
        .eq('referred_user_id', userId)
        .single();

      // Check for general referral
      const { data: generalReferral, error: generalError } = await supabase
        .from('general_referrals')
        .select(`
          *,
          referrer:users!general_referrals_referrer_id_fkey(id, name, email),
          referred_user:users!general_referrals_referred_user_id_fkey(id, name, email)
        `)
        .eq('referred_user_id', userId)
        .single();

      // It's expected that one of these might not exist, so we don't treat that as an error
      return {
        data: {
          groupReferral: groupError ? undefined : groupReferral,
          generalReferral: generalError ? undefined : generalReferral,
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
      const tableName = isGroupReferral ? 'group_referrals' : 'general_referrals';
      
      const { error } = await supabase
        .from(tableName)
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
      const tableName = isGroupReferral ? 'group_referrals' : 'general_referrals';
      
      const { error } = await supabase
        .from(tableName)
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
      // Get group referrals count
      const { count: groupCount, error: groupError } = await supabase
        .from('group_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', referrerId);

      if (groupError) {
        return { data: null, error: new Error(groupError.message) };
      }

      // Get general referrals count
      const { count: generalCount, error: generalError } = await supabase
        .from('general_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', referrerId);

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
      groupReferralsExists: boolean;
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

      // Check for group referrals with invalid group references
      const { data: invalidGroupRefs, error: groupRefError } = await supabase
        .from('group_referrals')
        .select('id, group_id')
        .not('group_id', 'in', `(SELECT id FROM groups)`);

      if (groupRefError) {
        return { data: null, error: new Error(groupRefError.message) };
      }

      // Check for referrals with invalid user references (referrer)
      const { data: invalidReferrers, error: referrerError } = await supabase
        .from('group_referrals')
        .select('id, referrer_id')
        .not('referrer_id', 'in', `(SELECT id FROM users)`);

      if (referrerError) {
        return { data: null, error: new Error(referrerError.message) };
      }

      // Check for referrals with invalid user references (referred user)
      const { data: invalidReferredUsers, error: referredError } = await supabase
        .from('group_referrals')
        .select('id, referred_user_id')
        .not('referred_user_id', 'in', `(SELECT id FROM users)`);

      if (referredError) {
        return { data: null, error: new Error(referredError.message) };
      }

      // Similar checks for general referrals
      const { data: invalidGeneralReferrers, error: generalReferrerError } = await supabase
        .from('general_referrals')
        .select('id, referrer_id')
        .not('referrer_id', 'in', `(SELECT id FROM users)`);

      if (generalReferrerError) {
        return { data: null, error: new Error(generalReferrerError.message) };
      }

      const { data: invalidGeneralReferredUsers, error: generalReferredError } = await supabase
        .from('general_referrals')
        .select('id, referred_user_id')
        .not('referred_user_id', 'in', `(SELECT id FROM users)`);

      if (generalReferredError) {
        return { data: null, error: new Error(generalReferredError.message) };
      }

      // Compile issues
      if (invalidGroupRefs && invalidGroupRefs.length > 0) {
        issues.push(`${invalidGroupRefs.length} group referrals reference non-existent groups`);
      }

      if (invalidReferrers && invalidReferrers.length > 0) {
        issues.push(`${invalidReferrers.length} group referrals reference non-existent referrer users`);
      }

      if (invalidReferredUsers && invalidReferredUsers.length > 0) {
        issues.push(`${invalidReferredUsers.length} group referrals reference non-existent referred users`);
      }

      if (invalidGeneralReferrers && invalidGeneralReferrers.length > 0) {
        issues.push(`${invalidGeneralReferrers.length} general referrals reference non-existent referrer users`);
      }

      if (invalidGeneralReferredUsers && invalidGeneralReferredUsers.length > 0) {
        issues.push(`${invalidGeneralReferredUsers.length} general referrals reference non-existent referred users`);
      }

      return {
        data: {
          orphanedGroupReferrals: invalidGroupRefs?.length || 0,
          orphanedGeneralReferrals: 0, // General referrals don't have group dependencies
          invalidUserReferences: 
            (invalidReferrers?.length || 0) + 
            (invalidReferredUsers?.length || 0) + 
            (invalidGeneralReferrers?.length || 0) + 
            (invalidGeneralReferredUsers?.length || 0),
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
