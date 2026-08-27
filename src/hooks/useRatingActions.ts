import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as reviewService from '../services/reviews/reviewService';

interface RatingTarget {
  taskId: string;
  reviewedUserId: string;
  reviewedUserName: string;
}

/** Mirrors useReportBlockActions's shape -- centralizes the "open the rating modal, submit, close" flow. */
export function useRatingActions() {
  const { session } = useAuth();
  const [target, setTarget] = useState<RatingTarget | null>(null);

  function presentRating(taskId: string, reviewedUserId: string, reviewedUserName: string) {
    setTarget({ taskId, reviewedUserId, reviewedUserName });
  }

  function closeRatingModal() {
    setTarget(null);
  }

  async function submitRating(rating: number, body: string) {
    if (!session || !target) return;
    await reviewService.submitReview(target.taskId, session.user.id, target.reviewedUserId, rating, body);
  }

  return {
    ratingModalVisible: !!target,
    ratingModalTitle: target ? `Rate ${target.reviewedUserName}` : '',
    presentRating,
    submitRating,
    closeRatingModal,
  };
}
