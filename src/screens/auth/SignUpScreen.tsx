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

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Fill in your name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp({ name, email, password });
      // AuthContext session update flips RootNavigator into MainTabs automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll contentStyle={styles.scrollContent}>
      <ScreenHeader title="Create your account" subtitle="Join TaskHop to post tasks and offer your skills." />

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Input label="Name" placeholder="Your full name" value={name} onChangeText={setName} icon="person-outline" />
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
        placeholder="At least 6 characters"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password-new"
        icon="lock-closed-outline"
      />

      <View style={styles.submitWrap}>
        <Button label="Create account" onPress={handleSubmit} loading={loading} size="lg" />
      </View>

      <Pressable onPress={() => navigation.navigate('SignIn')} hitSlop={8} style={styles.switchLink}>
        <Text style={styles.switchText}>
          Already have an account? <Text style={styles.switchTextStrong}>Sign in</Text>
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

export default SignUpScreen;
