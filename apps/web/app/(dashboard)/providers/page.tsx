'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/empty-state';
import { Plug, Trash2, CheckCircle, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'app' | 'pat'>('app');
  const [form, setForm] = useState({ name: '', token: '', owner: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
  });

  const { data: appStatus } = useQuery({
    queryKey: ['github-app-status'],
    queryFn: providersApi.getGithubAppStatus,
  });

  const createMutation = useMutation({
    mutationFn: () => providersApi.create('github', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setOpen(false);
      setForm({ name: '', token: '', owner: '' });
      toast({ title: 'Provider connected successfully' });
    },
    onError: () => toast({ title: 'Failed to connect provider', variant: 'destructive' }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) =>
      providersApi.test(id) as Promise<{ success: boolean; message: string }>,
    onSuccess: (result: any) => {
      toast({
        title: result.success ? 'Connection successful' : 'Connection failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: providersApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['github-app-status'] });
      toast({ title: 'Provider removed' });
    },
  });

  const handleCreateApp = async () => {
    try {
      const payload = await providersApi.getGithubAppManifestPayload(window.location.origin);
      const formElement = document.createElement('form');
      formElement.method = 'POST';
      formElement.action = 'https://github.com/settings/apps/new';

      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'manifest';
      input.value = JSON.stringify(payload);

      formElement.appendChild(input);
      document.body.appendChild(formElement);
      formElement.submit();
    } catch (err) {
      toast({
        title: 'Failed to initiate GitHub App creation',
        variant: 'destructive',
      });
    }
  };

  const providers = (data as any[]) ?? [];
  const appConfigured = appStatus?.configured ?? false;

  // Filter out the root GitHub App connection from the main sync list for a cleaner user experience
  const displayProviders = providers.filter((p) => p.config?.authMethod !== 'github_app');
  const rootAppProvider = providers.find((p) => p.config?.authMethod === 'github_app');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Providers</h1>
          <p className="text-muted-foreground text-sm">
            Manage your Git and deployment platform connections.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plug className="h-4 w-4" />
              Connect GitHub
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Connect GitHub Provider</DialogTitle>
            </DialogHeader>

            <div className="flex border-b border-border my-2">
              <button
                type="button"
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  method === 'app'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMethod('app')}
              >
                GitHub App (No-env)
              </button>
              <button
                type="button"
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  method === 'pat'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setMethod('pat')}
              >
                PAT
              </button>
            </div>

            {method === 'app' ? (
              <div className="space-y-4 py-4">
                {appConfigured ? (
                  <div className="space-y-4 text-center">
                    <div className="flex items-center justify-center p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                      <Shield className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>
                        GitHub App <strong>{appStatus?.appName}</strong> is fully configured.
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Install the application on any GitHub account or organization to start syncing
                      its repositories.
                    </p>
                    <Button
                      className="w-full flex items-center justify-center gap-2"
                      size="lg"
                      onClick={() => {
                        if (appStatus?.htmlUrl) {
                          window.location.href = `${appStatus.htmlUrl}/installations/new`;
                        }
                      }}
                    >
                      <Plug className="h-5 w-5" />
                      Connect / Install on Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Register a self-hosted GitHub App dynamically. Zero environment variable
                      configuration required.
                    </p>
                    <Button
                      className="w-full flex items-center justify-center gap-2"
                      size="lg"
                      onClick={handleCreateApp}
                    >
                      <Shield className="h-5 w-5" />
                      Create GitHub App Connection
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    placeholder="My GitHub"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Personal Access Token</Label>
                  <Input
                    type="password"
                    placeholder="github_pat_xxx"
                    value={form.token}
                    onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Organization (optional)</Label>
                  <Input
                    placeholder="my-org"
                    value={form.owner}
                    onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.name || !form.token}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Connect
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* GitHub App Settings Card (if configured) */}
      {rootAppProvider && (
        <Card className="border border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary animate-pulse" />
                <CardTitle className="text-base font-semibold">Instance GitHub App</CardTitle>
              </div>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                Active App
              </Badge>
            </div>
            <CardDescription>
              Registered App Name:{' '}
              <strong className="text-foreground">{rootAppProvider.name}</strong>. Used to
              authenticate multiple connected developer accounts without static secrets.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (appStatus?.htmlUrl) {
                  window.location.href = `${appStatus.htmlUrl}/installations/new`;
                }
              }}
            >
              <Plug className="h-3 w-3 mr-1" />
              Link New Account
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate(rootAppProvider.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove App
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayProviders.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No providers connected"
          description="Connect a GitHub account (via GitHub App, OAuth, or PAT) to start syncing repositories."
          action={{ label: 'Connect GitHub', onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayProviders.map((provider: any) => {
            const authMethod = provider.config?.authMethod ?? 'pat';
            return (
              <Card key={provider.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                      {authMethod === 'github_app_installation' ? 'GitHub App' : provider.type}
                    </Badge>
                  </div>
                  <CardDescription>
                    {provider.lastTestedAt
                      ? `Last tested: ${new Date(provider.lastTestedAt).toLocaleDateString()}`
                      : 'Not tested yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate(provider.id)}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(provider.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
