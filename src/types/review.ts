import type { User } from './user';

export interface Review {
  id: string;
  taskId: string;
  reviewerId: string;
  reviewer: User;
  reviewedUserId: string;
  rating: number;
  body: string | null;
  createdAt: string;
}

export interface ReviewStats {
  average: number;
  count: number;
}
