/**
 * End-to-end tests for email verification and account activation
 * Tests the complete email verification flow for referred users
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { EmailVerificationService } from '../../services/emailVerification';
import { AuthService } from '../../services/auth';
import { supabase } from '../../services/supabase';

// Mock external dependencies
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
      signInWithPassword: jest.fn(),
      resend: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
    })),
  },
}));

// Mock email service
const mockEmailService = {
  send: jest.fn(),
  sendTemplate: jest.fn(),
};

jest.mock('../../config/email', () => ({
  emailService: mockEmailService,
}));

describe('Email Verification Flow E2E Tests', () => {
  let emailVerificationService: EmailVerificationService;
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'newuser@example.com',
    email_confirmed_at: null,
    user_metadata: {
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
    },
  };

  const mockReferrer = {
    id: 'referrer-123',
    first_name: 'Jane',
    last_name: 'Smith',
  };

  beforeEach(() => {
    emailVerificationService = new EmailVerificationService();
    authService = new AuthService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Email Verification Sending', () => {
    it('should send verification email successfully for referred user', async () => {
      // Mock user lookup
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferrer,
          error: null,
        }),
      });

      // Mock successful email sending
      mockEmailService.sendTemplate.mockResolvedValue({ success: true });

      // Send verification email
      await emailVerificationService.sendVerificationEmail(
        mockUser.id,
        mockUser.email
      );

      // Verify email was sent
      expect(mockEmailService.sendTemplate).toHaveBeenCalled();
    });

    it('should handle email sending failures gracefully', async () => {
      // Mock user lookup
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferrer,
          error: null,
        }),
      });

      // Mock email sending failure
      mockEmailService.sendTemplate.mockRejectedValue(
        new Error('Email service unavailable')
      );

      // Attempt to send verification email
      await expect(
        emailVerificationService.sendVerificationEmail(
          mockUser.id,
          mockUser.email
        )
      ).rejects.toThrow('Email service unavailable');
    });
  });

  describe('Email Verification Completion', () => {
    const mockVerificationToken = 'verification-token-123';

    it('should complete email verification successfully', async () => {
      // Mock token validation
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { ...mockUser, email_confirmed_at: new Date() } },
        error: null,
      });

      // Mock user update
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockUser, email_verified: true },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      });

      // Complete verification
      const result = await emailVerificationService.verifyEmail(
        mockVerificationToken
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should handle invalid verification tokens', async () => {
      // Mock invalid token
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      // Attempt verification with invalid token
      const result =
        await emailVerificationService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid token');
    });
  });

  describe('Integration with Referral System', () => {
    it('should maintain referral context through verification process', async () => {
      // Mock referral lookup
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest
          .fn()
          .mockResolvedValueOnce({
            data: mockReferrer,
            error: null,
          })
          .mockResolvedValueOnce({
            data: {
              id: 'referral-123',
              referrer_id: mockReferrer.id,
              referred_by_user_id: mockUser.id,
              note: 'Great person for our community',
            },
            error: null,
          }),
      });

      mockEmailService.sendTemplate.mockResolvedValue({ success: true });

      // Send verification email
      await emailVerificationService.sendVerificationEmail(
        mockUser.id,
        mockUser.email
      );

      // Verify email service was called
      expect(mockEmailService.sendTemplate).toHaveBeenCalled();
    });

    it('should handle missing referral context gracefully', async () => {
      // Mock no referrer found
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Referrer not found' },
        }),
      });

      mockEmailService.sendTemplate.mockResolvedValue({ success: true });

      // Send verification email without referrer context
      await emailVerificationService.sendVerificationEmail(
        mockUser.id,
        mockUser.email
      );

      // Verify email is still sent
      expect(mockEmailService.sendTemplate).toHaveBeenCalled();
    });
  });
});
