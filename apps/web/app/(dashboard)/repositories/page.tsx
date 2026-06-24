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
import { GitBranch, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  // Query active local repositories
  const { data, isLoading } = useQuery({
    queryKey: ['repositories', search],
    queryFn: () => repositoriesApi.list({ search, limit: 50 }),
  });

  // Query connected providers to populate dropdown
  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
    enabled: importOpen,
  });

  const githubProviders = useMemo(() => {
    return (providersData ?? []).filter(
      (p: any) => p.type === 'GITHUB' && p.config?.authMethod !== 'github_app'
    );
  }, [providersData]);

  // Query remote repositories from selected provider
  const { data: remoteRepos, isLoading: isLoadingRemote } = useQuery({
    queryKey: ['remoteRepos', selectedProviderId],
    queryFn: () => repositoriesApi.listRemote(selectedProviderId),
    enabled: !!selectedProviderId && importOpen,
  });

  const repos = (data as any)?.data ?? [];

  const localExternalIds = useMemo(() => {
    return new Set(repos.map((r: any) => r.externalId));
  }, [repos]);

  const filteredRemoteRepos = useMemo(() => {
    if (!remoteRepos) return [];
    return remoteRepos.filter((repo: any) =>
      repo.fullName.toLowerCase().includes(searchRemote.toLowerCase())
    );
  }, [remoteRepos, searchRemote]);

  const handleToggleRepo = (externalId: string) => {
    setSelectedExternalIds((prev) =>
      prev.includes(externalId)
        ? prev.filter((id) => id !== externalId)
        : [...prev, externalId]
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
                        {provider.name}
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
                        {selectedExternalIds.length === remoteRepos.filter((r: any) => !localExternalIds.has(r.externalId)).length
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
                                checked={isImported || selectedExternalIds.includes(repo.externalId)}
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
                                <Badge variant="secondary" className="text-xs">Imported</Badge>
                              ) : (
                                <Badge variant={repo.visibility === 'private' ? 'secondary' : 'outline'} className="text-xs capitalize">
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
            </div>

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
        <TableSkeleton columns={['Name', 'Provider', 'Branch', 'Visibility', 'Last Synced', 'Actions']} />
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
                <TableCell className="font-medium">{repo.fullName}</TableCell>
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setRepoToDelete(repo);
                      setDeleteConfirmOpen(true);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Repository</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{repoToDelete?.fullName}</strong>? This action cannot be undone and will remove it from the local HALLO Projects registry.
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
