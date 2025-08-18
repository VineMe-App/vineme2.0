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

  // Actions
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name?: string) => Promise<boolean>;
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

  // Actions
  signIn: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const { user, error } = await authService.signIn({ email, password });

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      if (user) {
        set({ user, isLoading: false });
        // Load user profile after successful sign in
        await get().loadUserProfile();
        return true;
      }

      set({ error: 'Sign in failed', isLoading: false });
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign in failed';
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  signUp: async (
    email: string,
    password: string,
    name?: string
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const { user, error } = await authService.signUp({
        email,
        password,
        name,
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return false;
      }

      if (user) {
        set({ user, isLoading: false });
        return true;
      }

      set({ error: 'Sign up failed', isLoading: false });
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Sign up failed';
      set({ error: errorMessage, isLoading: false });
      return false;
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
