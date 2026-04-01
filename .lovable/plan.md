

# Fix: Show "Frozen" Status on Member Cards

## Problem
All member cards still show "Active" even though their services have `freeze_status = 'frozen'` in the database. The status logic only checks `expiry_date` and `is_active` — it completely ignores `freeze_status`.

## Changes

### 1. Add `freeze_status` to MemberService interfaces
In `MemberCard.tsx`, `MemberDetailsSheet.tsx`, and `MemberFilters.tsx`, add `freeze_status?: string | null` to the `MemberService` interface.

### 2. Update `getMemberStatus` in all 3 locations
The function exists in `MemberCard.tsx`, `MemberDetailsSheet.tsx`, and `Members.tsx`. Update all three to return `"frozen"` when all active services have `freeze_status = 'frozen'`:

```typescript
const getMemberStatus = (member) => {
  const activeServices = member.member_services?.filter(s => s.is_active && new Date(s.expiry_date) >= new Date());
  if (!activeServices?.length) return "expired";
  const allFrozen = activeServices.every(s => s.freeze_status === 'frozen');
  if (allFrozen) return "frozen";
  return "active";
};
```

### 3. Update `MemberCard.tsx` UI
- Add a third status: frozen (blue/ice themed badge with "Frozen" text)
- Show a snowflake icon instead of checkmark for frozen members
- Border color: blue/primary for frozen cards

### 4. Update `MemberDetailsSheet.tsx` UI
- Show "Frozen" badge with appropriate styling
- Each frozen service pill should show a snowflake indicator

### 5. Update `getServiceStatus` in `MemberCard.tsx`
Check `freeze_status` on individual services too, so service badges show "Frozen" instead of "Active".

### 6. Update filter/stats in `Members.tsx` and `MemberFilters.tsx`
- Add "Frozen" as a filter option alongside Active/Expired
- Show frozen count in the stats bar

### Files to modify
- `src/components/members/MemberCard.tsx` — interface, status logic, UI
- `src/components/members/MemberDetailsSheet.tsx` — interface, status logic, UI
- `src/components/members/MemberFilters.tsx` — interface, frozen filter option, stats
- `src/pages/Members.tsx` — `getMemberStatus` logic, stats calculation, filter logic

