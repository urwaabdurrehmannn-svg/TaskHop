import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Avatar, AvatarSize } from '../../components/common/Avatar';
import { Card } from '../../components/common/Card';
import { SkillTag } from '../../components/common/SkillTag';
import { Badge } from '../../components/common/Badge';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { UserCard } from '../../components/user/UserCard';
import { ReportModal } from '../../components/trust/ReportModal';
import { ActionMenu } from '../../components/trust/ActionMenu';
import { RatingModal } from '../../components/reviews/RatingModal';
import { Colors, getCategoryColor } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { useReportBlockActions } from '../../hooks/useReportBlockActions';
import { useRatingActions } from '../../hooks/useRatingActions';
import * as taskService from '../../services/tasks/taskService';
import * as interestService from '../../services/interests/interestService';
import * as reviewService from '../../services/reviews/reviewService';
import { getCategoryIcon } from '../../data/categories';
import { formatDateLong, formatDeadline } from '../../utils/date';
import { exchangeOfferValue, exchangeTypeLabel, PAYMENT_STATUS_LABEL } from '../../utils/exchange';
import type { RootStackParamList } from '../../navigation/types';
import type { Task, TaskInterest } from '../../types';
import type { Review } from '../../types/review';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetails'>;

const STATUS_META: Record<Task['status'], { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: Colors.success, bg: Colors.successLight },
  matching: { label: 'Matching', color: Colors.accentDark, bg: Colors.accentLight },
  in_progress: { label: 'In progress', color: Colors.primary, bg: Colors.primaryLight },
  completed: { label: 'Completed', color: Colors.textSecondary, bg: Colors.surfaceAlt },
  cancelled: { label: 'Cancelled', color: Colors.danger, bg: Colors.dangerLight },
};

