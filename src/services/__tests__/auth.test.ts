import { AuthService } from '../auth';
import { supabase } from '../supabase';

// Mock the supabase client
jest.mock('../supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error when sign in fails', async () => {
      const mockError = { message: 'Invalid credentials' };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Invalid credentials');
    });

    it('should handle unexpected errors', async () => {
      // Mock to reject multiple times to exhaust retries quickly
      mockSupabase.auth.signInWithPassword
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValue(new Error('Network error'));

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toEqual(new Error('Network error'));
    });
  });

  describe('signUp', () => {
    it('should sign up successfully with valid data', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: { name: 'Test User' },
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      });
    });

    it('should return error when sign up fails', async () => {
      const mockError = { message: 'Email already exists' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await authService.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Email already exists');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await authService.signOut();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should return error when sign out fails', async () => {
      const mockError = { message: 'Sign out failed' };

      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError });

      const result = await authService.signOut();

      expect(result.error).toEqual(new Error('Sign out failed'));
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when there is an error', async () => {
      const mockError = { message: 'Token expired' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentUserProfile', () => {
    it('should return user profile when user is authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
      };

      const mockProfile = {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        church_id: 'church-123',
        roles: ['member'],
        created_at: '2023-01-01T00:00:00Z',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockFrom as any);

      const result = await authService.getCurrentUserProfile();

      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.select).toHaveBeenCalledWith('*');
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockFrom.single).toHaveBeenCalled();
    });

    it('should return null when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUserProfile();

      expect(result).toBeNull();
    });
  });

  describe('createUserProfile', () => {
    it('should create user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        user_metadata: {},
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFrom = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockFrom as any);

      const result = await authService.createUserProfile({
        name: 'Test User',
        church_id: 'church-123',
      });

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockFrom.insert).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        church_id: 'church-123',
        service_id: undefined,
        roles: ['member'],
        created_at: expect.any(String),
      });
    });

    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.createUserProfile({
        name: 'Test User',
      });

      expect(result.error).toEqual(new Error('No authenticated user'));
    });
  });
});
