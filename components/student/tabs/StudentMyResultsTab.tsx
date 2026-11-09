'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Sliders,
  Search,
  Medal,
  Award,
  Trophy,
  Download,
} from 'lucide-react';
import { Student, formatStudentCategory } from '@/lib/types/fest';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';

interface StudentMyResultsTabProps {
  targetStu: Student | null;
  guestStudent: Student | null;
  guestSearchQuery: string;
  setGuestSearchQuery: (q: string) => void;
  setGuestStudent: (stu: Student | null) => void;
  handleGuestLookup: (e: React.FormEvent) => void;
  myResults: any[];
  openCustomPoster: () => void;
  openPosterForResult: (res: any) => void;
}

export function StudentMyResultsTab({
  targetStu,
  guestStudent,
  guestSearchQuery,
  setGuestSearchQuery,
  setGuestStudent,
  handleGuestLookup,
  myResults,
  openCustomPoster,
  openPosterForResult,
}: StudentMyResultsTabProps) {
  return (
    <div className="space-y-6">
      {/* Header Action Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1f1303] via-[#121829] to-[#090d1a] p-6 sm:p-8 text-white border border-amber-500/25 shadow-elevated [box-shadow:var(--shadow-elevated),var(--glass-highlight)]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/35 text-amber-300 text-xs font-heading font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Social Media Poster Generator</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight">My Fest Results & Celebration Posters</h2>
            <p className="text-xs text-slate-300 max-w-xl font-sans leading-relaxed">
              Download high-resolution official achievement posters tailored with your name, English event title, category phase, and prize won to share directly on WhatsApp and Instagram status.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={openCustomPoster}
              className="bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] text-[#090d1a] font-heading font-bold text-xs shadow-md shadow-amber-500/25 flex items-center gap-2 cursor-pointer border-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
            >
              <Sliders className="w-4 h-4 text-[#090d1a]" />
              <span>Custom Poster Designer</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Guest Search Lookup */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-4">
        <form onSubmit={handleGuestLookup} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Lookup by Chest No, Admission/CIC No or Student Name..."
              value={guestSearchQuery}
              onChange={e => setGuestSearchQuery(e.target.value)}
              aria-label="Student lookup search"
              className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] focus-visible:outline-none font-sans"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full sm:w-auto text-xs bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] text-[#090d1a] font-heading font-bold shrink-0 shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] active:scale-[0.98]"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            Find Student
          </Button>
        </form>

        {targetStu && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-sans">Active Profile:</span>
              <span className="font-heading font-bold text-[var(--text-primary)]">{targetStu.full_name || targetStu.name}</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                Chest #{getCanonicalChestNo(targetStu)}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-heading text-[11px] font-semibold border border-[var(--border-subtle)]">
                Phase: {formatStudentCategory(targetStu.category || 'General')}
              </span>
            </div>
            {guestStudent && (
              <button
                onClick={() => {
                  setGuestStudent(null);
                  setGuestSearchQuery('');
                }}
                className="text-[11px] font-heading font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Results Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Medal className="w-4 h-4 text-[var(--f-saffron)]" />
            <span>Published Honors & Prizes</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono">
              {myResults.length}
            </span>
          </h3>
        </div>

        {myResults.length === 0 ? (
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              <Award className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-heading font-bold text-[var(--text-primary)]">
                No Published Results Yet for {targetStu?.full_name || targetStu?.name || 'this participant'}
              </h4>
              <p className="text-xs font-sans text-[var(--text-muted)] max-w-md mx-auto">
                Evaluation results are announced live once judge score sheets are submitted. You can still generate and preview your celebration poster anytime using the designer below.
              </p>
            </div>
            <div>
              <Button
                onClick={openCustomPoster}
                className="bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] text-[#090d1a] font-heading font-bold text-xs inline-flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)] active:scale-[0.98]"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open Poster Designer</span>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myResults.map(res => {
              const isFirst = res.rank === 1;
              const isSecond = res.rank === 2;
              const isThird = res.rank === 3;
              const rankColor = isFirst
                ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/8 via-[var(--bg-surface)] to-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]'
                : isSecond
                ? 'border-neutral-400/30 bg-gradient-to-b from-neutral-500/5 via-[var(--bg-surface)] to-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]'
                : isThird
                ? 'border-orange-500/35 bg-gradient-to-b from-orange-500/5 via-[var(--bg-surface)] to-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]'
                : 'border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-[var(--bg-surface)] to-[var(--bg-surface)] [box-shadow:var(--shadow-card),var(--glass-highlight)]';

              return (
                <Card
                  key={res.id}
                  className={`border ${rankColor} rounded-2xl hover:shadow-md transition-all flex flex-col justify-between overflow-hidden`}
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-heading font-extrabold flex items-center gap-1.5 ${
                          isFirst
                            ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/35'
                            : isSecond
                            ? 'bg-neutral-500/15 text-neutral-800 dark:text-neutral-200 border border-neutral-500/30'
                            : isThird
                            ? 'bg-orange-500/15 text-orange-900 dark:text-orange-300 border border-orange-500/30'
                            : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-semibold'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        {res.prize}
                      </span>
                      {res.points && (
                        <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          +{res.points} Pts
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs text-[var(--text-muted)] font-mono">
                        {res.item?.item_code || `ITEM #${res.item?.item_id || ''}`}
                      </div>
                      <h4 className="text-sm font-heading font-bold text-[var(--text-primary)] mt-0.5">
                        {res.item?.name_eng || res.item?.name || 'Competition Event'}
                      </h4>
                      {res.item?.name_eng && res.item?.name && res.item.name !== res.item.name_eng && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-sans font-medium">
                          {res.item.name}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-heading font-semibold border border-[var(--border-subtle)]">
                        {formatStudentCategory(res.item?.phase || res.item?.category || 'General')}
                      </span>
                      {res.grade && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-300 font-mono font-bold border border-amber-500/30">
                          Grade {res.grade}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <Button
                      onClick={() => openPosterForResult(res)}
                      className="w-full bg-[var(--f-saffron)] hover:bg-[var(--f-saffron-hover)] text-[#090d1a] font-heading font-bold text-xs shadow-xs flex items-center justify-center gap-2 border-0 cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--f-saffron)]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Generate & Download Poster</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Poster Specifications Card */}
      <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card [box-shadow:var(--shadow-card),var(--glass-highlight)] rounded-2xl p-5">
        <h4 className="text-xs font-heading font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--f-saffron)]" />
          <span>Poster Specifications & Sharing Guide</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[var(--text-secondary)]">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="font-heading font-bold text-[var(--text-primary)] mb-1">1. Student Name</div>
            <p className="text-[11px] text-[var(--text-muted)] font-sans">Placed front and center in elegant gold typography.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="font-heading font-bold text-[var(--text-primary)] mb-1">2. Event Name (English)</div>
            <p className="text-[11px] text-[var(--text-muted)] font-sans">Official English title of the participated event.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="font-heading font-bold text-[var(--text-primary)] mb-1">3. Phase Category</div>
            <p className="text-[11px] text-[var(--text-muted)] font-sans">Category level (Senior, Junior, Sub-Junior, General).</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="font-heading font-bold text-[var(--text-primary)] mb-1">4. Prize Won</div>
            <p className="text-[11px] text-[var(--text-muted)] font-sans">Distinctive ribbon badge: First, Second, Third or Grade.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

