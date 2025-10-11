import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';
import type { OnboardingData } from '@/types/app';

jest.mock('@react-native-async-storage/async-storage');
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Onboarding Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Validation', () => {
    it('validates name correctly', () => {
      const validateName = (name: string): string | null => {
        if (!name.trim()) return 'Name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        if (name.trim().length > 50)
          return 'Name must be less than 50 characters';
        return null;
      };

      expect(validateName('')).toBe('Name is required');
      expect(validateName(' ')).toBe('Name is required');
      expect(validateName('A')).toBe('Name must be at least 2 characters');
      expect(validateName('A'.repeat(51))).toBe(
        'Name must be less than 50 characters'
      );
      expect(validateName('John Doe')).toBeNull();
    });

    it('validates group status selection', () => {
      const validateGroupStatus = (status: string): string | null => {
        if (!status) return 'Please select your group status';
        if (!['existing', 'looking'].includes(status)) {
          return 'Invalid group status selected';
        }
        return null;
      };

      expect(validateGroupStatus('')).toBe('Please select your group status');
      expect(validateGroupStatus('invalid')).toBe(
        'Invalid group status selected'
      );
      expect(validateGroupStatus('existing')).toBeNull();
      expect(validateGroupStatus('looking')).toBeNull();
    });
  });

  describe('Data Storage', () => {
    it('saves onboarding data to AsyncStorage', async () => {
      const saveOnboardingData = async (data: OnboardingData) => {
        await AsyncStorage.setItem(
          STORAGE_KEYS.ONBOARDING_DATA,
          JSON.stringify(data)
        );
      };

      const testData: OnboardingData = {
        name: 'John Doe',
        church_id: 'church-123',
        service_id: 'service-456',
        group_status: 'looking',
      };

      mockAsyncStorage.setItem.mockResolvedValue();

      await saveOnboardingData(testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING_DATA,
        JSON.stringify(testData)
      );
    });

    it('loads onboarding data from AsyncStorage', async () => {
      const loadOnboardingData = async (): Promise<OnboardingData | null> => {
        try {
          const savedData = await AsyncStorage.getItem(
            STORAGE_KEYS.ONBOARDING_DATA
          );
          if (savedData) return JSON.parse(savedData);
          return null;
        } catch {
          return null;
        }
      };

      const testData: OnboardingData = {
        name: 'Jane Doe',
        church_id: 'church-999',
        service_id: 'service-888',
        group_status: 'existing',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const result = await loadOnboardingData();

      expect(result).toEqual(testData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING_DATA
      );
    });

    it('clears onboarding data after completion', async () => {
      const clearOnboardingData = async () => {
        await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      };

      mockAsyncStorage.removeItem.mockResolvedValue();
      mockAsyncStorage.setItem.mockResolvedValue();

      await clearOnboardingData();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING_DATA
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        'true'
      );
    });
  });

  describe('Step Navigation', () => {
    it('calculates progress correctly', () => {
      const calculateProgress = (
        currentStep: number,
        totalSteps: number
      ): number => {
        return ((currentStep + 1) / totalSteps) * 100;
      };

      expect(calculateProgress(0, 4)).toBe(25);
      expect(calculateProgress(1, 4)).toBe(50);
      expect(calculateProgress(2, 4)).toBe(75);
      expect(calculateProgress(3, 4)).toBe(100);
    });

    it('determines newcomer status based on group status', () => {
      const determineNewcomerStatus = (
        groupStatus?: 'existing' | 'looking'
      ): boolean => {
        return groupStatus === 'looking';
      };

      expect(determineNewcomerStatus('looking')).toBe(true);
      expect(determineNewcomerStatus('existing')).toBe(false);
      expect(determineNewcomerStatus(undefined)).toBe(false);
    });

    it('determines if a step is complete', () => {
      const isStepComplete = (
        stepId: string,
        data: OnboardingData
      ): boolean => {
        switch (stepId) {
          case 'name':
            return data.name.trim().length >= 2;
          case 'email':
            return true; // email is handled via Supabase and not stored locally
          case 'church':
            return Boolean(data.church_id && data.service_id);
          case 'group-status':
            return (
              data.group_status === 'existing' ||
              data.group_status === 'looking'
            );
          default:
            return false;
        }
      };

      const completeData: OnboardingData = {
        name: 'John Doe',
        church_id: 'church-123',
        service_id: 'service-456',
        group_status: 'looking',
      };

      const incompleteData: OnboardingData = {
        name: '',
        church_id: undefined,
        service_id: undefined,
        group_status: undefined,
      };

      expect(isStepComplete('name', completeData)).toBe(true);
      expect(isStepComplete('email', completeData)).toBe(true);
      expect(isStepComplete('church', completeData)).toBe(true);
      expect(isStepComplete('group-status', completeData)).toBe(true);

      expect(isStepComplete('name', incompleteData)).toBe(false);
      expect(isStepComplete('email', incompleteData)).toBe(true);
      expect(isStepComplete('church', incompleteData)).toBe(false);
      expect(isStepComplete('group-status', incompleteData)).toBe(false);
    });
  });
});
