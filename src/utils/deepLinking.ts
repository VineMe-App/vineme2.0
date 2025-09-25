import * as Linking from 'expo-linking';
import { Share, Alert } from 'react-native';

export interface DeepLinkData {
  type: 'group' | 'event' | 'auth' | 'referral' | 'notifications';
  id: string;
  title?: string;
  params?: Record<string, any>;
}

/**
 * Generate a deep link URL for sharing
 */
export const generateDeepLink = (data: DeepLinkData): string => {
  const baseUrl = Linking.createURL('');

  switch (data.type) {
    case 'group':
      return `${baseUrl}group/${data.id}`;
    case 'event':
      return `${baseUrl}event/${data.id}`;
    case 'referral':
      return `${baseUrl}referral/${data.id}`;
    case 'notifications':
      return `${baseUrl}notifications`;
    default:
      return baseUrl;
  }
};

/**
 * Share a group with others
 */
export const shareGroup = async (groupId: string, groupTitle: string) => {
  try {
    const deepLink = generateDeepLink({
      type: 'group',
      id: groupId,
      title: groupTitle,
    });
    // Use a web URL for messaging apps like WhatsApp so links are clickable
    const webUrl = generateWebUrl({ type: 'group', id: groupId, title: groupTitle });

    const shareOptions = {
      message: `Check out this Bible study group: ${groupTitle}\n\nOpen on the web: ${webUrl}`,
      url: webUrl,
      title: `Join ${groupTitle} on VineMe`,
    };

    await Share.share(shareOptions);
  } catch (error) {
    console.error('Error sharing group:', error);
    Alert.alert('Error', 'Failed to share group. Please try again.');
  }
};

/**
 * Share an event with others
 */
export const shareEvent = async (
  eventId: string,
  eventTitle: string,
  eventDate?: string
) => {
  try {
    const deepLink = generateDeepLink({
      type: 'event',
      id: eventId,
      title: eventTitle,
    });

    const dateText = eventDate
      ? `\nDate: ${new Date(eventDate).toLocaleDateString()}`
      : '';

    const shareOptions = {
      message: `Check out this church event: ${eventTitle}${dateText}\n\nView details on VineMe: ${deepLink}`,
      url: deepLink,
      title: `${eventTitle} - VineMe`,
    };

    await Share.share(shareOptions);
  } catch (error) {
    console.error('Error sharing event:', error);
    Alert.alert('Error', 'Failed to share event. Please try again.');
  }
};

/**
 * Parse incoming deep link and extract data
 */
export const parseDeepLink = (url: string): DeepLinkData | null => {
  try {
    const { path, queryParams } = Linking.parse(url);

    if (!path) return null;

    const segments = path.split('/').filter(Boolean);

    // Handle auth links: vineme://auth/verify-email
    if (segments.length >= 2 && segments[0] === 'auth') {
      const [, id] = segments;
      return { 
        type: 'auth', 
        id,
        params: queryParams 
      };
    }

    // Handle referral landing page: vineme://referral/landing
    if (segments.length >= 2 && segments[0] === 'referral') {
      const [, id] = segments;
      return { 
        type: 'referral', 
        id,
        params: queryParams 
      };
    }

    // Handle notifications
    if (segments.length >= 1 && segments[0] === 'notifications') {
      return { type: 'notifications', id: 'inbox' };
    }

    // Handle group and event links
    if (segments.length >= 2) {
      const [type, id] = segments;

      if ((type === 'group' || type === 'event') && id) {
        return { type, id };
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing deep link:', error);
    return null;
  }
};

/**
 * Handle incoming deep link navigation
 */
export const handleDeepLink = (url: string, router: any) => {
  const linkData = parseDeepLink(url);

  if (!linkData) {
    console.warn('Invalid deep link format:', url);
    return false;
  }

  try {
    switch (linkData.type) {
      case 'auth':
        if (linkData.id === 'verify-email') {
          // Build the route with query parameters for email verification
          const params = new URLSearchParams();
          if (linkData.params) {
            Object.entries(linkData.params).forEach(([key, value]) => {
              if (value) params.append(key, String(value));
            });
          }
          const queryString = params.toString();
          const route = queryString 
            ? `/(auth)/verify-email?${queryString}`
            : '/(auth)/verify-email';
          router.push(route);
          return true;
        }
        return false;
      case 'notifications':
        router.push('/notifications');
        return true;
      case 'referral':
        if (linkData.id === 'landing') {
          router.push('/referral-landing');
          return true;
        }
        return false;
      case 'group':
        router.push(`/group/${linkData.id}`);
        return true;
      case 'event':
        router.push(`/event/${linkData.id}`);
        return true;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error navigating from deep link:', error);
    return false;
  }
};

/**
 * Share referral landing page with others
 */
export const shareReferralLanding = async () => {
  try {
    const deepLink = generateDeepLink({
      type: 'referral',
      id: 'landing',
      title: 'Connect Someone to VineMe',
    });

    const shareOptions = {
      message: `Help connect someone to our community!\n\nUse VineMe to refer friends to Bible study groups: ${deepLink}`,
      url: deepLink,
      title: 'Connect Someone to VineMe',
    };

    await Share.share(shareOptions);
  } catch (error) {
    console.error('Error sharing referral landing:', error);
    Alert.alert('Error', 'Failed to share referral link. Please try again.');
  }
};

/**
 * Generate shareable web URL (for social media, etc.)
 */
export const generateWebUrl = (data: DeepLinkData): string => {
  const baseWebUrl = 'https://vineme.app'; // Replace with actual web URL when available

  switch (data.type) {
    case 'group':
      return `${baseWebUrl}/group/${data.id}`;
    case 'event':
      return `${baseWebUrl}/event/${data.id}`;
    case 'referral':
      return `${baseWebUrl}/referral/${data.id}`;
    default:
      return baseWebUrl;
  }
};
