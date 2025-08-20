import { secureStorage, SECURE_STORAGE_KEYS } from '../secureStorage';

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock window for web detection
let mockWindow: any = undefined;

// Mock localStorage for web
const mockLocalStorage = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock btoa/atob for web encryption
Object.defineProperty(global, 'btoa', {
  value: jest.fn((str: string) => Buffer.from(str).toString('base64')),
  writable: true,
});

Object.defineProperty(global, 'atob', {
  value: jest.fn((str: string) => Buffer.from(str, 'base64').toString()),
  writable: true,
});

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('SecureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window mock to simulate native environment by default
    mockWindow = undefined;
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true,
    });
  });

  describe('Native Environment', () => {
    it('should store items using SecureStore on native', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();

      await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, 'test-token');

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        'test-token',
        {
          requireAuthentication: false,
          authenticationPrompt: 'Authenticate to access secure data',
        }
      );
    });

    it('should retrieve items using SecureStore on native', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('test-token');

      const result = await secureStorage.getItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );

      expect(result).toBe('test-token');
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        {
          requireAuthentication: false,
          authenticationPrompt: 'Authenticate to access secure data',
        }
      );
    });

    it('should remove items using SecureStore on native', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      await secureStorage.removeItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );
    });

    it('should handle biometric authentication options', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();
      mockSecureStore.getItemAsync.mockResolvedValue('true');

      // Enable biometric authentication
      await secureStorage.setBiometricEnabled(true);

      // Store with biometric authentication
      await secureStorage.setItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        'test-token',
        {
          requireAuthentication: true,
          authenticationPrompt: 'Custom prompt',
        }
      );

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        'test-token',
        {
          requireAuthentication: true,
          authenticationPrompt: 'Custom prompt',
        }
      );
    });
  });

  describe('Web Environment', () => {
    beforeEach(() => {
      // Simulate web environment
      mockWindow = {};
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should store items using localStorage on web', async () => {
      await secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, 'test-token');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        expect.any(String) // encrypted value
      );
      expect(global.btoa).toHaveBeenCalledWith('test-token');
    });

    it('should retrieve items using localStorage on web', async () => {
      const encryptedValue = Buffer.from('test-token').toString('base64');
      mockLocalStorage.getItem.mockReturnValue(encryptedValue);

      const result = await secureStorage.getItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );

      expect(result).toBe('test-token');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );
      expect(global.atob).toHaveBeenCalledWith(encryptedValue);
    });

    it('should remove items using localStorage on web', async () => {
      await secureStorage.removeItem(SECURE_STORAGE_KEYS.AUTH_TOKEN);

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );
    });

    it('should return false for biometric availability on web', async () => {
      const result = await secureStorage.isBiometricAvailable();
      expect(result).toBe(false);
    });
  });

  describe('Authentication Session Management', () => {
    beforeEach(() => {
      // Reset to native environment
      mockWindow = undefined;
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should store authentication session data', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue();
      mockSecureStore.getItemAsync.mockResolvedValue('false'); // biometric disabled

      const sessionData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: 1234567890,
      };

      await secureStorage.storeAuthSession(sessionData);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        'access-token',
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.REFRESH_TOKEN,
        'refresh-token',
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.LAST_AUTH_TIME,
        expect.any(String),
        undefined
      );
    });

    it('should retrieve authentication session data', async () => {
      mockSecureStore.getItemAsync
        .mockResolvedValueOnce('false') // biometric disabled
        .mockResolvedValueOnce('access-token') // auth token
        .mockResolvedValueOnce('refresh-token') // refresh token
        .mockResolvedValueOnce('1234567890'); // last auth time

      const result = await secureStorage.getAuthSession();

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        lastAuthTime: 1234567890,
      });
    });

    it('should clear authentication session data', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue();

      await secureStorage.clearAuthSession();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.REFRESH_TOKEN
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.LAST_AUTH_TIME
      );
    });
  });

  describe('Non-sensitive Data', () => {
    it('should store non-sensitive data using AsyncStorage', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await secureStorage.setNonSensitiveItem('test-key', 'test-value');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        'test-value'
      );
    });

    it('should retrieve non-sensitive data using AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('test-value');

      const result = await secureStorage.getNonSensitiveItem('test-key');

      expect(result).toBe('test-value');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Reset to native environment
      mockWindow = undefined;
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should handle SecureStore errors gracefully', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(
        new Error('SecureStore error')
      );

      await expect(
        secureStorage.setItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, 'test-token')
      ).rejects.toThrow('Failed to store secure data');
    });

    it('should return null when retrieval fails', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(
        new Error('SecureStore error')
      );

      const result = await secureStorage.getItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );

      expect(result).toBeNull();
    });

    it('should handle clear all errors', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(
        new Error('Delete error')
      );

      await expect(secureStorage.clearAll()).rejects.toThrow(
        'Failed to clear secure storage'
      );
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      // Reset to native environment
      mockWindow = undefined;
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true,
      });
    });

    it('should check if item exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('test-value');

      const result = await secureStorage.hasItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );

      expect(result).toBe(true);
    });

    it('should return false when item does not exist', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await secureStorage.hasItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN
      );

      expect(result).toBe(false);
    });

    it('should check biometric availability', async () => {
      mockSecureStore.isAvailableAsync.mockResolvedValue(true);

      const result = await secureStorage.isBiometricAvailable();

      expect(result).toBe(true);
    });
  });
});
