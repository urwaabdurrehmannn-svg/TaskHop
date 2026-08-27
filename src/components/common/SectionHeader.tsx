import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
}

/**
 * Shared eyebrow-style label for subsections within a screen (e.g.
 * "Categories", "Description", "Skills"). One consistent secondary-heading
 * treatment used everywhere instead of ad-hoc h3/label styles per screen.
 */
export function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
});

export default SectionHeader;
