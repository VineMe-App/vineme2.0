import { authService } from '@/services/auth';
import { supabase } from '@/services/supabase';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null })),
      })),
    })),
  },
}));

// Mock secure storage
jest.mock('@/utils/secureStorage', () => ({
  secureStorage: {
    storeAuthSession: jest.fn(),
    clearAuthSession: jest.fn(),
    getAuthSession: jest.fn(),
  },
}));

describe('Phone Authentication Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Phone Sign Up Flow', () => {
    it('should send OTP for phone sign up with shouldCreateUser: true', async () => {
      const mockPhone = '+14155551234';
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await authService.signUpWithPhone(mockPhone);

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: mockPhone,
        options: { shouldCreateUser: true },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone numbers', async () => {
      const result = await authService.signUpWithPhone('invalid-phone');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
      expect(supabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it('should handle Supabase errors during sign up', async () => {
      const mockPhone = '+14155551234';
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: { message: 'Phone number already exists' },
      });

      const result = await authService.signUpWithPhone(mockPhone);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number already exists');
    });
  });

  describe('Phone Sign In Flow', () => {
    it('should send OTP for phone sign in with shouldCreateUser: false', async () => {
      const mockPhone = '+14155551234';
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await authService.signInWithPhone(mockPhone);

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        phone: mockPhone,
        options: { shouldCreateUser: false },
      });
      expect(result.success).toBe(true);
    });

    it('should handle user not found error', async () => {
      const mockPhone = '+14155551234';
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: { message: 'User not found' },
      });

      const result = await authService.signInWithPhone(mockPhone);

      expect(result.success).toBe(false);
      expect(result.userNotFound).toBe(true);
      expect(result.error).toContain("This phone isn't linked yet");
    });
  });

  describe('Email Sign In Flow', () => {
    it('should send magic link for email sign in with shouldCreateUser: false', async () => {
      const mockEmail = 'test@example.com';
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: null,
      });

      const result = await authService.signInWithEmail(mockEmail);

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: mockEmail,
        options: { 
          shouldCreateUser: false,
          emailRedirectTo: 'vineme://auth/verify-email'
        },
      });
      expect(result.success).toBe(true);
    });

    it('should handle user not found error', async () => {
      const mockEmail = 'test@example.com';
      (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
        error: { message: 'User not found' },
      });

      const result = await authService.signInWithEmail(mockEmail);

      expect(result.success).toBe(false);
      expect(result.userNotFound).toBe(true);
      expect(result.error).toContain("This email isn't linked yet");
    });
  });

  describe('OTP Verification', () => {
    it('should verify SMS OTP with 4-digit code', async () => {
      const mockPhone = '+14155551234';
      const mockCode = '1234';
      const mockUser = { id: 'user-123', phone: mockPhone };
      const mockSession = { 
        access_token: 'token', 
        refresh_token: 'refresh', 
        expires_at: 123456789,
        user: mockUser 
      };

      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.verifyOtp(mockPhone, mockCode, 'sms');

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        phone: mockPhone,
        token: mockCode,
        type: 'sms',
      });
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should verify email OTP with 6-digit code', async () => {
      const mockEmail = 'test@example.com';
      const mockCode = '123456';
      const mockUser = { id: 'user-123', email: mockEmail };
      const mockSession = { 
        access_token: 'token', 
        refresh_token: 'refresh', 
        expires_at: 123456789,
        user: mockUser 
      };

      (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await authService.verifyOtp(mockEmail, mockCode, 'email');

      expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: mockEmail,
        token: mockCode,
        type: 'email',
      });
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should reject invalid SMS code length', async () => {
      const result = await authService.verifyOtp('+14155551234', '123', 'sms');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Enter the 4-digit code');
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('should reject invalid email code length', async () => {
      const result = await authService.verifyOtp('test@example.com', '12345', 'email');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Enter the 6-digit code');
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });

    it('should reject invalid phone format in SMS verifyOtp', async () => {
      const result = await authService.verifyOtp('invalid-phone', '1234', 'sms');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number format');
      expect(supabase.auth.verifyOtp).not.toHaveBeenCalled();
    });
  });

  describe('Phone Normalization', () => {
    it('should accept properly formatted E.164 numbers', async () => {
      const validPhones = [
        '+14155551234',
        '+442071234567',
        '+33123456789',
      ];

      for (const phone of validPhones) {
        (supabase.auth.signInWithOtp as jest.Mock).mockResolvedValue({
          error: null,
        });

        const result = await authService.signUpWithPhone(phone);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid phone formats', async () => {
      const invalidPhones = [
        '4155551234',     // Missing +
        '+1415555',       // Too short
        'invalid',        // Not a number
        '',               // Empty
        '+',              // Just +
      ];

      for (const phone of invalidPhones) {
        const result = await authService.signUpWithPhone(phone);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid phone number format');
      }
    });
  });

  describe('Credential Linking', () => {
    it('should link email to authenticated user without verification', async () => {
      const mockEmail = 'test@example.com';
      const mockUser = { id: 'user-123' };
      
      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        error: null,
      });
      
      // Mock getCurrentUser
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser as any);

      const result = await authService.linkEmail(mockEmail);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        email: mockEmail
      });
      expect(result.success).toBe(true);
    });

    it('should link phone to authenticated user and update public table', async () => {
      const mockPhone = '+14155551234';
      const mockUser = { id: 'user-123' };
      
      (supabase.auth.updateUser as jest.Mock).mockResolvedValue({
        error: null,
      });
      
      // Mock getCurrentUser
      jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser as any);

      const result = await authService.linkPhone(mockPhone);

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        phone: mockPhone,
      });
      expect(result.success).toBe(true);
    });
  });
});