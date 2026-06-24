'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Layers,
  Plus,
  Rocket,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  Edit,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'services' | 'deployments' | 'environments' | 'variables';

const STATUSES = ['ALL', 'PENDING', 'BUILDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'CANCELLED'];

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SUCCESS: 'default',
  FAILED: 'destructive',
  CANCELLED: 'outline',
  PENDING: 'secondary',
  BUILDING: 'secondary',
  DEPLOYING: 'secondary',
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [serviceOpen, setServiceOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', repositoryId: '', branch: 'main' });

  // Project Edit / Delete states
  const [projectEditOpen, setProjectEditOpen] = useState(false);
  const [projectEditForm, setProjectEditForm] = useState({ name: '', description: '' });
  const [projectDeleteOpen, setProjectDeleteOpen] = useState(false);

  // Service Delete states
  const [serviceToDelete, setServiceToDelete] = useState<any>(null);
  const [serviceDeleteOpen, setServiceDeleteOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id),
  });

  const { data: services } = useQuery({
    queryKey: ['services', id],
    queryFn: () => servicesApi.list(id),
    enabled: tab === 'services' || tab === 'overview',
  });

  const [deployPage, setDeployPage] = useState(1);
  const [deployStatus, setDeployStatus] = useState('ALL');
  const [deployEnv, setDeployEnv] = useState('ALL');
  const [deploySearch, setDeploySearch] = useState('');
  const [deployStart, setDeployStart] = useState('');
  const [deployEnd, setDeployEnd] = useState('');

  const { data: deploymentsData, isLoading: loadingDeployments } = useQuery({
    queryKey: [
      'deployments',
      'project',
      id,
      deployPage,
      deployStatus,
      deployEnv,
      deploySearch,
      deployStart,
      deployEnd,
    ],
    queryFn: () =>
      deploymentsApi.list({
        projectId: id,
        page: deployPage,
        limit: 20,
        status: deployStatus === 'ALL' ? undefined : deployStatus,
        environmentId: deployEnv === 'ALL' ? undefined : deployEnv,
        search: deploySearch || undefined,
        startDate: deployStart || undefined,
        endDate: deployEnd || undefined,
      }),
    enabled: tab === 'deployments',
  });

  const cancelDeploymentMutation = useMutation({
    mutationFn: (depId: string) => deploymentsApi.cancel(depId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments', 'project', id] });
      toast({ title: 'Deployment cancelled successfully' });
    },
    onError: () => toast({ title: 'Failed to cancel deployment', variant: 'destructive' }),
  });

  const handleResetDeployFilters = () => {
    setDeployStatus('ALL');
    setDeployEnv('ALL');
    setDeploySearch('');
    setDeployStart('');
    setDeployEnd('');
    setDeployPage(1);
  };

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

  const updateProjectMutation = useMutation({
    mutationFn: () => projectsApi.update(id, projectEditForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectEditOpen(false);
      toast({ title: 'Project updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update project', variant: 'destructive' }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectDeleteOpen(false);
      toast({ title: 'Project deleted successfully' });
      router.push('/projects');
    },
    onError: () => toast({ title: 'Failed to delete project', variant: 'destructive' }),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (serviceId: string) => servicesApi.remove(id, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', id] });
      setServiceDeleteOpen(false);
      setServiceToDelete(null);
      toast({ title: 'Service deleted successfully' });
    },
    onError: () => toast({ title: 'Failed to delete service', variant: 'destructive' }),
  });

  const proj = project as any;
  const svcList = (services as any[]) ?? [];
  const deployments = (deploymentsData as any)?.data ?? [];
  const deployMeta = (deploymentsData as any)?.meta ?? {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };
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
    { key: 'variables', label: 'Variables' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{proj?.name}</h1>
            <Badge>{proj?.status}</Badge>
          </div>
          {proj?.description && <p className="text-muted-foreground mt-1">{proj.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setProjectEditForm({ name: proj?.name ?? '', description: proj?.description ?? '' });
              setProjectEditOpen(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setProjectDeleteOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
        </div>
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
                  <TableHead className="w-20 text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setServiceToDelete(svc);
                          setServiceDeleteOpen(true);
                        }}
                        title="Delete Service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {tab === 'deployments' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search commit, branch..."
                value={deploySearch}
                onChange={(e) => {
                  setDeploySearch(e.target.value);
                  setDeployPage(1);
                }}
                className="pl-9 w-full text-sm"
              />
            </div>

            <div className="w-40">
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={deployStatus}
                onChange={(e) => {
                  setDeployStatus(e.target.value);
                  setDeployPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>
                {STATUSES.filter((s) => s !== 'ALL').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-44">
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={deployEnv}
                onChange={(e) => {
                  setDeployEnv(e.target.value);
                  setDeployPage(1);
                }}
              >
                <option value="ALL">All Environments</option>
                {(proj?.environments ?? []).map((env: any) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={deployStart}
                onChange={(e) => {
                  setDeployStart(e.target.value);
                  setDeployPage(1);
                }}
                className="w-36 text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={deployEnd}
                onChange={(e) => {
                  setDeployEnd(e.target.value);
                  setDeployPage(1);
                }}
                className="w-36 text-sm"
              />
            </div>

            {(deployStatus !== 'ALL' ||
              deployEnv !== 'ALL' ||
              deploySearch ||
              deployStart ||
              deployEnd) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDeployFilters}
                className="h-9 gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>

          {loadingDeployments ? (
            <p className="text-sm text-muted-foreground">Loading deployments...</p>
          ) : deployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No deployments"
              description={
                deployStatus !== 'ALL' ||
                deployEnv !== 'ALL' ||
                deploySearch ||
                deployStart ||
                deployEnd
                  ? 'No deployments match your active filters.'
                  : 'Trigger a deployment from a service.'
              }
              action={
                deployStatus !== 'ALL' ||
                deployEnv !== 'ALL' ||
                deploySearch ||
                deployStart ||
                deployEnd
                  ? { label: 'Clear Filters', onClick: handleResetDeployFilters }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-6">
              {/* Timeline Container */}
              <div className="relative pl-6 border-l border-muted space-y-8 py-2">
                {deployments.map((d: any) => {
                  const isCancellable = ['PENDING', 'BUILDING', 'DEPLOYING'].includes(d.status);

                  return (
                    <div key={d.id} className="relative group">
                      {/* Timeline Node Icon */}
                      <div className="absolute -left-[35px] top-1.5 bg-background p-1.5 border rounded-full shadow-sm">
                        {d.status === 'SUCCESS' && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                        {d.status === 'FAILED' && <XCircle className="h-4 w-4 text-rose-500" />}
                        {d.status === 'CANCELLED' && (
                          <Ban className="h-4 w-4 text-muted-foreground" />
                        )}
                        {d.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-500" />}
                        {['BUILDING', 'DEPLOYING'].includes(d.status) && (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {d.service?.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {d.environment?.name}
                            </Badge>
                            <Badge
                              variant={STATUS_VARIANTS[d.status] ?? 'outline'}
                              className="text-xs font-semibold"
                            >
                              {d.status}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-mono">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-primary">
                              {d.branch}
                            </code>
                            {d.commitSha && (
                              <>
                                <span>·</span>
                                <span className="font-semibold">{d.commitSha.slice(0, 7)}</span>
                              </>
                            )}
                          </div>

                          {d.commitMsg && (
                            <p className="text-sm text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-md italic">
                              &ldquo;{d.commitMsg}&rdquo;
                            </p>
                          )}

                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>
                              Triggered by{' '}
                              <span className="font-semibold text-foreground">{d.triggeredBy}</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(d.createdAt).toLocaleString()}</span>
                            {d.duration !== undefined && d.duration !== null && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-foreground">
                                  Completed in {formatDuration(d.duration)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {isCancellable && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelDeploymentMutation.mutate(d.id)}
                            disabled={cancelDeploymentMutation.isPending}
                            className="h-8 text-xs gap-1"
                          >
                            <Ban className="h-3 w-3" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-3 border rounded-lg bg-muted/20 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Showing{' '}
                  <span className="font-semibold text-foreground">
                    {deployMeta.total === 0 ? 0 : (deployMeta.page - 1) * deployMeta.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-foreground">
                    {Math.min(deployMeta.page * deployMeta.limit, deployMeta.total)}
                  </span>{' '}
                  of <span className="font-semibold text-foreground">{deployMeta.total}</span>{' '}
                  deployments
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeployPage((p) => Math.max(1, p - 1))}
                    disabled={deployMeta.page <= 1}
                    className="h-8 gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeployPage((p) => Math.min(deployMeta.totalPages, p + 1))}
                    disabled={deployMeta.page >= deployMeta.totalPages}
                    className="h-8 gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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

      {tab === 'variables' && (
        <VariablesTab projectId={proj.id} environments={proj?.environments ?? []} />
      )}

      {/* Edit Project Dialog */}
      <Dialog open={projectEditOpen} onOpenChange={setProjectEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Project Name</Label>
              <Input
                placeholder="My Project"
                value={projectEditForm.name}
                onChange={(e) => setProjectEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Input
                placeholder="A brief description"
                value={projectEditForm.description}
                onChange={(e) => setProjectEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => updateProjectMutation.mutate()}
              disabled={updateProjectMutation.isPending || !projectEditForm.name}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={projectDeleteOpen} onOpenChange={setProjectDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete project <strong>{proj?.name}</strong>? This will
              permanently delete all its services and environment configurations. This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setProjectDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteProjectMutation.mutate()}
                disabled={deleteProjectMutation.isPending}
              >
                Delete Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Service Dialog */}
      <Dialog open={serviceDeleteOpen} onOpenChange={setServiceDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete service <strong>{serviceToDelete?.name}</strong>? This
              will permanently delete the service and all its deployments. This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setServiceDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteServiceMutation.mutate(serviceToDelete?.id)}
                disabled={deleteServiceMutation.isPending}
              >
                Delete Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  const [healthCheckUrl, setHealthCheckUrl] = useState(environment.healthCheckUrl ?? '');
  const [autoDeploy, setAutoDeploy] = useState(environment.autoDeploy ?? true);

  const updateMutation = useMutation({
    mutationFn: () =>
      environmentsApi.update(projectId, environment.id, {
        branch: branch || null,
        domain: domain || null,
        healthCheckUrl: healthCheckUrl || null,
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
            {environment.healthCheckUrl && ` · Health: ${environment.healthCheckUrl}`}
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
          <div className="grid grid-cols-3 gap-4">
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
            <div className="space-y-1">
              <Label>Health Check URL</Label>
              <Input
                placeholder="https://myapp.com/healthz"
                value={healthCheckUrl}
                onChange={(e) => setHealthCheckUrl(e.target.value)}
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

function VariablesTab({ projectId, environments }: { projectId: string; environments: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEnvId, setSelectedEnvId] = useState(environments[0]?.id ?? '');
  const [revealedVars, setRevealedVars] = useState<Record<string, string>>({});
  const [newVar, setNewVar] = useState({ key: '', value: '', isSecret: false });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const { data: variables, isLoading } = useQuery({
    queryKey: ['variables', projectId, selectedEnvId],
    queryFn: () => environmentsApi.listVariables(projectId, selectedEnvId),
    enabled: !!selectedEnvId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: { key: string; value: string; isSecret: boolean }) =>
      environmentsApi.createVariable(projectId, selectedEnvId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables', projectId, selectedEnvId] });
      setNewVar({ key: '', value: '', isSecret: false });
      toast({ title: 'Variable added successfully' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to add variable';
      toast({ title: msg, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (varId: string) => environmentsApi.removeVariable(projectId, selectedEnvId, varId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables', projectId, selectedEnvId] });
      toast({ title: 'Variable deleted' });
    },
  });

  const handleReveal = async (varId: string) => {
    if (revealedVars[varId]) {
      setRevealedVars((prev) => {
        const copy = { ...prev };
        delete copy[varId];
        return copy;
      });
      return;
    }

    try {
      const data = await environmentsApi.revealVariable(projectId, selectedEnvId, varId);
      setRevealedVars((prev) => ({ ...prev, [varId]: data.value }));
    } catch {
      toast({ title: 'Failed to reveal secret variable', variant: 'destructive' });
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n');
    let importedCount = 0;
    let failedCount = 0;

    const promises = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const equalIdx = trimmed.indexOf('=');
      if (equalIdx === -1) continue;

      const rawKey = trimmed.substring(0, equalIdx).trim();
      let rawVal = trimmed.substring(equalIdx + 1).trim();

      if (
        (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'"))
      ) {
        rawVal = rawVal.substring(1, rawVal.length - 1);
      }

      if (rawKey) {
        promises.push(
          environmentsApi
            .createVariable(projectId, selectedEnvId, {
              key: rawKey,
              value: rawVal,
              isSecret: false,
            })
            .then(() => {
              importedCount++;
            })
            .catch(() => {
              failedCount++;
            }),
        );
      }
    }

    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ['variables', projectId, selectedEnvId] });
    setBulkText('');
    setBulkOpen(false);

    toast({
      title: 'Bulk Import Finished',
      description: `Successfully imported ${importedCount} variables.${
        failedCount > 0 ? ` Failed: ${failedCount} (likely already exist)` : ''
      }`,
    });
  };

  if (!selectedEnvId) {
    return <p className="text-muted-foreground">Create an environment to manage variables.</p>;
  }

  const varList = (variables as any[]) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Environment</Label>
          <select
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
            value={selectedEnvId}
            onChange={(e) => {
              setSelectedEnvId(e.target.value);
              setRevealedVars({});
            }}
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
          Bulk Import (.env)
        </Button>
      </div>

      <div className="rounded-lg border p-4 bg-muted/40 space-y-4">
        <h4 className="font-semibold text-sm">Add Environment Variable</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Key</Label>
            <Input
              placeholder="API_KEY"
              value={newVar.key}
              onChange={(e) => setNewVar((v) => ({ ...v, key: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Value</Label>
            <Input
              placeholder="super-secret-value"
              value={newVar.value}
              onChange={(e) => setNewVar((v) => ({ ...v, value: e.target.value }))}
            />
          </div>
          <div className="flex items-end pb-1 gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
              <input
                type="checkbox"
                checked={newVar.isSecret}
                onChange={(e) => setNewVar((v) => ({ ...v, isSecret: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
              />
              Secret / Encrypted
            </label>
            <Button
              size="sm"
              className="ml-auto"
              disabled={createMutation.isPending || !newVar.key || !newVar.value}
              onClick={() => createMutation.mutate(newVar)}
            >
              Add
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading variables...</p>
      ) : varList.length === 0 ? (
        <p className="text-sm text-muted-foreground bg-muted/20 p-4 rounded text-center">
          No variables configured for this environment.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {varList.map((v) => {
              const isRevealed = !!revealedVars[v.id];
              const displayVal = isRevealed ? revealedVars[v.id] : v.value;

              return (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm font-semibold">{v.key}</TableCell>
                  <TableCell className="font-mono text-sm max-w-xs truncate">
                    {displayVal}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {v.isSecret && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => handleReveal(v.id)}
                      >
                        {isRevealed ? 'Hide' : 'Reveal'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(v.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Variables (.env)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label className="text-xs text-muted-foreground">
              Paste your .env file lines below. E.g. KEY=VALUE
            </Label>
            <textarea
              className="w-full h-48 font-mono text-sm p-3 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="DATABASE_URL=postgres://...&#10;PORT=3000&#10;# This is a comment&#10;DEBUG=true"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <Button className="w-full" onClick={handleBulkImport} disabled={!bulkText.trim()}>
              Import Variables
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
