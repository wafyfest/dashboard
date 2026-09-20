# Inter-College Arts Fest Management System

A full-stack, enterprise-grade Arts Fest Management web application built with **Next.js 14 (App Router), TypeScript, Tailwind CSS, and Supabase (Auth, PostgreSQL, Storage, and Realtime)**.

Designed with a dashboard aesthetic:
- **Canvas:** Slate-blue/gray `#EEF2F6`
- **Cards:** `rounded-2xl` with crisp white background, subtle `border-slate-200/80` and gentle elevation
- **Accents:** Dark Navy `#132238` with emerald and amber indicators
- **Badges:** Clean pill badges for categories (`Sub_Junior`, `Junior`, `Senior`, `General`), stage statuses, and appeal statuses
- **Tables:** Dense, highly readable data tables with responsive column layouts and quick controls

---

## 1. User Roles & Access Control (RBAC)

The application implements a multi-tenant role-based access model with PostgreSQL Row Level Security (RLS) policies:

| Role | Description | Key Capabilities |
|---|---|---|
| **`admin`** | Fest Executive Committee / General Secretary | Fest settings & deadline controls, global/selective event locks, college lock overrides, fine waiver, score review & publishing, grievance adjudication. |
| **`college`** | Participating Institution Portal | Student enrollment directory, single & group event registration with capacity validations, batch printable admit cards with QR simulation, schedule tracking, grievance/appeal filing. |
| **`student`** | Participant / Viewer Portal | Fast search by Chest Number or Admission Number, individualized printable admit card, live stage timetable tracking, official results & aggregate trophy leaderboard. |
| **`stage_controller`** | Backstage Tablet Console | High-density, touch-optimized venue manager. Stage queue selector, fair blind judging code allotment (randomized A, B, C... concealment), and live stage status relay (`Upcoming`, `Next_Item`, `Starting_Soon`, `On_Going`, `Ended`). |
| **`result_entry`** | Tabulation Division Console | Rapid tabular score entry for blind codes across multi-criteria scoring rubrics (Technique, Expression, Adherence = 100 total). Enforces write-once locking and automatic rank calculation (1st, 2nd, 3rd). |

---

## 2. Supabase Database Schema & RLS

Database migrations and seed scripts are located in `supabase/`:

- **Migration SQL:** [`supabase/migrations/20240101000000_init_arts_fest.sql`](file:///c:/Users/mskc9/Documents/antiGravity/dashboard/supabase/migrations/20240101000000_init_arts_fest.sql)
- **Seed Data SQL:** [`supabase/seed.sql`](file:///c:/Users/mskc9/Documents/antiGravity/dashboard/supabase/seed.sql)

### Database Enums & Tables

1. **Enums:**
   - `user_role`: `'admin'`, `'college'`, `'stage_controller'`, `'result_entry'`
   - `student_category`: `'Sub_Junior'`, `'Junior'`, `'Senior'`, `'General'`
   - `item_type`: `'Single'`, `'Group'`
   - `stage_status`: `'Upcoming'`, `'Next_Item'`, `'Starting_Soon'`, `'On_Going'`, `'Ended'`
   - `appeal_status`: `'Pending'`, `'Approved'`, `'Rejected'`

2. **Tables with Row Level Security (RLS):**
   - `profiles`: Tied to `auth.users`, role mapping and optional `college_id`.
   - `colleges`: Institution identity, affiliation number, coordinator contact, fine status, manual lock override flag.
   - `students`: Admission number, chest number, category, contact, photo URL.
   - `items`: Event catalog, category bounds, single/group classification, min/max participant bounds, global lock status.
   - `fest_settings`: System deadlines (`reg_deadline`, `fine_deadline`), fest name, official rulebook link.
   - `college_item_locks`: Granular selective unlock records overriding global locks per college and item with expiration timestamps.
   - `registrations` & `registration_participants`: College event enrollment with blind code letters (A, B, C...) and student rosters.
   - `stages` & `schedules`: Campus stages and live item timeline with real-time status.
   - `results`: Finalized score breakdowns, 1st/2nd/3rd place registration foreign keys, and publication status.
   - `appeals` & `replacements`: Performance appeals with fee proof URLs, and participant emergency substitutions.

---

## 3. Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v20)
- npm or pnpm

### Quick Start (Interactive Demo Mode)
The application includes a state management layer pre-seeded with realistic arts fest events, colleges, students, and schedules, allowing full exploration of all 5 roles out-of-the-box:

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Use the **interactive role switcher** in the top navigation bar to seamlessly transition between Admin, College Portal, Student View, Stage Controller, and Result Entry consoles!

### Connecting to a Live Supabase Instance
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL script from `supabase/migrations/20240101000000_init_arts_fest.sql` in the Supabase SQL Editor.
3. Optionally run `supabase/seed.sql` to populate sample colleges, items, and stages.
4. Copy `.env.example` to `.env.local` and configure:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Restart the development server.

---

## 4. Production Build & Verification

```bash
# Typecheck
npx tsc --noEmit

# Production Build
npm run build

# Start Production Server
npm run start
```
