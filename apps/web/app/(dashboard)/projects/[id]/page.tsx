'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectsApi,
  servicesApi,
  repositoriesApi,
  deploymentsApi,
  environmentsApi,
  providersApi,
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
  Settings,
  AlertCircle,
  FolderTree,
  Folder,
  FileCode,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [createNewBranch, setCreateNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');

  // Deployment Target / Trigger Dialog states
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [serviceToDeploy, setServiceToDeploy] = useState<any>(null);
  const [deployEnvId, setDeployEnvId] = useState('');
  const [deployProviderId, setDeployProviderId] = useState('');
  const [deployBranch, setDeployBranch] = useState('');
  const [selectedCoolifyAppUuid, setSelectedCoolifyAppUuid] = useState('');
  const [showRepoTree, setShowRepoTree] = useState(false);

  // Auto-Create Coolify App states
  const [autoCreateCoolifyApp, setAutoCreateCoolifyApp] = useState(false);
  const [coolifyAppName, setCoolifyAppName] = useState('');
  const [coolifyServerUuid, setCoolifyServerUuid] = useState('');
  const [coolifyProjectUuid, setCoolifyProjectUuid] = useState('');
  const [coolifyEnvName, setCoolifyEnvName] = useState('production');
  const [coolifyGithubAppUuid, setCoolifyGithubAppUuid] = useState('');
  const [coolifyBuildPack, setCoolifyBuildPack] = useState('nixpacks');
  const [coolifyExposedPort, setCoolifyExposedPort] = useState('3000');
  const [coolifyDockfilePath, setCoolifyDockfilePath] = useState('/Dockerfile');
  const [coolifyBaseDirectory, setCoolifyBaseDirectory] = useState('/');
  const [isDeploying, setIsDeploying] = useState(false);
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, any>>({});

  // New project creation inside Coolify
  const [isCreatingNewCoolifyProject, setIsCreatingNewCoolifyProject] = useState(false);
  const [newCoolifyProjectName, setNewCoolifyProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

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

  const targetRepoId = serviceOpen
    ? serviceForm.repositoryId
    : (serviceToDeploy?.repositoryId ?? '');
  const { data: branches, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['repository-branches', targetRepoId],
    queryFn: () => repositoriesApi.branches(targetRepoId),
    enabled: !!targetRepoId && (serviceOpen || deployDialogOpen),
  });

  const { data: treeFiles, isLoading: isLoadingTree } = useQuery({
    queryKey: ['repository-tree', targetRepoId, deployBranch],
    queryFn: () => repositoriesApi.tree(targetRepoId, deployBranch),
    enabled: !!targetRepoId && deployDialogOpen && !!deployBranch,
  });

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.list(),
  });

  const { data: coolifyApps, isLoading: isLoadingCoolifyApps } = useQuery({
    queryKey: ['providers', deployProviderId, 'coolify-apps'],
    queryFn: () => providersApi.listCoolifyApplications(deployProviderId),
    enabled: !!deployProviderId && deployDialogOpen,
  });

  const { data: coolifyServers } = useQuery({
    queryKey: ['providers', deployProviderId, 'coolify-servers'],
    queryFn: () => providersApi.listCoolifyServers(deployProviderId),
    enabled: !!deployProviderId && deployDialogOpen && autoCreateCoolifyApp,
  });

  const { data: coolifyProjects } = useQuery({
    queryKey: ['providers', deployProviderId, 'coolify-projects'],
    queryFn: () => providersApi.listCoolifyProjects(deployProviderId),
    enabled: !!deployProviderId && deployDialogOpen && autoCreateCoolifyApp,
  });

  const { data: coolifySources } = useQuery({
    queryKey: ['providers', deployProviderId, 'coolify-sources'],
    queryFn: () => providersApi.listCoolifySources(deployProviderId),
    enabled: !!deployProviderId && deployDialogOpen && autoCreateCoolifyApp,
  });

  // Load target configuration from localStorage
  useEffect(() => {
    if (services) {
      const configs: Record<string, any> = {};
      services.forEach((svc: any) => {
        const saved = localStorage.getItem(`hallo:deploy-config:${svc.id}`);
        if (saved) {
          try {
            configs[svc.id] = JSON.parse(saved);
          } catch (e) {
            // ignore
          }
        }
      });
      setServiceConfigs(configs);
    }
  }, [services]);

  // Prefill new app options when servers, projects, sources load
  useEffect(() => {
    if (coolifyServers && coolifyServers.length > 0 && !coolifyServerUuid) {
      setCoolifyServerUuid(coolifyServers[0].uuid);
    }
  }, [coolifyServers, coolifyServerUuid]);

  useEffect(() => {
    if (coolifyProjects && coolifyProjects.length > 0) {
      const exists = coolifyProjects.some((p: any) => p.uuid === coolifyProjectUuid);
      if (!coolifyProjectUuid || !exists) {
        const projectWithEnv =
          coolifyProjects.find((p: any) => p.environments && p.environments.length > 0) ||
          coolifyProjects[0];
        setCoolifyProjectUuid(projectWithEnv.uuid);
        setCoolifyEnvName(projectWithEnv.environments?.[0]?.name || 'production');
      }
    }
  }, [coolifyProjects, coolifyProjectUuid]);

  useEffect(() => {
    if (coolifySources && coolifySources.length > 0 && !coolifyGithubAppUuid) {
      const gh = coolifySources.find((s: any) => s.type === 'github');
      if (gh) {
        setCoolifyGithubAppUuid(gh.uuid);
      } else {
        setCoolifyGithubAppUuid(coolifySources[0].uuid);
      }
    }
  }, [coolifySources, coolifyGithubAppUuid]);

  useEffect(() => {
    if (coolifyApps && coolifyApps.length > 0) {
      const repoFullName = serviceToDeploy?.repository?.fullName;
      const repoName = serviceToDeploy?.repository?.name;
      const matched = coolifyApps.find((app: any) => {
        if (!app.gitRepository) return false;
        const appRepoLower = app.gitRepository.toLowerCase();
        return (
          appRepoLower === repoFullName?.toLowerCase() ||
          appRepoLower.endsWith('/' + repoName?.toLowerCase())
        );
      });
      if (matched) {
        setSelectedCoolifyAppUuid(matched.uuid);
      } else {
        setSelectedCoolifyAppUuid('');
      }
    } else {
      setSelectedCoolifyAppUuid('');
    }
  }, [coolifyApps, serviceToDeploy]);

  const detectedDockerfiles = useMemo(() => {
    if (!treeFiles || !Array.isArray(treeFiles)) return [];
    return treeFiles
      .filter((f: any) => {
        const fileName = f.path.split('/').pop()?.toLowerCase() || '';
        // Skip common non-dockerfile configuration files
        if (
          fileName.includes('dockerignore') ||
          fileName.includes('compose') ||
          fileName.includes('caddy')
        ) {
          return false;
        }
        // Match if filename contains 'docker' or 'dockerfile'
        const hasDocker = fileName.includes('docker');
        // Exclude files ending with common config/script/documentation/asset extensions
        const isCommonExtension = /\.(sh|ya?ml|json|jsx?|tsx?|md|png|jpe?g|gif|svg|css|html|txt)$/.test(
          fileName
        );
        return hasDocker && !isCommonExtension;
      })
      .map((f: any) => f.path);
  }, [treeFiles]);

  // Auto-detect and recommend buildpack based on detectedDockerfiles
  useEffect(() => {
    if (detectedDockerfiles.length > 0) {
      setCoolifyBuildPack('dockerfile');
    } else {
      setCoolifyBuildPack('nixpacks');
    }
  }, [detectedDockerfiles]);

  // Handle Dockerfile and Base Directory defaults when Dockerfile is selected
  useEffect(() => {
    if (coolifyBuildPack === 'dockerfile') {
      if (detectedDockerfiles.length > 0) {
        const firstDockerfile = detectedDockerfiles[0];
        setCoolifyDockfilePath(firstDockerfile.startsWith('/') ? firstDockerfile : '/' + firstDockerfile);
        setCoolifyBaseDirectory('/');
      } else {
        setCoolifyDockfilePath('/Dockerfile');
        setCoolifyBaseDirectory('/');
      }
    } else {
      setCoolifyBaseDirectory('/');
    }
  }, [coolifyBuildPack, detectedDockerfiles]);

  const triggerDeployMutation = useMutation({
    mutationFn: (payload: {
      serviceId: string;
      environmentId: string;
      providerId: string;
      branch: string;
      coolifyAppUuid?: string;
    }) =>
      deploymentsApi.trigger(payload.serviceId, {
        environmentId: payload.environmentId,
        providerId: payload.providerId,
        branch: payload.branch,
        coolifyAppUuid: payload.coolifyAppUuid,
      }),
    onSuccess: (newDep: any) => {
      toast({
        title: 'Deployment Triggered!',
        description: `Successfully queued build for service "${serviceToDeploy?.name}" on branch "${deployBranch}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['deployments', 'project', id] });
      setDeployDialogOpen(false);
      router.push(`/deployments/${newDep.id}`);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to trigger deployment';
      toast({
        title: 'Deployment Failed',
        description: errMsg,
        variant: 'destructive',
      });
    },
  });

  const openDeployModal = (svc: any) => {
    setServiceToDeploy(svc);
    setDeployBranch(svc.branch);

    // Load config from localStorage if available
    const saved = localStorage.getItem(`hallo:deploy-config:${svc.id}`);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setDeployEnvId(config.envId);
        setDeployProviderId(config.providerId);
        setSelectedCoolifyAppUuid(config.coolifyAppUuid);
      } catch (e) {
        setDeployEnvId(proj?.environments?.[0]?.id ?? '');
        setDeployProviderId(
          ((providersData as any[]) ?? []).find((p: any) => p.type === 'COOLIFY')?.id ?? '',
        );
        setSelectedCoolifyAppUuid('');
      }
    } else {
      setDeployEnvId(proj?.environments?.[0]?.id ?? '');
      setDeployProviderId(
        ((providersData as any[]) ?? []).find((p: any) => p.type === 'COOLIFY')?.id ?? '',
      );
      setSelectedCoolifyAppUuid('');
    }

    setCoolifyAppName(svc.name);
    setAutoCreateCoolifyApp(false);
    setShowRepoTree(false);
    setDeployDialogOpen(true);
  };

  const handleStartDeploy = async () => {
    setIsDeploying(true);
    try {
      let finalAppUuid = selectedCoolifyAppUuid;
      let finalAppName = '';

      if (autoCreateCoolifyApp) {
        if (!coolifyServerUuid) {
          toast({
            title: 'Validasi Gagal',
            description: 'Silakan pilih Server Coolify terlebih dahulu.',
            variant: 'destructive',
          });
          setIsDeploying(false);
          return;
        }
        if (!coolifyProjectUuid || !coolifyEnvName) {
          toast({
            title: 'Validasi Gagal',
            description: 'Silakan pilih Project & Env Coolify terlebih dahulu.',
            variant: 'destructive',
          });
          setIsDeploying(false);
          return;
        }
        toast({
          title: 'Membuat Aplikasi...',
          description: 'Sedang membuat resource aplikasi baru di Coolify...',
        });

        const createdApp = await providersApi.createCoolifyApplication(deployProviderId, {
          name: coolifyAppName,
          projectUuid: coolifyProjectUuid,
          environmentName: coolifyEnvName,
          serverUuid: coolifyServerUuid,
          gitRepository:
            serviceToDeploy?.repository?.url ||
            (serviceToDeploy?.repository?.fullName
              ? `https://github.com/${serviceToDeploy.repository.fullName}`
              : ''),
          gitBranch: deployBranch,
          githubAppUuid: coolifyGithubAppUuid || undefined,
          buildPack: coolifyBuildPack,
          portsExposes: coolifyExposedPort,
          dockerfilePath: coolifyBuildPack === 'dockerfile' ? coolifyDockfilePath : undefined,
          baseDirectory: coolifyBuildPack === 'dockerfile' ? coolifyBaseDirectory : undefined,
        });

        finalAppUuid = createdApp.uuid;
        finalAppName = createdApp.name;
        setSelectedCoolifyAppUuid(createdApp.uuid);

        toast({
          title: 'Aplikasi Dibuat!',
          description: `Aplikasi "${createdApp.name}" berhasil dibuat di Coolify.`,
        });
      }

      const envName = (proj?.environments ?? []).find((e: any) => e.id === deployEnvId)?.name || '';
      const providerName =
        ((providersData as any[]) ?? []).find((p: any) => p.id === deployProviderId)?.name || '';

      localStorage.setItem(
        `hallo:deploy-config:${serviceToDeploy.id}`,
        JSON.stringify({
          envId: deployEnvId,
          providerId: deployProviderId,
          coolifyAppUuid: finalAppUuid,
          envName,
          providerName,
          coolifyAppName:
            finalAppName ||
            (coolifyApps ?? []).find((a: any) => a.uuid === finalAppUuid)?.name ||
            '',
        }),
      );

      setServiceConfigs((prev) => ({
        ...prev,
        [serviceToDeploy.id]: {
          envId: deployEnvId,
          providerId: deployProviderId,
          coolifyAppUuid: finalAppUuid,
          envName,
          providerName,
          coolifyAppName:
            finalAppName ||
            (coolifyApps ?? []).find((a: any) => a.uuid === finalAppUuid)?.name ||
            '',
        },
      }));

      triggerDeployMutation.mutate({
        serviceId: serviceToDeploy.id,
        environmentId: deployEnvId,
        providerId: deployProviderId,
        branch: deployBranch,
        coolifyAppUuid: finalAppUuid || undefined,
      });
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to trigger deployment';
      toast({
        title: 'Deployment Gagal',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const createBranchMutation = useMutation({
    mutationFn: (payload: { name: string; fromBranch: string }) =>
      repositoriesApi.createBranch(serviceForm.repositoryId, payload),
  });

  const createServiceMutation = useMutation({
    mutationFn: (form: typeof serviceForm) => servicesApi.create(id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', id] });
      setServiceOpen(false);
      setServiceForm({ name: '', repositoryId: '', branch: 'main' });
      setCreateNewBranch(false);
      setNewBranchName('');
      toast({ title: 'Service created' });
    },
    onError: () => toast({ title: 'Failed to create service', variant: 'destructive' }),
  });

  const handleCreateService = async () => {
    try {
      let targetBranch = serviceForm.branch;
      if (createNewBranch) {
        const cleanedName = newBranchName.trim();
        if (!cleanedName) {
          toast({ title: 'Branch name is required', variant: 'destructive' });
          return;
        }
        await createBranchMutation.mutateAsync({
          name: cleanedName,
          fromBranch: baseBranch,
        });
        targetBranch = cleanedName;
      }
      await createServiceMutation.mutateAsync({
        ...serviceForm,
        branch: targetBranch,
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to create service';
      toast({ title: errMsg, variant: 'destructive' });
    }
  };

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
                      onChange={(e) => {
                        const repoId = e.target.value;
                        const selectedRepo = repos.find((r: any) => r.id === repoId);
                        setServiceForm((f) => ({
                          ...f,
                          repositoryId: repoId,
                          branch: selectedRepo?.defaultBranch || 'main',
                        }));
                        if (selectedRepo) {
                          setBaseBranch(selectedRepo.defaultBranch || 'main');
                        }
                      }}
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
                    <div className="flex items-center justify-between">
                      <Label>Branch</Label>
                      {serviceForm.repositoryId && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextVal = !createNewBranch;
                            setCreateNewBranch(nextVal);
                            if (nextVal) {
                              setNewBranchName('');
                              const selectedRepo = repos.find(
                                (r: any) => r.id === serviceForm.repositoryId,
                              );
                              setBaseBranch(selectedRepo?.defaultBranch || 'main');
                            }
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {createNewBranch ? 'Choose existing branch' : 'Create new branch'}
                        </button>
                      )}
                    </div>

                    {!createNewBranch ? (
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-50"
                        value={serviceForm.branch}
                        onChange={(e) => setServiceForm((f) => ({ ...f, branch: e.target.value }))}
                        disabled={!serviceForm.repositoryId || isLoadingBranches}
                      >
                        {!serviceForm.repositoryId && (
                          <option value="">Select repository first...</option>
                        )}
                        {isLoadingBranches && <option value="">Loading branches...</option>}
                        {!isLoadingBranches &&
                          (branches ?? []).map((b: any) => (
                            <option key={b.name} value={b.name}>
                              {b.name} {b.isDefault ? '(default)' : ''}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="space-y-2 border p-3 rounded-md bg-muted/40 mt-1">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">New Branch Name</Label>
                          <Input
                            placeholder="feature/my-new-branch"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Base Branch</Label>
                          <select
                            className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                            value={baseBranch}
                            onChange={(e) => setBaseBranch(e.target.value)}
                          >
                            {(branches ?? []).map((b: any) => (
                              <option key={b.name} value={b.name}>
                                {b.name} {b.isDefault ? '(default)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateService}
                    disabled={
                      createServiceMutation.isPending ||
                      createBranchMutation.isPending ||
                      !serviceForm.name ||
                      !serviceForm.repositoryId ||
                      (createNewBranch ? !newBranchName.trim() : !serviceForm.branch)
                    }
                  >
                    {createServiceMutation.isPending || createBranchMutation.isPending ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {createBranchMutation.isPending
                          ? 'Creating branch...'
                          : 'Creating service...'}
                      </span>
                    ) : (
                      'Create Service'
                    )}
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
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {svcList.map((svc: any) => (
                  <TableRow key={svc.id}>
                    <TableCell className="font-medium py-3">
                      <div>{svc.name}</div>
                      {serviceConfigs[svc.id] ? (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-500 font-medium bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>
                            Target: {serviceConfigs[svc.id].envName} pada{' '}
                            {serviceConfigs[svc.id].providerName} (
                            {serviceConfigs[svc.id].coolifyAppName || 'Aplikasi Terdeteksi'})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground font-medium bg-muted/40 border border-muted/50 px-2 py-0.5 rounded-full w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          <span>
                            Belum Dikonfigurasi (Klik ikon gerigi untuk mengatur target default)
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {svc.repository?.fullName ?? '—'}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{svc.branch}</code>
                    </TableCell>
                    <TableCell>{svc._count?.deployments ?? 0}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-primary hover:text-primary hover:bg-primary/5 border-primary/20"
                        onClick={() => openDeployModal(svc)}
                        title="Deploy Service"
                      >
                        <Rocket className="h-3 w-3.5 text-primary" />
                        <span>Deploy</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                        onClick={() => openDeployModal(svc)}
                        title="Configure Deploy Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
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

      {/* Deploy Service Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0 bg-background/50 backdrop-blur-md">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Rocket className="h-5 w-5 text-primary" />
              <span>Deploy Service: {serviceToDeploy?.name}</span>
            </DialogTitle>
          </DialogHeader>

          {(() => {
            const coolifyProviders = ((providersData as any[]) ?? []).filter(
              (p: any) => p.type === 'COOLIFY',
            );

            if (coolifyProviders.length === 0) {
              return (
                <div className="p-6 space-y-6 flex-1 flex flex-col justify-center">
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 flex gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">No Coolify Server Configured</p>
                      <p className="text-xs mt-1 leading-relaxed">
                        To deploy this service, you need to connect a Coolify target instance.
                        Please visit the Providers page to configure one.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        setDeployDialogOpen(false);
                        router.push('/providers');
                      }}
                    >
                      Connect Coolify
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[calc(85vh-160px)]">
                  {/* Step 1: Target Environment */}
                  <div className="space-y-3 relative pl-8 border-l border-muted pb-4">
                    <div className="absolute left-0 top-0 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 border border-primary text-xs font-bold text-primary">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Langkah 1: Pilih Lingkungan (Environment)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Tentukan ke lingkungan mana aplikasi ini akan dideploy (misalnya:
                        Production, Staging, atau Development).
                      </p>
                    </div>
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      value={deployEnvId}
                      onChange={(e) => setDeployEnvId(e.target.value)}
                    >
                      {(proj?.environments ?? []).map((env: any) => (
                        <option key={env.id} value={env.id}>
                          {env.name} {env.branch ? `(branch default: ${env.branch})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Coolify Server & Application */}
                  <div className="space-y-3 relative pl-8 border-l border-muted pb-4">
                    <div className="absolute left-0 top-0 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 border border-primary text-xs font-bold text-primary">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Langkah 2: Hubungkan dengan Coolify
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Pilih server tujuan Anda dan hubungkan ke aplikasi Coolify (atau buat baru
                        secara otomatis).
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Server Target
                        </Label>
                        <select
                          className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                          value={deployProviderId}
                          onChange={(e) => setDeployProviderId(e.target.value)}
                        >
                          {coolifyProviders.map((prov: any) => (
                            <option key={prov.id} value={prov.id}>
                              {prov.name} ({prov.config?.apiUrl ?? 'API target'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between border p-3 rounded-lg bg-background shadow-sm mt-2">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Buat Aplikasi Baru di Coolify
                          </Label>
                          <p className="text-[10px] text-muted-foreground">
                            Buat aplikasi baru secara otomatis dari kosong di Coolify menggunakan
                            panel ini.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={autoCreateCoolifyApp}
                          onChange={(e) => setAutoCreateCoolifyApp(e.target.checked)}
                        />
                      </div>

                      {!autoCreateCoolifyApp ? (
                        <div className="space-y-1 mt-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Aplikasi di Coolify
                          </Label>
                          {isLoadingCoolifyApps ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span>Mengambil daftar aplikasi dari Coolify...</span>
                            </div>
                          ) : (
                            <select
                              className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                              value={selectedCoolifyAppUuid}
                              onChange={(e) => setSelectedCoolifyAppUuid(e.target.value)}
                            >
                              <option value="">-- Deteksi Otomatis (Auto-detect) --</option>
                              {(coolifyApps ?? []).map((app: any) => (
                                <option key={app.uuid} value={app.uuid}>
                                  {app.name} (
                                  {app.gitRepository
                                    ? `${app.gitRepository}:${app.gitBranch || 'main'}`
                                    : 'Tanpa repository'}
                                  )
                                </option>
                              ))}
                            </select>
                          )}
                          <p className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20 mt-1 leading-relaxed">
                            ⚠️ <strong>Penting:</strong> Jika repositori di Coolify Anda berbeda
                            nama dengan di GitHub, Anda{' '}
                            <strong>wajib memilih aplikasi yang sesuai</strong> dari dropdown di
                            atas secara manual agar deploy tidak gagal.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 bg-muted/40 p-4 rounded-lg border border-dashed mt-2">
                          <div className="text-xs font-semibold text-foreground border-b pb-1">
                            Konfigurasi Aplikasi Baru Coolify
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Nama Aplikasi
                            </Label>
                            <Input
                              type="text"
                              className="h-8 text-xs"
                              value={coolifyAppName}
                              onChange={(e) => setCoolifyAppName(e.target.value)}
                              placeholder="e.g. halloprojects-web"
                            />
                            <p className="text-[9px] text-muted-foreground leading-tight">
                              Nama unik aplikasi Anda di Coolify. Contoh: <code className="bg-muted dark:bg-zinc-800 px-1 rounded">hallo-projects-web</code>.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-muted-foreground">
                                Server
                              </Label>
                              <select
                                className="w-full rounded-md border px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                value={coolifyServerUuid}
                                onChange={(e) => setCoolifyServerUuid(e.target.value)}
                              >
                                <option value="">-- Pilih Server --</option>
                                {(coolifyServers ?? []).map((s: any) => (
                                  <option key={s.uuid} value={s.uuid}>
                                    {s.name} ({s.ip})
                                  </option>
                                ))}
                              </select>
                              <p className="text-[9px] text-muted-foreground leading-tight">
                                Target server tujuan deployment Anda di Coolify.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <Label className="text-[11px] font-semibold text-muted-foreground">
                                  Project & Env
                                </Label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCreatingNewCoolifyProject(!isCreatingNewCoolifyProject);
                                    setNewCoolifyProjectName((project as any)?.name || '');
                                  }}
                                  className="text-[10px] text-primary hover:underline font-medium focus:outline-none"
                                >
                                  {isCreatingNewCoolifyProject ? '× Batal' : '+ Buat Project Baru'}
                                </button>
                              </div>
                              {isCreatingNewCoolifyProject ? (
                                <div className="space-y-1.5 p-2 border rounded bg-muted/20">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={newCoolifyProjectName}
                                      onChange={(e) => setNewCoolifyProjectName(e.target.value)}
                                      placeholder="Nama Project Baru"
                                      className="flex-1 rounded border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isCreatingProject || !newCoolifyProjectName.trim()}
                                      onClick={async () => {
                                        setIsCreatingProject(true);
                                        try {
                                          const newProj = await providersApi.createCoolifyProject(
                                            deployProviderId,
                                            {
                                              name: newCoolifyProjectName.trim(),
                                              description: `Dibuat dari panel Hallo Projects untuk repositori ${(project as any)?.name}`,
                                            },
                                          );
                                          toast({
                                            title: 'Project Dibuat!',
                                            description: `Project "${newCoolifyProjectName}" berhasil dibuat di Coolify.`,
                                          });
                                          await queryClient.invalidateQueries({
                                            queryKey: [
                                              'providers',
                                              deployProviderId,
                                              'coolify-projects',
                                            ],
                                          });
                                          setCoolifyProjectUuid(newProj.uuid);
                                          setCoolifyEnvName('production');
                                          setIsCreatingNewCoolifyProject(false);
                                        } catch (err: any) {
                                          toast({
                                            title: 'Gagal membuat project',
                                            description:
                                              err.response?.data?.message ||
                                              err.message ||
                                              'Error tidak diketahui',
                                            variant: 'destructive',
                                          });
                                        } finally {
                                          setIsCreatingProject(false);
                                        }
                                      }}
                                      className="h-7 text-xs px-2.5"
                                    >
                                      {isCreatingProject ? '...' : 'Buat'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <select
                                  className="w-full rounded-md border px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={
                                    coolifyProjectUuid && coolifyEnvName
                                      ? `${coolifyProjectUuid}:${coolifyEnvName}`
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const [pUuid, envName] = e.target.value.split(':');
                                    setCoolifyProjectUuid(pUuid || '');
                                    setCoolifyEnvName(envName || '');
                                  }}
                                >
                                  <option value="">-- Pilih Project --</option>
                                  {(coolifyProjects ?? []).map((p: any) => (
                                    <optgroup key={p.uuid} label={p.name}>
                                      {(p.environments ?? []).map((e: any) => (
                                        <option
                                          key={`${p.uuid}:${e.name}`}
                                          value={`${p.uuid}:${e.name}`}
                                        >
                                          {p.name} - {e.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              )}
                              <p className="text-[9px] text-muted-foreground leading-tight">
                                Wadah project dan environment di Coolify untuk mengelompokkan resource.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-muted-foreground">
                              Sumber Git / GitHub App
                            </Label>
                            <select
                              className="w-full rounded-md border px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              value={coolifyGithubAppUuid}
                              onChange={(e) => setCoolifyGithubAppUuid(e.target.value)}
                            >
                              <option value="">-- Public Repository (Tanpa GitHub App) --</option>
                              {(coolifySources ?? []).map((s: any) => (
                                <option key={s.uuid} value={s.uuid}>
                                  {s.name} ({s.type})
                                </option>
                              ))}
                            </select>
                            <p className="text-[9px] text-muted-foreground leading-tight">
                              Gunakan koneksi GitHub App jika repositori Anda bersifat <strong>Private</strong>.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                <span>Build Pack</span>
                                {treeFiles && treeFiles.length > 0 && (
                                  <span className="text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold uppercase">
                                    Rekomendasi:{' '}
                                    {detectedDockerfiles.length > 0
                                      ? 'Dockerfile'
                                      : 'Nixpacks'}
                                  </span>
                                )}
                              </Label>
                              <select
                                className="w-full rounded-md border px-2 py-1.5 text-xs bg-background focus:outline-none"
                                value={coolifyBuildPack}
                                onChange={(e) => setCoolifyBuildPack(e.target.value)}
                              >
                                <option value="nixpacks">Nixpacks</option>
                                <option value="dockerfile">Dockerfile</option>
                                <option value="dockerimage">Docker Image</option>
                              </select>
                              <p className="text-[9px] text-muted-foreground leading-tight">
                                <strong>Nixpacks</strong> (deteksi otomatis) atau <strong>Dockerfile</strong> (file kustom).
                              </p>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-muted-foreground">
                                Exposed Port
                              </Label>
                              <Input
                                type="text"
                                className="h-8 text-xs"
                                placeholder="3000"
                                value={coolifyExposedPort}
                                onChange={(e) => setCoolifyExposedPort(e.target.value)}
                              />
                              <p className="text-[9px] text-muted-foreground leading-tight">
                                Port internal container. Contoh: <code className="bg-muted dark:bg-zinc-800 px-1 rounded">3000</code> (Next.js) atau <code className="bg-muted dark:bg-zinc-800 px-1 rounded">80</code>.
                              </p>
                            </div>
                          </div>

                          {coolifyBuildPack === 'dockerfile' && (
                            <div className="space-y-2 mt-2 bg-muted/30 p-2.5 rounded-md border border-dashed border-zinc-200 dark:border-zinc-800">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold text-muted-foreground">
                                    Dockerfile Path
                                  </Label>
                                  <Input
                                    type="text"
                                    className="h-8 text-[11px] font-mono"
                                    placeholder="/Dockerfile"
                                    value={coolifyDockfilePath}
                                    onChange={(e) => setCoolifyDockfilePath(e.target.value)}
                                  />
                                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                                    Lokasi Dockerfile dari root. Contoh: <code className="bg-muted dark:bg-zinc-800 px-1 rounded font-mono text-[8px]">/apps/web/Dockerfile</code>.
                                  </p>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[11px] font-semibold text-muted-foreground">
                                    Base Directory
                                  </Label>
                                  <Input
                                    type="text"
                                    className="h-8 text-[11px] font-mono"
                                    placeholder="/"
                                    value={coolifyBaseDirectory}
                                    onChange={(e) => setCoolifyBaseDirectory(e.target.value)}
                                  />
                                  <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                                    Build context directory. Gunakan <code className="bg-muted dark:bg-zinc-800 px-1 rounded font-mono text-[8px]">/</code> jika monorepo.
                                  </p>
                                </div>
                              </div>

                              {detectedDockerfiles.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[9px] text-muted-foreground font-medium block">
                                    Rekomendasi Dockerfile Terdeteksi (Klik untuk memilih):
                                  </span>
                                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                    {detectedDockerfiles.map((path: string) => {
                                      const formattedPath = path.startsWith('/') ? path : '/' + path;
                                      const isSelected = coolifyDockfilePath === formattedPath;
                                      return (
                                        <button
                                          key={path}
                                          type="button"
                                          onClick={() => {
                                            setCoolifyDockfilePath(formattedPath);
                                            setCoolifyBaseDirectory('/');
                                          }}
                                          className={`text-[9px] px-2 py-0.5 rounded border font-mono transition-all ${
                                            isSelected
                                              ? 'bg-primary text-primary-foreground border-primary font-bold'
                                              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                          }`}
                                        >
                                          {path}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Source Branch */}
                  <div className="space-y-3 relative pl-8 pb-2">
                    <div className="absolute left-0 top-0 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 border border-primary text-xs font-bold text-primary">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Langkah 3: Pilih Cabang Kode (Branch Git)
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Pilih cabang (branch) kode sumber dari GitHub yang ingin dibangun untuk
                        dideploy ke server.
                      </p>
                      {isLoadingTree ? (
                        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-dashed w-fit">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          <span>Mendeteksi tech stack...</span>
                        </div>
                      ) : (
                        treeFiles &&
                        treeFiles.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 px-2 py-1 rounded-full w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span>
                              Tech Stack Terdeteksi:{' '}
                              {detectTechStack(treeFiles) || 'Static HTML / Web'}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    {isLoadingBranches ? (
                      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Mengambil daftar cabang dari GitHub...</span>
                      </div>
                    ) : (
                      <select
                        className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                        value={deployBranch}
                        onChange={(e) => setDeployBranch(e.target.value)}
                      >
                        {(branches ?? []).map((b: any) => (
                          <option key={b.name} value={b.name}>
                            {b.name} {b.isDefault ? '(utama)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Repository structure toggle inside scrollable form */}
                  <div className="border rounded-lg bg-muted/20">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 text-xs font-semibold hover:bg-muted/40 transition-colors"
                      onClick={() => setShowRepoTree(!showRepoTree)}
                    >
                      <span className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                        <FolderTree className="h-4 w-4 text-primary" />
                        <span>Lihat Struktur File Repository</span>
                      </span>
                      {showRepoTree ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {showRepoTree && (
                      <div className="border-t p-3 max-h-60 overflow-y-auto space-y-1 bg-background rounded-b-lg">
                        {isLoadingTree ? (
                          <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span>Memuat file repository...</span>
                          </div>
                        ) : !treeFiles || treeFiles.length === 0 ? (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            Repository kosong atau tidak ada file ditemukan.
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {buildTree(treeFiles).map((node) => (
                              <FileNode key={node.path} node={node} level={0} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Footer Actions */}
                <div className="p-6 border-t bg-muted/20 flex-shrink-0 flex flex-col gap-3">
                  <div className="text-[11px] text-muted-foreground p-3 rounded-lg bg-background border space-y-1">
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span className="font-semibold text-foreground">{serviceToDeploy?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Repository:</span>
                      <span className="font-semibold text-foreground truncate max-w-[200px]">
                        {serviceToDeploy?.repository?.fullName}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 py-5 text-sm font-semibold"
                      onClick={() => setDeployDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-[2] gap-2 py-5 text-sm font-semibold shadow-md"
                      onClick={handleStartDeploy}
                      disabled={
                        isDeploying ||
                        triggerDeployMutation.isPending ||
                        isLoadingBranches ||
                        !deployEnvId ||
                        !deployProviderId ||
                        !deployBranch
                      }
                    >
                      {isDeploying || triggerDeployMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>
                            {isDeploying ? 'Menyiapkan Aplikasi...' : 'Sedang Memulai Deploy...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4" />
                          <span>Mulai Deploy Sekarang</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
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

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children: TreeNode[];
}

function buildTree(files: { path: string; type: 'file' | 'dir'; size?: number }[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map: Record<string, TreeNode> = {};

  const sortedFiles = [...files].sort(
    (a, b) => a.path.split('/').length - b.path.split('/').length,
  );

  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    const node: TreeNode = {
      name: parts[parts.length - 1],
      path: file.path,
      type: file.type,
      size: file.size,
      children: [],
    };

    map[file.path] = node;

    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map[parentPath];
      if (parent) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortTree(node.children);
      }
    }
  };

  sortTree(root);
  return root;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function FileNode({ node, level = 0 }: { node: TreeNode; level: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === 'dir';

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 px-2 hover:bg-muted/50 rounded-md cursor-pointer text-xs transition-colors',
          isDir ? 'text-foreground font-medium' : 'text-muted-foreground',
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => isDir && setIsOpen(!isOpen)}
      >
        {isDir ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
            )}
            <Folder className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className="h-3.5 w-3.5 text-blue-500/80" />
          </>
        )}
        <span className="truncate">{node.name}</span>
        {!isDir && node.size !== undefined && (
          <span className="text-[10px] text-muted-foreground/60 ml-auto">
            {formatBytes(node.size)}
          </span>
        )}
      </div>
      {isDir && isOpen && node.children.length > 0 && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function detectTechStack(files: { path: string; type: 'file' | 'dir'; size?: number }[]) {
  if (!files || files.length === 0) return null;
  const fileNames = files.map((f) => {
    const parts = f.path.split('/');
    return parts[parts.length - 1].toLowerCase();
  });

  if (
    fileNames.includes('next.config.js') ||
    fileNames.includes('next.config.mjs') ||
    fileNames.includes('next.config.ts')
  ) {
    return 'Next.js';
  }
  if (fileNames.includes('nuxt.config.js') || fileNames.includes('nuxt.config.ts')) {
    return 'Nuxt.js (Vue)';
  }
  if (fileNames.includes('svelte.config.js') || fileNames.includes('svelte.config.ts')) {
    return 'SvelteKit';
  }
  if (fileNames.includes('angular.json')) {
    return 'Angular';
  }
  if (fileNames.includes('vite.config.js') || fileNames.includes('vite.config.ts')) {
    return 'Vite (React/Vue/Svelte)';
  }
  if (fileNames.includes('package.json')) {
    return 'Node.js / React';
  }
  if (
    fileNames.includes('requirements.txt') ||
    fileNames.includes('pipfile') ||
    fileNames.includes('pyproject.toml')
  ) {
    return 'Python';
  }
  if (fileNames.includes('go.mod')) {
    return 'Go (Golang)';
  }
  if (fileNames.includes('composer.json')) {
    return 'PHP (Laravel)';
  }
  if (fileNames.includes('gemfile')) {
    return 'Ruby on Rails';
  }
  if (fileNames.includes('cargo.toml')) {
    return 'Rust';
  }
  if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) {
    return 'Java / Spring Boot';
  }
  return 'Static HTML / Web';
}
