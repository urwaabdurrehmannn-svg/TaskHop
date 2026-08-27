const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** "Today", "Tomorrow", "In 3 days", or a short date — relative to now. */
export function formatDeadline(isoDate: string, now: Date = new Date()): string {
  const deadline = new Date(isoDate);
  const diffDays = Math.round((deadline.getTime() - now.getTime()) / MS_PER_DAY);

  if (diffDays < 0) return 'Past due';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return `Due ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function formatDateLong(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
