import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryColor } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';

interface SkillTagProps {
  label: string;
  size?: 'sm' | 'md';
  matched?: boolean;
}

export function SkillTag({ label, size = 'md', matched = false }: SkillTagProps) {
  const { bg, text } = getCategoryColor(label);
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg, paddingVertical: small ? 5 : 7, paddingHorizontal: small ? 10 : 12 },
      ]}
    >
      {matched && <Ionicons name="checkmark" size={small ? 12 : 13} color={text} style={styles.icon} />}
      <Text style={[styles.text, { color: text, fontSize: small ? 12 : 13 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    marginRight: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  icon: {
    marginRight: 3,
  },
  text: {
    fontWeight: '600',
  },
});

export default SkillTag;
