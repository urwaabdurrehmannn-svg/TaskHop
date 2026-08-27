/**
 * Skill names are shared, DB-wide vocabulary (see skills table), so they're
 * normalized client-side before every insert/upsert to keep "video editing"
 * and "Video Editing" from becoming two separate rows.
 */
export function normalizeSkillName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
