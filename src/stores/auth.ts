import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { DatabaseUser } from '../types/database';
import { authService } from '../services/auth';

interface AuthState {
  // State
  user: User | null;
  userProfile: DatabaseUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions - password authentication removed
  signUpWithPhone: (phone: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPhone: (phone: string) => Promise<{ success: boolean; error?: string; userNotFound?: boolean }>;
  signInWithEmail: (email: string) => Promise<{ success: boolean; error?: string; userNotFound?: boolean }>;
  verifyOtp: (phoneOrEmail: string, code: string, type: 'sms' | 'email') => Promise<{ success: boolean; error?: string; user?: User }>;
  linkEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  linkPhone: (phone: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<DatabaseUser>) => Promise<boolean>;
  createUserProfile: (userData: {
    name: string;
    church_id?: string;
    service_id?: string;
    newcomer?: boolean;
  }) => Promise<boolean>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  userProfile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Password authentication methods removed - phone-first authentication only

  signUpWithPhone: async (phone: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signUpWithPhone(phone);
      set({ isLoading: false });
      if (!result.success && result.error) {
        set({ error: result.error });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Phone sign up failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signInWithPhone: async (phone: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signInWithPhone(phone);
      set({ isLoading: false });
      if (!result.success && result.error) {
        set({ error: result.error });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Phone sign in failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signInWithEmail: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signInWithEmail(email);
      set({ isLoading: false });
      if (!result.success && result.error) {
        set({ error: result.error });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email sign in failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  verifyOtp: async (phoneOrEmail: string, code: string, type: 'sms' | 'email') => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.verifyOtp(phoneOrEmail, code, type);
      if (result.success && result.user) {
        set({ user: result.user, isLoading: false });
        // Load user profile after successful verification
        await get().loadUserProfile();

        // If no profile exists yet: only auto-create if we already have an email on the auth user
        // Otherwise, let onboarding collect email first to satisfy NOT NULL + uniqueness
        if (!get().userProfile && result.user.email) {
          const fallbackName =
            (result.user.user_metadata as any)?.name ||
            result.user.phone ||
            'New User';
          await get().createUserProfile({
            name: String(fallbackName),
            newcomer: true,
          });
        }
      } else {
        set({ isLoading: false });
        if (result.error) {
          set({ error: result.error });
        }
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'OTP verification failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  linkEmail: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.linkEmail(email);
      set({ isLoading: false });
      if (!result.success && result.error) {
        set({ error: result.error });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email linking failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  linkPhone: async (phone: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.linkPhone(phone);
      set({ isLoading: false });
      if (result.success) {
        // Reload user profile to get updated phone
        await get().loadUserProfile();
      } else if (result.error) {
        set({ error: result.error });
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Phone linking failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signOut: async (): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await authService.signOut();

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({
        user: null,
        userProfile: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign out failed';
      set({ error: errorMessage, isLoading: false });
    }
  },

  loadUserProfile: async (): Promise<void> => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true, error: null });

    try {
      const userProfile = await authService.getCurrentUserProfile();
      set({ userProfile, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load user profile';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateUserProfile: async (
    updates: Partial<DatabaseUser>
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await authService.updateUserProfile(updates);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      // Reload user profile after successful update
      await get().loadUserProfile();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Profile update failed';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  createUserProfile: async (userData: {
    name: string;
    church_id?: string;
    service_id?: string;
    newcomer?: boolean;
  }): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await authService.createUserProfile(userData);

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      // Load the newly created profile
      await get().loadUserProfile();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Profile creation failed';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  clearError: (): void => {
    set({ error: null });
  },

  initialize: async (): Promise<void> => {
    if (get().isInitialized) return;

    set({ isLoading: true });

    try {
      // Get current user
      const user = await authService.getCurrentUser();

      if (user) {
        set({ user });
        // Load user profile if user exists
        await get().loadUserProfile();
      }

      // Set up auth state listener
      authService.onAuthStateChange((user) => {
        const currentState = get();
        if (user && user.id !== currentState.user?.id) {
          set({ user });
          get().loadUserProfile();
        } else if (!user && currentState.user) {
          set({ user: null, userProfile: null });
        }
      });

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Initialization failed';
      set({ error: errorMessage, isLoading: false, isInitialized: true });
    }
  },
}));
