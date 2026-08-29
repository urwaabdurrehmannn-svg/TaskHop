import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { PressScale } from '../../constants/motion';
import { AnimatedPressable, usePressScale } from '../../hooks/usePressScale';
import { haptics } from '../../utils/haptics';

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Selecting a filter is a meaningful discrete choice -- on by default. */
  haptic?: boolean;
}

/**
 * The one reusable "selectable pill" component -- replaces the deadline
 * chip, exchange-type chip, availability chip, and report-reason chip that
 * were each independently re-implementing this exact style.
 */
export function FilterChip({ label, active, onPress, icon, haptic = true }: FilterChipProps) {
  const { style: pressStyle, onPressIn, onPressOut } = usePressScale(PressScale.small);

  function handlePress() {
    if (haptic) haptics.selection();
    onPress();
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive, pressStyle]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={15}
          color={active ? Colors.textInverse : Colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  chipInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  textActive: {
    color: Colors.textInverse,
  },
});

export default FilterChip;
