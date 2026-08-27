/**
 * TaskHop design system — color tokens.
 * Identity: intelligent + trustworthy (indigo) with human energy (coral).
 */

export const palette = {
  indigo50: '#EDEBFF',
  indigo100: '#DCD8FF',
  indigo400: '#7C6FF5',
  indigo500: '#5B4EF2',
  indigo600: '#4A3DE0',
  indigo700: '#3C2FC4',

  coral50: '#FFEDE8',
  coral100: '#FFDACF',
  coral400: '#FF8266',
  coral500: '#FF6B4E',
  coral600: '#E8532F',

  teal50: '#E1F7F0',
  teal500: '#0FA379',
  teal600: '#0B8B67',

  amber50: '#FFF4DE',
  amber500: '#DB9A16',
  amber600: '#B5790A',

  blue50: '#E4F0FF',
  blue500: '#2F6FE4',

  pink50: '#FFE7F3',
  pink500: '#D6336C',

  red50: '#FDECEC',
  red500: '#E5484D',
  red600: '#C4383D',

  ink900: '#14121F',
  ink700: '#312D45',
  ink500: '#605C74',
  ink400: '#8B879C',
  ink300: '#B6B3C4',
  ink200: '#DEDCE8',
  ink100: '#EEEDF5',
  ink50: '#F7F7FC',

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

  // Surfaces
  background: palette.ink50,
  surface: palette.white,
  surfaceAlt: palette.ink100,
  overlay: 'rgba(20, 18, 31, 0.55)',

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
  { bg: palette.blue50, text: '#1D4FB0' },
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
