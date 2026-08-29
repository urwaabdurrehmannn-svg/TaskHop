import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single shimmering placeholder block. Respects reduced-motion: the pulse
 * loop is skipped entirely and a fixed, still opacity is used instead.
 */
export function Skeleton({ width = '100%', height = 16, radius = Radius.xs, style }: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.7 : 0.5 + progress.value * 0.3,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: Colors.surfaceAlt },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Shaped like TaskCard, so a feed's loading state doesn't jump when real content arrives. */
export function TaskCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Skeleton width={92} height={24} radius={Radius.full} />
        <Skeleton width={64} height={24} radius={Radius.full} />
      </View>
      <Skeleton width="82%" height={18} style={styles.gapSm} />
      <Skeleton width="100%" height={14} style={styles.gapXs} />
      <Skeleton width="55%" height={14} style={styles.gapMd} />
      <View style={styles.footerRow}>
        <Skeleton width={96} height={14} />
        <Skeleton width={64} height={14} />
      </View>
    </View>
  );
}

/** A short run of TaskCardSkeletons for a feed's initial load. */
export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <TaskCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  gapSm: { marginBottom: Spacing.sm },
  gapXs: { marginBottom: Spacing.xxs },
  gapMd: { marginBottom: Spacing.sm },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});

export default Skeleton;
