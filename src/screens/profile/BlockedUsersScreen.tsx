import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { useAuth } from '../../context/AuthContext';
import * as blockService from '../../services/trust/blockService';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { RootStackParamList } from '../../navigation/types';
import type { BlockedUser } from '../../types/trust';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

/** Unblocking only ever removes the current user's own block row (blockService.unblockUser is scoped to blockerId = the caller). */
export function BlockedUsersScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setError(null);
      const result = await blockService.fetchMyBlocks(session.user.id);
      setBlocked(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your blocked users.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleUnblock(entry: BlockedUser) {
    if (!session) return;
    setUnblockingId(entry.id);
    try {
      await blockService.unblockUser(session.user.id, entry.user.id);
      setBlocked((prev) => prev.filter((b) => b.id !== entry.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unblock this person.');
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Blocked Users" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <LoadingIndicator label="Loading…" />
        ) : error ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn't load this" subtitle={error} actionLabel="Try again" onAction={load} />
        ) : blocked.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="No blocked users"
            subtitle="People you block will show up here, and you can unblock them anytime."
          />
        ) : (
          blocked.map((entry) => (
            <View key={entry.id} style={[styles.row, Shadow.sm]}>
              <Avatar
                name={entry.user.name}
                initials={entry.user.initials}
                color={entry.user.avatarColor}
                imageUrl={entry.user.avatarUrl}
                size={AvatarSize.md}
              />
              <Text style={styles.name} numberOfLines={1}>
                {entry.user.name}
              </Text>
              <Button
                label="Unblock"
                variant="outline"
                size="sm"
                fullWidth={false}
                loading={unblockingId === entry.id}
                onPress={() => handleUnblock(entry)}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  name: {
    ...Typography.bodySemibold,
    flex: 1,
  },
});

export default BlockedUsersScreen;
