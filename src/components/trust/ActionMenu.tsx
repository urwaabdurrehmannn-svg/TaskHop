import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

export interface ActionMenuOption {
  key: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  options: ActionMenuOption[];
  onClose: () => void;
}

/**
 * Custom-rendered menu, not RN's Alert.alert -- Alert.alert's button count
 * is capped at 3 on Android (native AlertDialog only supports
 * positive/neutral/negative), so a 4-option menu (Report User / Report Task
 * / Block / Cancel) silently drops the last button on that platform. This
 * guarantees Cancel always renders, on every platform, regardless of how
 * many other options are present.
 */
export function ActionMenu({ visible, title, options, onClose }: ActionMenuProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}

          {options.map((opt) => (
            <Pressable
              key={opt.key}
              style={styles.option}
              onPress={() => {
                onClose();
                opt.onPress();
              }}
            >
              <Text style={[styles.optionText, opt.destructive && styles.optionTextDestructive]}>{opt.label}</Text>
            </Pressable>
          ))}

          <View style={styles.divider} />

          <Pressable style={styles.option} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  title: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  option: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  optionText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  optionTextDestructive: {
    color: Colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  cancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
});

export default ActionMenu;
