'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { projectsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { FolderKanban, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProjectsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectsApi.list({ search, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create(form),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      setForm({ name: '', description: '' });
      router.push(`/projects/${result.id}`);
    },
    onError: () => toast({ title: 'Failed to create project', variant: 'destructive' }),
  });

  const projects = (data as any)?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="My Project"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="A brief description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name}
              >
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <TableSkeleton columns={['Name', 'Slug', 'Services', 'Status', 'Created']} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to get started."
          action={{ label: 'Create Project', onClick: () => setOpen(true) }}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project: any) => (
              <TableRow
                key={project.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{project.slug}</code>
                </TableCell>
                <TableCell>{project._count?.services ?? 0}</TableCell>
                <TableCell>
                  <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(project.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
