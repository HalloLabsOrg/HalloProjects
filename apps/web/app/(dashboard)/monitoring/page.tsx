'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, Clock, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';

export default function MonitoringPage() {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['monitoring-summary'],
    queryFn: () => monitoringApi.getSummary(),
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['monitoring-detail', selectedServiceId],
    queryFn: () => monitoringApi.getServiceDetail(selectedServiceId!),
    enabled: !!selectedServiceId,
  });

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['monitoring-history', selectedServiceId, historyPage],
    queryFn: () =>
      monitoringApi.getServiceHistory(selectedServiceId!, { page: historyPage, limit: 10 }),
    enabled: !!selectedServiceId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'SLOW':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'OFFLINE':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const getDotColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-emerald-500';
      case 'SLOW':
        return 'bg-amber-500';
      case 'OFFLINE':
        return 'bg-rose-500';
      default:
        return 'bg-zinc-400';
    }
  };

  if (isSummaryLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  const projects = summary ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Real-time health status and latency performance for all deployed services.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchSummary()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-card">
          <Activity className="h-12 w-12 text-muted-foreground mb-4 stroke-1" />
          <h3 className="font-semibold text-lg">No monitored services</h3>
          <p className="text-muted-foreground text-sm max-w-sm mt-1">
            Configure domains or health check URLs under your environments tab to begin monitoring.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {projects.map((project: any) => (
            <div key={project.id} className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight text-muted-foreground border-b pb-2">
                {project.name}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.services.map((svc: any) => (
                  <div
                    key={svc.id}
                    onClick={() => {
                      setSelectedServiceId(svc.id);
                      setHistoryPage(1);
                    }}
                    className="group border rounded-xl p-5 bg-card hover:bg-muted/30 transition-all duration-300 cursor-pointer hover:shadow-md relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors">
                          {svc.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">slug: {svc.slug}</p>
                      </div>
                      <Badge
                        className={`border ${getStatusColor(svc.status)} px-2.5 py-0.5 rounded-full font-semibold text-xs`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getDotColor(svc.status)} mr-1.5 inline-block`}
                        />
                        {svc.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
                        <span>Latency</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {svc.responseTime !== null ? `${svc.responseTime}ms` : '—'}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details / History Modal */}
      <Dialog
        open={!!selectedServiceId}
        onOpenChange={(open) => !open && setSelectedServiceId(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isDetailLoading
                ? 'Loading service health details...'
                : `${detail?.name} Health Monitor`}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading || !detail ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-xl p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Current Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${getDotColor(detail.status)}`} />
                    <span className="font-bold text-sm">{detail.status}</span>
                  </div>
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Uptime 24h</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-sm">{detail.uptime24h}%</span>
                  </div>
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground">Avg Latency 24h</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">
                      {detail.averageResponseTime24h ? `${detail.averageResponseTime24h}ms` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Latest 24h checks timeline block */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  Uptime History (Last 24 Hours)
                </h4>
                <div className="flex gap-[3px] py-2 overflow-x-auto">
                  {detail.latestResults24h.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">
                      No historical check logs in the last 24h.
                    </span>
                  ) : (
                    detail.latestResults24h.map((res: any) => (
                      <div
                        key={res.id}
                        title={`Status: ${res.status}\nTime: ${res.responseTime ? `${res.responseTime}ms` : '—'}\nDate: ${new Date(res.checkedAt).toLocaleString()}`}
                        className={`h-6 w-2 rounded-full cursor-help flex-shrink-0 transition-transform hover:scale-125 ${
                          res.status === 'ONLINE'
                            ? 'bg-emerald-500'
                            : res.status === 'SLOW'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Paginated checks history list */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Logs History</h4>
                {isHistoryLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : !history || history.results.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No logs found.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="py-2 text-xs">Time</TableHead>
                            <TableHead className="py-2 text-xs">Target URL</TableHead>
                            <TableHead className="py-2 text-xs">Status</TableHead>
                            <TableHead className="py-2 text-xs text-right">Response Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.results.map((log: any) => (
                            <TableRow key={log.id} className="h-10">
                              <TableCell className="py-1.5 text-xs text-muted-foreground">
                                {new Date(log.checkedAt).toLocaleTimeString()}
                              </TableCell>
                              <TableCell
                                className="py-1.5 text-xs font-mono max-w-[200px] truncate"
                                title={log.url}
                              >
                                {log.url}
                              </TableCell>
                              <TableCell className="py-1.5 text-xs">
                                <Badge
                                  className={`border ${getStatusColor(log.status)} px-1.5 py-0 rounded text-[10px]`}
                                >
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 text-xs text-right font-mono font-semibold">
                                {log.responseTime !== null ? `${log.responseTime}ms` : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted-foreground">
                        Page {history.page} of {history.totalPages} ({history.total} total logs)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => setHistoryPage((p) => Math.min(history.totalPages, p + 1))}
                          disabled={historyPage === history.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
