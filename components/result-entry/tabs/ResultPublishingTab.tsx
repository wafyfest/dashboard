'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge, CategoryBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, CheckCircle2 } from 'lucide-react';
import { Item, Result } from '@/lib/types/fest';

export interface AggregatedEventResult {
  item_id: number;
  item: Item | undefined;
  results: Result[];
  first: Result | undefined;
  second: Result | undefined;
  third: Result | undefined;
  is_published: boolean;
}

interface ResultPublishingTabProps {
  aggregatedResults: AggregatedEventResult[];
  onTogglePublish: (itemId: number, currentPublishedState: boolean) => void;
}

export function ResultPublishingTab({
  aggregatedResults,
  onTogglePublish,
}: ResultPublishingTabProps) {
  const publishedCount = aggregatedResults.filter(a => a.is_published).length;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-base font-heading font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Globe className="w-4 h-4 text-[var(--f-saffron-text)]" />
            Official Result Publishing Console
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-secondary)]">
            Toggle publication of scored events. Published results immediately reflect on public scoreboards and college dashboards.
          </CardDescription>
        </div>
        <span className="text-xs font-mono text-[var(--text-muted)]">
          {publishedCount} Published / {aggregatedResults.length} Scored
        </span>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Event Code & Name</TableHead>
              <TableHead>Category / Phase</TableHead>
              <TableHead>1st Place (Winner)</TableHead>
              <TableHead>2nd Place</TableHead>
              <TableHead>3rd Place</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Publish Toggle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregatedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-[var(--text-muted)] text-sm">
                  No scored events available yet. Enter scores in the Score Entry tab to make them available for publishing.
                </TableCell>
              </TableRow>
            ) : (
              aggregatedResults.map((agg, idx) => {
                const item = agg.item;
                const isPub = agg.is_published;

                return (
                  <TableRow key={agg.item_id} className="hover:bg-[var(--bg-hover)]">
                    <TableCell className="text-center font-medium text-[var(--text-muted)] text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-xs text-[var(--text-primary)]">
                        {item?.item_code || item?.code}
                      </div>
                      <div className="font-semibold text-xs text-[var(--text-primary)] mt-0.5">
                        {item?.name_eng || item?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CategoryBadge category={item?.phase || item?.category || 'General'} />
                    </TableCell>
                    <TableCell>
                      {agg.first ? (
                        <div>
                          <span className="font-bold text-xs text-[var(--f-saffron-text)]">
                            Code [{agg.first.code_letter}]
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] block">
                            Chest: {agg.first.chest_no || 'N/A'} • {agg.first.points} pts
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {agg.second ? (
                        <div>
                          <span className="font-bold text-xs text-[var(--text-primary)]">
                            Code [{agg.second.code_letter}]
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] block">
                            Chest: {agg.second.chest_no || 'N/A'} • {agg.second.points} pts
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {agg.third ? (
                        <div>
                          <span className="font-bold text-xs text-[var(--text-primary)]">
                            Code [{agg.third.code_letter}]
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] block">
                            Chest: {agg.third.chest_no || 'N/A'} • {agg.third.points} pts
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPub ? (
                        <Badge variant="success" size="sm" className="font-bold gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Published</span>
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm" className="font-bold">
                          <span>Draft</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant={isPub ? 'destructive' : 'saffron'}
                        onClick={() => onTogglePublish(agg.item_id, isPub)}
                        className="font-semibold shadow-2xs focus-visible:ring-2 focus-visible:ring-amber-500"
                      >
                        {isPub ? 'Unpublish' : 'Publish Result'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
