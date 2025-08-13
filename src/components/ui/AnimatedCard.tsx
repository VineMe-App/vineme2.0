import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, ViewStyle } from 'react-native';
import { Card, CardProps } from './Card';
import { fadeIn, scale } from '../../utils/animations';

interface AnimatedCardProps extends CardProps {
  onPress?: () => void;
  animationDelay?: number;
  scaleOnPress?: boolean;
  children: React.ReactNode;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  onPress,
  animationDelay = 0,
  scaleOnPress = true,
  children,
  style,
  ...cardProps
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation
    const animations = [
      fadeIn(fadeAnim, 300),
      scale(scaleAnim, 1, 300),
    ];

    Animated.parallel(animations).start();
  }, [fadeAnim, scaleAnim]);

  const handlePressIn = () => {
    if (scaleOnPress) {
      scale(pressScaleAnim, 0.98, 100).start();
    }
  };

  const handlePressOut = () => {
    if (scaleOnPress) {
      scale(pressScaleAnim, 1, 100).start();
    }
  };

  const animatedStyle: ViewStyle = {
    opacity: fadeAnim,
    transform: [
      { scale: Animated.multiply(scaleAnim, pressScaleAnim) },
    ],
  };

  const CardComponent = (
    <Animated.View style={[animatedStyle, { marginBottom: animationDelay * 0.1 }]}>
      <Card style={style} {...cardProps}>
        {children}
      </Card>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {CardComponent}
      </TouchableOpacity>
    );
  }

  return CardComponent;
};