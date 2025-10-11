import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';

/**
 * Custom hook for authentication
 * Provides easy access to auth state and actions
 *
 * @deprecated Use useAuth from AuthProvider instead for new components
 */
export const useAuth = () => {
  const {
    user,
    userProfile,
    isLoading,
    isInitialized,
    error,
    // Password authentication removed
    signUpWithPhone,
    signInWithPhone,
    signInWithEmail,
    verifyOtp,
    linkEmail,
    linkPhone,
    signOut,
    loadUserProfile,
    updateUserProfile,
    createUserProfile,
    clearError,
    initialize,
  } = useAuthStore();

  // Initialize auth on first use
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Computed values
  const isAuthenticated = !!user;
  const hasProfile = !!userProfile;
  const needsOnboarding = isAuthenticated && !hasProfile;

  return {
    // State
    user,
    userProfile,
    isLoading,
    isInitialized,
    error,
    isAuthenticated,
    hasProfile,
    needsOnboarding,

    // Actions - password authentication removed
    signUpWithPhone,
    signInWithPhone,
    signInWithEmail,
    verifyOtp,
    linkEmail,
    linkPhone,
    signOut,
    loadUserProfile,
    updateUserProfile,
    createUserProfile,
    clearError,
  };
};
