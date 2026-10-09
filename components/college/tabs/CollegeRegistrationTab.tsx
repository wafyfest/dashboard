'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, Registration } from '@/lib/types/fest';
import { festService, RegistrationStatus } from '@/lib/services/festService';
import { getCanonicalChestNo } from '@/lib/utils/studentIdentity';
import { ChevronDown, Plus, SquarePen, Trash2 } from 'lucide-react';

interface CollegeRegistrationTabProps {
  filteredItems: Item[];
  registrations: Registration[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categoryOptions: string[];
  currentCollegeId: string;
  currentCollegeAfflNo?: number;
  onOpenRegistrationModal: (item: Item) => void;
  onUnregisterRegistration?: (item: Item) => void;
  allItemsCount: number;
  registrationStatusByItem?: Map<number, RegistrationStatus>;
}

export function CollegeRegistrationTab({
  filteredItems,
  registrations,
  selectedCategory,
  setSelectedCategory,
  categoryOptions,
  currentCollegeId,
  currentCollegeAfflNo,
  onOpenRegistrationModal,
  onUnregisterRegistration,
  allItemsCount,
  registrationStatusByItem
}: CollegeRegistrationTabProps) {
  const registrationByItemId = React.useMemo(() => {
    const byItem = new Map<number, Registration>();
    for (const reg of registrations) {
      if (!byItem.has(reg.item_id)) {
        byItem.set(reg.item_id, reg);
      }
    }
    return byItem;
  }, [registrations]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle>Event Registration</CardTitle>
          <CardDescription>
            Enroll student participants in Single and Group events according to quotas
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 hidden sm:block">
            Enrolled: <strong className="text-emerald-700">{registrations.length}</strong> / {allItemsCount} Events
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#132238]/20 cursor-pointer"
            >
              <option value="All Categories">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Item (Malayalam)</TableHead>
              <TableHead>Name (English)</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-center">Registered</TableHead>
              <TableHead className="text-center w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item, index) => {
              const reg = registrationByItemId.get(item.item_id);
              const lockCheck = registrationStatusByItem?.get(item.item_id)
                || festService.isRegistrationOpen(currentCollegeAfflNo || currentCollegeId, item.item_id || item.id);
              const itemCategory = item.phase || item.category;
              const itemType = item.point_type
                ? (item.point_type.toLowerCase() === 'group' ? 'Group' : 'Individual')
                : (item.item_type === 'Group' ? 'Group' : 'Individual');
              const maxCount = item.no_of_participants || item.max_participants || 1;
              const registeredCount = reg ? (reg.participants?.length || 1) : 0;
              const isRegistered = !!reg;

              return (
                <TableRow key={item.id}>
                  <TableCell className="text-center font-medium text-slate-500">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.name_mal || item.name}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-[#132238] dark:text-slate-100">{item.name_eng || item.name}</div>
                    {reg && reg.participants && reg.participants.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Roster: {reg.participants.map(p => `${p.full_name || p.name} (${getCanonicalChestNo(p)})`).join(', ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={itemCategory} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={itemType === 'Group' ? 'purple' : 'secondary'}>
                      {itemType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.item_code || item.code}
                  </TableCell>
                  <TableCell className="text-center">
                    {isRegistered ? (
                      <span className="font-mono font-bold text-sm text-emerald-600">
                        {registeredCount}/{maxCount}
                      </span>
                    ) : (
                      <span
                        className={`font-mono font-bold text-sm ${!lockCheck.canRegister ? 'text-rose-500' : 'text-blue-600'}`}
                        title={!lockCheck.canRegister ? lockCheck.reason : undefined}
                      >
                        0/{maxCount}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {isRegistered ? (
                        <>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                            title="Edit Roster"
                            onClick={() => onOpenRegistrationModal(item)}
                          >
                            <SquarePen className="w-4 h-4" />
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            title="Remove / Unregister Event"
                            onClick={() => {
                              if (confirm(`Are you sure you want to unregister from "${item.name_eng || item.name}"?`)) {
                                onUnregisterRegistration?.(item);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          variant="primary"
                          disabled={!lockCheck.canRegister}
                          className="h-8 w-8 p-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                          title={lockCheck.canRegister ? 'Register Entry' : lockCheck.reason}
                          onClick={() => onOpenRegistrationModal(item)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                  No events found matching the selected category.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
