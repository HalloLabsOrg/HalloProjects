'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  deploymentsApi,
  projectsApi,
  monitoringApi,
  auditLogsApi,
  providersApi,
  repositoriesApi,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  Plug,
  GitBranch,
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

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.list(),
  });

  const { data: reposData } = useQuery({
    queryKey: ['repositories-count'],
    queryFn: () => repositoriesApi.list({ limit: 1 }),
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

  const hasGithub = (providersData ?? []).some((p: any) => p.type === 'GITHUB');
  const hasCoolify = (providersData ?? []).some((p: any) => p.type === 'COOLIFY');
  const hasRepos = ((reposData as any)?.data ?? []).length > 0;
  const hasServices = (monitoringData ?? []).flatMap((p: any) => p.services).length > 0;
  const hasDeployments = totalDeployments > 0;

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

      {/* Onboarding Guide Card */}
      <Card className="mb-8 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-card shadow-md">
        <CardHeader className="pb-3 border-b bg-muted/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Rocket className="h-5 w-5 text-primary animate-pulse" />
              Deployment Workflow Guide
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Follow these simple steps to connect, sync, and deploy your code repositories to
              Coolify.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/50 border px-3 py-1 rounded-full font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Interactive Guide</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="flex flex-col justify-between space-y-4 p-4 rounded-xl border bg-card/60 hover:bg-card hover:shadow-sm transition-all duration-200">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    1
                  </div>
                  {hasGithub && hasCoolify ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"
                    >
                      CONNECTED
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-bold"
                    >
                      INCOMPLETE
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Plug className="h-4 w-4 text-muted-foreground" /> Connect Providers
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect GitHub (for source code) and your Coolify instance (for deployment
                    target).
                  </p>
                </div>
                <div className="text-[11px] space-y-1 border-t pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">GitHub Integration</span>
                    <span
                      className={
                        hasGithub ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'
                      }
                    >
                      {hasGithub ? '🟢 Linked' : '🟡 Not Connected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coolify Instance</span>
                    <span
                      className={
                        hasCoolify ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'
                      }
                    >
                      {hasCoolify ? '🟢 Linked' : '🟡 Not Connected'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={hasGithub && hasCoolify ? 'outline' : 'default'}
                onClick={() => router.push('/providers')}
                className="w-full text-xs font-semibold"
              >
                Connect Providers
              </Button>
            </div>

            {/* Step 2 */}
            <div
              className={`flex flex-col justify-between space-y-4 p-4 rounded-xl border bg-card/60 hover:bg-card hover:shadow-sm transition-all duration-200 ${!(hasGithub && hasCoolify) ? 'opacity-60' : ''}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    2
                  </div>
                  {hasRepos ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"
                    >
                      IMPORTED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold">
                      PENDING
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4 text-muted-foreground" /> Import Repo
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Import target repositories from your GitHub account into the local registry.
                  </p>
                </div>
                <div className="text-[11px] space-y-1 border-t pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sync Registry</span>
                    <span>{hasRepos ? '🟢 Repos Synced' : '⚪ Awaiting Providers'}</span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={hasRepos ? 'outline' : hasGithub && hasCoolify ? 'default' : 'secondary'}
                disabled={!(hasGithub && hasCoolify)}
                onClick={() => router.push('/repositories')}
                className="w-full text-xs font-semibold"
              >
                Import Repository
              </Button>
            </div>

            {/* Step 3 */}
            <div
              className={`flex flex-col justify-between space-y-4 p-4 rounded-xl border bg-card/60 hover:bg-card hover:shadow-sm transition-all duration-200 ${!hasRepos ? 'opacity-60' : ''}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    3
                  </div>
                  {hasServices ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"
                    >
                      READY
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold">
                      PENDING
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" /> Create Project
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Create a project and link your imported repository as a project service.
                  </p>
                </div>
                <div className="text-[11px] space-y-1 border-t pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service Created</span>
                    <span>{hasServices ? '🟢 Service OK' : '⚪ Awaiting Repo'}</span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={hasServices ? 'outline' : hasRepos ? 'default' : 'secondary'}
                disabled={!hasRepos}
                onClick={() => router.push('/projects')}
                className="w-full text-xs font-semibold"
              >
                Setup Project
              </Button>
            </div>

            {/* Step 4 */}
            <div
              className={`flex flex-col justify-between space-y-4 p-4 rounded-xl border bg-card/60 hover:bg-card hover:shadow-sm transition-all duration-200 ${!hasServices ? 'opacity-60' : ''}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    4
                  </div>
                  {hasDeployments ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold"
                    >
                      DEPLOYED
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-bold">
                      PENDING
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <Rocket className="h-4 w-4 text-muted-foreground" /> One-Click Deploy
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Trigger deployment to build and deploy your repository live to Coolify.
                  </p>
                </div>
                <div className="text-[11px] space-y-1 border-t pt-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Deployments</span>
                    <span className="font-mono">{totalDeployments} builds</span>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant={hasDeployments ? 'outline' : hasServices ? 'default' : 'secondary'}
                disabled={!hasServices}
                onClick={() => router.push('/projects')}
                className="w-full text-xs font-semibold"
              >
                Go to Projects
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
