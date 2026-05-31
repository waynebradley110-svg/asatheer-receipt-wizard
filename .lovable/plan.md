# Emerald Prestige Redesign + Performance Pass

Goal: refresh the entire app with a calmer, more authoritative "Emerald Prestige" look (deep emerald + gold), restructure the four key dashboards for desktop-first clarity, and trim runtime cost — all without changing any business logic, RLS, or feature behavior.

## 1. Design system refresh (`src/index.css`, `tailwind.config.ts`)

Replace the current dark blue/green palette with Emerald Prestige tokens — semantic only, all HSL:

- `--background` deep emerald-black `158 50% 4%`
- `--card` `158 35% 7%`, `--muted` `158 20% 14%`, `--border` `158 25% 16%`
- `--primary` emerald `162 78% 26%`, `--primary-glow` `162 65% 38%`
- `--accent` gold `42 55% 54%` (replaces current green accent)
- `--vip` stays gold (already aligned)
- New: `--gradient-primary`, `--gradient-gold`, `--shadow-prestige`, `--shadow-gold`
- Typography pair: **Fraunces** (display, headings) + **Inter Tight** (body). Loaded via `<link rel="preload">` with `font-display: swap` in `index.html`.
- Light mode kept but tuned to cream `--background 40 30% 96%` with emerald primary.

All existing classes (`.glow-green`, `.glow-blue`, `.stat-card-hover`, zone color tokens for cafe/football/massage) are remapped to the new palette so no component needs token-name changes.

## 2. Dashboard restructure (desktop-first)

Shared shell changes (`DashboardLayout.tsx`, `AppSidebar.tsx`):
- Sticky translucent header with backdrop blur, role badge, today's date, quick-search slot.
- Sidebar: collapsible icon mode, active-route gold underline, grouped by domain (Operations / Finance / People / System).

### Admin Dashboard (`pages/AdminDashboard.tsx`)
New hierarchy:
1. **Hero strip** — gradient emerald → gold, "Command Center" title, live KPI ticker (today's check-ins, revenue today, active members) instead of static `--`.
2. **KPI grid** — 4 refined stat cards (Total, Active, Expired, New this week) using `--shadow-prestige`, large numerals in Fraunces, sparkline trend in gold.
3. **Revenue split** — cash vs card kept, restyled as a single 2-column "Revenue Mix" card with progress bars in gold/emerald.
4. **Tabs** — replace overflow scroller with grouped pill tabs (Overview · Analytics · Operations [cafe/football/massage] · Management [users/corrections/notifications] · Settings).

### Receptionist & Accounts dashboards
Same shell + KPI language, role-scoped cards. Accounts gets a "Daily Financial Pulse" card (today / week / month revenue).

### Members list + cards (`pages/Members.tsx`, `components/members/MemberCard.tsx`, `MemberFilters.tsx`)
- Switch to a denser, table-like card grid with avatar circle, gold name, status chip, expiry date prominent.
- Sticky filter bar with segmented controls (All / Active / Expired / Frozen / VIP) and search.
- VIP card retains gold left border + tint — no other change to VIP logic.

### Reports & Analytics
- Unify `Reports.tsx`, `AdvancedAnalytics`, `EnhancedAnalytics`, `FuturisticAnalyticsDashboard`, `ZoneAnalysis` under one consistent chart style: emerald primary series, gold accent series, muted gridlines, Fraunces tick labels.
- Recharts: shared `<ChartTheme>` wrapper so every chart inherits colors/fonts.
- Zone monthly sales + revenue distribution moved to a 2-column grid above the detail tables.

## 3. Performance pass

Routing & bundle:
- Convert every route in `App.tsx` to `React.lazy` + `<Suspense fallback={Skeleton}>`. Wrap heavy admin tabs (Analytics, Cafe/Football/Massage Sales, NotificationManager, ExcelBackup) in `lazy()` as well so the initial admin bundle drops.
- Code-split `xlsx` (already heavy) behind dynamic `import()` inside `ExcelBackup` only.
- Add `manualChunks` in `vite.config.ts` for `recharts`, `xlsx`, `@radix-ui/*`, `lucide-react`.

Data layer:
- Replace ad-hoc `supabase.from(...).select('*')` in dashboards with `useQuery` keyed per metric, `staleTime: 60_000`, shared `QueryClient` (already present).
- `AdminDashboard.fetchStats` currently pulls every member + every payment to count — replace with three parallel `count` / aggregate queries (`select('id', { count: 'exact', head: true })` and a SQL view `v_revenue_split` for cash/card sums) to avoid loading the full tables on the client.
- Memoize derived stats and chart datasets with `useMemo`; wrap big lists with `React.memo` + stable keys.

Rendering:
- Virtualize the members grid with `@tanstack/react-virtual` when count > 100.
- Replace inline SVG icon walls with a single `lucide-react` tree-shaken import barrel.
- Add `loading="lazy"` + explicit width/height to all `<img>` (member portal QR, digital card).

PWA / assets:
- Preload Fraunces + Inter Tight WOFF2 only.
- Keep PWA config; add `runtimeCaching` for Supabase GETs to make repeat loads instant.

## 4. Safety / non-goals

- No changes to RLS, edge functions, migrations, payment logic, VIP rules, freeze/auto-resume, notifications, or printing logic.
- Revenue/VIP filtering (`src/lib/revenueFilter.ts`, `src/lib/vip.ts`) untouched.
- Admin password gate for payment edit/delete untouched.
- Print stylesheets kept as-is (they target `.print-root`).

## 5. Rollout order

1. Tokens + typography (index.css, tailwind, index.html) — instant visual lift, zero risk.
2. Shared shell (DashboardLayout, AppSidebar, shared `KpiCard`, `SectionHeader`, `ChartTheme`).
3. AdminDashboard restructure + new aggregate queries.
4. Receptionist + Accounts dashboards.
5. Members list + cards.
6. Reports & Analytics unification.
7. Performance pass (lazy routes, manualChunks, virtualization, count-queries).
8. Visual QA on desktop preview, then mobile sanity check.

## Technical details

- New shared components: `src/components/ui/kpi-card.tsx`, `src/components/ui/section-header.tsx`, `src/components/charts/ChartTheme.tsx`.
- New SQL view (read-only migration) `public.v_revenue_split` returning `(method, total)` filtered by the same VIP exclusion as `revenueFilter.ts` — granted `SELECT` to `authenticated`.
- `vite.config.ts` gets `build.rollupOptions.output.manualChunks`.
- No new dependencies except `@tanstack/react-virtual` (small, ~3kb).
