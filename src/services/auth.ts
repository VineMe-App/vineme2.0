import { supabase } from './supabase';
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

      return { user: data.user, error: null };
    } catch (error) {
      const appError = handleSupabaseError(error as Error);
      return { user: null, error: appError };
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
      return { user: null, error: appError };
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
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error('Error getting current user:', error.message);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
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
        .select('*')
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
  }): Promise<{ error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        return { error: new Error('No authenticated user') };
      }

      const { error } = await supabase.from('users').insert({
        id: user.id,
        email: user.email || '',
        name: userData.name,
        church_id: userData.church_id,
        service_id: userData.service_id,
        roles: ['member'], // Default role
        created_at: new Date().toISOString(),
      });

      if (error) {
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
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
}

// Export singleton instance
export const authService = new AuthService();
