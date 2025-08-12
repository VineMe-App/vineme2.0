import * as Linking from 'expo-linking';
import { Share, Alert } from 'react-native';

export interface DeepLinkData {
  type: 'group' | 'event';
  id: string;
  title?: string;
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
    default:
      return baseUrl;
  }
};

/**
 * Share a group with others
 */
export const shareGroup = async (groupId: string, groupTitle: string) => {
  try {
    const deepLink = generateDeepLink({ type: 'group', id: groupId, title: groupTitle });
    
    const shareOptions = {
      message: `Check out this Bible study group: ${groupTitle}\n\nJoin us on VineMe: ${deepLink}`,
      url: deepLink,
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
export const shareEvent = async (eventId: string, eventTitle: string, eventDate?: string) => {
  try {
    const deepLink = generateDeepLink({ type: 'event', id: eventId, title: eventTitle });
    
    const dateText = eventDate ? `\nDate: ${new Date(eventDate).toLocaleDateString()}` : '';
    
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
    const { hostname, path } = Linking.parse(url);
    
    if (!path) return null;
    
    const segments = path.split('/').filter(Boolean);
    
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
 * Generate shareable web URL (for social media, etc.)
 */
export const generateWebUrl = (data: DeepLinkData): string => {
  const baseWebUrl = 'https://vineme.app'; // Replace with actual web URL when available
  
  switch (data.type) {
    case 'group':
      return `${baseWebUrl}/group/${data.id}`;
    case 'event':
      return `${baseWebUrl}/event/${data.id}`;
    default:
      return baseWebUrl;
  }
};