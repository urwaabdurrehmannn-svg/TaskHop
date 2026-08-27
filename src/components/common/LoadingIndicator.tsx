import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface LoadingIndicatorProps {
  label?: string;
  fullscreen?: boolean;
}

export function LoadingIndicator({ label = 'Loading…', fullscreen = false }: LoadingIndicatorProps) {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <ActivityIndicator color={Colors.primary} size="small" />
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  label: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});

export default LoadingIndicator;
