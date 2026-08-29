/**
 * TaskHop design system — motion tokens.
 * One shared set of durations/spring configs so every screen's animation
 * shares the same feel instead of ad hoc numbers per component. Durations
 * follow standard mobile micro-interaction guidance (150-300ms); nothing
 * here should be used for a loop or an animation longer than ~400ms.
 */

/** Timing durations, in ms. */
export const Duration = {
  /** Chip/badge selection, icon swaps. */
  fast: 150,
  /** Fades, card entrance, filter transitions. */
  base: 220,
  /** Sheet/modal presentation, larger layout shifts. */
  slow: 320,
} as const;

/** Reanimated spring configs, named by where they're used. */
export const Spring = {
  /** Press-scale feedback on buttons/cards — quick, minimal overshoot. */
  press: { damping: 18, stiffness: 380, mass: 0.5 },
  /** Selection state changes (chips, tabs) — snappy, slight settle. */
  select: { damping: 16, stiffness: 260, mass: 0.6 },
  /** Bottom sheet / modal presentation — natural, slightly weightier. */
  sheet: { damping: 24, stiffness: 260, mass: 0.9 },
  /** List/card entrance — gentle, no bounce. */
  entrance: { damping: 22, stiffness: 180, mass: 0.9 },
} as const;

/** Press-scale amount used across Button/Card/TaskCard for consistency. */
export const PressScale = {
  /** Standard interactive surfaces (buttons, cards). */
  default: 0.97,
  /** Small tap targets (chips, icon buttons) — a touch more travel reads better at small size. */
  small: 0.94,
} as const;

/** Stagger delay between consecutive list-entrance items, in ms. */
export const StaggerStep = 40;
