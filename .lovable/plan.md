# Plan

## 1. Remove crown badge, use gold border on VIP cards

In `src/components/members/MemberCard.tsx`:
- Remove the `<Crown>` badge block (and the `Crown` import).
- When `member.is_vip` is true and the member is not expired/frozen, switch the card's left border + subtle background tint to gold (semantic token `--vip` added to `index.css` and `tailwind.config.ts`, e.g. amber/gold HSL).
- Active VIP: `border-l-vip bg-vip/5`. Expired/frozen styling still wins (so the red/blue state remains visible).
- Also remove the small inline VIP badge next to the member ID.

Apply the same gold-border treatment in:
- `MemberDetailsSheet.tsx` header area (replace crown badge with gold tint on the name block).
- `DigitalMemberCard.tsx` if it shows a crown.
- `MemberPortal.tsx`: drop the "⭐ VIP" Badge, tint the header/status card gold instead.

No business-logic changes to revenue filtering — `revenueFilter.ts` and the whitelist stay as is.

## 2. VIP auto-expires after 30 days

**Schema** (migration):
- Add column `members.vip_started_at timestamptz null`.
- Backfill: for every member where `is_vip = true`, set `vip_started_at = now()` (so today's VIPs get a fresh 30-day window).
- Add a trigger on `members` BEFORE UPDATE: when `is_vip` flips from false→true, set `vip_started_at = now()`; when it flips true→false, clear `vip_started_at`.

**Auto-clear job:**
- New edge function `auto-expire-vip` that runs daily. It executes:
  `UPDATE members SET is_vip = false, vip_started_at = null WHERE is_vip = true AND vip_started_at < now() - interval '30 days'`.
- Schedule with pg_cron (daily at 02:00), using `supabase--insert` (not migration) so the function URL + anon key aren't committed.

**Frontend safety net (optional but cheap):**
- In any place that reads `is_vip`, treat it as effectively false if `vip_started_at` is older than 30 days. Keeps UI correct even before the daily job runs. Done via a tiny helper `isCurrentlyVip(member)` in `src/lib/vip.ts`.

**UI:**
- In `MemberDetailsSheet.tsx`, show a small line under the VIP toggle: "VIP active until DD/MM/YYYY (auto-expires in N days)" when `vip_started_at` is set.

## 3. Password-protected payment edit/delete (secret + edge function)

**Secret:** add a new runtime secret `ADMIN_PAYMENT_PASSWORD` (value `Marrion23718#`) via the secrets tool. The password will never appear in client code or the repo.

**Edge function** `verify-admin-password`:
- POST { password: string }.
- Verifies the caller's JWT, confirms the user has the `admin` role via `has_role` RPC.
- Compares submitted password against `Deno.env.get("ADMIN_PAYMENT_PASSWORD")` using a constant-time compare.
- Returns `{ ok: true, token: <short-lived signed value> }` on success, 401 otherwise. (Token is a simple in-memory nonce stored in a new `admin_password_grants` table with 5-minute TTL.)

**Schema:** small table `admin_password_grants(id, user_id, expires_at)` with RLS so only the owning admin can read their grant. Used by `EditPaymentDialog` delete/save paths.

**Frontend:**
- In `EditPaymentDialog.tsx`, before calling update or delete, if no unexpired grant exists, open a password prompt dialog. On submit, call `verify-admin-password`; on success, store the grant id + expiry in component state and proceed. Subsequent edits within the 5-minute window skip the prompt.
- Show a clear error toast for wrong password (sanitized, no DB codes).

This satisfies "admin password to delete or update payments" while keeping the secret out of the JS bundle.

## Technical notes

- New semantic token `--vip` (warm gold, e.g. `45 90% 55%` light, `45 80% 60%` dark) added to `index.css` and registered in `tailwind.config.ts` so `border-l-vip` / `bg-vip/5` work.
- New file `src/lib/vip.ts` exporting `isCurrentlyVip(member)` and `vipDaysRemaining(member)`.
- pg_cron + pg_net must be enabled (one-time) before scheduling the daily job.
- Existing `revenueFilter.ts` keeps working — `vip_started_at` does not affect the whitelist.

## Files touched

- `supabase/migrations/*` — add `vip_started_at`, trigger, `admin_password_grants` table + RLS, enable pg_cron/pg_net.
- `supabase/functions/auto-expire-vip/index.ts` — new.
- `supabase/functions/verify-admin-password/index.ts` — new.
- `src/index.css`, `tailwind.config.ts` — add `--vip` token.
- `src/lib/vip.ts` — new helpers.
- `src/components/members/MemberCard.tsx` — remove crown, use gold border.
- `src/components/members/MemberDetailsSheet.tsx` — remove crown badge, gold tint, show VIP countdown.
- `src/components/members/EditPaymentDialog.tsx` — password gate via edge function.
- `src/components/DigitalMemberCard.tsx`, `src/pages/MemberPortal.tsx` — remove crown/star, gold tint.
- `mem://index.md` — update the "frontend passwords are never secure" core rule to reflect the new server-verified password flow.
