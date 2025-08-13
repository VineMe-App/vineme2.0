import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Keys for secure storage
export const SECURE_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_SESSION: 'user_session',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  LAST_AUTH_TIME: 'last_auth_time',
} as const;

export type SecureStorageKey =
  (typeof SECURE_STORAGE_KEYS)[keyof typeof SECURE_STORAGE_KEYS];

export interface SecureStorageOptions {
  requireAuthentication?: boolean;
  authenticationPrompt?: string;
}

class SecureStorageService {
  private isWeb = Platform.OS === 'web';

  /**
   * Store sensitive data securely
   */
  async setItem(
    key: SecureStorageKey,
    value: string,
    options: SecureStorageOptions = {}
  ): Promise<void> {
    try {
      if (this.isWeb) {
        // On web, use localStorage with encryption (in production, consider more secure alternatives)
        localStorage.setItem(key, this.encryptValue(value));
      } else {
        // On native, use Expo SecureStore
        await SecureStore.setItemAsync(key, value, {
          requireAuthentication: options.requireAuthentication || false,
          authenticationPrompt:
            options.authenticationPrompt ||
            'Authenticate to access secure data',
        });
      }
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      throw new Error(
        `Failed to store secure data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve sensitive data securely
   */
  async getItem(
    key: SecureStorageKey,
    options: SecureStorageOptions = {}
  ): Promise<string | null> {
    try {
      if (this.isWeb) {
        // On web, retrieve from localStorage and decrypt
        const encrypted = localStorage.getItem(key);
        return encrypted ? this.decryptValue(encrypted) : null;
      } else {
        // On native, use Expo SecureStore
        return await SecureStore.getItemAsync(key, {
          requireAuthentication: options.requireAuthentication || false,
          authenticationPrompt:
            options.authenticationPrompt ||
            'Authenticate to access secure data',
        });
      }
    } catch (error) {
      console.error(`Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove sensitive data
   */
  async removeItem(key: SecureStorageKey): Promise<void> {
    try {
      if (this.isWeb) {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error(`Failed to remove secure item ${key}:`, error);
      throw new Error(
        `Failed to remove secure data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if an item exists in secure storage
   */
  async hasItem(key: SecureStorageKey): Promise<boolean> {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Clear all secure storage items
   */
  async clearAll(): Promise<void> {
    try {
      const keys = Object.values(SECURE_STORAGE_KEYS);
      await Promise.all(keys.map((key) => this.removeItem(key)));
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      throw new Error(
        `Failed to clear secure storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store non-sensitive data (uses AsyncStorage)
   */
  async setNonSensitiveItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to store non-sensitive item ${key}:`, error);
      throw new Error(
        `Failed to store data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve non-sensitive data (uses AsyncStorage)
   */
  async getNonSensitiveItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to retrieve non-sensitive item ${key}:`, error);
      return null;
    }
  }

  /**
   * Simple encryption for web storage (not cryptographically secure, just obfuscation)
   * In production, use proper encryption libraries
   */
  private encryptValue(value: string): string {
    // Simple base64 encoding for basic obfuscation
    // In production, use proper encryption like crypto-js
    return btoa(value);
  }

  /**
   * Simple decryption for web storage
   */
  private decryptValue(encrypted: string): string {
    try {
      return atob(encrypted);
    } catch {
      return encrypted; // Return as-is if decryption fails
    }
  }

  /**
   * Check if biometric authentication is available
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (this.isWeb) return false;

    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Enable/disable biometric authentication for secure storage
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setItem(
      SECURE_STORAGE_KEYS.BIOMETRIC_ENABLED,
      enabled.toString()
    );
  }

  /**
   * Check if biometric authentication is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const value = await this.getItem(SECURE_STORAGE_KEYS.BIOMETRIC_ENABLED);
    return value === 'true';
  }

  /**
   * Store authentication session data securely
   */
  async storeAuthSession(sessionData: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }): Promise<void> {
    const biometricEnabled = await this.isBiometricEnabled();
    const options: SecureStorageOptions = biometricEnabled
      ? {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access your session',
        }
      : {};

    await Promise.all([
      this.setItem(
        SECURE_STORAGE_KEYS.AUTH_TOKEN,
        sessionData.accessToken,
        options
      ),
      sessionData.refreshToken
        ? this.setItem(
            SECURE_STORAGE_KEYS.REFRESH_TOKEN,
            sessionData.refreshToken,
            options
          )
        : Promise.resolve(),
      this.setItem(SECURE_STORAGE_KEYS.LAST_AUTH_TIME, Date.now().toString()),
    ]);
  }

  /**
   * Retrieve authentication session data
   */
  async getAuthSession(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    lastAuthTime: number | null;
  }> {
    const biometricEnabled = await this.isBiometricEnabled();
    const options: SecureStorageOptions = biometricEnabled
      ? {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to access your session',
        }
      : {};

    const [accessToken, refreshToken, lastAuthTimeStr] = await Promise.all([
      this.getItem(SECURE_STORAGE_KEYS.AUTH_TOKEN, options),
      this.getItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN, options),
      this.getItem(SECURE_STORAGE_KEYS.LAST_AUTH_TIME),
    ]);

    return {
      accessToken,
      refreshToken,
      lastAuthTime: lastAuthTimeStr ? parseInt(lastAuthTimeStr, 10) : null,
    };
  }

  /**
   * Clear authentication session data
   */
  async clearAuthSession(): Promise<void> {
    await Promise.all([
      this.removeItem(SECURE_STORAGE_KEYS.AUTH_TOKEN),
      this.removeItem(SECURE_STORAGE_KEYS.REFRESH_TOKEN),
      this.removeItem(SECURE_STORAGE_KEYS.LAST_AUTH_TIME),
    ]);
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageService();
