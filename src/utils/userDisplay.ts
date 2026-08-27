import { palette } from '../constants/colors';

const AVATAR_COLORS = [
  palette.indigo500,
  palette.coral500,
  palette.teal500,
  palette.amber500,
  palette.blue500,
  palette.pink500,
  palette.indigo400,
];

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic so the same user always gets the same avatar color. */
export function avatarColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
