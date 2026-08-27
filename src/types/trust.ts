import type { User } from './user';

export type ReportReason =
  | 'scam_fraud'
  | 'harassment'
  | 'fake_information'
  | 'inappropriate_behavior'
  | 'spam'
  | 'other';

export type ReportTargetType = 'user' | 'task';
export type ReportStatus = 'open' | 'reviewed' | 'resolved';

/** A block the current user has made, with the blocked user's profile for display. */
export interface BlockedUser {
  id: string;
  user: User;
  createdAt: string;
}
