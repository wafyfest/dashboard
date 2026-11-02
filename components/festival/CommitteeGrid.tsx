'use client';

import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Crown, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { CommitteeMember } from '@/lib/types/fest';

// ── Chairman, Vice Chairmen & Main Convenors (Official 14th State Wafy Fest Poster) ──
const MAIN_COMMITTEE_MEMBERS: CommitteeMember[] = [
  // ── Apex Leadership (Row 1 of Poster) ──
  {
    id: 'lead-chair',
    name: 'Alfaz Kothamangalam',
    position: 'Chairman',
    category: 'apex_chair',
    campus: 'Wafy Campus Kalikavu',
    photo_url: null,
    display_order: 1,
    is_active: true,
  },
  {
    id: 'lead-gen-conv',
    name: 'Aboobacker Jiyad',
    position: 'General Convenor',
    category: 'general_convenor',
    campus: 'Wafy Campus Kalikavu',
    photo_url: null,
    display_order: 2,
    is_active: true,
  },
  {
    id: 'lead-vc-1',
    name: 'Rizal Abdul Samad',
    position: 'Vice Chairman',
    category: 'apex_chair',
    campus: 'Wafy Campus Kalikavu',
    photo_url: null,
    display_order: 3,
    is_active: true,
  },
  {
    id: 'lead-vc-2',
    name: 'Shahzad Aman',
    position: 'Vice Chairman',
    category: 'apex_chair',
    campus: "Majma' Kavanur",
    photo_url: null,
    display_order: 4,
    is_active: true,
  },
  {
    id: 'lead-dep-conv',
    name: 'Fazil Pattambi',
    position: 'Deputy Convenor',
    category: 'general_convenor',
    campus: 'Wafy Campus Kalikavu',
    photo_url: null,
    display_order: 5,
    is_active: true,
  },

  // ── Main Convenors ──
  {
    id: 'conv-swalih',
    name: 'Swalih Mannarkad',
    position: 'Convenor',
    category: 'fest_convenor',
    campus: 'Wafy Campus Kalikavu',
    photo_url: null,
    display_order: 6,
    is_active: true,
  },
  {
    id: 'conv-shamil',
    name: 'Shamil Usman',
    position: 'Convenor',
    category: 'fest_convenor',
    campus: 'MTM Chokli',
    photo_url: null,
    display_order: 7,
    is_active: true,
  },
  {
    id: 'conv-miras',
    name: 'La Al Miras',
    position: 'Convenor',
    category: 'fest_convenor',
    campus: 'Wafy Campus Kalikavu',
    photo_url: null,
    display_order: 8,
    is_active: true,
  },
  {
    id: 'conv-shadi',
    name: 'Shadi Athavanad',
    position: 'Convenor',
    category: 'fest_convenor',
    campus: "Majma' Kavanur",
    photo_url: null,
    display_order: 9,
    is_active: true,
  },
  {
    id: 'conv-adhil',
    name: 'Adhil Sali',
    position: 'Convenor',
    category: 'fest_convenor',
    campus: 'PMSA Kadakkangal',
    photo_url: null,
    display_order: 10,
    is_active: true,
  },
  {
    id: 'conv-tech',
    name: 'Munavir Thirunavaya',
    position: 'Technical Convenor',
    category: 'fest_convenor',
    campus: 'Darul Uloom Thootha',
    photo_url: null,
    display_order: 11,
    is_active: true,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Leaders' },
  { id: 'apex_chair', label: 'Chairman & Vice Chairmen' },
  { id: 'general_convenor', label: 'General & Deputy' },
  { id: 'fest_convenor', label: 'Main Convenors' },
];

function getMemberSubtitle(member: CommitteeMember): string {
  if (member.campus) return member.campus;
  switch (member.category) {
    case 'apex_chair':
      return 'State Fest Leadership';
    case 'general_convenor':
      return 'General Secretariat';
    case 'fest_convenor':
      return 'Convenors Directorate';
    default:
      return '14th State Wafy Fest';
  }
}

function getSignatureText(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const first = parts[0].toLowerCase();
  if (['muhammed', 'mohammed', 'sayyid', 'aboobacker'].includes(first) && parts.length > 1) {
    return parts[1];
  }
  if (name.toLowerCase().includes('miras')) {
    return 'Miras';
  }
  return parts[0];
}

function formatDisplayName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function MemberCard({ member }: { member: CommitteeMember }) {
  const initials = member.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const signatureText = getSignatureText(member.name);
  const displayName = formatDisplayName(member.name);
  const subtitle = getMemberSubtitle(member);

  return (
    <div
      key={member.id}
      className="group relative flex flex-col rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-4.5 backdrop-blur-sm shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-amber-500/50 hover:bg-white/[0.08] hover:shadow-2xl"
    >
      {/* Photo Frame Container with Diamond Badge & Signature */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-b from-[#182052] to-[#0c1244] shadow-inner">
        {/* Top-Right Diamond Badge */}
        <div
          className="absolute top-2.5 right-2.5 z-20 h-2 w-2 rotate-45 bg-[var(--f-saffron)] shadow-[0_0_8px_var(--f-saffron)]"
          aria-hidden="true"
        />

        {/* Photo or Artistic Monochrome Initials Portrait */}
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1e2868] to-[#0a0e30]">
            <span className="f-kufi text-3xl sm:text-4xl lg:text-5xl font-black text-white/80 transition-transform duration-500 group-hover:scale-110 group-hover:text-[var(--f-saffron)] select-none">
              {initials}
            </span>
          </div>
        )}

        {/* Elegant Signature Script Overlay */}
        <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none select-none z-10 px-2">
          <span
            style={{ fontFamily: "'Alex Brush', 'Caveat', cursive" }}
            className="text-2xl sm:text-3xl text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] tracking-wide"
          >
            {signatureText}
          </span>
        </div>
      </div>

      {/* Information below photo */}
      <div className="mt-2.5 flex flex-col min-w-0">
        <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight group-hover:text-[var(--f-saffron)] transition-colors truncate">
          {displayName}
        </h4>
        <p className="mt-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--f-saffron)] truncate">
          {member.position}
        </p>
        <p className="mt-0.5 text-[10px] sm:text-[11px] text-white/50 font-medium truncate">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function CommitteeGrid() {
  const [members, setMembers] = useState<CommitteeMember[]>(MAIN_COMMITTEE_MEMBERS);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase
      .from('fest_committee')
      .select('*')
      .eq('is_active', true)
      .in('category', ['apex_chair', 'general_convenor', 'fest_convenor'])
      .order('display_order', { ascending: true })
      .then(({ data, error }: { data: CommitteeMember[] | null; error: any }) => {
        if (!error && data && data.length > 0) {
          setMembers(data);
        }
      });
  }, []);

  const filteredMembers = members.filter((m) => {
    const matchesCategory = activeCategory === 'all' || m.category === activeCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.campus && m.campus.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const isDefaultView = activeCategory === 'all' && searchQuery.trim() === '';

  // Groupings for Default View
  const apexMembers = members.filter((m) => m.category === 'apex_chair' || m.category === 'general_convenor');
  const convenorMembers = members.filter((m) => m.category === 'fest_convenor');

  return (
    <section
      id="committee"
      className="f-sans relative scroll-mt-16 bg-[var(--f-ink)] py-20 text-white sm:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* ── Section Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--f-saffron)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Leadership &amp; Committee</span>
            </div>
            <h2 className="mt-3 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Festival Committee
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-white/70 max-w-xl">
              The Chairman, Vice Chairmen, and Main Convenors leading the 14th State Wafy Arts Fest.
            </p>
          </div>
          <p
            lang="ar"
            dir="rtl"
            className="f-kufi text-left text-2xl font-bold text-[var(--f-saffron)] sm:text-right sm:text-3xl"
          >
            لجنة المهرجان
          </p>
        </div>

        {/* ── Category Filter Tabs & Search Bar ── */}
        <div className="mt-12 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/15 pb-6">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {CATEGORIES.map((cat) => {
              const count =
                cat.id === 'all'
                  ? members.length
                  : members.filter((m) => m.category === cat.id).length;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--f-saffron)] text-[var(--f-ink)] shadow-md'
                      : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive ? 'bg-[var(--f-ink)]/15 text-[var(--f-ink)]' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Search leader, role, or campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-xs text-white placeholder-white/50 backdrop-blur-sm focus:border-[var(--f-saffron)] focus:outline-none"
            />
          </div>
        </div>

        {/* ── Default View: 2 Focused Tiers (Apex Leadership & Main Convenors) ── */}
        {isDefaultView ? (
          <div className="mt-12 space-y-14">
            {/* Tier 1: Apex Leadership (5 Leaders: Chairman, General Convenor, Vice Chairmen, Deputy Convenor) */}
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--f-saffron)] text-[var(--f-ink)]">
                    <Crown className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    Apex Leadership
                  </h3>
                  <span className="text-xs text-white/50 hidden sm:inline">
                    — Chairman, General Convenor, Vice Chairmen &amp; Deputy Convenor
                  </span>
                </div>
                <span lang="ar" dir="rtl" className="f-kufi text-xs sm:text-sm text-white/40">
                  القيادة العليا
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
                {apexMembers.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>

            {/* Tier 2: Main Convenors (6 Convenors: Swalih, Shamil, Miras, Shadi, Adhil, Munavir) */}
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-white">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    Main Convenors Directorate
                  </h3>
                  <span className="text-xs text-white/50 hidden sm:inline">
                    — State Festival Convenors &amp; Technical Convenor
                  </span>
                </div>
                <span lang="ar" dir="rtl" className="f-kufi text-xs sm:text-sm text-white/40">
                  منسقو المهرجان
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-5">
                {convenorMembers.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Filtered Mode / Search Mode ── */
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredMembers.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        {filteredMembers.length === 0 && (
          <div className="py-16 text-center text-xs text-white/60">
            No committee leaders matched &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>
    </section>
  );
}
