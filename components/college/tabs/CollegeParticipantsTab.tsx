'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Registration, Item, isCategoryMatching } from '@/lib/types/fest';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { Download, Search, Users, ArrowUpDown, ChevronDown, RotateCcw } from 'lucide-react';

interface CollegeParticipantsTabProps {
  registrations: Registration[];
  onEditRegistration?: (item: Item) => void;
  onUnregisterRegistration?: (item: Item) => void;
  collegeName?: string;
  collegeAfflNo?: number;
}

interface ParticipantRow {
  id: string;
  studentName: string;
  cicNo: string;
  chestNo: string;
  category: string;
  itemName: string;
  itemNameMal?: string;
  itemCode: string;
  itemType: string;
  itemMode?: string;
  blindCode: string;
}

function parseCicSortKey(cic: string): { prefix: string; num: number; raw: string } {
  const match = cic.match(/^([A-Z\-_\s]*?)(\d+)/i);
  if (match) {
    return {
      prefix: match[1].toUpperCase(),
      num: parseInt(match[2], 10),
      raw: cic
    };
  }
  return { prefix: cic.toUpperCase(), num: 0, raw: cic };
}

function compareCicNo(a: string, b: string): number {
  const keyA = parseCicSortKey(a);
  const keyB = parseCicSortKey(b);

  if (keyA.prefix !== keyB.prefix) {
    return keyA.prefix.localeCompare(keyB.prefix);
  }
  if (keyA.num !== keyB.num) {
    return keyA.num - keyB.num;
  }
  return keyA.raw.localeCompare(keyB.raw);
}

