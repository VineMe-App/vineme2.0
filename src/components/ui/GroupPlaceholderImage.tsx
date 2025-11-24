import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface GroupPlaceholderImageProps {
  style?: any;
  category?: 'service' | 'church' | 'outside';
}

export const GroupPlaceholderImage: React.FC<GroupPlaceholderImageProps> = ({
  style,
  category = 'service', // Default to service for backward compatibility
}) => {
  const getPlaceholderImageUrl = () => {
    const baseUrl =
      'https://knwlfuysipixbwuzvyen.supabase.co/storage/v1/object/public/placeholder-images/';

    switch (category) {
      case 'service':
        return `${baseUrl}vineme_png-16.png`;
      case 'church':
        return `${baseUrl}vineme_png-17.png`;
      case 'outside':
        return `${baseUrl}vineme_png-18.png`;
      default:
        return `${baseUrl}vineme_png-16.png`; // Default to service
    }
  };

  const placeholderImageUrl = getPlaceholderImageUrl();

  return (
    <Image
      source={{ uri: placeholderImageUrl }}
      style={[styles.image, style]}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#f0f0f0',
  },
});
