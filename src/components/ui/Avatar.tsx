import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Text from './Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/provider/useTheme';

interface AvatarProps {
  size?: number;
  imageUrl?: string | null;
  name?: string;
  onPress?: () => void;
  showEditIcon?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 80,
  imageUrl,
  name = '',
  onPress,
  showEditIcon = false,
}) => {
  const { theme } = useTheme();

  const initials = name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const textStyle = {
    fontSize: size * 0.35,
    lineHeight: size * 0.35,
    textAlign: 'center' as const,
    includeFontPadding: false,
  };

  const content = (
    <View style={[styles.container, avatarStyle]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={[styles.image, avatarStyle]} />
      ) : (
        <View
          style={[
            styles.placeholder,
            avatarStyle,
            { backgroundColor: theme.colors.secondary[100] },
          ]}
        >
          <Text
            weight="black"
            style={[
              styles.initials,
              textStyle,
              { color: theme.colors.primary[500] },
            ]}
          >
            {initials || '?'}
          </Text>
        </View>
      )}
      {showEditIcon && (
        <View
          style={[styles.editIcon, { bottom: size * 0.05, right: size * 0.05 }]}
        >
          <Ionicons name="pencil-outline" size={14} color="#fff" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  editIcon: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  editIconText: {
    fontSize: 12,
  },
});
