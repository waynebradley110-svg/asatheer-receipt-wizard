

# Emergency Mass Freeze — All Active Memberships

## Context
Due to an emergency closure in the UAE, all active memberships need to be frozen starting from yesterday (2026-03-31) with no end date. When the academy reopens, the freeze duration will be calculated and added back to each member's expiry date automatically (the existing auto-resume system already handles this).

## Approach

### 1. Database: Mass freeze via edge function
Create a new edge function `emergency-freeze` that:
- Fetches all active `member_services` where `is_active = true` and `freeze_status IS NULL` and `expiry_date >= '2026-03-31'`
- For each service, inserts a row into `membership_freezes` with:
  - `action_type`: `'freeze'`
  - `status`: `'active'`
  - `freeze_start`: `'2026-03-31'` (yesterday)
  - `freeze_end`: `NULL` (indefinite until manual resume)
  - `reason`: `'Emergency Closure'`
  - `notes`: `'Emergency closure due to ongoing conflict in UAE. All memberships frozen until further notice.'`
  - `created_by`: `'system-emergency'`
- Updates each `member_services` row to set `freeze_status = 'frozen'`
- Logs a single entry in `financial_audit_trail`

### 2. Admin UI: Emergency Mode Banner + Resume Button
- Add an "Emergency Mode" banner at the top of the Admin Dashboard showing the academy is closed
- Add a "Resume All Memberships" button that, when clicked:
  - Calls a `resume-all-freezes` edge function
  - Calculates days frozen (from `freeze_start` to today) for each frozen service
  - Extends each member's `expiry_date` by those days
  - Marks all emergency freezes as `completed`
  - Removes the emergency banner

### 3. Emergency settings flag
- Store an `emergency_closure` flag in the `notification_settings` table (key: `emergency_closure`, value: `{ active: true, start_date: '2026-03-31', reason: 'Conflict' }`)
- Dashboard reads this flag to show/hide the emergency banner

## Implementation Steps

| Step | What |
|------|------|
| 1 | Create `emergency-freeze` edge function to mass-freeze all active services |
| 2 | Create `emergency-resume` edge function to mass-resume and extend expiry dates |
| 3 | Add emergency banner component to AdminDashboard |
| 4 | Add "Activate Emergency Freeze" and "Resume All" buttons in admin settings or dashboard |
| 5 | Call the emergency-freeze function immediately after deployment |

## Important Notes
- The existing `auto-resume-memberships` function checks for `freeze_end` date — since we set `freeze_end = NULL` for emergency freezes, it will **not** auto-resume them. Resume will only happen manually.
- All frozen members will have their expiry dates extended by exactly the number of days they were frozen, so no member loses any paid time.
- A single audit trail entry will record the mass action for accountability.

