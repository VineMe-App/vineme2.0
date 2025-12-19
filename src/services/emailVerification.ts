import { supabase } from './supabase';
import { authService } from './auth';
import { handleSupabaseError, retryWithBackoff } from '../utils/errorHandling';

export interface EmailVerificationService {
  sendVerificationEmail(
    email: string,
    isReferral?: boolean
  ): Promise<EmailVerificationResult>;
  verifyEmailFromTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<EmailVerificationResult>;
  checkVerificationStatus(userId: string): Promise<boolean>;
  resendVerificationEmail(email: string): Promise<EmailVerificationResult>;
}

export interface EmailVerificationResult {
  success: boolean;
  error?: string;
  userId?: string;
}

export class EmailVerificationServiceImpl implements EmailVerificationService {
  /**
   * Send verification email to a user
   * Requirement 5.1: Send verification email to referred person's email address
   * Requirement 5.2: Include "verify email" link for account activation
   */
  async sendVerificationEmail(
    email: string,
    isReferral: boolean = false
  ): Promise<EmailVerificationResult> {
    try {
      const redirectUrl = this.buildVerificationRedirectUrl();

      const result = await retryWithBackoff(
        async () => {
          return await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                is_referral: isReferral,
              },
            },
          });
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 5000,
        }
      );

      if (result.error) {
        console.error('Failed to send verification email:', result.error);
        return {
          success: false,
          error: this.getEmailErrorMessage(result.error.message),
        };
      }

      console.log(`Verification email sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      const appError = handleSupabaseError(error as Error);
      return {
        success: false,
        error: appError.message || 'Failed to send verification email',
      };
    }
  }

  /**
   * Verify email using tokens from verification link
   * Requirement 5.3: Allow referred person to complete VineMe account setup
   * Requirement 5.4: Update user's status appropriately when verification is complete
   */
  async verifyEmailFromTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<EmailVerificationResult> {
    try {
      const result = await authService.handleEmailVerification(
        accessToken,
        refreshToken
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Email verification failed',
        };
      }

      return {
        success: true,
        userId: result.user?.id,
      };
    } catch (error) {
      console.error('Error verifying email from tokens:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Email verification failed',
      };
    }
  }

  /**
   * Check if a user's email is verified
   */
  async checkVerificationStatus(userId: string): Promise<boolean> {
    try {
      return await authService.isEmailVerified(userId);
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
    }
  }

  /**
   * Resend verification email for a user
   */
  async resendVerificationEmail(
    email: string
  ): Promise<EmailVerificationResult> {
    try {
      const result = await authService.resendVerificationEmail();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to resend verification email',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error resending verification email:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to resend verification email',
      };
    }
  }

  /**
   * Build the redirect URL for email verification
   */
  private buildVerificationRedirectUrl(): string {
    return 'vineme://auth/verify-email';
  }

  /**
   * Get user-friendly error message for email errors
   */
  private getEmailErrorMessage(errorMessage: string): string {
    const lowerError = errorMessage.toLowerCase();

    if (lowerError.includes('rate limit')) {
      return 'Too many verification emails sent. Please wait a few minutes before trying again.';
    }

    if (lowerError.includes('invalid email')) {
      return 'The email address is invalid. Please check and try again.';
    }

    if (lowerError.includes('user not found')) {
      return 'No account found with this email address.';
    }

    if (lowerError.includes('email already confirmed')) {
      return 'This email address has already been verified.';
    }

    if (lowerError.includes('network') || lowerError.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (lowerError.includes('service unavailable')) {
      return 'Email service is temporarily unavailable. Please try again later.';
    }

    // Default error message
    return 'Failed to send verification email. Please try again.';
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get verification email template data for referred users
   */
  private getReferralEmailTemplateData(referrerName?: string) {
    return {
      subject: 'Welcome to VineMe - Verify Your Email',
      greeting: referrerName
        ? `You've been invited to join VineMe by ${referrerName}!`
        : 'Welcome to VineMe!',
      instructions:
        'Click the link below to verify your email and complete your account setup.',
      callToAction: 'Verify Email & Get Started',
    };
  }
}

// Export singleton instance
export const emailVerificationService = new EmailVerificationServiceImpl();

// Export types for use in other modules
export type { EmailVerificationService, EmailVerificationResult };
