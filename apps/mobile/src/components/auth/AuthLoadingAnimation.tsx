import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const defaultLogo = require('../../../assets/figma-105-1538/47c97a3de297c8957bfbc742d3e4396bccd0d31a.png');

const AnimatedImage = Animated.createAnimatedComponent(Image);

type BubbleConfig = {
  offsetX: number;
  offsetY: number;
  size: number;
  color: string;
  delay: number;
};

const bubbleConfigs: BubbleConfig[] = [
  { offsetX: 32, offsetY: -32, size: 26, color: '#FF0083', delay: 0 },
  { offsetX: -28, offsetY: -6, size: 26, color: '#FF66AD', delay: 180 },
  { offsetX: -2, offsetY: 34, size: 28, color: '#FFD5EC', delay: 360 },
];

export interface AuthLoadingAnimationProps {
  logoSource?: ImageSourcePropType;
  style?: ViewStyle;
}

export const AuthLoadingAnimation: React.FC<AuthLoadingAnimationProps> = ({
  logoSource = defaultLogo,
  style,
}) => {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const bubbleValues = useMemo(
    () => bubbleConfigs.map(() => new Animated.Value(0)),
    []
  );

  useEffect(() => {
    const animations = bubbleValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(bubbleConfigs[index].delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 700,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [bubbleValues]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {bubbleConfigs.map((config, index) => {
        const bubbleScale = bubbleValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1],
        });
        const bubbleOpacity = bubbleValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 0.9],
        });

        return (
          <Animated.View
            key={`bubble-${index}`}
            style={[
              styles.bubble,
              {
                backgroundColor: config.color,
                width: config.size,
                height: config.size,
                transform: [
                  { translateX: config.offsetX },
                  { translateY: config.offsetY },
                  { scale: bubbleScale },
                ],
                opacity: bubbleOpacity,
              },
            ]}
          />
        );
      })}
      <AnimatedImage
        source={logoSource}
        style={[styles.logo, { transform: [{ scale }], opacity: logoOpacity }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    opacity: 0.9,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
});

export default AuthLoadingAnimation;

