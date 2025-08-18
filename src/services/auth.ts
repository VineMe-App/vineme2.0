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

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

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
  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        const result = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (result.error) {
          throw result.error;
        }

        return result;
      });

      // Store authentication session securely
      if (data.session) {
        await secureStorage.storeAuthSession({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        });
      }

      return { user: data.user, error: null };
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return { user: null, error: new Error(appError.message) };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp({ email, password, name }: SignUpData): Promise<AuthResponse> {
    try {
      const { data, error } = await retryWithBackoff(async () => {
        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || '',
            },
          },
        });

        if (result.error) {
          throw result.error;
        }

        return result;
      });

      return { user: data.user, error: null };
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return { user: null, error: new Error(appError.message) };
    }
  }

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
        .single();

      if (error) {
        console.error('Error getting user profile:', error.message);
        return null;
      }

      return data;
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
  }): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { error: new Error('No authenticated user') };
      }

      // Insert minimal required fields to avoid 400s from missing FKs or columns
      const payload: Record<string, any> = {
        id: user.id,
        email: user.email || '',
        name: userData.name,
        roles: ['user'],
        updated_at: new Date().toISOString(),
      };

      if (userData.church_id) {
        payload.church_id = userData.church_id;
      }
      if (userData.service_id) {
        payload.service_id = userData.service_id;
      }
      if (userData.newcomer !== undefined) {
        payload.newcomer = userData.newcomer;
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
      // Validate input data
      const validationError = this.validateReferredUserData(data);
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
              phone: data.phone,
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
        const appError = handleSupabaseError(authError as Error);
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
        data
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

      // Trigger email verification for the referred user
      await this.triggerReferredUserEmailVerification(data.email);

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

    // Basic phone validation (allow various formats)
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      return 'Invalid phone number format';
    }

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
        email: data.email,
        name: userName,
        phone: data.phone,
        newcomer: true, // Mark as newcomer for appropriate onboarding
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
   */
  private async triggerReferredUserEmailVerification(
    email: string
  ): Promise<void> {
    try {
      // Use Supabase auth to send verification email
      const result = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (result?.error) {
        console.error('Failed to send verification email:', result.error);
        // Don't throw here as the user account was created successfully
        // The verification email failure shouldn't block the referral
      }
    } catch (error) {
      console.error('Error triggering email verification:', error);
      // Don't throw here as the user account was created successfully
    }
  }

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
}

// Export singleton instance
export const authService = new AuthService();
