import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { MatchCard } from '../../components/user/MatchCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { ReportModal } from '../../components/trust/ReportModal';
import { ActionMenu } from '../../components/trust/ActionMenu';
import { Colors, getCategoryColor } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { useReportBlockActions } from '../../hooks/useReportBlockActions';
import { generateMatchesForTask } from '../../services/matches/matchService';
import * as taskService from '../../services/tasks/taskService';
import * as interestService from '../../services/interests/interestService';
import { getCategoryIcon } from '../../data/categories';
import { describeExchange } from '../../utils/exchange';
import type { RootStackParamList } from '../../navigation/types';
import type { Match, Task } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

/**
 * Matches only ever operates on a single task, resolved fresh from Supabase
 * (not any locally-cached list) and verified to belong to the signed-in
 * user before generateMatchesForTask() is ever called. There is
 * intentionally no task picker here -- Matches is only reachable by owning
 * a task and pressing "Find Matches" from its Task Details screen (My Tasks
 * → task → Find Matches); a taskId for a task you don't own resolves to a
 * blocked state, not a list of other people's tasks to browse.
 */
export function MatchesScreen({ route, navigation }: Props) {
  const { session } = useAuth();
  const taskId = route.params?.taskId;

  const [task, setTask] = useState<Task | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId || !session) {
      setTask(null);
      setAccessError(null);
      return;
    }
    let cancelled = false;
    setTaskLoading(true);
    setAccessError(null);
    taskService
      .fetchTaskById(taskId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setTask(null);
          setAccessError('This task could not be found.');
          return;
        }
        if (result.poster.id !== session.user.id) {
          setTask(null);
          setAccessError("You can only view Matches for tasks you posted.");
          return;
        }
        setTask(result);
      })
      .catch((err) => {
        if (!cancelled) setAccessError(err instanceof Error ? err.message : 'Could not load this task.');
      })
      .finally(() => {
        if (!cancelled) setTaskLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, session]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setMatchesLoading(true);
    setMatchesError(null);
    generateMatchesForTask(task)
      .then((result) => {
        if (!cancelled) setMatches(result);
      })
      .catch((err) => {
        if (!cancelled) setMatchesError(err instanceof Error ? err.message : 'Could not load matches.');
      })
      .finally(() => {
        if (!cancelled) setMatchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task]);

  const [invitedCandidateIds, setInvitedCandidateIds] = useState<Set<string>>(new Set());
  const [connectingCandidateId, setConnectingCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (!task || !session) {
      setInvitedCandidateIds(new Set());
      return;
    }
    let cancelled = false;
    interestService
      .fetchInterestsForTask(task.id)
      .then((interests) => {
        if (cancelled) return;
        const owned = interests.filter((i) => i.initiatedBy === 'owner').map((i) => i.helper.id);
        setInvitedCandidateIds(new Set(owned));
      })
      .catch(() => {
        if (!cancelled) setInvitedCandidateIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [task, session]);

  const {
    menuVisible,
    menuTitle,
    menuOptions,
    closeMenu,
    reportModalVisible,
    reportModalTitle,
    presentUserActions,
    submitReport,
    closeReportModal,
    onReportSubmitted,
  } = useReportBlockActions();

  function handleMoreOptions(candidateId: string, candidateName: string) {
    presentUserActions(candidateId, candidateName, () => {
      // Blocked users must not appear as match candidates -- drop them
      // from the current list immediately rather than waiting on a refetch.
      setMatches((prev) => prev.filter((m) => m.user.id !== candidateId));
    });
  }

  async function handleConnect(candidateId: string) {
    if (!task || !session || invitedCandidateIds.has(candidateId) || connectingCandidateId) return;
    setConnectingCandidateId(candidateId);
    try {
      await interestService.inviteCandidate(task, candidateId, session.user.id);
      setInvitedCandidateIds((prev) => new Set(prev).add(candidateId));
      Alert.alert('Invite sent', "They'll see your task and can message you back.");
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setConnectingCandidateId(null);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <Header title="Matches" onBack={() => navigation.goBack()} />

      {taskLoading ? (
        <LoadingIndicator label="Loading task…" />
      ) : !task ? (
        <EmptyState
          icon="flash-outline"
          title={accessError ? "Can't show Matches" : 'No task selected'}
          subtitle={
            accessError ??
            'Open one of your posted tasks from My Tasks and tap "Find Matches" to see ranked candidates here.'
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.taskSummary}>
            <View style={[styles.taskIconWrap, { backgroundColor: getCategoryColor(task.category).bg }]}>
              <Ionicons name={getCategoryIcon(task.category)} size={16} color={getCategoryColor(task.category).text} />
            </View>
            <View style={styles.taskSummaryText}>
              <Text style={styles.taskSummaryLabel}>Finding matches for</Text>
              <Text style={styles.taskSummaryTitle} numberOfLines={1}>
                {task.title}
              </Text>
              <Text style={styles.taskSummaryOffer} numberOfLines={1}>
                {describeExchange(task.exchangeType, task.offeredSkill, task.offeredAmount)}
              </Text>
            </View>
          </View>

          {matchesLoading ? (
            <LoadingIndicator label="Finding matches…" />
          ) : matchesError ? (
            <EmptyState icon="cloud-offline-outline" title="Couldn't load matches" subtitle={matchesError} />
          ) : matches.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No matches yet"
              subtitle="No one on TaskHop matches this task's skills yet — check back soon."
            />
          ) : (
            matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onConnect={handleConnect}
                connected={invitedCandidateIds.has(match.user.id)}
                connecting={connectingCandidateId === match.user.id}
                onMoreOptions={handleMoreOptions}
              />
            ))
          )}
        </ScrollView>
      )}

      <ActionMenu visible={menuVisible} title={menuTitle} options={menuOptions} onClose={closeMenu} />

      <ReportModal
        visible={reportModalVisible}
        title={reportModalTitle}
        onClose={closeReportModal}
        onSubmit={async (reason, description) => {
          await submitReport(reason, description);
          onReportSubmitted();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  taskSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  taskIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  taskSummaryText: {
    flex: 1,
  },
  taskSummaryLabel: {
    ...Typography.caption,
  },
  taskSummaryTitle: {
    ...Typography.bodySemibold,
  },
  taskSummaryOffer: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});

export default MatchesScreen;
