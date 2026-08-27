import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, palette } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { Button } from '../../components/common/Button';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <LinearGradient
      colors={[palette.indigo500, palette.indigo700]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.flex}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Ionicons name="git-network" size={22} color={Colors.textInverse} />
            </View>
            <Text style={styles.wordmark}>TaskHop</Text>
          </View>

          <View style={styles.heroText}>
            <Text style={styles.headline}>Got a task?{'\n'}Find your person.</Text>
            <Text style={styles.subheadline}>
              TaskHop matches what you need with people who already have the skill — on campus, in minutes.
            </Text>
          </View>

          <View style={[styles.matchPreview, Shadow.lg]}>
            <View style={styles.previewRow}>
              <View style={styles.previewIconWrap}>
                <Ionicons name="help-buoy" size={16} color={Colors.accent} />
              </View>
              <View style={styles.previewTextWrap}>
                <Text style={styles.previewLabel}>Someone needs</Text>
                <Text style={styles.previewValue}>"Edit my event video"</Text>
              </View>
            </View>

            <View style={styles.previewDivider}>
              <View style={styles.dividerLine} />
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>92%</Text>
              </View>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.previewRow}>
              <View style={[styles.previewIconWrap, styles.previewIconWrapAlt]}>
                <Ionicons name="videocam" size={16} color={Colors.primary} />
              </View>
              <View style={styles.previewTextWrap}>
                <Text style={styles.previewLabel}>Someone has</Text>
                <Text style={styles.previewValue}>Premiere Pro, YouTube editing</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Get Started"
              variant="accent"
              size="lg"
              icon="arrow-forward"
              iconPosition="right"
              onPress={() => navigation.replace('SignIn')}
            />
            <Text style={styles.footerHint}>Free for students. Sign up to get started.</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  wordmark: {
    ...Typography.h2,
    color: Colors.textInverse,
  },
  heroText: {
    marginTop: Spacing.xl,
  },
  headline: {
    ...Typography.hero,
    color: Colors.textInverse,
  },
  subheadline: {
    ...Typography.bodyLg,
    color: 'rgba(255,255,255,0.82)',
    marginTop: Spacing.sm,
  },
  matchPreview: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  previewIconWrapAlt: {
    backgroundColor: Colors.primaryLight,
  },
  previewTextWrap: {
    flex: 1,
  },
  previewLabel: {
    ...Typography.caption,
  },
  previewValue: {
    ...Typography.bodySemibold,
    marginTop: 1,
  },
  previewDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  matchBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginHorizontal: Spacing.xs,
  },
  matchBadgeText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '800',
  },
  footer: {
    marginTop: Spacing.xl,
  },
  footerHint: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default WelcomeScreen;
