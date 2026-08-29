import React, { useEffect } from 'react';
import { GestureResponderEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Duration } from '../../constants/motion';
import { AnimatedPressable, usePressScale } from '../../hooks/usePressScale';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  /** Makes the card an interactive press-scale surface instead of a static container. */
  onPress?: (e: GestureResponderEvent) => void;
  /**
   * Staggered fade/rise-in on mount, for feed-style lists. `entranceIndex`
   * sets the stagger position (0 = no delay); omit both for a static card.
   */
  animateEntrance?: boolean;
  entranceIndex?: number;
}

export function Card({
  children,
  style,
  padded = true,
  elevation = 'sm',
  bordered = true,
  onPress,
  animateEntrance = false,
  entranceIndex = 0,
}: CardProps) {
  const pressScale = usePressScale();
  const entranceProgress = useSharedValue(animateEntrance ? 0 : 1);

  useEffect(() => {
    if (!animateEntrance) return;
    entranceProgress.value = withDelay(
      entranceIndex * 40,
      withTiming(1, { duration: Duration.base })
    );
    // Mount-only: entranceIndex is a stable position within its list, not a live input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateEntrance]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceProgress.value,
    transform: [{ translateY: (1 - entranceProgress.value) * 10 }],
  }));

  const content = (
    <>{children}</>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={pressScale.onPressIn}
        onPressOut={pressScale.onPressOut}
        style={[
          styles.base,
          padded && styles.padded,
          bordered && styles.bordered,
          Shadow[elevation],
          pressScale.style,
          animateEntrance && entranceStyle,
          style,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View
      style={[
        styles.base,
        padded && styles.padded,
        bordered && styles.bordered,
        Shadow[elevation],
        animateEntrance && entranceStyle,
        style,
      ]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
  },
  padded: {
    padding: Spacing.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});

export default Card;
