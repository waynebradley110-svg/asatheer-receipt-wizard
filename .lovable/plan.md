
# Extend Renewal Feature

## Overview
Add an "extend renewal" capability that preserves remaining membership days when a member renews before their current subscription expires.

## Current Behavior (Problem)
When renewing a membership today:
- Start date = Payment date (e.g., today: January 27)
- Expiry = Start + Plan duration

**Example**: Member has Gym expiring February 15. They renew today with a 1-month plan:
- Current logic: New expiry = January 27 + 1 month = **February 27** (loses 19 days!)

## New Behavior (Extend Renewal)
When the member has an active subscription in the selected zone:
- New expiry = Current expiry date + Plan duration

**Same Example**: Member has Gym expiring February 15. They renew today with 1-month plan:
- Extended logic: New expiry = February 15 + 1 month = **March 15** (preserves all days!)

---

## User Interface Changes

### Renewal Dialog Enhancements

When a zone is selected, the system will check if there's an active subscription in that zone:

**If active subscription exists:**
```
┌─────────────────────────────────────────────────────┐
│ ℹ️ Active Membership Detected                       │
├─────────────────────────────────────────────────────┤
│ Current Expiry:    15/02/2026 (19 days remaining)  │
│ New Plan:          1 Month                          │
│ ─────────────────────────────────────────────────── │
│ New Expiry:        15/03/2026 ✓                    │
└─────────────────────────────────────────────────────┘
```

**If no active subscription (expired or first time):**
```
┌─────────────────────────────────────────────────────┐
│ New Membership                                      │
├─────────────────────────────────────────────────────┤
│ Start Date:        27/01/2026                       │
│ Plan:              1 Month                          │
│ ─────────────────────────────────────────────────── │
│ Expiry Date:       27/02/2026                       │
└─────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### 1. Add Helper Function to Find Active Service
```typescript
const getActiveServiceForZone = (member: any, zone: string) => {
  return member?.member_services?.find((s: any) => 
    s.zone === zone && 
    s.is_active && 
    new Date(s.expiry_date) >= new Date()
  );
};
```

### 2. Modify `handleRenewalSubmit` Logic
```typescript
// Check for active service in the selected zone
const activeService = getActiveServiceForZone(renewingMember, formData.zone);

let startDate, expiryDate;

if (activeService) {
  // EXTEND: Add duration on top of current expiry
  startDate = new Date(formData.payment_date);
  expiryDate = calculateExpiryDate(
    new Date(activeService.expiry_date), 
    formData.subscription_plan
  );
} else {
  // FRESH: Start from payment date
  startDate = new Date(formData.payment_date);
  expiryDate = calculateExpiryDate(startDate, formData.subscription_plan);
}
```

### 3. Add Preview Section in Renewal Dialog UI
Add a calculated preview section that updates when zone and plan are selected:
- Shows current expiry (if active)
- Shows days remaining
- Shows selected plan duration
- Shows calculated new expiry date

### 4. State for Preview Calculation
```typescript
const renewalPreview = useMemo(() => {
  if (!renewingMember || !formData.zone || !formData.subscription_plan) {
    return null;
  }
  
  const activeService = getActiveServiceForZone(renewingMember, formData.zone);
  const paymentDate = new Date(formData.payment_date);
  
  if (activeService) {
    const currentExpiry = new Date(activeService.expiry_date);
    const daysRemaining = Math.ceil(
      (currentExpiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const newExpiry = calculateExpiryDate(currentExpiry, formData.subscription_plan);
    
    return {
      isExtension: true,
      currentExpiry,
      daysRemaining,
      newExpiry
    };
  } else {
    const newExpiry = calculateExpiryDate(paymentDate, formData.subscription_plan);
    return {
      isExtension: false,
      startDate: paymentDate,
      newExpiry
    };
  }
}, [renewingMember, formData.zone, formData.subscription_plan, formData.payment_date]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Members.tsx` | Add helper function, modify renewal submit logic, add preview UI section in renewal dialog |

---

## Validation Checklist

| Scenario | Expected Result |
|----------|-----------------|
| Renew active gym (expires Feb 15) with 1 month | New expiry = Mar 15 |
| Renew expired gym with 1 month | New expiry = Payment date + 1 month |
| Renew PT (no active PT service) with 3 months | New expiry = Payment date + 3 months |
| Preview shows correct calculation before submit | Yes |
| Days remaining displayed for active memberships | Yes |
