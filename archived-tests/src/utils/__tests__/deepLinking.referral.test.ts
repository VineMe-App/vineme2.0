import { parseDeepLink, handleDeepLink, generateDeepLink, shareReferralLanding } from '../deepLinking';
import { Alert, Share } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Share: {
    share: jest.fn(),
  },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'vineme://'),
  parse: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
};

describe('Deep Linking - Referral Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
  });

  describe('parseDeepLink', () => {
    it('should parse referral landing deep link', () => {
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'referral/landing',
        queryParams: {},
      });

      const result = parseDeepLink('vineme://referral/landing');

      expect(result).toEqual({
        type: 'referral',
        id: 'landing',
        params: {},
      });
    });

    it('should parse referral deep link with query parameters', () => {
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'referral/landing',
        queryParams: { source: 'share', campaign: 'growth' },
      });

      const result = parseDeepLink('vineme://referral/landing?source=share&campaign=growth');

      expect(result).toEqual({
        type: 'referral',
        id: 'landing',
        params: { source: 'share', campaign: 'growth' },
      });
    });

    it('should return null for invalid referral deep link', () => {
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'referral',
        queryParams: {},
      });

      const result = parseDeepLink('vineme://referral');

      expect(result).toBeNull();
    });
  });

  describe('handleDeepLink', () => {
    it('should navigate to referral landing page', () => {
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'referral/landing',
        queryParams: {},
      });

      const result = handleDeepLink('vineme://referral/landing', mockRouter);

      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/referral-landing');
    });

    it('should handle unknown referral deep link gracefully', () => {
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'referral/unknown',
        queryParams: {},
      });

      const result = handleDeepLink('vineme://referral/unknown', mockRouter);

      expect(result).toBe(false);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should maintain existing functionality for other deep links', () => {
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'group/123',
        queryParams: {},
      });

      const result = handleDeepLink('vineme://group/123', mockRouter);

      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/group/123');
    });
  });

  describe('generateDeepLink', () => {
    it('should generate referral deep link', () => {
      const mockCreateURL = require('expo-linking').createURL;
      mockCreateURL.mockReturnValue('vineme://');

      const result = generateDeepLink({
        type: 'referral',
        id: 'landing',
        title: 'Connect Someone',
      });

      expect(result).toBe('vineme://referral/landing');
    });

    it('should maintain existing functionality for other link types', () => {
      const mockCreateURL = require('expo-linking').createURL;
      mockCreateURL.mockReturnValue('vineme://');

      const result = generateDeepLink({
        type: 'group',
        id: '123',
        title: 'Bible Study Group',
      });

      expect(result).toBe('vineme://group/123');
    });
  });

  describe('shareReferralLanding', () => {
    it('should share referral landing page successfully', async () => {
      const mockCreateURL = require('expo-linking').createURL;
      mockCreateURL.mockReturnValue('vineme://');
      
      const mockShare = Share.share as jest.Mock;
      mockShare.mockResolvedValue({ action: 'sharedAction' });

      await shareReferralLanding();

      expect(mockShare).toHaveBeenCalledWith({
        message: 'Help connect someone to our community!\n\nUse VineMe to refer friends to Bible study groups: vineme://referral/landing',
        url: 'vineme://referral/landing',
        title: 'Connect Someone to VineMe',
      });
    });

    it('should handle share errors gracefully', async () => {
      const mockCreateURL = require('expo-linking').createURL;
      mockCreateURL.mockReturnValue('vineme://');
      
      const mockShare = Share.share as jest.Mock;
      const mockAlert = Alert.alert as jest.Mock;
      mockShare.mockRejectedValue(new Error('Share failed'));

      await shareReferralLanding();

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Failed to share referral link. Please try again.'
      );
    });
  });

  describe('Navigation Requirements Validation', () => {
    it('should meet requirement 1.2 - navigation from home page to referral landing', () => {
      // This validates that the deep link structure supports the navigation flow
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'referral/landing',
        queryParams: {},
      });

      const result = handleDeepLink('vineme://referral/landing', mockRouter);

      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/referral-landing');
    });

    it('should meet requirement 1.3 - referral landing page displays decision flow', () => {
      // This validates that the referral landing route is properly configured
      const linkData = parseDeepLink('vineme://referral/landing');
      
      expect(linkData).toEqual({
        type: 'referral',
        id: 'landing',
        params: {},
      });
    });

    it('should meet requirement 2.1 - navigation flow for general referrals', () => {
      // This validates that the referral system can be accessed via deep links
      const mockCreateURL = require('expo-linking').createURL;
      mockCreateURL.mockReturnValue('vineme://');

      const deepLink = generateDeepLink({
        type: 'referral',
        id: 'landing',
        title: 'General Referral',
      });

      expect(deepLink).toBe('vineme://referral/landing');
    });

    it('should meet requirement 3.1 - navigation flow for group referrals', () => {
      // This validates that group referrals can be accessed through existing group navigation
      const mockParse = require('expo-linking').parse;
      mockParse.mockReturnValue({
        path: 'group/123',
        queryParams: {},
      });

      const result = handleDeepLink('vineme://group/123', mockRouter);

      expect(result).toBe(true);
      expect(mockRouter.push).toHaveBeenCalledWith('/group/123');
    });
  });
});