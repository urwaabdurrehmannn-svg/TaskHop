import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { ReportReason } from '../../types/trust';

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'scam_fraud', label: 'Scam or fraud' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_information', label: 'Fake information' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

interface ReportModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Should throw on failure -- the modal shows the error inline and stays open. */
  onSubmit: (reason: ReportReason, description: string) => Promise<void>;
}

/** Reusable reason + optional-description form, shared by Report User and Report Task. */
export function ReportModal({ visible, title, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason(null);
    setDescription('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!reason) {
      setError('Choose a reason for this report.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(reason, description);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your report. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.label}>Reason</Text>
            <View style={styles.reasonGrid}>
              {REASON_OPTIONS.map((opt) => {
                const isActive = reason === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setReason(opt.value)}
                    style={[styles.reasonChip, isActive && styles.reasonChipActive]}
                  >
                    <Text style={[styles.reasonChipText, isActive && styles.reasonChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Additional details (optional)"
              placeholder="Anything that would help us understand what happened."
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actionsRow}>
            <Button
              label="Cancel"
              onPress={handleClose}
              variant="outline"
              size="lg"
              disabled={submitting}
              style={styles.actionButton}
            />
            <Button
              label="Submit report"
              onPress={handleSubmit}
              loading={submitting}
              size="lg"
              style={styles.actionButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    marginRight: Spacing.sm,
  },
  scroll: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  reasonChip: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  reasonChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reasonChipText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  reasonChipTextActive: {
    color: Colors.textInverse,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.dangerDark,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
});

export default ReportModal;
