import { emailVerificationService } from '../emailVerification';
import { authService } from '../auth';
import { supabase } from '../supabase';

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      resend: jest.fn(),
    },
  },
}));

jest.mock('../auth', () => ({
  authService: {
    handleEmailVerification: jest.fn(),
    isEmailVerified: jest.fn(),
    resendVerificationEmail: jest.fn(),
  },
}));

jest.mock('../../utils/errorHandling', () => ({
  handleSupabaseError: jest.fn((error) => error),
  retryWithBackoff: jest.fn((fn) => fn()),
}));

describe('EmailVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      // Mock successful email send
      (supabase.auth.resend as jest.Mock).mockResolvedValue({ error: null });

      const result = await emailVerificationService.sendVerificationEmail(
        'test@example.com',
        true
      );

      expect(result.success).toBe(true);
      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'vineme://auth/verify-email',
          data: {
            is_referral: true,
          },
        },
      });
    });

    it('should handle email send failure', async () => {
      // Mock email send failure
      (supabase.auth.resend as jest.Mock).mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      const result =
        await emailVerificationService.sendVerificationEmail(
          'test@example.com'
        );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many verification emails sent');
    });

    it('should handle network errors', async () => {
      // Mock network error
      (supabase.auth.resend as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const result =
        await emailVerificationService.sendVerificationEmail(
          'test@example.com'
        );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyEmailFromTokens', () => {
    it('should verify email successfully', async () => {
      // Mock successful verification
      (authService.handleEmailVerification as jest.Mock).mockResolvedValue({
        success: true,
        user: { id: 'user-123' },
      });

      const result = await emailVerificationService.verifyEmailFromTokens(
        'access-token',
        'refresh-token'
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(authService.handleEmailVerification).toHaveBeenCalledWith(
        'access-token',
        'refresh-token'
      );
    });

    it('should handle verification failure', async () => {
      // Mock verification failure
      (authService.handleEmailVerification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid tokens',
      });

      const result = await emailVerificationService.verifyEmailFromTokens(
        'invalid-token',
        'invalid-refresh'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid tokens');
    });
  });

  describe('checkVerificationStatus', () => {
    it('should return verification status', async () => {
      // Mock verification status check
      (authService.isEmailVerified as jest.Mock).mockResolvedValue(true);

      const result =
        await emailVerificationService.checkVerificationStatus('user-123');

      expect(result).toBe(true);
      expect(authService.isEmailVerified).toHaveBeenCalledWith('user-123');
    });

    it('should handle errors gracefully', async () => {
      // Mock error
      (authService.isEmailVerified as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result =
        await emailVerificationService.checkVerificationStatus('user-123');

      expect(result).toBe(false);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email successfully', async () => {
      // Mock successful resend
      (authService.resendVerificationEmail as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result =
        await emailVerificationService.resendVerificationEmail(
          'test@example.com'
        );

      expect(result.success).toBe(true);
      expect(authService.resendVerificationEmail).toHaveBeenCalled();
    });

    it('should handle resend failure', async () => {
      // Mock resend failure
      (authService.resendVerificationEmail as jest.Mock).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result =
        await emailVerificationService.resendVerificationEmail(
          'test@example.com'
        );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('error message handling', () => {
    it('should provide user-friendly error messages', async () => {
      const testCases = [
        {
          error: 'Rate limit exceeded',
          expected: 'Too many verification emails sent',
        },
        {
          error: 'Invalid email format',
          expected: 'The email address is invalid',
        },
        {
          error: 'User not found',
          expected: 'No account found with this email address',
        },
        {
          error: 'Email already confirmed',
          expected: 'This email address has already been verified',
        },
        {
          error: 'Network timeout',
          expected: 'Network error',
        },
        {
          error: 'Service unavailable',
          expected: 'Email service is temporarily unavailable',
        },
      ];

      for (const testCase of testCases) {
        (supabase.auth.resend as jest.Mock).mockResolvedValue({
          error: { message: testCase.error },
        });

        const result =
          await emailVerificationService.sendVerificationEmail(
            'test@example.com'
          );

        expect(result.success).toBe(false);
        expect(result.error).toContain(testCase.expected);
      }
    });
  });
});
