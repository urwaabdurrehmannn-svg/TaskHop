import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, AvatarSize } from '../common/Avatar';
import { StarRating } from '../common/StarRating';
import { EmptyState } from '../common/EmptyState';
import { Colors } from '../../constants/colors';
import { Radius, Shadow, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { Review } from '../../types/review';

interface ReviewsListProps {
  reviews: Review[];
  emptySubtitle: string;
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Shared between ProfileScreen (own reviews) and UserProfileScreen (someone else's) so the two stay visually identical. */
export function ReviewsList({ reviews, emptySubtitle }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <View style={styles.inlineEmpty}>
        <EmptyState icon="star-outline" title="No reviews yet" subtitle={emptySubtitle} />
      </View>
    );
  }

  return (
    <View>
      {reviews.map((review) => (
        <View key={review.id} style={[styles.card, Shadow.sm]}>
          <View style={styles.headerRow}>
            <Avatar
              name={review.reviewer.name}
              initials={review.reviewer.initials}
              color={review.reviewer.avatarColor}
              imageUrl={review.reviewer.avatarUrl}
              size={AvatarSize.sm}
            />
            <View style={styles.headerText}>
              <Text style={styles.reviewerName} numberOfLines={1}>
                {review.reviewer.name}
              </Text>
              <Text style={styles.date}>{formatReviewDate(review.createdAt)}</Text>
            </View>
            <StarRating rating={review.rating} size={14} />
          </View>
          {review.body && <Text style={styles.body}>{review.body}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineEmpty: {
    marginBottom: Spacing.lg,
    marginHorizontal: -Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  reviewerName: {
    ...Typography.bodySemibold,
    fontSize: 13,
  },
  date: {
    ...Typography.caption,
    fontSize: 11,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});

export default ReviewsList;
