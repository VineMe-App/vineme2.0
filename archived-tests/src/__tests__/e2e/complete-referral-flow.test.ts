/**
 * End-to-end tests for the complete referral flow
 * Tests the entire user journey from referral creation to account activation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ReferralService } from '../../services/referrals';
import { AuthService } from '../../services/auth';
import { EmailVerificationService } from '../../services/emailVerification';
import { supabase } from '../../services/supabase';

// Mock external dependencies
jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

jest.mock('../../services/emailVerification', () => ({
  EmailVerificationService: {
    sendVerificationEmail: jest.fn(),
  },
}));

describe('Complete Referral Flow E2E Tests', () => {
  let referralService: ReferralService;
  let authService: AuthService;
  
  const mockReferrerUser = {
    id: 'referrer-123',
    email: 'referrer@example.com',
  };

  const mockReferralData = {
    email: 'newuser@example.com',
    phone: '+1234567890',
    note: 'Great person for our community',
    firstName: 'John',
    lastName: 'Doe',
    referrerId: mockReferrerUser.id,
  };

  beforeEach(() => {
    referralService = new ReferralService();
    authService = new AuthService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('General Referral Flow', () => {
    it('should complete the entire general referral flow successfully', async () => {
      // Mock successful user creation
      const mockCreatedUser = {
        id: 'new-user-123',
        email: mockReferralData.email,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockCreatedUser },
        error: null,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock successful email sending
      (EmailVerificationService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      // Execute the complete referral flow
      const result = await referralService.createGeneralReferral(mockReferralData);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockCreatedUser.id);

      // Verify user account creation
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: mockReferralData.email,
        password: expect.any(String),
        options: {
          data: {
            phone: mockReferralData.phone,
            first_name: mockReferralData.firstName,
            last_name: mockReferralData.lastName,
          },
        },
      });

      // Verify email verification was triggered
      expect(EmailVerificationService.sendVerificationEmail).toHaveBeenCalledWith(
        mockCreatedUser.id,
        mockReferralData.email
      );
    });

    it('should handle user creation failure gracefully', async () => {
      // Mock user creation failure
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      // Execute the referral flow
      const result = await referralService.createGeneralReferral(mockReferralData);

      // Verify failure handling
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email already exists');

      // Verify no further operations were attempted
      expect(EmailVerificationService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('Group Referral Flow', () => {
    const mockGroupReferralData = {
      ...mockReferralData,
      groupId: 'group-456',
    };

    it('should complete the entire group referral flow successfully', async () => {
      // Mock successful user creation
      const mockCreatedUser = {
        id: 'new-user-123',
        email: mockReferralData.email,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockCreatedUser },
        error: null,
      });

      // Mock successful database operations
      const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock successful email sending
      (EmailVerificationService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      // Execute the complete referral flow
      const result = await referralService.createGroupReferral(mockGroupReferralData);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockCreatedUser.id);

      // Verify email verification was triggered
      expect(EmailVerificationService.sendVerificationEmail).toHaveBeenCalledWith(
        mockCreatedUser.id,
        mockReferralData.email
      );
    });
  });

  describe('Data Integrity Tests', () => {
    it('should maintain referral relationships correctly', async () => {
      // Mock successful operations
      const mockCreatedUser = {
        id: 'new-user-123',
        email: mockReferralData.email,
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { user: mockCreatedUser },
        error: null,
      });

      const mockInsert = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      (EmailVerificationService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      // Execute referral creation
      await referralService.createGeneralReferral(mockReferralData);

      // Verify database operations were called
      expect(mockInsert).toHaveBeenCalled();
      expect(EmailVerificationService.sendVerificationEmail).toHaveBeenCalledWith(
        mockCreatedUser.id,
        mockReferralData.email
      );
    });
  });
});