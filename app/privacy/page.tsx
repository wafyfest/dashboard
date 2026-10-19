'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock, Database, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md font-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-500" />
            <span>Return to Homepage</span>
          </Link>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            WSF & CIC Official Policy
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-10">
        {/* Title Header */}
        <div className="space-y-3 border-b border-[var(--border-subtle)] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Student Data Privacy & Governance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading">
            Privacy Policy & Data Security
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Effective Date: October 2026 • 14th Edition Wafy Arts Fest • Coordination of Islamic Colleges (CIC)
          </p>
        </div>

        {/* Section 1: Overview */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <span>1. Institutional Mandate & Scope</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            This Privacy Policy governs the collection, processing, confidentiality, and storage of participant and institutional data across the <strong>14th Wafy Arts Fest Portal</strong>, operated under the joint jurisdiction of the <strong>Coordination of Islamic Colleges (CIC)</strong> and the <strong>Wafy Students Federation (WSF)</strong>.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            We are committed to maintaining the highest standards of data security, identity protection, and academic integrity for all participating students, faculty mentors, and festival officials.
          </p>
        </section>

        {/* Section 2: Data Collection */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-500" />
            <span>2. Information We Collect</span>
          </h2>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
              <strong className="text-[var(--text-primary)] block">Participant & Student Information:</strong>
              <p>Official CIC Admission Number, full name, affiliated college name, competition category, enrolled arts items, and official Admit Card portrait photograph.</p>
            </div>
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-1.5">
              <strong className="text-[var(--text-primary)] block">Institutional Officer Information:</strong>
              <p>Authorized college representative email, designated role (Admin, Convenor, Stage Controller, Result Tabulator), and audit transaction timestamps.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Double Blind Judging */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-emerald-500" />
            <span>3. Double-Blind Judging & Identity Anonymity</span>
          </h2>
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Full Identity Shielding Protocol</span>
            </div>
            <p>
              To eliminate bias, jury scoring sheets operate through decoupled surrogate codes (chest numbers / blind submission IDs). At no point during evaluation do judges have access to a participant&apos;s real name, institutional affiliation, or personal identity. De-anonymization only occurs automatically upon final centralized validation by the Chief Tabulation Board.
            </p>
          </div>
        </section>

        {/* Section 4: Storage & Security */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            <span>4. Storage, Encryption & Access Control</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            All data records are stored in high-availability enterprise database clusters backed by Supabase with Postgres Row-Level Security (RLS). All data in transit is encrypted using TLS 1.3 standards. Strict Role-Based Access Control (RBAC) ensures college coordinators may only view registered students belonging exclusively to their affiliated institution.
          </p>
        </section>

        {/* Section 5: Cookies & Local Storage */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>5. Cookies & Local Client Storage</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            We do not use advertising, marketing, or third-party profiling cookies. Browser storage is used strictly for technical operation:
          </p>
          <ul className="list-disc list-inside text-sm text-[var(--text-secondary)] space-y-1.5 pl-2">
            <li><code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-xs font-mono">arts_fest_theme</code>: Saves your preferred visual theme (Dark / Light mode).</li>
            <li><code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-xs font-mono">sb-auth-token</code>: Secure encrypted session token to maintain authorized login sessions.</li>
          </ul>
        </section>

        {/* Section 6: Inquiries & Redressal */}
        <section className="space-y-4 border-t border-[var(--border-subtle)] pt-8">
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            6. Contact & Grievance Redressal
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            For data inquiries, rectification requests, or official verification, please contact the WSF IT & Tabulation Directorate:
          </p>
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs space-y-1">
            <p className="font-bold text-[var(--text-primary)]">Coordination of Islamic Colleges (CIC) - WSF Directorate</p>
            <p className="text-[var(--text-secondary)]">Wafy Arts Fest Central Secretariat</p>
            <p className="text-[var(--text-muted)]">Valanchery, Malappuram District, Kerala - 676552</p>
            <p className="text-emerald-500 pt-1 font-medium">support@wafyfest.org</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-6 text-center text-xs text-[var(--text-muted)]">
        <p>© {new Date().getFullYear()} Coordination of Islamic Colleges (CIC) & Wafy Students Federation. All rights reserved.</p>
      </footer>
    </div>
  );
}
