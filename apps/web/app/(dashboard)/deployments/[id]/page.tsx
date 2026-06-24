'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef } from 'react';

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [logs, setLogs] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

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

  const redeployMutation = useMutation({
    mutationFn: () =>
      deploymentsApi.trigger(d.serviceId, {
        environmentId: d.environmentId,
        providerId: d.providerId,
        branch: d.branch,
        commitSha: d.commitSha,
      }),
    onSuccess: (newDep: any) => {
      toast({ title: 'Redeployment triggered!' });
      router.push(`/deployments/${newDep.id}`);
    },
    onError: () => {
      toast({ title: 'Failed to trigger redeployment', variant: 'destructive' });
    },
  });

  // Handle SSE logs
  useEffect(() => {
    if (!d) return;

    if (!CANCELLABLE.includes(d.status)) {
      if (d.logs) {
        setLogs(d.logs);
      }
      return;
    }

    const token = localStorage.getItem('access_token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const sseUrl = `${baseUrl}/api/deployments/${id}/logs/stream?token=${token}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.logs) {
          setLogs((prev) => prev + payload.logs);
        }
        if (!CANCELLABLE.includes(payload.status)) {
          queryClient.invalidateQueries({ queryKey: ['deployment', id] });
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [d, id, queryClient]);

  // Autoscroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
          {CANCELLABLE.includes(d?.status) ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => redeployMutation.mutate()}
              disabled={redeployMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-deploy
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
          {logs ? (
            <div className="relative">
              <pre className="text-xs font-mono bg-muted p-4 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">
                {logs}
                <div ref={logEndRef} />
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No logs available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
