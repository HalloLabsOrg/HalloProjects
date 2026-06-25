'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repositoriesApi, providersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import {
  GitBranch,
  Loader2,
  Plus,
  Search,
  Trash2,
  Plug,
  Shield,
  Github,
  FolderTree,
  Folder,
  FileCode,
  ChevronDown,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function RepositoriesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  // Modal & Selection state
  const [importOpen, setImportOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedExternalIds, setSelectedExternalIds] = useState<string[]>([]);
  const [searchRemote, setSearchRemote] = useState('');

  // Delete confirm state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<any>(null);

  // Details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [detailsBranch, setDetailsBranch] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'techstack'>('files');

  // Query active local repositories
  const { data, isLoading } = useQuery({
    queryKey: ['repositories', search],
    queryFn: () => repositoriesApi.list({ search, limit: 50 }),
  });

  // Query branches for details view
  const { data: detailsBranches, isLoading: isLoadingDetailsBranches } = useQuery({
    queryKey: ['repository-branches', selectedRepo?.id],
    queryFn: () => repositoriesApi.branches(selectedRepo.id),
    enabled: !!selectedRepo && detailsOpen,
  });

  // Query tree files for details view
  const { data: detailsTreeFiles, isLoading: isLoadingDetailsTree } = useQuery({
    queryKey: ['repository-tree', selectedRepo?.id, detailsBranch],
    queryFn: () => repositoriesApi.tree(selectedRepo.id, detailsBranch),
    enabled: !!selectedRepo && detailsOpen && !!detailsBranch,
  });

  // Query connected providers to populate dropdown
  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
    enabled: importOpen,
  });

  // Query GitHub App status to see if configured at root level
  const { data: appStatus } = useQuery({
    queryKey: ['github-app-status'],
    queryFn: providersApi.getGithubAppStatus,
    enabled: importOpen,
  });

  const githubProviders = useMemo(() => {
    return (providersData ?? []).filter(
      (p: any) => p.type === 'GITHUB' && p.config?.authMethod !== 'github_app',
    );
  }, [providersData]);

  // Query remote repositories from selected provider
  const { data: remoteRepos, isLoading: isLoadingRemote } = useQuery({
    queryKey: ['remoteRepos', selectedProviderId],
    queryFn: () => repositoriesApi.listRemote(selectedProviderId),
    enabled: !!selectedProviderId && importOpen,
  });

  const repos = useMemo(() => (data as any)?.data ?? [], [data]);

  const localExternalIds = useMemo(() => {
    return new Set(repos.map((r: any) => r.externalId));
  }, [repos]);

  const filteredRemoteRepos = useMemo(() => {
    if (!remoteRepos) return [];
    return remoteRepos.filter((repo: any) =>
      repo.fullName.toLowerCase().includes(searchRemote.toLowerCase()),
    );
  }, [remoteRepos, searchRemote]);

  const handleToggleRepo = (externalId: string) => {
    setSelectedExternalIds((prev) =>
      prev.includes(externalId) ? prev.filter((id) => id !== externalId) : [...prev, externalId],
    );
  };

  const toggleSelectAll = () => {
    if (!remoteRepos) return;
    const importableRepos = remoteRepos.filter((r: any) => !localExternalIds.has(r.externalId));
    const importableIds = importableRepos.map((r: any) => r.externalId);

    const allSelected = importableIds.every((id) => selectedExternalIds.includes(id));
    if (allSelected) {
      setSelectedExternalIds((prev) => prev.filter((id) => !importableIds.includes(id)));
    } else {
      setSelectedExternalIds((prev) => {
        const next = new Set([...prev, ...importableIds]);
        return Array.from(next);
      });
    }
  };

  // Sync Mutation for importing selected repos
  const importMutation = useMutation({
    mutationFn: () =>
      repositoriesApi.sync({
        providerId: selectedProviderId,
        externalIds: selectedExternalIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      toast({ title: 'Repositories imported successfully' });
      setImportOpen(false);
      setSelectedExternalIds([]);
      setSelectedProviderId('');
      setSearchRemote('');
    },
    onError: () => toast({ title: 'Import failed', variant: 'destructive' }),
  });

  // Delete Mutation for deleting repository
  const deleteMutation = useMutation({
    mutationFn: (id: string) => repositoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      toast({ title: 'Repository deleted successfully' });
      setDeleteConfirmOpen(false);
      setRepoToDelete(null);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Delete failed';
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Import Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Repositories</DialogTitle>
              <DialogDescription>
                Select a connected GitHub account and choose the repositories you want to import.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {githubProviders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/30 text-center space-y-4">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <Plug className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">No connected GitHub accounts</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {appStatus?.configured
                        ? `You have configured the GitHub App "${appStatus.appName}". Please install/link it to your GitHub account to sync repositories.`
                        : 'Connect a GitHub account (via GitHub App or Personal Access Token) to start importing your repositories.'}
                    </p>
                  </div>
                  <div className="flex flex-col w-full gap-2 pt-2">
                    {appStatus?.configured && appStatus.htmlUrl && (
                      <Button
                        type="button"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => {
                          window.open(`${appStatus.htmlUrl}/installations/new`, '_blank');
                        }}
                      >
                        <Shield className="h-4 w-4" />
                        Install GitHub App
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setImportOpen(false);
                        window.location.href = '/providers';
                      }}
                    >
                      Go to Providers page
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">GitHub Account</label>
                    <Select
                      value={selectedProviderId}
                      onValueChange={(val) => {
                        setSelectedProviderId(val);
                        setSelectedExternalIds([]);
                        setSearchRemote('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a connected account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {githubProviders.map((provider: any) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <div className="flex items-center space-x-2">
                              {provider.config?.avatarUrl ? (
                                <img
                                  src={provider.config.avatarUrl}
                                  alt={provider.name}
                                  className="h-5 w-5 rounded-full border border-border"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted">
                                  <Github className="h-3 w-3 text-foreground" />
                                </div>
                              )}
                              <span>{provider.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProviderId && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Select Repositories</label>
                        {remoteRepos && remoteRepos.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            {selectedExternalIds.length ===
                            remoteRepos.filter((r: any) => !localExternalIds.has(r.externalId))
                              .length
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search remote repositories..."
                          value={searchRemote}
                          onChange={(e) => setSearchRemote(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {isLoadingRemote ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredRemoteRepos.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                          No repositories found.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border rounded-md divide-y bg-background">
                          {filteredRemoteRepos.map((repo: any) => {
                            const isImported = localExternalIds.has(repo.externalId);
                            return (
                              <div
                                key={repo.externalId}
                                className={`flex items-center justify-between p-2.5 text-sm ${
                                  isImported ? 'bg-muted/40 opacity-70' : 'hover:bg-accent/40'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    id={`repo-${repo.externalId}`}
                                    disabled={isImported}
                                    checked={
                                      isImported || selectedExternalIds.includes(repo.externalId)
                                    }
                                    onChange={() => handleToggleRepo(repo.externalId)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <label
                                    htmlFor={`repo-${repo.externalId}`}
                                    className={`font-medium select-none ${isImported ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    {repo.fullName}
                                  </label>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  {isImported ? (
                                    <Badge variant="secondary" className="text-xs">
                                      Imported
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant={
                                        repo.visibility === 'private' ? 'secondary' : 'outline'
                                      }
                                      className="text-xs capitalize"
                                    >
                                      {repo.visibility}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {githubProviders.length > 0 && (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportOpen(false);
                    setSelectedProviderId('');
                    setSelectedExternalIds([]);
                    setSearchRemote('');
                  }}
                  disabled={importMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={selectedExternalIds.length === 0 || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import Selected (${selectedExternalIds.length})`
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <TableSkeleton
          columns={['Name', 'Provider', 'Branch', 'Visibility', 'Last Synced', 'Actions']}
        />
      ) : repos.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories"
          description="Connect a GitHub provider and import repositories to see them here."
          action={{ label: 'Import Repository', onClick: () => setImportOpen(true) }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repos.map((repo: any) => (
              <TableRow key={repo.id}>
                <TableCell className="font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRepo(repo);
                      setDetailsBranch(repo.defaultBranch);
                      setActiveTab('files');
                      setDetailsOpen(true);
                    }}
                    className="hover:underline text-left font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    {repo.fullName}
                  </button>
                </TableCell>
                <TableCell>{repo.provider?.name ?? '—'}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{repo.defaultBranch}</code>
                </TableCell>
                <TableCell>
                  <Badge variant={repo.visibility === 'private' ? 'secondary' : 'outline'}>
                    {repo.visibility}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {repo.syncedAt ? new Date(repo.syncedAt).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedRepo(repo);
                      setDetailsBranch(repo.defaultBranch);
                      setActiveTab('files');
                      setDetailsOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted h-8 w-8"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setRepoToDelete(repo);
                      setDeleteConfirmOpen(true);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    title="Delete Repository"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Repository Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              <span>Repository Details</span>
            </DialogTitle>
            <DialogDescription>Explore repository files and settings.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-xs p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-muted-foreground block mb-0.5">Name</span>
                <span className="font-semibold text-foreground truncate block">
                  {selectedRepo?.fullName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Provider</span>
                <span className="font-semibold text-foreground truncate block">
                  {selectedRepo?.provider?.name ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Default Branch</span>
                <span className="font-semibold text-foreground truncate block">
                  {selectedRepo?.defaultBranch}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-0.5">Visibility</span>
                <Badge
                  variant={selectedRepo?.visibility === 'private' ? 'secondary' : 'outline'}
                  className="capitalize mt-0.5"
                >
                  {selectedRepo?.visibility}
                </Badge>
              </div>
            </div>

            <div className="flex border-b mb-2 mt-1">
              <button
                type="button"
                className={cn(
                  'pb-2 px-4 text-xs font-semibold border-b-2 -mb-[2px] transition-colors',
                  activeTab === 'files'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setActiveTab('files')}
              >
                Files Explorer
              </button>
              <button
                type="button"
                className={cn(
                  'pb-2 px-4 text-xs font-semibold border-b-2 -mb-[2px] transition-colors',
                  activeTab === 'techstack'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
                onClick={() => setActiveTab('techstack')}
              >
                Tech Stack & Layering
              </button>
            </div>

            {activeTab === 'files' ? (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold block">Select Branch</label>
                  {isLoadingDetailsBranches ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Fetching branches from GitHub...</span>
                    </div>
                  ) : (
                    <select
                      className="w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={detailsBranch}
                      onChange={(e) => setDetailsBranch(e.target.value)}
                    >
                      {(detailsBranches ?? []).map((b: any) => (
                        <option key={b.name} value={b.name}>
                          {b.name} {b.isDefault ? '(default)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-2 border-t pt-3">
                  <label className="text-xs font-semibold flex items-center gap-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-primary" />
                    <span>Files Structure</span>
                  </label>

                  <div className="border rounded-lg max-h-80 overflow-y-auto p-3 bg-muted/10 space-y-1">
                    {isLoadingDetailsTree ? (
                      <div className="flex items-center gap-2 py-8 justify-center text-xs text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>Loading files list...</span>
                      </div>
                    ) : !detailsTreeFiles || detailsTreeFiles.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        No files found or repository is empty.
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {buildTree(detailsTreeFiles).map((node) => (
                          <FileNode key={node.path} node={node} level={0} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-1">
                {isLoadingDetailsTree ? (
                  <div className="flex flex-col items-center gap-2 py-12 justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Analyzing repository structure & files...</span>
                  </div>
                ) : !detailsTreeFiles || detailsTreeFiles.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Unable to analyze repository. No files found.
                  </div>
                ) : (
                  (() => {
                    const analysis = analyzeProject(detailsTreeFiles);
                    return (
                      <div className="space-y-4">
                        {/* Tech Stack section */}
                        <div className="space-y-2">
                          <span className="text-xs font-semibold block text-muted-foreground">
                            Detected Tech Stack
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.techStack.length === 0 ? (
                              <Badge variant="outline" className="text-xs">
                                Generic Project
                              </Badge>
                            ) : (
                              analysis.techStack.map((tech) => (
                                <Badge
                                  key={tech.name}
                                  className={cn('text-xs font-medium border', tech.color)}
                                  variant="outline"
                                >
                                  {tech.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Layering section */}
                        <div className="space-y-2 border-t pt-3">
                          <span className="text-xs font-semibold block text-muted-foreground">
                            Architecture Layering Model
                          </span>
                          <div className="p-3.5 rounded-lg border bg-primary/5 border-primary/20 space-y-1.5">
                            <span className="font-bold text-sm text-primary block">
                              {analysis.layering}
                            </span>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {analysis.description}
                            </p>
                          </div>
                        </div>

                        {/* Key highlights / details */}
                        <div className="space-y-2 border-t pt-3">
                          <span className="text-xs font-semibold block text-muted-foreground">
                            Structure Highlights
                          </span>
                          <ul className="text-xs space-y-1.5 text-muted-foreground pl-1">
                            {analysis.highlights.map((highlight, index) => (
                              <li key={index} className="flex items-start gap-1.5">
                                <span className="text-primary font-bold text-xs select-none">
                                  •
                                </span>
                                <span>{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Repository</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{repoToDelete?.fullName}</strong>? This action
              cannot be undone and will remove it from the local HALLO Projects registry.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setRepoToDelete(null);
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(repoToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProjectAnalysis {
  techStack: { name: string; category: string; color: string }[];
  layering: string;
  description: string;
  highlights: string[];
}

function analyzeProject(files: { path: string }[]): ProjectAnalysis {
  const techStack: { name: string; category: string; color: string }[] = [];
  const highlights: string[] = [];

  const filePaths = files.map((f) => f.path);

  // Check language/runtime
  let isTS = false;
  let isJS = false;
  let isGo = false;
  let isPython = false;
  let isRust = false;
  let isRuby = false;
  let isPHP = false;
  let isJava = false;

  for (const path of filePaths) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) isTS = true;
    if (path.endsWith('.js') || path.endsWith('.jsx')) isJS = true;
    if (path.endsWith('.go') || path.includes('go.mod')) isGo = true;
    if (
      path.endsWith('.py') ||
      path.includes('requirements.txt') ||
      path.includes('pyproject.toml')
    )
      isPython = true;
    if (path.endsWith('.rs') || path.includes('Cargo.toml')) isRust = true;
    if (path.endsWith('.rb') || path.includes('Gemfile')) isRuby = true;
    if (path.endsWith('.php') || path.includes('composer.json')) isPHP = true;
    if (path.endsWith('.java') || path.includes('pom.xml') || path.includes('build.gradle'))
      isJava = true;
  }

  if (isTS)
    techStack.push({
      name: 'TypeScript',
      category: 'Language',
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    });
  else if (isJS)
    techStack.push({
      name: 'JavaScript',
      category: 'Language',
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    });
  if (isGo)
    techStack.push({
      name: 'Go',
      category: 'Language',
      color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    });
  if (isPython)
    techStack.push({
      name: 'Python',
      category: 'Language',
      color: 'bg-green-500/10 text-green-500 border-green-500/20',
    });
  if (isRust)
    techStack.push({
      name: 'Rust',
      category: 'Language',
      color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    });
  if (isRuby)
    techStack.push({
      name: 'Ruby',
      category: 'Language',
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
    });
  if (isPHP)
    techStack.push({
      name: 'PHP',
      category: 'Language',
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    });
  if (isJava)
    techStack.push({
      name: 'Java',
      category: 'Language',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    });

  // Frameworks & Libraries
  let hasNext = false;
  let hasVite = false;
  let hasNest = false;
  let hasTurbo = false;
  let hasPrisma = false;
  let hasDrizzle = false;
  let hasTailwind = false;
  let hasDocker = false;

  for (const path of filePaths) {
    if (path.includes('next.config')) hasNext = true;
    if (path.includes('vite.config')) hasVite = true;
    if (path.includes('nest-cli.json') || path.includes('apps/api')) hasNest = true;
    if (path.includes('turbo.json')) hasTurbo = true;
    if (path.includes('schema.prisma')) hasPrisma = true;
    if (path.includes('drizzle.config')) hasDrizzle = true;
    if (path.includes('tailwind.config')) hasTailwind = true;
    if (path.includes('Dockerfile') || path.includes('docker-compose')) hasDocker = true;
  }

  if (hasNext)
    techStack.push({
      name: 'Next.js',
      category: 'Framework',
      color: 'bg-slate-950/10 text-slate-950 dark:text-slate-100 border-slate-950/20',
    });
  if (hasNest)
    techStack.push({
      name: 'NestJS',
      category: 'Framework',
      color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    });
  if (hasVite && !hasNext)
    techStack.push({
      name: 'Vite',
      category: 'Build Tool',
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    });
  if (hasTurbo)
    techStack.push({
      name: 'Turborepo',
      category: 'Monorepo',
      color: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    });
  if (hasPrisma)
    techStack.push({
      name: 'Prisma',
      category: 'Database ORM',
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    });
  if (hasDrizzle)
    techStack.push({
      name: 'Drizzle',
      category: 'Database ORM',
      color: 'bg-lime-500/10 text-lime-500 border-lime-500/20',
    });
  if (hasTailwind)
    techStack.push({
      name: 'TailwindCSS',
      category: 'Styling',
      color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    });
  if (hasDocker)
    techStack.push({
      name: 'Docker',
      category: 'DevOps',
      color: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    });

  // Layering Model & Description
  let layering = 'Standard Layout';
  let description = 'A repository with a standard single-package project structure.';

  const isMonorepo =
    filePaths.some((p) => p.startsWith('apps/') || p.startsWith('packages/')) || hasTurbo;

  if (isMonorepo) {
    layering = 'Monorepo Workspace';
    description =
      'A multi-package monorepo workspace containing separate applications and shared packages/libraries.';
    highlights.push('Splits code into isolated apps/ and packages/ components');
    if (hasTurbo)
      highlights.push('Uses Turborepo for orchestration and high-performance task caching');
    if (filePaths.some((p) => p.includes('pnpm-workspace.yaml')))
      highlights.push('Managed via PNPM Workspaces dependency sharing');
  } else {
    // Check NestJS Modular
    const hasModules = filePaths.some(
      (p) => p.includes('.module.ts') || p.includes('.controller.ts') || p.includes('.service.ts'),
    );
    const hasCleanArch = filePaths.some(
      (p) => p.includes('domain/') && p.includes('infrastructure/'),
    );
    const hasMvc = filePaths.some((p) => p.includes('controllers/') && p.includes('models/'));

    if (hasNext) {
      const hasAppRouter = filePaths.some(
        (p) => p.includes('app/page.tsx') || p.includes('app/layout.tsx'),
      );
      if (hasAppRouter) {
        layering = 'Next.js App Router Architecture';
        description =
          'Modern Next.js application utilizing React Server Components and nested layouts inside the app/ directory.';
        highlights.push('Uses Server Actions and layouts file system routing');
      } else {
        layering = 'Next.js Pages Router Layout';
        description =
          'Traditional Next.js application structure utilizing the pages/ directory for routing.';
        highlights.push('Pages-based routing and Server Side Rendering (SSR) options');
      }
    } else if (hasNest && hasModules) {
      layering = 'NestJS Modular Architecture';
      description =
        'Scalable backend architecture organized into domain modules containing controllers, services, and entities.';
      highlights.push('Follows Dependency Injection and modular patterns');
    } else if (hasCleanArch) {
      layering = 'Clean Architecture / DDD';
      description =
        'Highly decoupled layered architecture separating Domain, Application, and Infrastructure concerns.';
      highlights.push('Strict separation of business domain from framework dependencies');
    } else if (hasMvc) {
      layering = 'MVC (Model-View-Controller) Layering';
      description =
        'Classic layered pattern organizing files by their technical role (controllers, models, views).';
      highlights.push('Highly organized technical categorization');
    } else {
      layering = 'Component-Based Structure';
      description =
        'Standard modern web application organized around reusable user interface components and styling files.';
    }
  }

  // Generic highlights if empty
  if (highlights.length === 0) {
    if (isTS) highlights.push('Type-safe development with TypeScript compiler check');
    if (hasDocker) highlights.push('Containerized deployment with Dockerfile specification');
    if (hasPrisma || hasDrizzle)
      highlights.push('Automated database migrations and type-safe schema models');
  }

  return {
    techStack,
    layering,
    description,
    highlights,
  };
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
    <div className="select-none font-sans">
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
