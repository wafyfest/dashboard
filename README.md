# WSF Inter-College Arts Fest Management System

A full-stack, enterprise-grade festival management and double-blind tabulation platform built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase** (PostgreSQL, Row Level Security, Auth, Storage, and Realtime).

Designed for high-concurrency inter-college cultural festivals with strict fair-judging guarantees, granular institutional permissions, and touch-optimized backstage consoles.

---

## 🌟 Key System Capabilities

- **Strict Double-Blind Judging**: Participant names and college identities are completely masked backstage using randomized single-letter code allocations (`A`, `B`, `C`...) to eliminate evaluator bias.
- **Master Events Tabulation Console**: High-density interactive matrix tracking live blind code allocations, scoring states, and criteria marks with write-once locking.
- **Convenor Operations Suite**: Real-time multi-stage queue monitor with instant broadcast announcements directly to team managers.
- **Granular Institutional Access (RBAC)**: Enforced through authenticated session claims and PostgreSQL Row-Level Security policies.
- **Dynamic Phase Normalization**: Robust canonical phase filtering (`Foundation`, `Thamheediyya`, `Aliya`, `PG`, `General`) with automated spelling and alias reconciliation.
- **Automated Championship Tallies**: Instant point allotment (1st: 5 pts, 2nd: 3 pts, 3rd: 1 pt) upon result publication by the Chief Tabulation Officer.
- **Audit Trails & Security**: Append-only system audit logging tracking every lock override, appeal decision, and mark entry.
- **Client-Side PDF Generation**: High-fidelity vector generation for student admit cards with verification QR codes, college participant rosters, and score sheets.

---

## 👥 Role-Based Access Control (RBAC) & Divisions

Access privileges and console features are partitioned strictly according to organizational roles:

| Operational Role | Scope & Primary Responsibilities |
|---|---|
| **Fest Secretariat & Executive Committee** | Global settings, deadlines, granular locks matrix, college registration overrides, fine waivers, appeal adjudications, and audit log inspection. |
| **Convenor Division** | Operational oversight, live stage progression monitoring, schedule management, and emergency broadcast dispatch to team managers. |
| **College Coordinators** | Student enrollment, single & group event registrations, capacity validation, late fee waivers, and bulk printable admit card generation. |
| **Stage Controllers** | Backstage venue console, call order queue management, blind code letter assignment (`A`, `B`...), and live stage status relay. |
| **Tabulation Division** | Fast score entry across multi-criteria rubrics ($A, B, C = 100$), automated draft score locking, and Chief Tabulation Officer publication. |
| **Students & Public Viewers** | Chest number lookup, personalized admit cards, live stage timetable, published results registry, and college championship leaderboard. |

---

## 📐 Architecture & Blind Scoring Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Student / College
    actor Stage as Stage Controller
    actor Judge as Evaluator / Tabulator
    actor CTO as Chief Tabulation Officer (Admin)
    participant DB as Supabase PostgreSQL

    Participant->>DB: Enrolls in Event with Chest No & College Affiliation
    Note over Stage,DB: Stage Call Order & Blind Allotment
    Stage->>DB: Assigns Random Code Letter (e.g. "C") to Chest Number
    Note over Judge,DB: Identity Masked Tabulation
    Judge->>DB: Records Marks for Code "C" (Criteria A: 38, B: 35, C: 18)
    Note over Judge,DB: Marks Write-Locked as Draft Result
    CTO->>DB: Verifies Standings & Publishes Official Result
    DB->>Participant: Identity Unmasked & Championship Points Credited
```

---

## 🗄️ Database Architecture & Migrations

All database schemas, extensions, and RLS policies are version-controlled in the repository:

### Core Schemas & Models
- **`colleges`**: Institutional affiliation records, contact details, fine status, and lock overrides.
- **`students`**: Enrolled candidates with CIC admission numbers, categories, and photos.
- **`items`**: Event catalog containing mode (`onstage`, `offstage`, `submission`), participation limits, phase/category bounds, and locks.
- **`registrations` & `registration_participants`**: College registrations linking events, students, and blind code letters.
- **`stages` & `schedules`**: Campus stages with live status relays (`Upcoming`, `Next_Item`, `Starting_Soon`, `On_Going`, `Ended`).
- **`results`**: Evaluator marks, score breakdowns, winner associations, and publication lock states.
- **`system_audit_logs`**: Tamper-evident operational audit logs recording administrative and tabulation actions.
- **`appeals` & `replacements`**: Formal performance disputes, evidence attachments, and emergency student substitutions.

### Database Migration Management

```bash
# Push pending migrations to the linked remote database
npx supabase db push
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or later (Node 20+ recommended)
- **Package Manager**: `npm` or `pnpm`
- **Database Engine**: PostgreSQL via Supabase

### 1. Installation

```bash
git clone <repository-url>
cd dashboard
npm install
```

### 2. Environment Configuration

Copy the sample environment file and populate your project credentials:

```bash
cp .env.example .env.local
```

> **Note**: The application includes an in-memory client service fallback (`festService`) pre-populated with realistic festival data, allowing immediate local development and demonstration without requiring a database connection.

### 3. Run Development Server

```bash
npm run dev
```

---

## 🛠️ Verification & Build Commands

```bash
# Static type checking
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm run start
```

---

## 🎨 Design System & Styling

The interface is engineered using CSS custom property design tokens supporting both light and dark modes:

- **Tokens**: `var(--bg-canvas)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--border-subtle)`
- **Color Palette**: High-contrast slate neutrals paired with functional accents (Amber for tabulation, Indigo for stages, Emerald for verified standings, Rose for locks).
- **Typography**: Clean, tabular sans-serif fonts with monospace numerics for chest numbers and scores.

---

## 📄 License

This software is developed for the **Inter-College Arts Fest Management System**. All rights reserved.
