import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PressScale, Spring } from '../constants/motion';

/** A Pressable that can carry a Reanimated animated style (for press-scale). */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Shared press-scale feedback used by Button/Card/TaskCard so every
 * interactive surface in the app compresses the same amount, with the same
 * spring, instead of each component reinventing its own press animation.
 * Spread the returned handlers onto an `AnimatedPressable` and apply `style`
 * to it (merged with any of the component's own style array).
 */
export function usePressScale(scale: number = PressScale.default) {
  const progress = useSharedValue(1);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
  }));

  function onPressIn() {
    progress.value = withSpring(scale, Spring.press);
  }

  function onPressOut() {
    progress.value = withSpring(1, Spring.press);
  }

  return { style, onPressIn, onPressOut };
}

export default usePressScale;
