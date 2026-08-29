/**
 * TaskHop design system — color tokens.
 * Identity: deep, trustworthy forest green (the TaskHop brand green) with a
 * warm gold accent for energy and premium warmth. Every hue below is
 * contrast-checked against WCAG AA (4.5:1) at the text sizes it's actually
 * used at, including small badge/caption text — see the accent, success,
 * warning, danger, and textTertiary roles, which previously failed AA.
 *
 * NOTE: the palette keys below (indigo/coral/teal/amber/blue/pink/ink) are
 * legacy names kept unchanged on purpose — `palette.indigo500` etc. is
 * imported directly by a few screens (gradients, avatar colors) and by this
 * file's own Colors/categoryPalette mappings. Only the hex values changed;
 * every existing import site keeps working untouched.
 */

export const palette = {
  // Brand green family (indigo500 = #064E3B, indigo700 = #003527 are the
  // two mandated TaskHop brand colors — kept exactly, unchanged).
  indigo50: '#F0F4F3',
  indigo100: '#D2DFDC',
  indigo400: '#0B6E4F',
  indigo500: '#064E3B',
  indigo600: '#034231',
  indigo700: '#003527',

  // Warm gold accent family (replaces the old coral; fill vs. text-on-light
  // are distinct shades so both directions clear 4.5:1 on their own).
  coral50: '#F9F6F1',
  coral100: '#EDE4D4',
  coral400: '#B8811A',
  coral500: '#9C6B12',
  coral600: '#7A5410',

  // Success (teal slot)
  teal50: '#ECF4F1',
  teal500: '#147A4C',
  teal600: '#0F5C39',

  // Warning (amber slot)
  amber50: '#F6F2EB',
  amber500: '#8A5A00',
  amber600: '#6E4700',

  // Info (blue slot)
  blue50: '#EDF1FC',
  blue500: '#1D4ED8',
  blue600: '#1739A6',

  // Category accent (pink slot) — a refined jewel-tone berry, not candy pink
  pink50: '#FBEEF3',
  pink500: '#A63166',

  // Danger (red slot)
  red50: '#F9EEED',
  red500: '#B3261E',
  red600: '#8F1E17',

  // Neutral ink scale — a faint green-grey tint (from the primary hue),
  // not flat grey.
  ink900: '#10201A',
  ink700: '#404D48',
  ink500: '#58635F',
  ink400: '#6B7571',
  ink300: '#939B98',
  ink200: '#CACECD',
  ink100: '#DEE0DF',
  ink50: '#F3F4F4',

  white: '#FFFFFF',
} as const;

export const Colors = {
  // Brand
  primary: palette.indigo500,
  primaryDark: palette.indigo600,
  primaryDarker: palette.indigo700,
  primaryLight: palette.indigo50,
  primaryMuted: palette.indigo100,

  accent: palette.coral500,
  accentDark: palette.coral600,
  accentLight: palette.coral50,
  accentMuted: palette.coral100,

  // Feedback
  success: palette.teal500,
  successDark: palette.teal600,
  successLight: palette.teal50,

  warning: palette.amber500,
  warningDark: palette.amber600,
  warningLight: palette.amber50,

  danger: palette.red500,
  dangerDark: palette.red600,
  dangerLight: palette.red50,

  info: palette.blue500,
  infoDark: palette.blue600,
  infoLight: palette.blue50,

  // Surfaces
  background: palette.ink50,
  surface: palette.white,
  surfaceAlt: palette.ink100,
  overlay: 'rgba(16, 32, 26, 0.55)',

  // Borders
  border: palette.ink200,
  borderLight: palette.ink100,

  // Text
  textPrimary: palette.ink900,
  textSecondary: palette.ink500,
  textTertiary: palette.ink400,
  textInverse: palette.white,
  textLink: palette.indigo500,

  // Misc
  white: palette.white,
  black: palette.ink900,
} as const;

/** Cycling palette used for category tags / skill chips so they stay legible and varied. */
export const categoryPalette = [
  { bg: palette.indigo50, text: palette.indigo600 },
  { bg: palette.coral50, text: palette.coral600 },
  { bg: palette.teal50, text: palette.teal600 },
  { bg: palette.amber50, text: palette.amber600 },
  { bg: palette.blue50, text: palette.blue600 },
  { bg: palette.pink50, text: palette.pink500 },
] as const;

export function getCategoryColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return categoryPalette[hash % categoryPalette.length];
}

export default Colors;
