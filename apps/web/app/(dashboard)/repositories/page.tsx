'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repositoriesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { GitBranch, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RepositoriesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['repositories', search],
    queryFn: () => repositoriesApi.list({ search, limit: 50 }),
  });

  const syncMutation = useMutation({
    mutationFn: () => repositoriesApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      toast({ title: 'Repositories synced successfully' });
    },
    onError: () => toast({ title: 'Sync failed', variant: 'destructive' }),
  });

  const repos = (data as any)?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync All
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <TableSkeleton columns={['Name', 'Provider', 'Branch', 'Visibility', 'Last Synced']} />
      ) : repos.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories"
          description="Connect a GitHub provider and sync to see your repositories here."
          action={{ label: 'Sync Now', onClick: () => syncMutation.mutate() }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Last Synced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repos.map((repo: any) => (
              <TableRow key={repo.id}>
                <TableCell className="font-medium">{repo.fullName}</TableCell>
                <TableCell>{repo.provider?.name ?? '—'}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{repo.defaultBranch}</code>
                </TableCell>
                <TableCell>
                  <Badge variant={repo.visibility === 'private' ? 'secondary' : 'outline'}>
                    {repo.visibility}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {repo.syncedAt ? new Date(repo.syncedAt).toLocaleDateString() : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
