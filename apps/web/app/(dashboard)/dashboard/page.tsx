'use client';

import { useQuery } from '@tanstack/react-query';
import { deploymentsApi, projectsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, Rocket, AlertCircle, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list({ limit: 1 }),
  });

  const { data: deploymentsData, isLoading: loadingDeployments } = useQuery({
    queryKey: ['deployments', 'recent'],
    queryFn: () => deploymentsApi.list({ limit: 10 }),
  });

  const projectCount = (projectsData as any)?.meta?.total ?? 0;
  const deployments = (deploymentsData as any)?.data ?? [];
  const totalDeployments = (deploymentsData as any)?.meta?.total ?? 0;
  const failedDeployments = deployments.filter((d: any) => d.status === 'FAILED').length;

  const stats = [
    { label: 'Total Projects', value: projectCount, icon: FolderKanban },
    { label: 'Total Deployments', value: totalDeployments, icon: Rocket },
    { label: 'Failed (recent)', value: failedDeployments, icon: AlertCircle },
    {
      label: 'Active',
      value: deployments.filter((d: any) => ['BUILDING', 'DEPLOYING'].includes(d.status)).length,
      icon: Activity,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
                {loadingDeployments || loadingProjects ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="text-lg font-semibold mb-4">Recent Deployments</h2>
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
          {deployments.map((d: any) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{d.service?.name ?? d.serviceId}</p>
                <p className="text-xs text-muted-foreground">
                  {d.branch} · {d.environment?.name}
                </p>
              </div>
              <DeploymentBadge status={d.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
