'use client';

import React, { useState } from 'react';
import { festService } from '@/lib/services/festService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Badge, CategoryBadge, StageStatusBadge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  GraduationCap,
  Search,
  Printer,
  Calendar,
  Award,
  Clock,
  Sparkles,
  QrCode,
  Trophy
} from 'lucide-react';
import { Student } from '@/lib/types/fest';

export function StudentView() {
  const [searchQuery, setSearchQuery] = useState('CH-101');
  const [activeTab, setActiveTab] = useState<'schedule' | 'admit_card' | 'results'>('schedule');

  const students = festService.getStudents();
  const colleges = festService.getColleges();
  const items = festService.getItems();
  const schedules = festService.getSchedules();
  const registrations = festService.getRegistrations();
  const results = festService.getResults();
  const leaderboard = festService.getLeaderboard();

  // Find student matching query (chest number or admission number or name)
  const currentStudent: Student | undefined = students.find(
    s =>
      s.chest_no?.toLowerCase() === searchQuery.trim().toLowerCase() ||
      s.admission_no.toLowerCase() === searchQuery.trim().toLowerCase() ||
      (s.full_name || s.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  ) || students[0];

  const studentCollege = colleges.find(c => c.affl_no === currentStudent?.college_affl_no || c.id === currentStudent?.college_id);

  // Events this student is registered for
  const studentRegistrations = registrations.filter(r =>
    r.chest_no === currentStudent?.chest_no ||
    r.participants?.some(p => p.id === currentStudent?.id || p.chest_no === currentStudent?.chest_no)
  );

  const studentItemIds = new Set(studentRegistrations.map(r => r.item_id));
  const studentSchedules = schedules.filter(s => studentItemIds.has(s.item_id));

  return (
    <div className="space-y-6">
      {/* Student Search & Quick Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#132238]">
                {currentStudent ? currentStudent.full_name : 'Student Portal'}
              </h2>
              {currentStudent?.chest_no && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#132238] text-white font-mono text-xs font-bold">
                  {currentStudent.chest_no}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Institution: <strong className="text-slate-700">{studentCollege?.name}</strong> ({studentCollege?.code}) | Admission: <span className="font-mono">{currentStudent?.admission_no}</span>
            </p>
          </div>
        </div>

        {/* Chest No Search Box */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Chest / Adm No..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#132238]/20 w-48 sm:w-60 font-medium"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab('admit_card')}>
            <Printer className="w-3.5 h-3.5" /> Admit Card
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
        {[
          { id: 'schedule', label: `My Competition Schedule (${studentSchedules.length})` },
          { id: 'admit_card', label: 'Official Admit Card' },
          { id: 'results', label: 'Live Results & Leaderboard' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#132238] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. SCHEDULE VIEW */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Registered Events & Venue Timetable</CardTitle>
                <CardDescription>Real-time stage tracking and reporting venues for your competitions</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Code & Title</TableHead>
                    <TableHead>Assigned Venue</TableHead>
                    <TableHead>Reporting Time</TableHead>
                    <TableHead>Blind Code</TableHead>
                    <TableHead>Stage Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                        No scheduled competitions found for this student.
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentSchedules.map(sch => {
                      const reg = studentRegistrations.find(r => r.item_id === sch.item_id);

                      return (
                        <TableRow key={sch.id}>
                          <TableCell>
                            <div className="font-semibold text-[#132238]">{sch.item?.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{sch.item?.code}</span>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-800">{sch.stage?.name}</div>
                            <span className="text-[11px] text-slate-500">{sch.stage?.location}</span>
                          </TableCell>
                          <TableCell className="font-mono text-slate-700">
                            {new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>
                            {reg?.code_letter ? (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold text-xs">
                                {reg.code_letter}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Assigned at Stage</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StageStatusBadge status={sch.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. ADMIT CARD VIEW */}
      {activeTab === 'admit_card' && currentStudent && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> Print Admit Card
            </Button>
          </div>

          <div className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-elevated print:border-black print:shadow-none space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                  INTER-COLLEGE ARTS FEST
                </span>
                <h3 className="text-base font-extrabold text-[#132238]">STUDENT PARTICIPANT PASS</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">CHEST NO</span>
                <div className="font-mono text-xl font-black px-3 py-1 rounded-xl bg-[#132238] text-white inline-block">
                  {currentStudent.chest_no}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex gap-4 items-center">
              {currentStudent.photo_url ? (
                <img
                  src={currentStudent.photo_url}
                  alt={currentStudent.full_name}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                  PHOTO
                </div>
              )}
              <div className="space-y-1 text-xs">
                <h4 className="text-base font-bold text-[#132238]">{currentStudent.full_name || currentStudent.name}</h4>
                <div className="text-slate-600">Institution: <strong className="text-slate-800">{studentCollege?.name}</strong></div>
                <div className="text-slate-600">Admission No: <span className="font-mono">{currentStudent.admission_no}</span></div>
                <div className="pt-1">
                  <CategoryBadge category={currentStudent.category || currentStudent.phase || 'Senior'} />
                </div>
              </div>
            </div>

            {/* Registered Events */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-2">
                Authorized Competitions & Stages:
              </span>
              <div className="space-y-1.5">
                {studentRegistrations.map(r => {
                  const sch = schedules.find(s => s.item_id === r.item_id);
                  return (
                    <div
                      key={r.id}
                      className="text-xs flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{r.item?.name}</div>
                        <span className="text-[10px] text-slate-500 font-mono">{r.item?.code}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-slate-800">{sch?.stage?.name.split(':')[0] || 'TBA'}</div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {sch ? new Date(sch.scheduled_start || sch.starting).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Barcode Simulation */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-slate-700" />
                <span className="font-mono">VERIFIED: {currentStudent.id.slice(0, 8)}</span>
              </div>
              <div className="text-right">
                <span className="block font-medium text-slate-700">Arts Fest Organizing Committee</span>
                <span className="text-[10px]">Valid with institutional ID</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESULTS & LEADERBOARD VIEW */}
      {activeTab === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Official Results */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Published Event Results</CardTitle>
                  <CardDescription>Officially finalized and published competition ranks</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>🥇 First Place</TableHead>
                      <TableHead>🥈 Second Place</TableHead>
                      <TableHead>🥉 Third Place</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.filter(r => r.published).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                          Results will appear here as soon as they are officially ratified.
                        </TableCell>
                      </TableRow>
                    ) : (
                      results
                        .filter(r => r.published)
                        .map(res => (
                          <TableRow key={res.id}>
                            <TableCell className="font-semibold text-[#132238]">{res.item?.name}</TableCell>
                            <TableCell>
                              <div className="font-bold text-amber-600">{res.first_reg?.college?.code || res.first_reg?.college?.short_name}</div>
                              <span className="text-[11px] text-slate-500">
                                {res.first_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-600">{res.second_reg?.college?.code || res.second_reg?.college?.short_name || '-'}</div>
                              <span className="text-[11px] text-slate-500">
                                {res.second_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || ''}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-amber-700">{res.third_reg?.college?.code || res.third_reg?.college?.short_name || '-'}</div>
                              <span className="text-[11px] text-slate-500">
                                {res.third_reg?.participants?.map((p: any) => p.name || p.full_name).join(', ') || ''}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Inter-Collegiate Standings Leaderboard */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" /> Overall College Trophy
                </CardTitle>
                <CardDescription>Aggregate championship points table</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank & College</TableHead>
                    <TableHead className="text-right">Medals</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, idx) => (
                    <TableRow key={entry.college.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'text-slate-500'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-[#132238]">{entry.college.code}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {entry.college.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-[11px] font-mono">
                        🥇{entry.gold} 🥈{entry.silver} 🥉{entry.bronze}
                      </TableCell>
                      <TableCell className="text-right font-black text-[#132238] text-sm">
                        {entry.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
