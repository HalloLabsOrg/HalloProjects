'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { deploymentsApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
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
import { Rocket } from 'lucide-react';

const STATUSES = ['ALL', 'PENDING', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'CANCELLED'];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  FAILED: 'destructive',
  CANCELLED: 'outline',
  PENDING: 'secondary',
  BUILDING: 'secondary',
  DEPLOYING: 'secondary',
};

export default function DeploymentsPage() {
  const router = useRouter();
  const [status, setStatus] = useState('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['deployments', status],
    queryFn: () =>
      deploymentsApi.list({ status: status === 'ALL' ? undefined : status, limit: 50 }),
  });

  const deployments = (data as any)?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Deployments</h1>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton columns={['Service', 'Environment', 'Branch', 'Status', 'Date']} />
      ) : deployments.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No deployments"
          description="Trigger a deployment from a project service."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((d: any) => (
              <TableRow
                key={d.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/deployments/${d.id}`)}
              >
                <TableCell className="font-medium">{d.service?.name ?? '—'}</TableCell>
                <TableCell>{d.environment?.name ?? '—'}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{d.branch}</code>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[d.status] ?? 'outline'}>{d.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(d.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
