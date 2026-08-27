import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { StarRating } from '../common/StarRating';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface RatingModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Should throw on failure -- the modal shows the error inline and stays open. */
  onSubmit: (rating: number, body: string) => Promise<void>;
}

/** Star rating + optional written review, shared by both "rate the helper" and "rate the owner" flows. Same shape as ReportModal. */
export function RatingModal({ visible, title, onClose, onSubmit }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRating(0);
    setBody('');
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (rating < 1) {
      setError('Choose a star rating.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(rating, body);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your review. Please try again.');
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
            <Text style={styles.label}>Rating</Text>
            <View style={styles.starsWrap}>
              <StarRating rating={rating} size={32} onChange={setRating} />
            </View>

            <Input
              label="Written review (optional)"
              placeholder="How did it go?"
              value={body}
              onChangeText={setBody}
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
              label="Submit review"
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
  starsWrap: {
    marginBottom: Spacing.md,
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

export default RatingModal;
