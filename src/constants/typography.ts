import { Platform, TextStyle } from 'react-native';
import { Colors } from './colors';

/**
 * TaskHop design system — typography tokens.
 * Uses the platform system font for zero load-time cost; hierarchy comes
 * from size, weight, and letter-spacing rather than a custom typeface.
 */

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const FontWeight = {
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
};

export const FontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  display: 30,
  hero: 34,
};

type Preset = TextStyle;

export const Typography: Record<string, Preset> = {
  hero: {
    fontFamily,
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
  },
  display: {
    fontFamily,
    fontSize: FontSize.display,
    fontWeight: FontWeight.extrabold,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
  },
  h1: {
    fontFamily,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: Colors.textPrimary,
  },
  h2: {
    fontFamily,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  bodyLg: {
    fontFamily,
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: 23,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily,
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  bodyMedium: {
    fontFamily,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  bodySemibold: {
    fontFamily,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  label: {
    fontFamily,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    lineHeight: 18,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  caption: {
    fontFamily,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  button: {
    fontFamily,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
};

export default Typography;
