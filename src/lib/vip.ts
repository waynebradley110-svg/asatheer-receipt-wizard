// VIP helpers — VIP status auto-expires 30 days after it was turned on.
// The daily edge function `auto-expire-vip` cleans this in the database.
// This helper gives the UI a safety net so an expired VIP is treated as a normal
// member immediately, even before the daily job has run.

export const VIP_DURATION_DAYS = 30;

type VipLike = {
  is_vip?: boolean | null;
  vip_started_at?: string | null;
};

export function isCurrentlyVip(member: VipLike | null | undefined): boolean {
  if (!member?.is_vip) return false;
  if (!member.vip_started_at) return true; // legacy: no start date → treat as active
  const started = new Date(member.vip_started_at).getTime();
  if (Number.isNaN(started)) return true;
  const elapsedDays = (Date.now() - started) / (1000 * 60 * 60 * 24);
  return elapsedDays < VIP_DURATION_DAYS;
}

export function vipDaysRemaining(member: VipLike | null | undefined): number | null {
  if (!member?.is_vip || !member.vip_started_at) return null;
  const started = new Date(member.vip_started_at).getTime();
  if (Number.isNaN(started)) return null;
  const elapsedDays = (Date.now() - started) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(VIP_DURATION_DAYS - elapsedDays));
}

export function vipExpiresAt(member: VipLike | null | undefined): Date | null {
  if (!member?.is_vip || !member.vip_started_at) return null;
  const started = new Date(member.vip_started_at).getTime();
  if (Number.isNaN(started)) return null;
  return new Date(started + VIP_DURATION_DAYS * 24 * 60 * 60 * 1000);
}
