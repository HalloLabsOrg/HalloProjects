'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { deploymentsApi, projectsApi, monitoringApi, auditLogsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  FolderKanban,
  Rocket,
  AlertCircle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Plus,
  History,
  FileText,
  ChevronRight,
  RefreshCw,
  User,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 1 }),
  });

  const { data: deploymentsData, isLoading: loadingDeployments } = useQuery({
    queryKey: ['deployments', 'recent'],
    queryFn: () => deploymentsApi.list({ limit: 10 }),
  });

  const { data: monitoringData, isLoading: loadingMonitoring } = useQuery({
    queryKey: ['monitoring-summary'],
    queryFn: () => monitoringApi.getSummary(),
  });

  const { data: auditLogsData, error: auditLogsError } = useQuery({
    queryKey: ['audit-logs', 'recent'],
    queryFn: () => auditLogsApi.list({ limit: 5 }),
    retry: false,
  });

  const { mutate: quickRedeploy, isPending: deploying } = useMutation({
    mutationFn: ({ serviceId, environmentId, providerId, branch }: any) =>
      deploymentsApi.trigger(serviceId, { environmentId, providerId, branch }),
    onSuccess: (newDep: any) => {
      toast({ title: 'Deployment triggered successfully!' });
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      router.push(`/deployments/${newDep.id}`);
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to trigger deployment',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const projectCount = (projectsData as any)?.meta?.total ?? 0;
  const deployments = (deploymentsData as any)?.data ?? [];
  const totalDeployments = (deploymentsData as any)?.meta?.total ?? 0;

  const allServices = (monitoringData ?? []).flatMap((p: any) => p.services);
  const offlineServicesCount = allServices.filter((s: any) => s.status === 'OFFLINE').length;
  const auditLogs = (auditLogsData as any)?.data ?? [];

  const stats = [
    { label: 'Total Projects', value: projectCount, icon: FolderKanban },
    { label: 'Total Deployments', value: totalDeployments, icon: Rocket },
    {
      label: 'Offline Services',
      value: offlineServicesCount,
      icon: AlertCircle,
      colorClass: offlineServicesCount > 0 ? 'text-rose-500 font-extrabold' : '',
    },
    {
      label: 'Active Deployments',
      value: deployments.filter((d: any) => ['BUILDING', 'DEPLOYING'].includes(d.status)).length,
      icon: Activity,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {!loadingMonitoring && allServices.length > 0 && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              offlineServicesCount > 0
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}
          >
            {offlineServicesCount > 0 ? (
              <>
                <ShieldAlert className="h-4 w-4" />
                <span>{offlineServicesCount} Services Offline</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>All Systems Operational</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingDeployments || loadingProjects || loadingMonitoring ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className={`text-2xl font-bold ${stat.colorClass ?? ''}`}>{stat.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Services Health Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMonitoring ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : allServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services configured.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allServices.map((s: any) => {
                    const statusColors: Record<string, string> = {
                      ONLINE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                      SLOW: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                      OFFLINE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
                      UNKNOWN: 'bg-muted text-muted-foreground border-transparent',
                    };
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/monitoring`)}
                      >
                        <div className="space-y-0.5 truncate mr-2">
                          <p className="text-sm font-semibold truncate text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.responseTime !== null
                              ? `Response: ${s.responseTime}ms`
                              : 'No response time'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0.5 font-bold ${statusColors[s.status] ?? ''}`}
                        >
                          {s.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Deployments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDeployments ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : deployments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deployments yet.</p>
              ) : (
                <div className="space-y-2">
                  {deployments.slice(0, 5).map((d: any) => {
                    const durationStr = formatDuration(d.duration);
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-md border px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/deployments/${d.id}`)}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">
                              {d.service?.name ?? d.serviceId}
                            </p>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                              {d.branch}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {d.environment?.name ?? '—'}
                            </Badge>
                          </div>
                          {d.commitSha && (
                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 flex-wrap">
                              <span className="text-primary font-semibold">
                                {d.commitSha.slice(0, 7)}
                              </span>
                              {d.commitMsg && (
                                <span className="truncate max-w-[250px] italic">
                                  ({d.commitMsg})
                                </span>
                              )}
                            </p>
                          )}
                          {durationStr && (
                            <p className="text-xs text-muted-foreground font-medium">
                              Completed in{' '}
                              <span className="font-semibold text-foreground">{durationStr}</span>
                            </p>
                          )}
                        </div>
                        <DeploymentBadge status={d.status} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deployments[0] && (
                <button
                  disabled={deploying}
                  onClick={() =>
                    quickRedeploy({
                      serviceId: deployments[0].serviceId,
                      environmentId: deployments[0].environmentId,
                      providerId: deployments[0].providerId,
                      branch: deployments[0].branch,
                    })
                  }
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw
                      className={`h-4 w-4 text-muted-foreground ${deploying ? 'animate-spin' : ''}`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Redeploy Latest Service
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {deployments[0].service?.name ?? 'Trigger new build'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {deployments[0] && (
                <button
                  onClick={() => router.push(`/deployments/${deployments[0].id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">View Latest Logs</p>
                      <p className="text-xs text-muted-foreground font-normal">
                        Check running server outputs
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              <button
                onClick={() => router.push('/projects')}
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Configure Project</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Add new services & pipelines
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogsError ? (
                <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-md">
                  Activity feed restricted to administrators.
                </p>
              ) : !auditLogsData ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.slice(0, 5).map((log: any) => {
                    const actionLabels: Record<string, string> = {
                      CREATE_PROJECT: 'Created project',
                      UPDATE_PROJECT: 'Updated project',
                      DELETE_PROJECT: 'Deleted project',
                      CREATE_SERVICE: 'Created service',
                      UPDATE_SERVICE: 'Updated service',
                      DELETE_SERVICE: 'Deleted service',
                      CREATE_ENVIRONMENT: 'Created environment',
                      UPDATE_ENVIRONMENT: 'Updated environment',
                      DELETE_ENVIRONMENT: 'Deleted environment',
                      TRIGGER_DEPLOYMENT: 'Triggered deployment',
                      CANCEL_DEPLOYMENT: 'Cancelled deployment',
                      CREATE_PROVIDER: 'Connected provider',
                      UPDATE_PROVIDER: 'Updated provider',
                      DELETE_PROVIDER: 'Removed provider',
                      REVEAL_SECRET: 'Revealed secret variable',
                    };
                    const actionLabel = actionLabels[log.action] ?? log.action.replace(/_/g, ' ');
                    return (
                      <div key={log.id} className="flex gap-3 text-xs leading-relaxed">
                        <div className="mt-0.5 h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5 truncate">
                          <p className="font-semibold text-foreground">
                            {log.user?.name ?? log.user?.email ?? 'System'}
                          </p>
                          <p className="text-muted-foreground truncate">
                            {actionLabel}{' '}
                            <span className="font-medium text-foreground">{log.entityType}</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function DeploymentBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    SUCCESS: 'default',
    FAILED: 'destructive',
    CANCELLED: 'outline',
    PENDING: 'secondary',
    BUILDING: 'secondary',
    DEPLOYING: 'secondary',
  };
  return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}
