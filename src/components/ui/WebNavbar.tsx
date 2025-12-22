import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useSegments } from 'expo-router';
import { Text } from '@/components/ui/Text';

const MOBILE_BREAKPOINT = 768;

const navItems = [
  { label: 'Home', href: '/(tabs)' },
  { label: 'Groups', href: '/(tabs)/groups' },
  { label: 'Profile', href: '/(tabs)/profile' },
];

export const WebNavbar: React.FC = () => {
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const menuHeight = useMemo(() => navItems.length * 52 + 16, []);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [animation, isOpen]);

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsOpen(false);
    }
    // Close menu on route change
  }, [segments]);

  if (Platform.OS !== 'web') {
    return null;
  }

  const handleNavigate = (href: string) => {
    router.push(href as never);
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const topLineStyle = {
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 7],
        }),
      },
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  const middleLineStyle = {
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  const bottomLineStyle = {
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -7],
        }),
      },
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-45deg'],
        }),
      },
    ],
  };

  const menuHeightAnimated = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, menuHeight],
  });

  const menuOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Text variant="h4" weight="semiBold" style={styles.logoText}>
          VineMe
        </Text>
        {isMobile ? (
          <TouchableOpacity
            onPress={toggleMenu}
            accessibilityRole="button"
            accessibilityLabel={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            style={styles.hamburgerButton}
          >
            <Animated.View style={[styles.hamburgerLine, topLineStyle]} />
            <Animated.View style={[styles.hamburgerLine, middleLineStyle]} />
            <Animated.View style={[styles.hamburgerLine, bottomLineStyle]} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navItems}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.href}
                onPress={() => handleNavigate(item.href)}
                style={styles.navItem}
                accessibilityRole="link"
              >
                <Text variant="body" weight="semiBold" style={styles.navItemText}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isMobile && (
        <Animated.View
          style={[
            styles.mobileMenu,
            {
              height: menuHeightAnimated,
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslate }],
            },
          ]}
        >
          <View style={styles.mobileMenuContent}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.href}
                onPress={() => handleNavigate(item.href)}
                style={styles.mobileMenuItem}
                accessibilityRole="link"
              >
                <Text variant="body" weight="semiBold" style={styles.mobileMenuText}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoText: {
    color: '#2C2235',
  },
  navItems: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItem: {
    marginLeft: 20,
  },
  navItemText: {
    color: '#2C2235',
    letterSpacing: -0.2,
  },
  hamburgerButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerLine: {
    width: 22,
    height: 2,
    backgroundColor: '#2C2235',
    borderRadius: 999,
    marginVertical: 3,
  },
  mobileMenu: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  mobileMenuContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  mobileMenuItem: {
    paddingVertical: 12,
  },
  mobileMenuText: {
    color: '#2C2235',
  },
});
