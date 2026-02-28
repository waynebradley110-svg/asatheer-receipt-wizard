
# Implementation Plan: Self-Service Portal + Session Scheduling + Real-Time Notifications

## Feature 1: Member Self-Service Portal (QR-Based)

A public page where members can scan a QR code (or enter their member ID) to view their own membership status -- no login required.

### What members will see:
- Their name, member ID, zone, and subscription status
- Expiry date and days remaining
- Attendance history (last 10 check-ins)
- Digital member card (download/share)

### How it works:
- A new public route `/member-portal/:memberId` (no auth required)
- Each member card already has a barcode -- we'll generate a QR code URL pointing to this portal
- Staff can share the QR link via WhatsApp alongside the member card

### Technical steps:
- Create `src/pages/MemberPortal.tsx` -- public page that fetches member data by `member_id`
- Add route in `App.tsx` (outside the `DashboardLayout` wrapper so no auth is needed)
- Create a database function or RLS policy for limited public read access to member info (read-only, by member_id only)
- Update `DigitalMemberCard.tsx` to include the portal QR code URL

---

## Feature 2: Session/Class Scheduling with Calendar

A scheduling system for PT sessions, football slots, and other bookable activities.

### What it includes:
- Admin/receptionist can create available time slots (e.g., "Football 5v5 - Sunday 6PM")
- Calendar view showing upcoming sessions
- Link sessions to members (who's booked)
- Track capacity per session

### Database:
- New `sessions` table: id, title, session_type (pt/football/crossfit/swimming/paddle), date, start_time, end_time, coach_id, max_capacity, zone, notes, is_recurring, created_at
- New `session_bookings` table: id, session_id, member_id, status (booked/attended/cancelled), created_at
- RLS: admin/receptionist can manage; accounts can view

### Technical steps:
- Create DB migration for `sessions` and `session_bookings` tables with RLS policies
- Create `src/pages/Schedule.tsx` with a weekly calendar view using a grid layout
- Add session creation dialog (title, type, date/time, coach, capacity)
- Add booking dialog to assign members to sessions
- Add "Schedule" to sidebar navigation
- Add route in `App.tsx`

---

## Feature 3: Real-Time Check-In Notifications

Live toast notifications on the dashboard when a member scans in at any zone.

### What it does:
- When a member checks in (attendance record inserted), all logged-in staff see a real-time toast notification
- Shows member name, zone, status (active/expired), and time
- Dashboard counter updates live without refresh

### Technical steps:
- Enable Realtime on the `attendance` table via migration (`ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance`)
- Create `src/components/RealtimeAttendanceNotifier.tsx` -- subscribes to attendance inserts, fetches member name, and shows toast
- Add the notifier component to `DashboardLayout.tsx` so it runs on all dashboard pages
- Show a styled toast with member name, zone badge, and active/expired status

---

## Summary of Changes

| Area | Files |
|------|-------|
| Database | 1 migration: `sessions` table, `session_bookings` table, realtime on `attendance` |
| New pages | `MemberPortal.tsx`, `Schedule.tsx` |
| New components | `RealtimeAttendanceNotifier.tsx`, `SessionCalendar.tsx`, `CreateSessionDialog.tsx` |
| Modified | `App.tsx` (routes), `AppSidebar.tsx` (nav), `DashboardLayout.tsx` (notifier), `DigitalMemberCard.tsx` (QR link) |

### Implementation order:
1. Database migration (all tables + realtime)
2. Real-time notifications (smallest, quickest win)
3. Session scheduling (new page + components)
4. Member self-service portal (public page + QR integration)
