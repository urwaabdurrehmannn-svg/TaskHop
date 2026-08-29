import * as Haptics from 'expo-haptics';

/**
 * Thin, defensive wrapper around expo-haptics. Wrapped in try/catch because
 * the native module only becomes available after a dev-client rebuild --
 * until then this silently no-ops instead of throwing, so haptics can never
 * crash an interaction.
 *
 * Named by intent, not by API call, and deliberately small: haptics are for
 * meaningful moments (a task published, a selection made, a save toggled),
 * never for every tap.
 */
function safe(fn: () => Promise<void>) {
  try {
    fn().catch(() => {});
  } catch {
    // Native module not linked yet -- no-op.
  }
}

export const haptics = {
  /** A meaningful action completed: task published, rating submitted, profile saved. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** A discrete choice was made: filter chip, category, deadline/exchange option. */
  selection: () => safe(() => Haptics.selectionAsync()),
  /** A light, low-emphasis confirmation: save/bookmark toggle. */
  impactLight: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** A stronger confirmation for a higher-stakes action: accepting a helper, sending an invite. */
  impactMedium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Something failed or needs attention. */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};

export default haptics;
