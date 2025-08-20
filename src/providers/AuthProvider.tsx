import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@supabase/supabase-js';
import type { DatabaseUser } from '@/types/database';

interface AuthContextType {
  // State
  user: User | null;
  userProfile: DatabaseUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasProfile: boolean;
  needsOnboarding: boolean;

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
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    if (!authStore.isInitialized) {
      authStore.initialize();
    }
  }, [authStore.isInitialized, authStore.initialize]);

  // Computed values
  const isAuthenticated = !!authStore.user;
  const hasProfile = !!authStore.userProfile;
  const needsOnboarding = isAuthenticated && !hasProfile;

  const contextValue: AuthContextType = {
    // State
    user: authStore.user,
    userProfile: authStore.userProfile,
    isLoading: authStore.isLoading,
    isInitialized: authStore.isInitialized,
    error: authStore.error,
    isAuthenticated,
    hasProfile,
    needsOnboarding,

    // Actions - password authentication removed
    signUpWithPhone: authStore.signUpWithPhone,
    signInWithPhone: authStore.signInWithPhone,
    signInWithEmail: authStore.signInWithEmail,
    verifyOtp: authStore.verifyOtp,
    linkEmail: authStore.linkEmail,
    linkPhone: authStore.linkPhone,
    signOut: authStore.signOut,
    loadUserProfile: authStore.loadUserProfile,
    updateUserProfile: authStore.updateUserProfile,
    createUserProfile: authStore.createUserProfile,
    clearError: authStore.clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Note: useAuth hook is defined above in this file