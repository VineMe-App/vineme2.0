import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface GroupPlaceholderImageProps {
  style?: any;
}

export const GroupPlaceholderImage: React.FC<GroupPlaceholderImageProps> = ({
  style,
}) => {
  const placeholderImageUrl =
    'https://knwlfuysipixbwuzvyen.supabase.co/storage/v1/object/public/placeholder-images/group_image_placeholder.png';

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
