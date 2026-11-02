'use client';

import React, { useEffect, useState } from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { CommitteeMember } from '@/lib/types/fest';
import { useInView } from '@/lib/hooks/useInView';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// Replace names / positions with real ones. Set photo_url to a Supabase
// Storage URL or any public image URL when you have real photos.
// The component uses this data when Supabase is unreachable or returns empty.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_COMMITTEE: CommitteeMember[] = [
  // ── Chief Patron ────────────────────────────────────────────────────────
  {
    id: 'mock-1',
    name: 'Sheikh Ahmed Kabeer Moulavi',
    position: 'Chief Patron & General President, CIC',
    category: 'chief_patron',
    photo_url: null,
    display_order: 1,
    is_active: true,
  },

  // ── Patrons ─────────────────────────────────────────────────────────────
  {
    id: 'mock-2',
    name: 'Dr. Mohammed Farook Ustaad',
    position: 'Patron & Academic Director, CIC',
    category: 'patron',
    photo_url: null,
    display_order: 10,
    is_active: true,
  },
  {
    id: 'mock-3',
    name: 'Ustadh Ibrahim Khaleel',
    position: 'Patron & Dean of Studies',
    category: 'patron',
    photo_url: null,
    display_order: 11,
    is_active: true,
  },
  {
    id: 'mock-4',
    name: 'Prof. Rasheed Musliyar',
    position: 'Patron & Principal, Markaz College',
    category: 'patron',
    photo_url: null,
    display_order: 12,
    is_active: true,
  },
  {
    id: 'mock-5',
    name: 'Haji Abdul Azeez',
    position: 'Patron & Vice President, WSF',
    category: 'patron',
    photo_url: null,
    display_order: 13,
    is_active: true,
  },

  // ── Organizing Committee ─────────────────────────────────────────────────
  {
    id: 'mock-6',
    name: 'Muhammed Shafeeq P.K.',
    position: 'General Convenor',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 20,
    is_active: true,
  },
  {
    id: 'mock-7',
    name: 'Aslam Koduvally',
    position: 'Joint Convenor',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 21,
    is_active: true,
  },
  {
    id: 'mock-8',
    name: 'Riyas Mannarkkad',
    position: 'General Secretary',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 22,
    is_active: true,
  },
  {
    id: 'mock-9',
    name: 'Safeer Nilambur',
    position: 'Joint Secretary',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 23,
    is_active: true,
  },
  {
    id: 'mock-10',
    name: 'Ansar Tirur',
    position: 'Treasurer',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 24,
    is_active: true,
  },
  {
    id: 'mock-11',
    name: 'Fawaz Kottakkal',
    position: 'Cultural Coordinator',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 25,
    is_active: true,
  },
  {
    id: 'mock-12',
    name: 'Haris Feroke',
    position: 'Stage Director',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 26,
    is_active: true,
  },
  {
    id: 'mock-13',
    name: 'Sirajudheen Perinthalmanna',
    position: 'Tabulation Supervisor',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 27,
    is_active: true,
  },
  {
    id: 'mock-14',
    name: 'Nafeesul Islam Kondotty',
    position: 'Accommodation In-Charge',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 28,
    is_active: true,
  },
  {
    id: 'mock-15',
    name: 'Abdurahman Wandoor',
    position: 'Discipline Committee Head',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 29,
    is_active: true,
  },
  {
    id: 'mock-16',
    name: 'Muhsin Valanchery',
    position: 'Media & Publications',
    category: 'organizing_committee',
    photo_url: null,
    display_order: 30,
    is_active: true,
  },

  // ── Technical Team ───────────────────────────────────────────────────────
  {
    id: 'mock-17',
    name: 'Fahad Sulthan K.',
    position: 'IT Director & Portal Lead',
    category: 'technical_team',
    photo_url: null,
    display_order: 40,
    is_active: true,
  },
  {
    id: 'mock-18',
    name: 'Irfan Shereef',
    position: 'Chief Tabulation Officer',
    category: 'technical_team',
    photo_url: null,
    display_order: 41,
    is_active: true,
  },
  {
    id: 'mock-19',
    name: 'Ashraf Perambra',
    position: 'Result Entry Coordinator',
    category: 'technical_team',
    photo_url: null,
    display_order: 42,
    is_active: true,
  },
  {
    id: 'mock-20',
    name: 'Shibili Thodupuzha',
    position: 'Stage Controller',
    category: 'technical_team',
    photo_url: null,
    display_order: 43,
    is_active: true,
  },
  {
    id: 'mock-21',
    name: 'Mufeeda Kannamangalam',
    position: 'Registration Systems',
    category: 'technical_team',
    photo_url: null,
    display_order: 44,
    is_active: true,
  },
  {
    id: 'mock-22',
    name: 'Naseef Edappal',
    position: 'Network & AV Support',
    category: 'technical_team',
    photo_url: null,
    display_order: 45,
    is_active: true,
  },

  // ── Volunteer Leads ──────────────────────────────────────────────────────
  {
    id: 'mock-23',
    name: 'Sahla Parappanangadi',
    position: 'Volunteer Lead — Registration Desk',
    category: 'volunteer_lead',
    photo_url: null,
    display_order: 50,
    is_active: true,
  },
  {
    id: 'mock-24',
    name: 'Jaseela Tirur',
    position: 'Volunteer Lead — Hospitality',
    category: 'volunteer_lead',
    photo_url: null,
    display_order: 51,
    is_active: true,
  },
  {
    id: 'mock-25',
    name: 'Afeef Ottapalam',
    position: 'Volunteer Lead — Stage Support',
    category: 'volunteer_lead',
    photo_url: null,
    display_order: 52,
    is_active: true,
  },
  {
    id: 'mock-26',
    name: 'Rifas Malappuram',
    position: 'Volunteer Lead — Transport',
    category: 'volunteer_lead',
    photo_url: null,
    display_order: 53,
    is_active: true,
  },
  {
    id: 'mock-27',
    name: 'Sumayya Kondotty',
    position: 'Volunteer Lead — Participant Welfare',
    category: 'volunteer_lead',
    photo_url: null,
    display_order: 54,
    is_active: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT PALETTE — for initials avatars when photo_url is null
// ─────────────────────────────────────────────────────────────────────────────
const GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-amber-400 to-orange-500',
  'from-purple-500 to-violet-600',
  'from-rose-400 to-pink-600',
  'from-indigo-500 to-blue-700',
  'from-teal-400 to-cyan-600',
  'from-orange-400 to-red-500',
];

