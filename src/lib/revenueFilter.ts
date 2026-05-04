// Whitelist of specific payment receipt IDs that should be counted as revenue
// even when the member is marked as VIP.
// Add payment IDs here for one-off VIP payments that should appear in financial reports.
export const VIP_REVENUE_WHITELIST = new Set<string>([
  // Mohammed Hamid — gym 150 AED (2026-05-03 and 2026-05-04)
  "5e65cf7f-4439-480a-94cf-e40ecd6e9f4a",
  "e470feac-607f-4738-b1fd-3a3974de3764",
]);

type PaymentLike = {
  id?: string;
  members?: { is_vip?: boolean | null } | null;
};

/**
 * Returns true if a payment_receipts row should be included in revenue/financial calculations.
 * Non-VIP members always count. VIP members only count if the payment ID is whitelisted.
 */
export function shouldCountPayment(payment: PaymentLike): boolean {
  const isVip = !!payment?.members?.is_vip;
  if (!isVip) return true;
  return !!payment?.id && VIP_REVENUE_WHITELIST.has(payment.id);
}
