import { supabase } from './supabase';
import { secureStorage, SECURE_STORAGE_KEYS } from '../utils/secureStorage';
import { permissionService } from './permissions';
import type { User } from '@supabase/supabase-js';
import type { DatabaseUser } from '../types/database';
import { handleSupabaseError, retryWithBackoff } from '../utils/errorHandling';

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

// Password authentication interfaces removed - phone-first authentication only

export interface CreateReferredUserData {
  email: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  note?: string;
  referrerId: string;
}

export interface CreateReferredUserResponse {
  user: User | null;
  userId?: string;
  error: Error | null;
}

export class AuthService {
  // Password authentication removed - phone-first authentication only

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: new Error(error.message) };
      }

      // Clear secure storage on sign out
      await secureStorage.clearAuthSession();
      
      // Clear permission cache
      permissionService.clearUserCache();

      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Sign out failed'),
      };
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        // Treat missing-session as unauthenticated without noisy logs
        return null;
      }

      return session?.user ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get the current user's profile from the users table
   */
  async getCurrentUserProfile(): Promise<DatabaseUser | null> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .select(
          `
          *,
          church:churches(*),
          service:services(*)
        `
        )
        .eq('id', user.id)
        .maybeSingle();

      if (error) return null;

      return data || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile in the users table
   */
  async updateUserProfile(
    updates: Partial<DatabaseUser>
  ): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { error: new Error('No authenticated user') };
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error('Profile update failed'),
      };
    }
  }

  /**
   * Create user profile after successful sign up
   */
  async createUserProfile(userData: {
    name: string;
    church_id?: string;
    service_id?: string;
    newcomer?: boolean;
    onboarding_complete?: boolean;
  }): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { error: new Error('No authenticated user') };
      }

      // Insert minimal required fields to avoid 400s from missing FKs or columns
      const payload: Record<string, any> = {
        id: user.id,
        name: userData.name,
        roles: ['user'],
        updated_at: new Date().toISOString(),
      };
      // Email is stored in auth.users only; do not write to public.users

      // phone/email removed from public.users; use auth.user for credentials

      if (userData.church_id) {
        payload.church_id = userData.church_id;
      }
      if (userData.service_id) {
        payload.service_id = userData.service_id;
      }
      if (userData.newcomer !== undefined) {
        payload.newcomer = userData.newcomer;
      }
      if (userData.onboarding_complete !== undefined) {
        payload.onboarding_complete = userData.onboarding_complete;
      }
      
      const { error } = await supabase.from('users').upsert(payload, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        // Surface full error info in dev to diagnose 400s
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('createUserProfile error:', error);
        }
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error : new Error('Profile creation failed'),
      };
    }
  }

  /**
   * Check if current session is valid and refresh if needed
   */
  async validateAndRefreshSession(): Promise<{
    user: User | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        return { user: null, error: new Error(error.message) };
      }

      if (!data.session) {
        // Try to get session from secure storage
        const storedSession = await secureStorage.getAuthSession();
        if (storedSession.accessToken) {
          // Session exists in storage but not in Supabase client
          // This might indicate the session expired, clear storage
          await secureStorage.clearAuthSession();
        }
        return { user: null, error: new Error('No active session') };
      }

      // Check if session is close to expiring (within 5 minutes)
      const expiresAt = data.session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;

      if (expiresAt && expiresAt - now < fiveMinutes) {
        // Refresh the session
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();
        
        if (refreshError) {
          await secureStorage.clearAuthSession();
          return { user: null, error: new Error('Session refresh failed') };
        }

        if (refreshData.session) {
          // Update secure storage with new session
          await secureStorage.storeAuthSession({
            accessToken: refreshData.session.access_token,
            refreshToken: refreshData.session.refresh_token,
            expiresAt: refreshData.session.expires_at,
          });
          
          return { user: refreshData.session.user, error: null };
        }
      }

      return { user: data.session.user, error: null };
    } catch (error) {
      return {
        user: null,
        error:
          error instanceof Error
            ? error
            : new Error('Session validation failed'),
      };
    }
  }

  /**
   * Create a referred user account with email verification
   * This method is specifically for referral system use
   */
  async createReferredUser(
    data: CreateReferredUserData
  ): Promise<CreateReferredUserResponse> {
    try {
      // Normalize phone early to avoid duplicate accounts due to formatting
      const normalizedPhone = this.normalizePhone(data.phone || '');
      if (!normalizedPhone) {
        return { user: null, error: new Error('Invalid phone number format') };
      }

      // Validate input data
      const validationError = this.validateReferredUserData({ ...data, phone: normalizedPhone });
      if (validationError) {
        return { user: null, error: new Error(validationError) };
      }

      // Generate a secure temporary password
      const tempPassword = this.generateSecurePassword();

      // Create auth user with email verification required
      const { data: authData, error: authError } = await retryWithBackoff(
        async () => {
          const result = await supabase.auth.admin.createUser({
            email: data.email,
            password: tempPassword,
            email_confirm: false, // Require email verification
            user_metadata: {
              name: this.buildFullName(data.firstName, data.lastName),
              phone: normalizedPhone,
              referred: true,
              referrer_id: data.referrerId,
            },
          });

          if (result.error) {
            throw result.error;
          }

          return result;
        }
      );

      if (authError || !authData.user) {
        const appError = handleSupabaseError((authError ?? new Error('Unknown auth error')) as Error);
        return {
          user: null,
          error: new Error(
            appError.message || 'Failed to create referred user account'
          ),
        };
      }

      // Create corresponding public user record with newcomer flag
      const profileError = await this.createReferredUserProfile(
        authData.user.id,
        { ...data, phone: normalizedPhone }
      );

      if (profileError) {
        // Clean up auth user if profile creation fails
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        return { user: null, error: profileError };
      }

      // Email verification is now handled by the referral service
      // using the dedicated emailVerificationService

      return {
        user: authData.user,
        userId: authData.user.id,
        error: null,
      };
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return {
        user: null,
        error: new Error(
          appError.message || 'Failed to create referred user'
        ),
      };
    }
  }

  /**
   * Private helper: Validate referred user data
   */
  private validateReferredUserData(
    data: CreateReferredUserData
  ): string | null {
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

    // Require normalizable E.164 format (with or without trunk prefix typos)
    const normalized = this.normalizePhone(data.phone);
    if (!normalized) return 'Invalid phone number format';

    return null;
  }

  /**
   * Private helper: Build full name from first and last name
   */
  private buildFullName(firstName?: string, lastName?: string): string {
    if (firstName && lastName) {
      return `${firstName.trim()} ${lastName.trim()}`;
    }
    return firstName?.trim() || '';
  }

  /**
   * Private helper: Generate secure temporary password
   */
  private generateSecurePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Private helper: Create user profile for referred user
   */
  private async createReferredUserProfile(
    userId: string,
    data: CreateReferredUserData
  ): Promise<Error | null> {
    try {
      const userName = this.buildFullName(data.firstName, data.lastName);

      const { error } = await supabase.from('users').insert({
        id: userId,
        name: userName,
        phone: this.normalizePhone(data.phone) || data.phone,
        newcomer: true, // Still a newcomer (needs help finding a group)
        onboarding_complete: false, // Explicitly require onboarding
        roles: ['user'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return new Error(`Failed to create user profile: ${error.message}`);
      }

      return null;
    } catch (error) {
      return error instanceof Error
        ? error
        : new Error('Failed to create user profile');
    }
  }

  /**
   * Private helper: Trigger email verification for referred user
   * Requirement 5.1: Send verification email to referred person's email address
   * Requirement 5.2: Include "verify email" link for account activation
   */
  private async triggerReferredUserEmailVerification(
    email: string
  ): Promise<void> {
    try {
      // Use Supabase auth to send verification email with custom redirect URL
      const redirectUrl = this.buildEmailVerificationRedirectUrl();
      
      const result = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (result?.error) {
        console.error('Failed to send verification email:', result.error);
        // Don't throw here as the user account was created successfully
        // The verification email failure shouldn't block the referral
        throw new Error(`Email verification failed: ${result.error.message}`);
      }

      console.log(`Verification email sent successfully to ${email}`);
    } catch (error) {
      console.error('Error triggering email verification:', error);
      // Re-throw to allow proper error handling in calling code
      throw error instanceof Error 
        ? error 
        : new Error('Failed to send verification email');
    }
  }

  /**
   * Build the redirect URL for email verification
   * This URL will be used when users click the verification link in their email
   */
  private buildEmailVerificationRedirectUrl(): string {
    // Use the app's deep link scheme for mobile app verification
    return 'vineme://auth/verify-email';
  }

  // Email verification methods removed - phone-only verification

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Store new session securely
        await secureStorage.storeAuthSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        });
      } else if (event === 'SIGNED_OUT') {
        // Clear secure storage and permission cache
        await secureStorage.clearAuthSession();
        permissionService.clearUserCache();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update stored session
        await secureStorage.storeAuthSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        });
      }
      
      callback(session?.user || null);
    });
  }

  /**
   * Sign up with phone number (preferred method)
   */
  async signUpWithPhone(
    rawPhone: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const phone = this.normalizePhone(rawPhone);
      if (!phone) {
        return { success: false, error: 'Invalid phone number format. Please use +countrycode format.' };
      }

      const { error } = await supabase.auth.signInWithOtp({ 
        phone,
        options: { shouldCreateUser: true }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code',
      };
    }
  }

  /**
   * Sign in with phone number
   */
  async signInWithPhone(
    rawPhone: string
  ): Promise<{ success: boolean; error?: string; userNotFound?: boolean }> {
    try {
      const phone = this.normalizePhone(rawPhone);
      if (!phone) {
        return { success: false, error: 'Invalid phone number format. Please use +countrycode format.' };
      }

      const { error } = await supabase.auth.signInWithOtp({ 
        phone,
        options: { shouldCreateUser: false }
      });

      if (error) {
        // Check if user not found
        if (error.message.toLowerCase().includes('user not found') || 
            error.message.toLowerCase().includes('invalid login credentials')) {
          return { 
            success: false, 
            error: "This phone isn't linked yet. Please log in with your email, then link your phone in Profile → Security.",
            userNotFound: true
          };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send verification code',
      };
    }
  }

  /**
   * Sign in with email (fallback method) - sends magic link
   */
  async signInWithEmail(
    email: string
  ): Promise<{ success: boolean; error?: string; userNotFound?: boolean }> {
    try {
      // Allow email login via magic link (no email signups)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: 'vineme://auth/verify-email',
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        // Check if user not found
        if (msg.includes('user not found') || msg.includes('invalid login credentials')) {
          return { 
            success: false, 
            error: "This email isn't linked yet. Please sign up with your phone first.",
            userNotFound: true
          };
        }
        // Some projects configure supabase to block email sign-in entirely; surface a better message
        if (msg.includes('signups not allowed') || msg.includes('disabled') || msg.includes('not allowed')) {
          return { success: false, error: 'Email login is currently disabled by server policy.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send magic link',
      };
    }
  }

  /**
   * Verify OTP code for SMS or email
   */
  async verifyOtp(
    phoneOrEmail: string,
    code: string,
    type: 'sms' | 'email'
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      // Expect 4-digit code for SMS, 6-digit for email
      const expectedLength = type === 'sms' ? 4 : 6;
      if (!new RegExp(`^\\d{${expectedLength}}$`).test(code)) {
        return { 
          success: false, 
          error: `Enter the ${expectedLength}-digit code` 
        };
      }

      let verifyOptions;
      if (type === 'sms') {
        const normalizedPhone = this.normalizePhone(phoneOrEmail);
        if (!normalizedPhone) {
          return { success: false, error: 'Invalid phone number format' };
        }
        verifyOptions = {
          phone: normalizedPhone,
          token: code,
          type: 'sms' as const
        };
      } else {
        verifyOptions = {
          email: phoneOrEmail,
          token: code,
          type: 'email' as const
        };
      }

      const { data, error } = await supabase.auth.verifyOtp(verifyOptions);

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data?.session?.user) {
        return { success: false, error: 'Verification failed. Try again.' };
      }

      // Store session securely
      if (data.session) {
        await secureStorage.storeAuthSession({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        });
      }

      return { success: true, user: data.session.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify code',
      };
    }
  }

  /**
   * Link email to existing phone-authenticated user (no verification required)
   */
  async linkEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({ email });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link email',
      };
    }
  }

  /**
   * Link phone to existing email-authenticated user
   */
  async linkPhone(rawPhone: string): Promise<{ success: boolean; error?: string }> {
    try {
      const phone = this.normalizePhone(rawPhone);
      if (!phone) {
        return { success: false, error: 'Invalid phone number format. Please use +countrycode format.' };
      }

      const { error } = await supabase.auth.updateUser({ phone });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link phone',
      };
    }
  }

  /**
   * Normalize phone to E.164 format
   */
  private normalizePhone(input: string): string | null {
    if (!input) return null;

    let s = String(input).trim();
    // Convert common international prefix 00 to +
    s = s.replace(/^00\s*/, '+');
    // Remove spaces, hyphens, dots, parentheses
    s = s.replace(/[\s\-\.\(\)]/g, '');
    // Ensure only + and digits remain
    if (!/^\+?\d+$/.test(s)) return null;

    // Default to UK (+44) if no leading + provided
    if (!s.startsWith('+')) {
      // If starts with UK country code without + (e.g., 44...), normalize
      if (s.startsWith('44')) {
        s = `+${s.replace(/^44(0?)/, '44')}`; // remove optional trunk 0 after 44
      } else if (s.startsWith('0')) {
        // National UK format like 07... => +44 7...
        s = `+44${s.slice(1)}`;
      } else {
        // Assume UK by default
        s = `+44${s}`;
      }
    }

    // Drop a single national trunk '0' erroneously included after country code
    // Example: +44 075... -> +4475...
    s = s.replace(/^(\+44)0(\d{4,})$/, '$1$2');

    // Basic E.164 length check (max 15 digits after +; min reasonable length)
    const digits = s.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;

    return s;
  }
}

// Export singleton instance
export const authService = new AuthService();
