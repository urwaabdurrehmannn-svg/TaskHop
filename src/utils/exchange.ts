import type { ExchangeType, PaymentStatus } from '../types';

/** The app's only supported currency today. No multi-currency support exists. */
export const CURRENCY_PREFIX = 'Rs.';

/** Formats a plain amount as the app's currency, e.g. 2000 -> "Rs. 2,000". */
export function formatOfferAmount(amount: number): string {
  return `${CURRENCY_PREFIX} ${amount.toLocaleString('en-US')}`;
}

/**
 * Label + value are exposed separately (not just the combined one-liner
 * below) so screens that render them in their own layout -- e.g.
 * TaskDetailsScreen's caption-over-value card -- share the same source of
 * truth instead of duplicating this branching.
 *
 * Both accept `null | undefined` even though `ExchangeType` itself is
 * non-nullable in the app's types: this is the graceful-degradation path
 * for a row whose exchange_type doesn't come back as exactly 'money' or
 * 'skill' (missing/legacy/malformed data) -- it must never be silently
 * mislabeled as "Skill exchange" just because it isn't 'money'.
 */
export function exchangeTypeLabel(exchangeType: ExchangeType | null | undefined): string {
  if (exchangeType === 'money') return 'Money';
  if (exchangeType === 'skill') return 'Skill exchange';
  return 'Offer not specified';
}

export function exchangeOfferValue(
  exchangeType: ExchangeType | null | undefined,
  offeredSkill: string | null,
  offeredAmount: number | null
): string {
  if (exchangeType === 'money') {
    return offeredAmount !== null && offeredAmount > 0 ? formatOfferAmount(offeredAmount) : 'Amount not specified';
  }
  if (exchangeType === 'skill') {
    return offeredSkill && offeredSkill.trim() ? offeredSkill : 'Not specified';
  }
  return 'Not specified';
}

/** One-line summary of what a task offers in exchange, e.g. "Money — Rs. 2,000" or "Skill exchange — Poster design". */
export function describeExchange(
  exchangeType: ExchangeType | null | undefined,
  offeredSkill: string | null,
  offeredAmount: number | null
): string {
  if (exchangeType !== 'money' && exchangeType !== 'skill') {
    return 'Offer not specified';
  }
  return `${exchangeTypeLabel(exchangeType)} — ${exchangeOfferValue(exchangeType, offeredSkill, offeredAmount)}`;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  payment_pending: 'Payment pending',
  paid: 'Paid',
};