// ── Initials avatar ────────────────────────────────────────────────
function InitialsAvatar({ name, index }: { name: string; index: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      className={`w-full h-full rounded-full bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]
        } flex items-center justify-center text-white font-extrabold text-lg font-heading select-none`}
    >
      {initials}
    </div>
  );
}

// ── Shimmer skeleton card ──────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3">
      <div className="w-20 h-20 rounded-full shimmer" />
      <div className="w-28 h-3.5 rounded-full shimmer" />
      <div className="w-20 h-2.5 rounded-full shimmer" />
    </div>
  );
}

// ── Member card ────────────────────────────────────────────────────
function MemberCard({
  member,
  index,
  inView,
}: {
  member: CommitteeMember;
  index: number;
  inView: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`glass-card-interactive rounded-2xl p-5 flex flex-col items-center gap-3 text-center reveal-scale ${inView ? 'in-view' : ''
        }`}
      style={{ animationDelay: `${(index % 8) * 70}ms` }}
    >
      {/* Photo or initials */}
      <div className="w-20 h-20 rounded-full ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-[var(--bg-page)] overflow-hidden shrink-0">
        {member.photo_url && !imgError ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <InitialsAvatar name={member.name} index={index} />
        )}
      </div>

      {/* Name & position */}
      <div>
        <p className="font-bold text-sm text-[var(--text-primary)] font-heading leading-snug">
          {member.name}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
          {member.position}
        </p>
      </div>
    </div>
  );
}

// ── Category display config ────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  chief_patron: {
    label: 'Chief Patron',
    badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
  },
  patron: {
    label: 'Patrons',
    badgeClass: 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400',
  },
  organizing_committee: {
    label: 'Organizing Committee',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  technical_team: {
    label: 'Technical Team',
    badgeClass: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400',
  },
  volunteer_lead: {
    label: 'Volunteer Leads',
    badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
  },
};

