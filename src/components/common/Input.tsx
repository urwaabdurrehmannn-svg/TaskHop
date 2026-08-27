import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  rightElement,
  style,
  multiline,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          focused && styles.inputRowFocused,
          error && styles.inputRowError,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={19}
            color={focused ? Colors.primary : Colors.textTertiary}
            style={styles.icon}
          />
        )}
        <TextInput
          {...rest}
          multiline={multiline}
          placeholderTextColor={Colors.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: Colors.textPrimary },
            style,
          ]}
        />
        {rightElement}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    minHeight: 110,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
  },
  inputRowError: {
    borderColor: Colors.danger,
  },
  icon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Spacing.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxs,
    gap: 4,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
  },
  hintText: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
});

export default Input;
