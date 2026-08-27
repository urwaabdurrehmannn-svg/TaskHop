import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { TaskCategory } from '../types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface CategoryMeta {
  name: TaskCategory;
  icon: IconName;
}

export const CATEGORIES: CategoryMeta[] = [
  { name: 'Design & Creative', icon: 'color-palette' },
  { name: 'Video & Photo', icon: 'videocam' },
  { name: 'Writing & Editing', icon: 'create' },
  { name: 'Tech & Dev', icon: 'code-slash' },
  { name: 'Tutoring & Academics', icon: 'school' },
  { name: 'Events & Errands', icon: 'calendar' },
  { name: 'Music & Audio', icon: 'musical-notes' },
  { name: 'Other', icon: 'sparkles' },
];

export function getCategoryIcon(name: TaskCategory) {
  return CATEGORIES.find((c) => c.name === name)?.icon ?? 'sparkles';
}
