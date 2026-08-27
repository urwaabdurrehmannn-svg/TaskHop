import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as reportService from '../services/trust/reportService';
import * as blockService from '../services/trust/blockService';
import type { ActionMenuOption } from '../components/trust/ActionMenu';
import type { ReportReason } from '../types/trust';

interface ReportTarget {
  type: 'user' | 'task';
  id: string;
  label: string;
}

interface MenuState {
  title?: string;
  options: ActionMenuOption[];
}

/**
 * Centralizes the Report/Block flows so screens don't each re-implement the
 * same menu, confirmation, and submission logic. Every mutation is called
 * with the current session's own id -- RLS (0009_trust_safety.sql) is the
 * actual authority that ids can't be forged, this is just where the app
 * gathers the current user's id to send.
 */
export function useReportBlockActions() {
  const { session } = useAuth();
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  function closeMenu() {
    setMenu(null);
  }

  // Kept as a native Alert -- always exactly 2 buttons (Cancel/Block), which
  // renders reliably on every platform. Not the menu that was dropping Cancel.
  function confirmBlock(userId: string, userName: string, onBlocked?: () => void) {
    Alert.alert(
      `Block ${userName}?`,
      "They won't be able to message you or connect on new tasks, and won't appear in your Matches. This won't affect your existing conversations.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              await blockService.blockUser(session.user.id, userId);
              Alert.alert('Blocked', `You won't hear from ${userName} anymore.`);
              onBlocked?.();
            } catch (err) {
              Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
            }
          },
        },
      ]
    );
  }

  /** Report User / Block User menu -- for contexts with just a person (Conversation, Match card, Interested Helpers). */
  function presentUserActions(userId: string, userName: string, onBlocked?: () => void) {
    if (!session) return;
    setMenu({
      title: userName,
      options: [
        {
          key: 'report-user',
          label: `Report ${userName}`,
          onPress: () => setReportTarget({ type: 'user', id: userId, label: userName }),
        },
        {
          key: 'block',
          label: `Block ${userName}`,
          destructive: true,
          onPress: () => confirmBlock(userId, userName, onBlocked),
        },
      ],
    });
  }

  /** Report User / Report Task / Block User menu -- for Task Details, where both a poster and a task are in view. */
  function presentTaskDetailActions(
    task: { posterId: string; posterName: string; taskId: string; taskTitle: string },
    onBlocked?: () => void
  ) {
    if (!session) return;
    setMenu({
      title: task.posterName,
      options: [
        {
          key: 'report-user',
          label: `Report ${task.posterName}`,
          onPress: () => setReportTarget({ type: 'user', id: task.posterId, label: task.posterName }),
        },
        {
          key: 'report-task',
          label: 'Report this task',
          onPress: () => setReportTarget({ type: 'task', id: task.taskId, label: task.taskTitle }),
        },
        {
          key: 'block',
          label: `Block ${task.posterName}`,
          destructive: true,
          onPress: () => confirmBlock(task.posterId, task.posterName, onBlocked),
        },
      ],
    });
  }

  async function submitReport(reason: ReportReason, description: string) {
    if (!session || !reportTarget) return;
    if (reportTarget.type === 'user') {
      await reportService.reportUser(session.user.id, reportTarget.id, reason, description);
    } else {
      await reportService.reportTask(session.user.id, reportTarget.id, reason, description);
    }
  }

  function closeReportModal() {
    setReportTarget(null);
  }

  function onReportSubmitted() {
    setReportTarget(null);
    Alert.alert('Thanks', 'Your report has been submitted. Our team will review it.');
  }

  return {
    menuVisible: !!menu,
    menuTitle: menu?.title,
    menuOptions: menu?.options ?? [],
    closeMenu,
    reportModalVisible: !!reportTarget,
    reportModalTitle: reportTarget ? `Report ${reportTarget.label}` : '',
    presentUserActions,
    presentTaskDetailActions,
    submitReport,
    closeReportModal,
    onReportSubmitted,
  };
}