export function TaskDetailsScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const { session } = useAuth();
  const { getTaskById, setTaskStatus } = useTasks();
  const contextTask = getTaskById(taskId);

  const [fallbackTask, setFallbackTask] = useState<Task | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [findingMatches, setFindingMatches] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<'completed' | 'cancelled' | null>(null);

  const [myInterest, setMyInterest] = useState<TaskInterest | null>(null);
  const [interestActionLoading, setInterestActionLoading] = useState(false);

  const [interests, setInterests] = useState<TaskInterest[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [interestsError, setInterestsError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [startingTask, setStartingTask] = useState(false);

  const [myReview, setMyReview] = useState<Review | null>(null);

  const {
    menuVisible,
    menuTitle,
    menuOptions,
    closeMenu,
    reportModalVisible,
    reportModalTitle,
    presentUserActions,
    presentTaskDetailActions,
    submitReport,
    closeReportModal,
    onReportSubmitted,
  } = useReportBlockActions();

  const { ratingModalVisible, ratingModalTitle, presentRating, submitRating, closeRatingModal } = useRatingActions();

  const task = contextTask ?? fallbackTask;
  const isOwner = !!(task && session && task.poster.id === session.user.id);

  useEffect(() => {
    if (contextTask || fallbackTask) return;
    let cancelled = false;
    setFallbackLoading(true);
    taskService
      .fetchTaskById(taskId)
      .then((result) => {
        if (!cancelled) setFallbackTask(result);
      })
      .finally(() => {
        if (!cancelled) setFallbackLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, contextTask, fallbackTask]);

  useEffect(() => {
    if (!task || !session || isOwner) return;
    let cancelled = false;
    interestService.fetchMyInterest(task.id, session.user.id).then((result) => {
      if (!cancelled) setMyInterest(result);
    });
    return () => {
      cancelled = true;
    };
  }, [task, session, isOwner]);

  useEffect(() => {
    if (!task || !isOwner) return;
    let cancelled = false;
    setInterestsLoading(true);
    setInterestsError(null);
    interestService
      .fetchInterestsForTask(task.id)
      .then((result) => {
        if (!cancelled) setInterests(result);
      })
      .catch((err) => {
        if (!cancelled) setInterestsError(err instanceof Error ? err.message : 'Could not load interest.');
      })
      .finally(() => {
        if (!cancelled) setInterestsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task, isOwner]);

  useEffect(() => {
    if (!task || !session || task.status !== 'completed') {
      setMyReview(null);
      return;
    }
    let cancelled = false;
    reviewService.fetchMyReviewForTask(task.id, session.user.id).then((result) => {
      if (!cancelled) setMyReview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [task, session]);

  if (!task) {
    return (
      <SafeAreaView style={styles.flex}>
        <Header title="Task" onBack={() => navigation.goBack()} />
        {fallbackLoading ? (
          <LoadingIndicator label="Loading task…" />
        ) : (
          <EmptyState icon="alert-circle-outline" title="Task not found" subtitle="It may have been removed." />
        )}
      </SafeAreaView>
    );
  }

  const status = STATUS_META[task.status];
  const categoryColor = getCategoryColor(task.category);
  const isClosed = task.status === 'completed' || task.status === 'cancelled';
  const showOwnerFooter = isOwner && !isClosed;
  const showHelperFooter = !isOwner && (!!myInterest || !isClosed);
  // Reassignment is only ever allowed pre-in_progress -- this mirrors the
  // RLS policy on task_interests.accepted exactly (0010_reviews.sql), so
  // the UI never offers an action the database would reject.
  const canReassignHelper = task.status === 'open' || task.status === 'matching';
  const hasAcceptedHelper = interests.some((i) => i.accepted);

  async function handleFindMatches() {
    if (!task) return;
    setFindingMatches(true);
    try {
      if (task.status === 'open') {
        await setTaskStatus(task.id, 'matching');
      }
    } catch {
      // Non-critical: still let the user see matches even if the status write failed.
    } finally {
      setFindingMatches(false);
      navigation.navigate('Matches', { taskId: task.id });
    }
  }

  async function handleChangeStatus(newStatus: 'completed' | 'cancelled') {
    if (!task) return;
    setStatusActionLoading(newStatus);
    try {
      await setTaskStatus(task.id, newStatus);
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setStatusActionLoading(null);
    }
  }

  function handleCancelTask() {
    Alert.alert(
      'Cancel this task?',
      'Helpers who already connected will still be able to see your conversation history.',
      [
        { text: 'Keep task', style: 'cancel' },
        { text: 'Cancel task', style: 'destructive', onPress: () => handleChangeStatus('cancelled') },
      ]
    );
  }

  async function handleToggleInterest() {
    if (!task || !session) return;
    setInterestActionLoading(true);
    try {
      if (myInterest) {
        await interestService.withdrawInterest(task.id, session.user.id);
        setMyInterest(null);
      } else {
        const created = await interestService.expressInterest(task, session.user.id);
        setMyInterest(created);
        Alert.alert('Interest sent', `${task.poster.name} will see that you're interested in this task.`);
      }
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setInterestActionLoading(false);
    }
  }

  async function doAcceptHelper(interest: TaskInterest) {
    if (!task) return;
    setAcceptingId(interest.id);
    try {
      await interestService.acceptHelper(task.id, interest.id);
      setInterests((prev) => prev.map((i) => ({ ...i, accepted: i.id === interest.id })));
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAcceptingId(null);
    }
  }

  function handleAcceptOrChangeHelper(interest: TaskInterest) {
    const current = interests.find((i) => i.accepted);
    if (current && current.id !== interest.id) {
      Alert.alert(
        'Replace accepted helper?',
        `${current.helper.name} is currently accepted for this task. Choosing ${interest.helper.name} instead will remove ${current.helper.name}'s accepted status.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => doAcceptHelper(interest) },
        ]
      );
    } else {
      doAcceptHelper(interest);
    }
  }

  async function handleStartTask() {
    if (!task) return;
    setStartingTask(true);
    try {
      await setTaskStatus(task.id, 'in_progress');
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setStartingTask(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
      <Header
        title="Task details"
        onBack={() => navigation.goBack()}
        rightIcon={!isOwner ? 'ellipsis-horizontal' : undefined}
        onRightPress={() =>
          !isOwner &&
          presentTaskDetailActions({
            posterId: task.poster.id,
            posterName: task.poster.name,
            taskId: task.id,
            taskTitle: task.title,
          })
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badgeRow}>
          <Badge
            label={task.category}
            icon={getCategoryIcon(task.category)}
            bg={categoryColor.bg}
            color={categoryColor.text}
            size="md"
          />
          <Badge label={status.label} bg={status.bg} color={status.color} size="md" />
        </View>

        <Text style={styles.title}>{task.title}</Text>

        <Pressable
          onPress={() => !isOwner && navigation.navigate('UserProfile', { userId: task.poster.id })}
          disabled={isOwner}
        >
          <Card style={styles.posterCard} elevation="none">
            <Avatar
              name={task.poster.name}
              initials={task.poster.initials}
              color={task.poster.avatarColor}
              imageUrl={task.poster.avatarUrl}
              size={AvatarSize.md}
              availability={task.poster.availability}
            />
            <View style={styles.posterText}>
              <Text style={styles.posterName}>{task.poster.name}</Text>
              <Text style={styles.posterMeta}>{task.poster.university ?? 'TaskHop member'}</Text>
            </View>
            {!isOwner && <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />}
          </Card>
        </Pressable>

        <SectionHeader title="Description" />
        <Text style={styles.description}>{task.description}</Text>

        <SectionHeader title="What's being offered" />
        <Card style={styles.offerCard} elevation="none">
          <View style={styles.offerIconWrap}>
            <Ionicons
              name={
                task.exchangeType === 'money'
                  ? 'cash-outline'
                  : task.exchangeType === 'skill'
                    ? 'swap-horizontal-outline'
                    : 'help-circle-outline'
              }
              size={18}
              color={Colors.primary}
            />
          </View>
          <View style={styles.offerTextWrap}>
            <Text style={styles.offerLabel}>{exchangeTypeLabel(task.exchangeType)}</Text>
            <Text style={styles.offerValue}>
              {exchangeOfferValue(task.exchangeType, task.offeredSkill, task.offeredAmount)}
            </Text>
            {task.exchangeType === 'money' && task.paymentStatus && (
              <View style={styles.paymentStatusBadge}>
                <Badge
                  label={PAYMENT_STATUS_LABEL[task.paymentStatus]}
                  bg={Colors.warningLight}
                  color={Colors.warningDark}
                  size="sm"
                />
              </View>
            )}
          </View>
        </Card>

        <SectionHeader title="Required skills" />
        <View style={styles.skillsRow}>
          {task.skills.map((s) => (
            <SkillTag key={s.id} label={s.name} />
          ))}
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Deadline</Text>
              <Text style={styles.metaValue}>{formatDeadline(task.deadline)}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <View style={[styles.metaIconWrap, { backgroundColor: Colors.accentLight }]}>
              <Ionicons name="ribbon-outline" size={16} color={Colors.accentDark} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Skills needed</Text>
              <Text style={styles.metaValue}>{task.skills.length} required</Text>
            </View>
          </View>
        </View>

        {isOwner && (
          <>
            <SectionHeader
              title="Interested helpers"
              right={interests.length > 0 ? <Text style={styles.interestCount}>{interests.length}</Text> : undefined}
            />
            {interestsLoading ? (
              <LoadingIndicator label="Loading interest…" />
            ) : interestsError ? (
              <EmptyState icon="cloud-offline-outline" title="Couldn't load interest" subtitle={interestsError} />
            ) : interests.length === 0 ? (
              <View style={styles.inlineEmpty}>
                <EmptyState
                  icon="people-outline"
                  title="No interest yet"
                  subtitle="Helpers who want to work on this will show up here."
                />
              </View>
            ) : (
              <View style={styles.interestsList}>
                {interests.map((interest) => (
                  <View key={interest.id} style={styles.interestRowWrap}>
                    <UserCard
                      user={interest.helper}
                      onPress={() => navigation.navigate('Conversation', { taskInterestId: interest.id })}
                      onMoreOptions={(userId, userName) => presentUserActions(userId, userName)}
                    />
                    {canReassignHelper && !interest.accepted && (
                      <Button
                        label={hasAcceptedHelper ? 'Change Helper' : 'Accept as Helper'}
                        icon="checkmark-circle-outline"
                        variant="outline"
                        size="sm"
                        fullWidth={false}
                        loading={acceptingId === interest.id}
                        onPress={() => handleAcceptOrChangeHelper(interest)}
                        style={styles.interestActionButton}
                      />
                    )}
                    {canReassignHelper && interest.accepted && (
                      <View style={styles.acceptedBadgeRow}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text style={styles.acceptedBadgeText}>Accepted helper</Text>
                      </View>
                    )}
                    {task.status === 'in_progress' && interest.accepted && (
                      <View style={styles.acceptedBadgeRow}>
                        <Ionicons name="lock-closed" size={14} color={Colors.success} />
                        <Text style={styles.acceptedBadgeText}>Accepted Helper</Text>
                      </View>
                    )}
                    {task.status === 'completed' && interest.accepted && (
                      myReview ? (
                        <View style={styles.acceptedBadgeRow}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                          <Text style={styles.acceptedBadgeText}>You reviewed them</Text>
                        </View>
                      ) : (
                        <Button
                          label={`Rate ${interest.helper.name.split(' ')[0]}`}
                          icon="star-outline"
                          variant="outline"
                          size="sm"
                          fullWidth={false}
                          onPress={() => presentRating(task.id, interest.helper.id, interest.helper.name)}
                          style={styles.interestActionButton}
                        />
                      )
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.postedText}>Posted {formatDateLong(task.createdAt)}</Text>
      </ScrollView>

      {showOwnerFooter && (
        <View style={styles.footer}>
          <Button label="Find Matches" icon="flash" size="lg" loading={findingMatches} onPress={handleFindMatches} />
          {hasAcceptedHelper && canReassignHelper && (
            <Button
              label="Start Task"
              icon="play-circle-outline"
              variant="secondary"
              size="sm"
              loading={startingTask}
              onPress={handleStartTask}
              style={styles.startTaskButton}
            />
          )}
          <View style={styles.ownerActionsRow}>
            <Button
              label="Mark as Completed"
              icon="checkmark-done"
              variant="outline"
              size="sm"
              loading={statusActionLoading === 'completed'}
              onPress={() => handleChangeStatus('completed')}
              style={styles.ownerActionButton}
            />
            <Button
              label="Cancel Task"
              icon="close-circle"
              variant="danger"
              size="sm"
              loading={statusActionLoading === 'cancelled'}
              onPress={handleCancelTask}
              style={styles.ownerActionButton}
            />
          </View>
        </View>
      )}

      {showHelperFooter && (
        <View style={styles.footer}>
          {!isClosed && (
            <Button
              label={myInterest ? 'Interested ✓' : 'I can help with this'}
              icon={myInterest ? 'checkmark-circle' : 'hand-left-outline'}
              variant={myInterest ? 'secondary' : 'primary'}
              size="lg"
              loading={interestActionLoading}
              onPress={handleToggleInterest}
            />
          )}
          {myInterest && (
            <Button
              label="Message"
              icon="chatbubble-ellipses-outline"
              variant="outline"
              size="lg"
              style={styles.messageButtonSpacing}
              onPress={() => navigation.navigate('Conversation', { taskInterestId: myInterest.id })}
            />
          )}
          {task.status === 'completed' &&
            myInterest?.accepted &&
            (myReview ? (
              <View style={[styles.acceptedBadgeRow, styles.messageButtonSpacing]}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.acceptedBadgeText}>You reviewed {task.poster.name.split(' ')[0]}</Text>
              </View>
            ) : (
              <Button
                label={`Rate ${task.poster.name.split(' ')[0]}`}
                icon="star-outline"
                variant="outline"
                size="lg"
                style={styles.messageButtonSpacing}
                onPress={() => presentRating(task.id, task.poster.id, task.poster.name)}
              />
            ))}
        </View>
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

      <RatingModal
        visible={ratingModalVisible}
        title={ratingModalTitle}
        onClose={closeRatingModal}
        onSubmit={async (rating, body) => {
          await submitRating(rating, body);
          closeRatingModal();
          if (task && session) {
            const refreshed = await reviewService.fetchMyReviewForTask(task.id, session.user.id);
            setMyReview(refreshed);
          }
          Alert.alert('Thanks', 'Your review has been submitted.');
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
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    marginBottom: Spacing.md,
  },
  posterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    marginBottom: Spacing.lg,
  },
  posterText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  posterName: {
    ...Typography.bodySemibold,
  },
  posterMeta: {
    ...Typography.caption,
    marginTop: 2,
  },
  description: {
    ...Typography.bodyLg,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    marginBottom: Spacing.lg,
  },
  offerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  offerTextWrap: {
    flex: 1,
  },
  offerLabel: {
    ...Typography.caption,
  },
  offerValue: {
    ...Typography.bodySemibold,
    marginTop: 2,
  },
  paymentStatusBadge: {
    marginTop: Spacing.xs,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.sm,
  },
  metaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  metaLabel: {
    ...Typography.caption,
  },
  metaValue: {
    ...Typography.bodySemibold,
    fontSize: 13,
  },
  interestCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  interestsList: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  interestRowWrap: {
    gap: Spacing.xs,
  },
  interestActionButton: {
    alignSelf: 'flex-end',
  },
  acceptedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  acceptedBadgeText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '600',
  },
  inlineEmpty: {
    marginHorizontal: -Spacing.md,
    marginBottom: Spacing.sm,
  },
  postedText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  messageButtonSpacing: {
    marginTop: Spacing.sm,
  },
  startTaskButton: {
    marginTop: Spacing.sm,
  },
  ownerActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ownerActionButton: {
    flex: 1,
  },
});

export default TaskDetailsScreen;
