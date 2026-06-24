'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  FAILED: 'destructive',
  CANCELLED: 'outline',
  PENDING: 'secondary',
  BUILDING: 'secondary',
  DEPLOYING: 'secondary',
};

const CANCELLABLE = ['PENDING', 'BUILDING', 'DEPLOYING'];

export default function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: deployment, isLoading } = useQuery({
    queryKey: ['deployment', id],
    queryFn: () => deploymentsApi.get(id),
    refetchInterval: (data: any) => (CANCELLABLE.includes(data?.status) ? 5000 : false),
  });

  const cancelMutation = useMutation({
    mutationFn: () => deploymentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployment', id] });
      toast({ title: 'Deployment cancelled' });
    },
    onError: () => toast({ title: 'Failed to cancel', variant: 'destructive' }),
  });

  const d = deployment as any;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Deployment</h1>
          <p className="text-sm text-muted-foreground font-mono">{d?.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANTS[d?.status] ?? 'outline'} className="text-sm px-3 py-1">
            {d?.status}
          </Badge>
          {CANCELLABLE.includes(d?.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Service', value: d?.service?.name },
          { label: 'Environment', value: d?.environment?.name },
          { label: 'Branch', value: d?.branch },
          { label: 'Commit', value: d?.commitSha?.slice(0, 7) ?? '—' },
          { label: 'Provider', value: d?.provider?.name },
          { label: 'Triggered by', value: d?.triggeredBy },
          { label: 'Started', value: d?.startedAt ? new Date(d.startedAt).toLocaleString() : '—' },
          {
            label: 'Completed',
            value: d?.completedAt ? new Date(d.completedAt).toLocaleString() : '—',
          },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <p className="text-sm font-medium">{value ?? '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {d?.logs ? (
            <pre className="text-xs font-mono bg-muted p-4 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
              {d.logs}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">No logs available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
