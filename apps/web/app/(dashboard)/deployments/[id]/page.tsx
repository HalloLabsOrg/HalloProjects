'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deploymentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  XCircle,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  PlayCircle,
  Loader2,
  Search,
  Terminal,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef, useMemo } from 'react';

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: React.ReactNode;
  }
> = {
  SUCCESS: {
    label: 'Success',
    variant: 'default',
    icon: <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />,
  },
  FAILED: {
    label: 'Failed',
    variant: 'destructive',
    icon: <XCircle className="h-4 w-4 mr-1" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'outline',
    icon: <XCircle className="h-4 w-4 mr-1 text-zinc-500" />,
  },
  PENDING: {
    label: 'Pending',
    variant: 'secondary',
    icon: <PlayCircle className="h-4 w-4 mr-1 animate-pulse" />,
  },
  BUILDING: {
    label: 'Building',
    variant: 'secondary',
    icon: <Loader2 className="h-4 w-4 mr-1 animate-spin text-blue-500" />,
  },
  DEPLOYING: {
    label: 'Deploying',
    variant: 'secondary',
    icon: <Loader2 className="h-4 w-4 mr-1 animate-spin text-emerald-500" />,
  },
};

const CANCELLABLE = ['PENDING', 'BUILDING', 'DEPLOYING'];

export default function DeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [logs, setLogs] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      toast({ title: 'Logs copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Failed to copy logs', variant: 'destructive' });
    }
  };

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
          {d?.status && (
            <Badge
              variant={STATUS_CONFIG[d.status]?.variant ?? 'outline'}
              className={`text-sm px-3 py-1 flex items-center gap-1 font-semibold ${
                d.status === 'SUCCESS'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                  : ''
              } ${
                d.status === 'BUILDING'
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20'
                  : ''
              } ${
                d.status === 'DEPLOYING'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                  : ''
              }`}
            >
              {STATUS_CONFIG[d.status]?.icon}
              {STATUS_CONFIG[d.status]?.label ?? d.status}
            </Badge>
          )}
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

      <Card className="overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-sm font-semibold">Console Logs</CardTitle>
          </div>
          {logs && (
            <Button variant="outline" size="sm" className="h-8 px-3" onClick={copyToClipboard}>
              {copied ? (
                <>
                  <Check className="mr-2 h-3.5 w-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy Logs
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {logs ? (
            <TerminalLogs logs={logs} />
          ) : (
            <div className="p-6 text-sm text-muted-foreground space-y-2">
              <p>No logs available yet.</p>
              <p className="text-xs text-muted-foreground/80">
                Catatan: Jika log build tidak muncul, pastikan API token Coolify yang Anda gunakan
                di panel <strong>Providers</strong> memiliki izin (permission){' '}
                <strong>read:sensitive</strong> agar sistem dapat menarik log build secara
                real-time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TerminalLogs({ logs }: { logs: string }) {
  const [filter, setFilter] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    if (!logs) return [];

    return logs.split('\n').map((line, idx) => {
      const isoRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s(.*)$/;
      const coolifyRegex = /^(\d{4}-[A-Za-z]{3}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s(.*)$/;

      let timestamp = '';
      let content = line;

      const coolifyMatch = line.match(coolifyRegex);
      if (coolifyMatch) {
        timestamp = coolifyMatch[1];
        content = coolifyMatch[2];
      } else {
        const isoMatch = line.match(isoRegex);
        if (isoMatch) {
          timestamp = isoMatch[1];
          content = isoMatch[2];
        }
      }

      const contentLower = content.toLowerCase();
      const isError =
        contentLower.includes('error') ||
        contentLower.includes('failed') ||
        contentLower.includes('err:') ||
        contentLower.includes('exit status 1');

      const isWarning = contentLower.includes('warning') || contentLower.includes('warn:');

      return {
        id: idx,
        timestamp,
        content,
        raw: line,
        isError,
        isWarning,
      };
    });
  }, [logs]);

  const filteredLines = useMemo(() => {
    if (!filter) return lines;
    const lowerFilter = filter.toLowerCase();
    return lines.filter(
      (line) =>
        line.content.toLowerCase().includes(lowerFilter) ||
        line.timestamp.toLowerCase().includes(lowerFilter),
    );
  }, [lines, filter]);

  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLines, autoScroll]);

  return (
    <div className="flex flex-col bg-zinc-950 text-zinc-100 font-mono text-[11px] leading-relaxed select-text cursor-text selection:bg-zinc-700 selection:text-white">
      {/* Sub Header / Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-900">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
        </div>
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Find in logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 pl-7 text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 w-44"
            />
          </div>
          {/* Timestamp Toggle */}
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${showTimestamps ? 'text-emerald-400' : 'text-zinc-500'}`}
            title="Toggle Timestamps"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
          {/* Auto-scroll Lock Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1 rounded hover:bg-zinc-800 transition-colors ${autoScroll ? 'text-emerald-400' : 'text-zinc-500'}`}
            title="Toggle Auto-Scroll"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Scroll Area */}
      <div className="p-4 overflow-y-auto max-h-96 min-h-[250px] space-y-0.5">
        {filteredLines.length > 0 ? (
          filteredLines.map((line) => (
            <div
              key={line.id}
              className="flex items-start hover:bg-zinc-900/40 py-0.5 px-1 rounded transition-colors"
            >
              {showTimestamps && line.timestamp && (
                <span className="text-zinc-600 mr-4 select-none whitespace-nowrap">
                  {line.timestamp}
                </span>
              )}
              <span
                className={`whitespace-pre-wrap break-all ${
                  line.isError
                    ? 'text-red-400 font-semibold'
                    : line.isWarning
                      ? 'text-amber-400'
                      : 'text-zinc-300'
                }`}
              >
                {line.content}
              </span>
            </div>
          ))
        ) : (
          <div className="text-zinc-600 py-8 text-center italic">
            {filter ? 'No matching logs found.' : 'Console is empty.'}
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