export function CollegeParticipantsTab({
  registrations,
  collegeName = 'College',
  collegeAfflNo = 11
}: CollegeParticipantsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedItemCode, setSelectedItemCode] = useState('All Item Codes');
  const [sortAsc, setSortAsc] = useState(true);

  // Extract flat participant rows with all details (Student Name, CIC No, Category, Item Name, Item Code, Type, Blind Code, etc.)
  const participantRows = React.useMemo(() => {
    const list: ParticipantRow[] = [];
    const seenKeys = new Set<string>();

    registrations.forEach(r => {
      const itemCode = r.item?.code || r.item?.item_code || '';
      const itemName = r.item?.name || r.item?.name_eng || '';
      const itemNameMal = r.item?.name_mal;
      const itemType = r.item?.item_type || (r.item?.point_type === 'group' ? 'Group' : 'Single');
      const itemMode = r.item?.mode;
      const blindCode = r.code_letter || 'Unassigned';

      const participants = (r.participants && r.participants.length > 0)
        ? r.participants
        : (r.student ? [r.student] : []);

      participants.forEach(p => {
        const studentName = p.full_name || p.name || 'Unknown Student';
        const cicNo = String(p.cic_no || p.admission_no || p.cic_number || 'N/A');
        const chestNo = getCanonicalChestNo(p);
        const category = p.category || p.phase || r.item?.phase || 'General';

        const uniqueKey = `${itemCode}-${p.id || cicNo || chestNo}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          list.push({
            id: uniqueKey,
            studentName,
            cicNo,
            chestNo,
            category,
            itemName,
            itemNameMal,
            itemCode,
            itemType,
            itemMode,
            blindCode
          });
        }
      });
    });

    // Default sort by CIC No (natural numeric order)
    list.sort((a, b) => {
      const res = compareCicNo(a.cicNo, b.cicNo);
      return sortAsc ? res : -res;
    });

    return list;
  }, [registrations, sortAsc]);

  // Unique Category options for dropdown
  const categoryOptions = React.useMemo(() => {
    const set = new Set<string>();
    participantRows.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [participantRows]);

  // Unique Item Code options for dropdown
  const itemCodeOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    participantRows.forEach(p => {
      if (p.itemCode) {
        map.set(p.itemCode, p.itemName);
      }
    });
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [participantRows]);

  // Combined search + category + item code filter
  const filteredRows = React.useMemo(() => {
    return participantRows.filter(p => {
      // 1. Category Filter
      if (selectedCategory !== 'All Categories') {
        if (!isCategoryMatching(p.category, selectedCategory)) {
          return false;
        }
      }
      // 2. Item Code Filter
      if (selectedItemCode !== 'All Item Codes') {
        if (p.itemCode.toLowerCase() !== selectedItemCode.toLowerCase()) {
          return false;
        }
      }
      // 3. Search Query
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matches =
          p.studentName.toLowerCase().includes(q) ||
          p.cicNo.toLowerCase().includes(q) ||
          p.chestNo.toLowerCase().includes(q) ||
          p.itemName.toLowerCase().includes(q) ||
          p.itemCode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [participantRows, selectedCategory, selectedItemCode, searchQuery]);

  const hasActiveFilters = selectedCategory !== 'All Categories' || selectedItemCode !== 'All Item Codes' || searchQuery !== '';

  const handleResetFilters = () => {
    setSelectedCategory('All Categories');
    setSelectedItemCode('All Item Codes');
    setSearchQuery('');
  };

  const handleExportCSV = () => {
    if (filteredRows.length === 0) {
      alert('No participant records available to export.');
      return;
    }

    const rows: string[] = [];
    rows.push('Student Name,CIC No,Chest No,Category,Item Name,Item Code,Item Type,Blind Code,Mode');

    filteredRows.forEach(p => {
      const studentName = `"${p.studentName.replace(/"/g, '""')}"`;
      const cicNo = `"${p.cicNo.replace(/"/g, '""')}"`;
      const chestNo = `"${p.chestNo.replace(/"/g, '""')}"`;
      const category = `"${p.category.replace(/"/g, '""')}"`;
      const itemName = `"${p.itemName.replace(/"/g, '""')}"`;
      const itemCode = `"${p.itemCode.replace(/"/g, '""')}"`;
      const itemType = `"${p.itemType.replace(/"/g, '""')}"`;
      const blindCode = `"${p.blindCode.replace(/"/g, '""')}"`;
      const mode = `"${(p.itemMode || '').replace(/"/g, '""')}"`;

      rows.push(`${studentName},${cicNo},${chestNo},${category},${itemName},${itemCode},${itemType},${blindCode},${mode}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${collegeName.replace(/[^a-z0-9]/gi, '_')}_Affl${collegeAfflNo}_Participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Registered Competition Participants</CardTitle>
            <Badge variant="navy">{filteredRows.length} / {participantRows.length} Entries</Badge>
          </div>
          <CardDescription>
            Official participant directory sorted by CIC number
          </CardDescription>
        </div>

        {/* Toolbar: Category Filter + Item Code Filter + Search + CSV Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 shadow-2xs hover:border-[var(--border-strong)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="All Categories">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Item Code Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedItemCode}
              onChange={e => setSelectedItemCode(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-surface)] border border-[var(--border-medium)] text-[var(--text-primary)] text-xs font-semibold rounded-xl px-3 py-1.5 pr-8 shadow-2xs hover:border-[var(--border-strong)] focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
            >
              <option value="All Item Codes">All Item Codes</option>
              {itemCodeOptions.map(opt => (
                <option key={opt.code} value={opt.code}>
                  {opt.code} ({opt.name.slice(0, 16)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              size="xs"
              variant="outline"
              onClick={handleResetFilters}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}

          {/* Export CSV Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-1.5 font-semibold shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="flex items-center gap-1 hover:text-emerald-500 transition-colors font-bold cursor-pointer text-xs"
                  title="Click to toggle CIC sorting direction"
                >
                  <span>CIC / Adm No</span>
                  <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                </button>
              </TableHead>
              <TableHead>Chest No</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Item Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-center">Blind Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-[var(--text-muted)] text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  No matching competition participant details found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="text-center font-medium text-[var(--text-muted)]">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-[var(--text-primary)]">{p.studentName}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {p.cicNo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                      {p.chestNo}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={p.category} />
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[var(--text-primary)]">{p.itemName}</div>
                    {p.itemNameMal && (
                      <div className="text-[10px] text-[var(--text-muted)]">{p.itemNameMal}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                    {p.itemCode}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.itemType === 'Group' ? 'purple' : 'secondary'}>
                      {p.itemType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.blindCode !== 'Unassigned' ? (
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs">
                        {p.blindCode}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs">Unassigned</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
