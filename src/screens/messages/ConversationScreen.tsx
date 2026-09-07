import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/common/Header';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingIndicator } from '../../components/common/LoadingIndicator';
import { ReportModal } from '../../components/trust/ReportModal';
import { ActionMenu } from '../../components/trust/ActionMenu';
import { useAuth } from '../../context/AuthContext';
import { useReportBlockActions } from '../../hooks/useReportBlockActions';
import { checkContent } from '../../services/ai/safety';
import * as messageService from '../../services/messages/messageService';
import type { ThreadMeta } from '../../services/messages/messageService';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { describeExchange } from '../../utils/exchange';
import type { RootStackParamList } from '../../navigation/types';
import type { ChatMessage } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ConversationScreen({ route, navigation }: Props) {
  const { taskInterestId } = route.params;
  const { session } = useAuth();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [meta, setMeta] = useState<ThreadMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    setMetaLoading(true);
    setMessagesLoading(true);
    setLoadError(null);

    Promise.all([
      messageService.fetchThreadMeta(taskInterestId, session.user.id),
      messageService.fetchMessages(taskInterestId),
    ])
      .then(([threadMeta, thread]) => {
        if (cancelled) return;
        setMeta(threadMeta);
        setMessages(thread);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load this conversation.');
      })
      .finally(() => {
        if (!cancelled) {
          setMetaLoading(false);
          setMessagesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [taskInterestId, session]);

  useEffect(() => {
    const unsubscribe = messageService.subscribeToNewMessages(taskInterestId, (incoming) => {
      setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
    });
    return unsubscribe;
  }, [taskInterestId]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || !session) return;

    const safety = await checkContent(trimmed, 'message');
    if (safety.flagged) {
      setSendError(safety.reasons[0] ?? 'This message could not be sent.');
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      taskInterestId,
      senderId: session.user.id,
      body: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setSendError(null);

    try {
      const sent = await messageService.sendMessage(taskInterestId, session.user.id, trimmed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? sent : m));
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(trimmed);
      setSendError(err instanceof Error ? err.message : 'Could not send that message.');
    }
  }

  const loading = metaLoading || messagesLoading;

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
      <Header
        title={meta?.otherUser.name ?? 'Conversation'}
        onBack={() => navigation.goBack()}
        rightIcon={meta ? 'ellipsis-horizontal' : undefined}
        onRightPress={() => meta && presentUserActions(meta.otherUser.id, meta.otherUser.name)}
      />

      {meta && (
        <View style={styles.taskBanner}>
          <Ionicons name="briefcase-outline" size={13} color={Colors.textSecondary} />
          <View style={styles.taskBannerTextWrap}>
            <Text style={styles.taskBannerText} numberOfLines={1}>
              About: {meta.taskTitle}
            </Text>
            <Text style={styles.taskBannerOfferText} numberOfLines={1}>
              Offer: {describeExchange(meta.exchangeType, meta.offeredSkill, meta.offeredAmount)}
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <LoadingIndicator label="Loading conversation…" />
        ) : loadError ? (
          <EmptyState icon="cloud-offline-outline" title="Couldn't load this conversation" subtitle={loadError} />
        ) : !meta ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Conversation not found"
            subtitle="It may have been removed."
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="Say hello"
                subtitle={`Start the conversation with ${meta.otherUser.name}.`}
              />
            }
            renderItem={({ item }) => {
              const isMine = item.senderId === session?.user.id;
              return (
                <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
                  </View>
                  <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
                </View>
              );
            }}
          />
        )}

        {meta && (
          <View style={styles.footer}>
            {sendError && <Text style={styles.sendErrorText}>{sendError}</Text>}
            <Input
              placeholder="Message…"
              value={draft}
              onChangeText={setDraft}
              multiline
              rightElement={
                <Pressable onPress={handleSend} style={styles.sendButton} hitSlop={8}>
                  <Ionicons name="send" size={16} color={Colors.textInverse} />
                </Pressable>
              }
            />
          </View>
        )}
      </KeyboardAvoidingView>

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
  taskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  taskBannerTextWrap: {
    flex: 1,
  },
  taskBannerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  taskBannerOfferText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  messageList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  bubbleRow: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomLeftRadius: Radius.xs,
  },
  bubbleText: {
    ...Typography.body,
  },
  bubbleTextMine: {
    color: Colors.textInverse,
  },
  bubbleTime: {
    ...Typography.caption,
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sendErrorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginBottom: Spacing.xxs,
  },
  sendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ConversationScreen;
