import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightPress?: () => void;
  transparent?: boolean;
}

export function Header({ title, onBack, rightIcon, onRightPress, transparent = false }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + Spacing.xs },
        transparent ? styles.transparent : styles.solid,
      ]}
    >
      <View style={styles.side}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={10} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={[styles.side, styles.sideRight]}>
        {rightIcon && (
          <Pressable onPress={onRightPress} hitSlop={10} style={styles.iconButton}>
            <Ionicons name={rightIcon} size={20} color={Colors.textPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  solid: {
    backgroundColor: Colors.background,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
});

export default Header;
