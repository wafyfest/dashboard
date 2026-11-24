'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Result } from '@/lib/types/fest';
import { useFest } from '@/lib/context/FestContext';
import { festService } from '@/lib/services/festService';

interface ResultsTabProps {
  onRefresh?: () => void;
}

export function ResultsTab({ onRefresh }: ResultsTabProps) {
  const { refreshKey, triggerRefresh } = useFest();
  const results = React.useMemo(() => festService.getResults(), [refreshKey]);

  // Deduplicate results by event item_id for display and publishing controls
  const groupedResults = React.useMemo(() => {
    const map = new Map<number, Result>();
    for (const res of results) {
      if (!map.has(res.item_id)) {
        map.set(res.item_id, res);
      }
    }
    return Array.from(map.values());
  }, [results]);

  const handlePublishToggle = async (itemId: number, publish: boolean) => {
    const ok = await festService.publishResult(itemId, publish);
    if (!ok) {
      alert('Failed to update result publication status');
    } else {
      if (onRefresh) onRefresh();
      else triggerRefresh();
    }
  };

  return (
    <Card className="[box-shadow:var(--shadow-card),var(--glass-highlight)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-[var(--border-subtle)]/60">
        <div>
          <CardTitle className="font-heading font-bold text-base text-[var(--text-primary)]">
            Results Verification &amp; Official Publishing
          </CardTitle>
          <CardDescription className="text-xs text-[var(--text-muted)] font-sans">
            Review submitted tabulation sheets, verify points, and publish to the public leaderboard
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="min-w-[750px]">
          <TableHeader className="bg-[var(--bg-subtle)]">
            <TableRow>
              <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Event</TableHead>
              <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">1st Place (Gold - 5 pts)</TableHead>
              <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">2nd Place (Silver - 3 pts)</TableHead>
              <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">3rd Place (Bronze - 1 pt)</TableHead>
              <TableHead className="font-heading font-bold text-xs text-[var(--text-secondary)]">Status</TableHead>
              <TableHead className="text-right font-heading font-bold text-xs text-[var(--text-secondary)]">Publishing Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-[var(--text-muted)] font-sans">
                  No results entered yet by tabulators
                </TableCell>
              </TableRow>
            ) : (
              groupedResults.map(res => (
                <TableRow key={res.item_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <TableCell>
                    <div className="font-heading font-semibold text-[var(--text-primary)]">{res.item?.name}</div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{res.item?.code}</span>
                  </TableCell>
                  <TableCell>
                    {res.first_reg ? (
                      <div>
                        <span className="font-heading font-bold text-[var(--f-saffron-text)] dark:text-[var(--f-saffron)]">
                          🥇 {res.first_reg.college?.code || res.first_reg.college?.short_name}
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] font-sans">
                          {res.first_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs font-sans">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {res.second_reg ? (
                      <div>
                        <span className="font-heading font-bold text-[var(--text-secondary)]">
                          🥈 {res.second_reg.college?.code || res.second_reg.college?.short_name}
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] font-sans">
                          {res.second_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs font-sans">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {res.third_reg ? (
                      <div>
                        <span className="font-heading font-bold text-amber-700 dark:text-amber-500">
                          🥉 {res.third_reg.college?.code || res.third_reg.college?.short_name}
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] font-sans">
                          {res.third_reg.participants?.map((p: any) => p.name || p.full_name).join(', ')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)] text-xs font-sans">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {res.published ? (
                      <Badge variant="success">Published Live</Badge>
                    ) : (
                      <Badge variant="warning">Awaiting Approval</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="xs"
                      variant={res.published ? 'outline' : 'saffron'}
                      className="font-heading font-semibold"
                      onClick={() => handlePublishToggle(res.item_id, !res.published)}
                    >
                      {res.published ? 'Revoke to Draft' : 'Publish to Board'}
                    </Button>
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
