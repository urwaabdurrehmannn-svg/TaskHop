import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { ScreenHeader } from '../../components/common/ScreenHeader';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn({ email, password });
      // AuthContext session update flips RootNavigator into MainTabs automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll contentStyle={styles.scrollContent}>
      <ScreenHeader title="Welcome back" subtitle="Sign in to keep hopping on tasks." />

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input
        label="Email"
        placeholder="you@university.edu"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        icon="mail-outline"
      />
      <Input
        label="Password"
        placeholder="Your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
        icon="lock-closed-outline"
      />

      <View style={styles.submitWrap}>
        <Button label="Sign in" onPress={handleSubmit} loading={loading} size="lg" />
      </View>

      <Pressable onPress={() => navigation.navigate('SignUp')} hitSlop={8} style={styles.switchLink}>
        <Text style={styles.switchText}>
          New to TaskHop? <Text style={styles.switchTextStrong}>Create an account</Text>
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.dangerDark,
    flex: 1,
  },
  submitWrap: {
    marginTop: Spacing.sm,
  },
  switchLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  switchTextStrong: {
    color: Colors.textLink,
    fontWeight: '700',
  },
});

export default SignInScreen;
