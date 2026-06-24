'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsApi } from '@/lib/api';
import { useRequireAdmin } from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ScrollText } from 'lucide-react';

export default function AuditLogsPage() {
  useRequireAdmin();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', from, to],
    queryFn: () => auditLogsApi.list({ from: from || undefined, to: to || undefined, limit: 50 }),
  });

  const logs = (data as any)?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <div className="flex gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton columns={['Action', 'User', 'Entity', 'IP', 'Date']} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit logs"
          description="Actions will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{log.user?.name ?? '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.entityType ? `${log.entityType}:${log.entityId?.slice(0, 8)}` : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.ipAddress ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
