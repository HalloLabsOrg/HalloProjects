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

type Tab = 'overview' | 'services' | 'deployments' | 'environments' | 'variables';

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
    { key: 'variables', label: 'Variables' },
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

      {tab === 'variables' && (
        <VariablesTab projectId={proj.id} environments={proj?.environments ?? []} />
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