const CATEGORY_ORDER = [
  'chief_patron',
  'patron',
  'organizing_committee',
  'technical_team',
  'volunteer_lead',
];

// ── Category group section ─────────────────────────────────────────
function GroupSection({
  category,
  members,
}: {
  category: string;
  members: CommitteeMember[];
}) {
  const config = CATEGORY_CONFIG[category] ?? {
    label: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    badgeClass:
      'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]',
  };

  const [headerRef, headerInView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  const [gridRef, gridInView] = useInView<HTMLDivElement>({ threshold: 0.05 });

  return (
    <div className="space-y-6">
      <div
        ref={headerRef}
        className={`reveal-up ${headerInView ? 'in-view' : ''} flex items-center gap-3`}
      >
        <span className={`px-3 py-1 rounded-full text-xs font-bold border font-heading ${config.badgeClass}`}>
          {config.label}
        </span>
        <div className="flex-1 h-px bg-[var(--border-subtle)]" />
        <span className="text-xs text-[var(--text-muted)] font-mono">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        ref={gridRef}
        className="stagger-children grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        {members.map((member, i) => (
          <MemberCard key={member.id} member={member} index={i} inView={gridInView} />
        ))}
      </div>
    </div>
  );
}

// ── Group helper ───────────────────────────────────────────────────
function groupByCategory(list: CommitteeMember[]) {
  const grouped: Record<string, CommitteeMember[]> = {};
  CATEGORY_ORDER.forEach(cat => {
    const group = list.filter(m => m.category === cat);
    if (group.length > 0) grouped[cat] = group;
  });
  // any unknown categories go at the end
  list.forEach(m => {
    if (!CATEGORY_ORDER.includes(m.category)) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    }
  });
  return grouped;
}

// ── Main CommitteeGrid ─────────────────────────────────────────────
export function CommitteeGrid() {
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [headerRef, headerInView] = useInView<HTMLDivElement>({ threshold: 0.1 });

  useEffect(() => {
    const supabase = createClient();

    // No Supabase connection → use mock immediately
    if (!supabase) {
      setMembers(MOCK_COMMITTEE);
      setLoading(false);
      return;
    }

    supabase
      .from('fest_committee')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(
        ({
          data,
          error: err,
        }: {
          data: CommitteeMember[] | null;
          error: { message: string } | null;
        }) => {
          if (err || !data || data.length === 0) {
            // DB error or table empty → fall back to mock data
            if (err) console.warn('[CommitteeGrid] Supabase error — using mock data:', err.message);
            setMembers(MOCK_COMMITTEE);
          } else {
            setMembers(data);
          }
          setLoading(false);
        }
      );
  }, []);

  const grouped = groupByCategory(members);

  return (
    <section id="committee" className="relative py-24 sm:py-32 bg-[var(--bg-subtle)]/40">
      {/* Top rule */}
      <div className="absolute top-0 left-0 right-0 h-px bg-[var(--border-subtle)]" />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 space-y-12 sm:space-y-16">

        {/* Section header */}
        <div
          ref={headerRef}
          className={`reveal-up ${headerInView ? 'in-view' : ''} mb-14 sm:mb-20`}
        >
          <p className="text-purple-500 text-xs font-bold tracking-[0.2em] uppercase mb-3">
            The People
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] font-heading leading-[1.05]">
              Festival<br className="hidden sm:block" /> Committee
            </h2>
            <p className="text-sm text-[var(--text-secondary)] sm:text-right sm:max-w-xs leading-relaxed">
              لجنة المهرجان<br />
              <span className="text-xs opacity-70">
                The dedicated individuals behind the 14th Wafy Arts Fest.
              </span>
            </p>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-purple-500/60 via-[var(--border-medium)] to-transparent" />
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Member groups */}
        {!loading && Object.keys(grouped).length > 0 && (
          <div className="space-y-12 sm:space-y-16">
            {Object.entries(grouped).map(([category, categoryMembers]) => (
              <GroupSection
                key={category}
                category={category}
                members={categoryMembers}
              />
            ))}
          </div>
        )}

        {/* Fallback — should never show since mock always fills it */}
        {!loading && Object.keys(grouped).length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="w-10 h-10 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">Committee details coming soon.</p>
          </div>
        )}
      </div>
    </section>
  );
}
