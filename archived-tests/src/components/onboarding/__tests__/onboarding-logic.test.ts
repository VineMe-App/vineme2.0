import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEYS,
  COMMON_INTERESTS,
  MEETING_NIGHTS,
} from '@/utils/constants';
import type { OnboardingData } from '@/types/app';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Onboarding Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Validation', () => {
    it('should validate name correctly', () => {
      const validateName = (name: string): string | null => {
        if (!name.trim()) {
          return 'Name is required';
        }
        if (name.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (name.trim().length > 50) {
          return 'Name must be less than 50 characters';
        }
        return null;
      };

      expect(validateName('')).toBe('Name is required');
      expect(validateName('   ')).toBe('Name is required');
      expect(validateName('A')).toBe('Name must be at least 2 characters');
      expect(validateName('A'.repeat(51))).toBe(
        'Name must be less than 50 characters'
      );
      expect(validateName('John Doe')).toBeNull();
      expect(validateName('  John Doe  ')).toBeNull();
    });

    it('should validate interests selection', () => {
      const validateInterests = (interests: string[]): string | null => {
        if (interests.length === 0) {
          return 'Select at least one interest to continue';
        }
        return null;
      };

      expect(validateInterests([])).toBe(
        'Select at least one interest to continue'
      );
      expect(validateInterests(['Bible Study'])).toBeNull();
      expect(validateInterests(['Bible Study', 'Prayer'])).toBeNull();
    });

    it('should validate meeting night selection', () => {
      const validateMeetingNight = (night: string): string | null => {
        if (!night) {
          return 'Select your preferred meeting night';
        }
        const validNights = MEETING_NIGHTS.map((n) => n.value);
        if (!validNights.includes(night)) {
          return 'Invalid meeting night selected';
        }
        return null;
      };

      expect(validateMeetingNight('')).toBe(
        'Select your preferred meeting night'
      );
      expect(validateMeetingNight('invalid')).toBe(
        'Invalid meeting night selected'
      );
      expect(validateMeetingNight('wednesday')).toBeNull();
      expect(validateMeetingNight('sunday')).toBeNull();
    });

    it('should validate group status selection', () => {
      const validateGroupStatus = (status: string): string | null => {
        if (!status) {
          return 'Please select your group status';
        }
        const validStatuses = ['existing', 'looking'];
        if (!validStatuses.includes(status)) {
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
    it('should save onboarding data to AsyncStorage', async () => {
      const saveOnboardingData = async (data: OnboardingData) => {
        await AsyncStorage.setItem(
          STORAGE_KEYS.ONBOARDING_DATA,
          JSON.stringify(data)
        );
      };

      const testData: OnboardingData = {
        name: 'John Doe',
        church_id: 'church-123',
        interests: ['Bible Study', 'Prayer'],
        preferred_meeting_night: 'wednesday',
        group_status: 'looking',
      };

      mockAsyncStorage.setItem.mockResolvedValue();

      await saveOnboardingData(testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING_DATA,
        JSON.stringify(testData)
      );
    });

    it('should load onboarding data from AsyncStorage', async () => {
      const loadOnboardingData = async (): Promise<OnboardingData | null> => {
        try {
          const savedData = await AsyncStorage.getItem(
            STORAGE_KEYS.ONBOARDING_DATA
          );
          if (savedData) {
            return JSON.parse(savedData);
          }
          return null;
        } catch {
          return null;
        }
      };

      const testData: OnboardingData = {
        name: 'John Doe',
        church_id: 'church-123',
        interests: ['Bible Study'],
        preferred_meeting_night: 'wednesday',
        group_status: 'existing',
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(testData));

      const result = await loadOnboardingData();

      expect(result).toEqual(testData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING_DATA
      );
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      const loadOnboardingData = async (): Promise<OnboardingData | null> => {
        try {
          const savedData = await AsyncStorage.getItem(
            STORAGE_KEYS.ONBOARDING_DATA
          );
          if (savedData) {
            return JSON.parse(savedData);
          }
          return null;
        } catch {
          return null;
        }
      };

      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await loadOnboardingData();

      expect(result).toBeNull();
    });

    it('should clear onboarding data after completion', async () => {
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

  describe('Data Processing', () => {
    it('should process onboarding data correctly', () => {
      const processOnboardingData = (data: OnboardingData) => {
        return {
          name: data.name.trim(),
          church_id: data.church_id || undefined,
          interests: data.interests.filter((interest) =>
            COMMON_INTERESTS.includes(interest as any)
          ),
          preferred_meeting_night: data.preferred_meeting_night,
        };
      };

      const inputData: OnboardingData = {
        name: '  John Doe  ',
        church_id: 'church-123',
        interests: ['Bible Study', 'Invalid Interest', 'Prayer'],
        preferred_meeting_night: 'wednesday',
        group_status: 'looking',
      };

      const result = processOnboardingData(inputData);

      expect(result.name).toBe('John Doe');
      expect(result.church_id).toBe('church-123');
      expect(result.interests).toEqual(['Bible Study', 'Prayer']);
      expect(result.preferred_meeting_night).toBe('wednesday');
    });

    it('should handle empty church_id', () => {
      const processOnboardingData = (data: OnboardingData) => {
        return {
          name: data.name.trim(),
          church_id: data.church_id || undefined,
          interests: data.interests,
          preferred_meeting_night: data.preferred_meeting_night,
        };
      };

      const inputData: OnboardingData = {
        name: 'John Doe',
        church_id: undefined,
        interests: ['Bible Study'],
        preferred_meeting_night: 'wednesday',
        group_status: 'existing',
      };

      const result = processOnboardingData(inputData);

      expect(result.church_id).toBeUndefined();
    });
  });

  describe('Step Navigation', () => {
    it('should calculate progress correctly', () => {
      const calculateProgress = (
        currentStep: number,
        totalSteps: number
      ): number => {
        return ((currentStep + 1) / totalSteps) * 100;
      };

      expect(calculateProgress(0, 5)).toBe(20);
      expect(calculateProgress(1, 5)).toBe(40);
      expect(calculateProgress(2, 5)).toBe(60);
      expect(calculateProgress(3, 5)).toBe(80);
      expect(calculateProgress(4, 5)).toBe(100);
    });

    it('should determine newcomer status correctly', () => {
      const determineNewcomerStatus = (
        groupStatus?: 'existing' | 'looking'
      ): boolean => {
        return groupStatus === 'looking';
      };

      expect(determineNewcomerStatus('looking')).toBe(true);
      expect(determineNewcomerStatus('existing')).toBe(false);
      expect(determineNewcomerStatus(undefined)).toBe(false);
    });

    it('should determine if step is complete', () => {
      const isStepComplete = (
        stepId: string,
        data: OnboardingData
      ): boolean => {
        switch (stepId) {
          case 'name':
            return data.name.trim().length >= 2;
          case 'church':
            return true; // Church selection is optional
          case 'interests':
            return data.interests.length > 0;
          case 'group-status':
            return (
              data.group_status === 'existing' ||
              data.group_status === 'looking'
            );
          case 'meeting-night':
            return data.preferred_meeting_night !== '';
          default:
            return false;
        }
      };

      const completeData: OnboardingData = {
        name: 'John Doe',
        church_id: 'church-123',
        interests: ['Bible Study'],
        preferred_meeting_night: 'wednesday',
        group_status: 'looking',
      };

      const incompleteData: OnboardingData = {
        name: '',
        church_id: undefined,
        interests: [],
        preferred_meeting_night: '',
        group_status: undefined,
      };

      expect(isStepComplete('name', completeData)).toBe(true);
      expect(isStepComplete('church', completeData)).toBe(true);
      expect(isStepComplete('group-status', completeData)).toBe(true);
      expect(isStepComplete('interests', completeData)).toBe(true);
      expect(isStepComplete('meeting-night', completeData)).toBe(true);

      expect(isStepComplete('name', incompleteData)).toBe(false);
      expect(isStepComplete('church', incompleteData)).toBe(true); // Optional
      expect(isStepComplete('group-status', incompleteData)).toBe(false);
      expect(isStepComplete('interests', incompleteData)).toBe(false);
      expect(isStepComplete('meeting-night', incompleteData)).toBe(false);
    });
  });
});
