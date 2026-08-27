import type { Skill, User } from './user';

export type TaskStatus = 'open' | 'matching' | 'in_progress' | 'completed' | 'cancelled';

/** What the task creator offers in return. Not a payment system -- money is recorded, not processed. */
export type ExchangeType = 'skill' | 'money';

/** Reserved for a future escrow/payment feature. Nothing in the app currently sets this to 'paid'. */
export type PaymentStatus = 'payment_pending' | 'paid';

export type TaskCategory =
  | 'Design & Creative'
  | 'Video & Photo'
  | 'Writing & Editing'
  | 'Tech & Dev'
  | 'Tutoring & Academics'
  | 'Events & Errands'
  | 'Music & Audio'
  | 'Other';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  skills: Skill[];
  deadline: string;
  status: TaskStatus;
  poster: User;
  createdAt: string;
  matchCount: number;
  exchangeType: ExchangeType;
  /** Free-text description of what's offered in exchange. Set when exchangeType is 'skill'. */
  offeredSkill: string | null;
  /** Amount offered, in the app's currency (Rs.). Set when exchangeType is 'money'. */
  offeredAmount: number | null;
  paymentStatus: PaymentStatus | null;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  skills: string[];
  deadline: string;
  exchangeType: ExchangeType;
  offeredSkill: string;
  offeredAmount: string;
}
