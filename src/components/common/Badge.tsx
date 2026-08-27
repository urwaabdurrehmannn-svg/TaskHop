import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing } from '../../constants/spacing';

type Size = 'sm' | 'md';

interface BadgeProps {
  label: string;
  bg: string;
  color: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  size?: Size;
}

const SIZE_STYLES: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
  sm: { paddingVertical: 5, paddingHorizontal: Spacing.xs, fontSize: 12, iconSize: 12 },
  md: { paddingVertical: 7, paddingHorizontal: Spacing.sm, fontSize: 13, iconSize: 14 },
};

/**
 * Shared filled-pill component for status/category/skill style tags.
 * Keeps radius, padding, and type scale identical everywhere a small
 * colored label is used (task cards, detail headers, filter chips).
 */
export function Badge({ label, bg, color, icon, size = 'sm' }: BadgeProps) {
  const s = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bg, paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal },
      ]}
    >
      {icon && <Ionicons name={icon} size={s.iconSize} color={color} style={styles.icon} />}
      <Text style={[styles.text, { color, fontSize: s.fontSize }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
});

export default Badge;
