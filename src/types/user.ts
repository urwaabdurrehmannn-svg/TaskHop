export interface Skill {
  id: string;
  name: string;
}

export type Availability = 'available_now' | 'available_soon' | 'busy';

export interface UserStats {
  tasksCompleted: number;
  tasksPosted: number;
  avgRating: number;
  reviewCount: number;
  responseTimeMins: number;
}

export interface CompletedTaskSummary {
  id: string;
  title: string;
  category: string;
  rating: number;
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarColor: string;
  initials: string;
  bio: string;
  university?: string;
  skills: Skill[];
  availability: Availability;
  stats: UserStats;
  completedTasks: CompletedTaskSummary[];
  memberSince: string;
}
