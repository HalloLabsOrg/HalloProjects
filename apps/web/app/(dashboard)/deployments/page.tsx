'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { deploymentsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Rocket, Search, Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

const STATUSES = ['ALL', 'PENDING', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'CANCELLED'];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  FAILED: 'destructive',
  CANCELLED: 'outline',
  PENDING: 'secondary',
  BUILDING: 'secondary',
  DEPLOYING: 'secondary',
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function DeploymentsPage() {
  const router = useRouter();
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['deployments', status, search, startDate, endDate, page],
    queryFn: () =>
      deploymentsApi.list({
        status: status === 'ALL' ? undefined : status,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit,
      }),
  });

  const deployments = (data as any)?.data ?? [];
  const meta = (data as any)?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const handleReset = () => {
    setStatus('ALL');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deployments</h1>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search service, commit, branch..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 w-full"
          />
        </div>

        <div className="w-40">
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'ALL' ? 'All Statuses' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="w-40 text-sm"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="w-40 text-sm"
          />
        </div>

        {(status !== 'ALL' || search || startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton
          columns={['Service', 'Environment', 'Branch', 'Commit', 'Status', 'Duration', 'Date']}
        />
      ) : deployments.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deployments"
          description={
            status !== 'ALL' || search || startDate || endDate
              ? 'No deployments match your active filters.'
              : 'Trigger a deployment from a project service.'
          }
          action={
            status !== 'ALL' || search || startDate || endDate
              ? { label: 'Clear Filters', onClick: handleReset }
              : undefined
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map((d: any) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/deployments/${d.id}`)}
                >
                  <TableCell className="font-semibold text-foreground">
                    {d.service?.name ?? '—'}
                  </TableCell>
                  <TableCell>{d.environment?.name ?? '—'}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                      {d.branch}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {d.commitSha ? (
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {d.commitSha.slice(0, 7)}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {d.commitMsg ?? 'No commit message'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[d.status] ?? 'outline'}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm text-foreground">
                    {formatDuration(d.duration)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(d.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing{' '}
              <span className="font-semibold text-foreground">
                {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-foreground">
                {Math.min(meta.page * meta.limit, meta.total)}
              </span>{' '}
              of <span className="font-semibold text-foreground">{meta.total}</span> deployments
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className="h-8 gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className="h-8 gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
