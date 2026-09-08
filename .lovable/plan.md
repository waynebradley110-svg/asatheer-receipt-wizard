# Swimming Academy Module (Additive Upgrade)

Add a complete Swimming module to the existing Asatheer system. Nothing existing changes: Dashboard, Members, Attendance, Reports, PT Report, Expenses, Notifications, and all current zones keep working exactly as they do now. Coaches and pools are typed in as free text on programs and classes.

## 1. Swimming Programs

New Swimming section with a Programs tab where admins can create, edit, and activate/deactivate programs. Each program has: name, level, age range (min/max), duration in weeks, price, max students, coach name, pool name, description, active toggle.

Seeded as editable rows (not hard-coded): Baby Swimming, Kids Beginner, Kids Intermediate, Kids Advanced, Learn to Swim, Private Swimming, Adult Swimming, Holiday Swimming Program.

## 2. Child Registration

The existing New Registration form stays as-is. When the zone "Swimming" is chosen, extra swimming fields appear below the current ones: date of birth with auto-calculated age, parent/guardian name, parent WhatsApp number, emergency contact, program, level, coach, pool, start date, class days, class start/end time, number of classes, notes. Payment and the existing fields work unchanged, so swimming children still appear in members, revenue, and reports.

## 3. Classes and Scheduling

A Swimming Schedule view where staff create recurring weekly classes: program, coach, pool, day of week, start/end time, capacity, start date, end date. Staff can edit day, time, coach, or pool at any time, and cancel or reschedule a single occurrence. Every enrolled child's schedule follows the class automatically — no copied/static dates.

Children are enrolled into classes individually; capacity and remaining spaces are shown.

## 4. Child Schedule

Each swimming child has a schedule panel listing their classes by day and time, editable at any time by staff.

## 5. Parent Calendar Link

Every swimming child gets a private link, `/swimming/calendar/<secure-token>`, that needs no login. The parent sees only their own child: child name, program, coach, pool, and upcoming classes with date, day, start and end time, plus any cancelled or rescheduled classes clearly marked. Includes an "Add to Calendar" download for upcoming classes. The link never exposes another child's data.

## 6. WhatsApp Sharing

A WhatsApp button beside each child's calendar opens WhatsApp with the parent's stored number pre-filled and a ready-made message containing the child's name, program, and the private calendar link.

## 7. Swimming Attendance

Swimming-specific attendance per class occurrence: Present, Absent, Late, Make-up Class. Per-child attendance history is shown on the child's page.

## 8. Swimming Dashboard

Swimming is added to the existing sidebar (same style, under Operations). The dashboard shows Total Swimming Children, Active Enrollments, Today's Classes, Upcoming Classes, Available Spaces, Coaches, Programs, Attendance summary, and Recent Registrations, with quick actions: Register Child, Create Program, Create Class, View Calendar.

## 9. Look and Feel

Reuses the existing dark theme, cards, typography, buttons, spacing, and responsive behavior. No redesign anywhere.

---

## Technical notes

Additive migrations only; existing tables and data untouched. `zone_type` already includes `swimming`, so no enum change is needed.

New tables (all with RLS + GRANTs, `updated_at` triggers):

- `swimming_programs` — name, level, age_min, age_max, duration_weeks, price, max_students, coach_name, pool_name, description, is_active
- `swimming_children` — member_id FK to `members`, program_id, level, coach_name, pool_name, parent_name, parent_whatsapp, emergency_contact, start_date, classes_total, notes
- `swimming_classes` — program_id, coach_name, pool_name, day_of_week, start_time, end_time, capacity, start_date, end_date, is_active
- `swimming_class_exceptions` — class_id, original_date, status (cancelled/rescheduled), new_date, new_start_time, new_end_time, reason
- `swimming_enrollments` — child_id, class_id, status, unique(child_id, class_id)
- `swimming_attendance` — child_id, class_id, class_date, status, notes
- `swimming_calendar_tokens` — child_id, token (unique, random), is_active

Policies: staff roles (`admin`, `receptionist`, `accounts`) manage all swimming tables via `has_role`. Public parent access is read-only through a `security definer` function `get_swimming_calendar(_token text)` that returns one child's schedule for a valid token — no `anon` table grants, so no cross-child exposure.

Frontend: new `src/pages/Swimming.tsx` (tabs: Overview, Children, Programs, Schedule, Attendance), `src/pages/SwimmingCalendar.tsx` (public route), components under `src/components/swimming/`, `src/lib/swimmingSchedule.ts` for occurrence expansion (recurrence + exceptions) and `.ics` generation. Routes added lazily in `App.tsx`; sidebar entry in `AppSidebar.tsx`. Members registration form gains a conditional swimming fieldset only.

Verification after build: existing registration + renewal flow, members list, reports, and attendance all still function; new swimming flows tested end to end.
