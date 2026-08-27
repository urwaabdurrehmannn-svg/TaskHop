import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

export function Card({ children, style, padded = true, elevation = 'sm', bordered = true }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        bordered && styles.bordered,
        Shadow[elevation],
        style,
      ]}
    >
      {children}
    </View>
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
