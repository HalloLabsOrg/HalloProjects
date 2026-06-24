'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectsApi,
  servicesApi,
  repositoriesApi,
  deploymentsApi,
  environmentsApi,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { Layers, Plus, Rocket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'services' | 'deployments' | 'environments';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', repositoryId: '', branch: 'main' });

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
  });

  const { data: services } = useQuery({
    queryKey: ['services', id],
    queryFn: () => servicesApi.list(id),
    enabled: tab === 'services' || tab === 'overview',
  });

  const { data: deploymentsData } = useQuery({
    queryKey: ['deployments', 'project', id],
    queryFn: () => deploymentsApi.list({ limit: 20 }),
    enabled: tab === 'deployments',
  });

  const { data: reposData } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => repositoriesApi.list({ limit: 100 }),
    enabled: serviceOpen,
  });

  const createServiceMutation = useMutation({
    mutationFn: () => servicesApi.create(id, serviceForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', id] });
      setServiceOpen(false);
      setServiceForm({ name: '', repositoryId: '', branch: 'main' });
      toast({ title: 'Service created' });
    },
    onError: () => toast({ title: 'Failed to create service', variant: 'destructive' }),
  });

  const proj = project as any;
  const svcList = (services as any[]) ?? [];
  const deployments = (deploymentsData as any)?.data ?? [];
  const repos = (reposData as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'services', label: 'Services' },
    { key: 'deployments', label: 'Deployments' },
    { key: 'environments', label: 'Environments' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{proj?.name}</h1>
          <Badge>{proj?.status}</Badge>
        </div>
        {proj?.description && <p className="text-muted-foreground mt-1">{proj.description}</p>}
      </div>

      <div className="flex border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <p className="text-sm text-muted-foreground">Slug</p>
            <code className="text-sm bg-muted px-2 py-0.5 rounded">{proj?.slug}</code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Services</p>
            <p className="text-sm font-medium">{svcList.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Environments</p>
            <p className="text-sm font-medium">{proj?.environments?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm font-medium">
              {proj?.createdAt ? new Date(proj.createdAt).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>
      )}

      {tab === 'services' && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Service</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label>Service Name</Label>
                    <Input
                      placeholder="api-server"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Repository</Label>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                      value={serviceForm.repositoryId}
                      onChange={(e) =>
                        setServiceForm((f) => ({ ...f, repositoryId: e.target.value }))
                      }
                    >
                      <option value="">Select repository...</option>
                      {repos.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Input
                      placeholder="main"
                      value={serviceForm.branch}
                      onChange={(e) => setServiceForm((f) => ({ ...f, branch: e.target.value }))}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createServiceMutation.mutate()}
                    disabled={
                      createServiceMutation.isPending ||
                      !serviceForm.name ||
                      !serviceForm.repositoryId
                    }
                  >
                    Create Service
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {svcList.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No services"
              description="Add a service to start deploying."
              action={{ label: 'Add Service', onClick: () => setServiceOpen(true) }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Deployments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {svcList.map((svc: any) => (
                  <TableRow key={svc.id}>
                    <TableCell className="font-medium">{svc.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {svc.repository?.fullName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{svc.branch}</code>
                    </TableCell>
                    <TableCell>{svc._count?.deployments ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {tab === 'deployments' && (
        <div className="space-y-2">
          {deployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No deployments"
              description="Trigger a deployment from a service."
            />
          ) : (
            deployments.map((d: any) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{d.service?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.branch} · {d.environment?.name}
                  </p>
                </div>
                <Badge>{d.status}</Badge>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'environments' && (
        <div className="space-y-4 max-w-2xl">
          {(proj?.environments ?? []).map((env: any) => (
            <EnvironmentRow
              key={env.id}
              projectId={proj.id}
              environment={env}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['project', id] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EnvironmentRow({
  projectId,
  environment,
  onUpdate,
}: {
  projectId: string;
  environment: any;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [branch, setBranch] = useState(environment.branch ?? '');
  const [domain, setDomain] = useState(environment.domain ?? '');
  const [autoDeploy, setAutoDeploy] = useState(environment.autoDeploy ?? true);

  const updateMutation = useMutation({
    mutationFn: () =>
      environmentsApi.update(projectId, environment.id, {
        branch: branch || null,
        domain: domain || null,
        autoDeploy,
      }),
    onSuccess: () => {
      toast({ title: 'Environment updated successfully' });
      setEditing(false);
      onUpdate();
    },
    onError: () => {
      toast({ title: 'Failed to update environment', variant: 'destructive' });
    },
  });

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold leading-none tracking-tight">{environment.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Branch:{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {environment.branch ?? '—'}
            </code>
            {environment.domain && ` · Domain: ${environment.domain}`}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                environment.autoDeploy ? 'bg-green-500' : 'bg-muted-foreground'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {environment.autoDeploy ? 'Auto-deploy active' : 'Auto-deploy disabled'}
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      {editing && (
        <div className="mt-4 pt-4 border-t space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Branch Mapping</Label>
              <Input
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Domain</Label>
              <Input
                placeholder="myapp.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={`auto-deploy-${environment.id}`}
              checked={autoDeploy}
              onChange={(e) => setAutoDeploy(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <Label
              htmlFor={`auto-deploy-${environment.id}`}
              className="font-normal cursor-pointer select-none"
            >
              Enable Auto-deploy on Push
            </Label>
          </div>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
}
