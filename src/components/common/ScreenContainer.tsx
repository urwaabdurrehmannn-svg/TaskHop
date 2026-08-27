import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  contentStyle,
  backgroundColor = Colors.background,
  padded = true,
}: ScreenContainerProps) {
  const Wrapper = scroll ? ScrollView : View;
  const wrapperProps = scroll
    ? { contentContainerStyle: [padded && styles.padded, contentStyle], showsVerticalScrollIndicator: false }
    : { style: [styles.flex, padded && styles.padded, contentStyle] };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor }]} edges={edges}>
      <StatusBar style="dark" />
      {/* @ts-ignore - dynamic wrapper props differ by component */}
      <Wrapper {...wrapperProps}>{children}</Wrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: Spacing.lg },
});

export default ScreenContainer;
