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
import { Plug, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', token: '', owner: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.list,
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
      toast({ title: 'Provider removed' });
    },
  });

  const providers = (data as any[]) ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Providers</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Connect GitHub</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect GitHub Provider</DialogTitle>
            </DialogHeader>
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
          </DialogContent>
        </Dialog>
      </div>

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
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="No providers connected"
          description="Connect a GitHub account to start syncing repositories."
          action={{ label: 'Connect GitHub', onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider: any) => (
            <Card key={provider.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{provider.name}</CardTitle>
                  <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                    {provider.type}
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
          ))}
        </div>
      )}
    </div>
  );
}
