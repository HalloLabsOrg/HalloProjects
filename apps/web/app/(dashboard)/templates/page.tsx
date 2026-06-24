'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesApi, projectsApi, environmentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  LayoutGrid,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  FileCode,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  // State
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Stepper Wizard State
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [wizardStep, setWizardStep] = useState(1); // Steps: 1 (Target), 2 (Fields), 3 (Dry-run/Preview), 4 (Success)
  const [projectId, setProjectId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [renderedFiles, setRenderedFiles] = useState<Record<string, string>>({});
  const [activePreviewFile, setActivePreviewFile] = useState<string>('');

  // Queries
  const { data: templates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ['templates', search, isAdmin],
    queryFn: () =>
      templatesApi.list({ all: isAdmin }).then((res) => {
        const allList = Array.isArray(res) ? res : [];
        if (!search) return allList;
        return allList.filter(
          (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.description?.toLowerCase().includes(search.toLowerCase()),
        );
      }),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.list({ limit: 100 }),
    enabled: isApplyOpen,
  });
  const projects = (projectsData as any)?.data ?? [];

  const { data: environments = [], isLoading: isEnvsLoading } = useQuery({
    queryKey: ['environments-list', projectId],
    queryFn: () => environmentsApi.list(projectId),
    enabled: isApplyOpen && !!projectId,
  });

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: (file: File) => templatesApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsUploadOpen(false);
      setSelectedFile(null);
      toast({ title: 'Template uploaded successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to upload template', variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      templatesApi.toggle(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template visibility updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template deleted' });
    },
  });

  const dryRunMutation = useMutation({
    mutationFn: () => templatesApi.dryRun(selectedTemplate.id, fieldValues),
    onSuccess: (files) => {
      setRenderedFiles(files);
      const keys = Object.keys(files);
      if (keys.length > 0) {
        setActivePreviewFile(keys.find((k) => k.endsWith('.env')) || keys[0]);
      }
      setWizardStep(3);
    },
    onError: (err: any) => {
      toast({
        title: 'Dry-run failed',
        description: err?.response?.data?.message || 'Error substituting template variables',
        variant: 'destructive',
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      templatesApi.apply(selectedTemplate.id, projectId, environmentId, fieldValues),
    onSuccess: () => {
      setWizardStep(4);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Template applied successfully!' });
    },
    onError: (err: any) => {
      toast({
        title: 'Apply failed',
        description: err?.response?.data?.message || 'Failed to apply configuration',
        variant: 'destructive',
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: ({ id, slug, version }: { id: string; slug: string; version: string }) =>
      templatesApi.export(id).then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${slug}-v${version}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }),
    onSuccess: () => {
      toast({ title: 'Template exported successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to export template', variant: 'destructive' });
    },
  });

  // Handlers
  const handleStartApply = (template: any) => {
    setSelectedTemplate(template);
    setWizardStep(1);
    setProjectId('');
    setEnvironmentId('');

    // Set default field values from template schema
    const defaults: Record<string, any> = {};
    if (template.schema?.fields) {
      template.schema.fields.forEach((f: any) => {
        defaults[f.name] = f.default !== undefined ? f.default : '';
      });
    }
    setFieldValues(defaults);
    setRenderedFiles({});
    setActivePreviewFile('');
    setIsApplyOpen(true);
  };

  const handleNextStep1 = () => {
    if (!projectId || !environmentId) {
      toast({ title: 'Please select a Project and Environment', variant: 'destructive' });
      return;
    }
    setWizardStep(2);
  };

  const handleNextStep2 = () => {
    // Trigger Dry Run
    dryRunMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Apply production-ready service templates to your project environments.
          </p>
        </div>

        {isAdmin && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                <Plus className="h-4 w-4 mr-2" />
                Upload Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Template (.zip)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <FileCode className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold text-center">
                    {selectedFile
                      ? selectedFile.name
                      : 'Click to select or drag & drop template ZIP'}
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Must contain template.json, schema.json, and files/ folder
                  </p>
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setSelectedFile(file);
                    }}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedFile || uploadMutation.isPending}
                  onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex max-w-sm mb-6">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background/50 backdrop-blur-sm"
        />
      </div>

      {isTemplatesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 border rounded-xl bg-card animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No templates found"
          description="Browse active community and built-in templates."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template: any) => (
            <div
              key={template.id}
              className="group relative flex flex-col border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:scale-[1.01] transition-all duration-300"
            >
              {/* Preview Image / Card Header */}
              <div className="relative h-44 w-full bg-slate-900 border-b border-border/40 overflow-hidden">
                {template.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={template.previewImage}
                    alt={template.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900">
                    <FileCode className="h-12 w-12 text-slate-700" />
                  </div>
                )}
                {!template.isActive && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Badge variant="destructive">DISABLED</Badge>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg leading-tight tracking-tight group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      v{template.version}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                    {template.description || 'No description provided.'}
                  </p>
                  {template.author && (
                    <p className="text-xs text-muted-foreground/80">
                      Author: <span className="font-medium text-foreground">{template.author}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={template.isActive ? 'outline' : 'secondary'}
                        onClick={() =>
                          toggleMutation.mutate({ id: template.id, isActive: !template.isActive })
                        }
                      >
                        {template.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      {template.author !== 'Hallo Labs' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (confirm('Delete this template?'))
                              deleteMutation.mutate(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="shadow-sm"
                      onClick={() =>
                        exportMutation.mutate({
                          id: template.id,
                          slug: template.slug,
                          version: template.version,
                        })
                      }
                      disabled={exportMutation.isPending}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      className="shadow-sm"
                      disabled={!template.isActive}
                      onClick={() => handleStartApply(template)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Apply Template Wizard Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Apply Template: {selectedTemplate?.name}</span>
              <span className="text-sm text-muted-foreground font-normal">
                Step {wizardStep} of 4
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2 py-3 border-b">
            {[
              { step: 1, label: 'Location' },
              { step: 2, label: 'Variables' },
              { step: 3, label: 'Preview' },
              { step: 4, label: 'Applied' },
            ].map((s) => (
              <div key={s.step} className="flex-1 flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    wizardStep === s.step
                      ? 'bg-primary text-primary-foreground scale-110 shadow-sm'
                      : wizardStep > s.step
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {wizardStep > s.step ? '✓' : s.step}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    wizardStep === s.step ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
                {s.step < 4 && <div className="flex-1 h-[2px] bg-muted" />}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Step 1: Target Location */}
            {wizardStep === 1 && (
              <div className="space-y-5 max-w-md mx-auto py-4">
                <div className="space-y-2">
                  <Label htmlFor="wizard-project">Target Project</Label>
                  <select
                    id="wizard-project"
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      setEnvironmentId('');
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wizard-env">Target Environment</Label>
                  <select
                    id="wizard-env"
                    value={environmentId}
                    onChange={(e) => setEnvironmentId(e.target.value)}
                    disabled={!projectId || isEnvsLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    <option value="">
                      {isEnvsLoading ? 'Loading environments...' : '-- Choose Environment --'}
                    </option>
                    {environments.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Dynamic Form Fields */}
            {wizardStep === 2 && (
              <div className="space-y-5 max-w-lg mx-auto py-4">
                {selectedTemplate?.schema?.fields?.map((field: any) => (
                  <div key={field.name} className="space-y-1">
                    <Label
                      htmlFor={`field-${field.name}`}
                      className="flex items-center gap-1.5 font-semibold text-sm"
                    >
                      {field.label || field.name}
                      {field.isSecret && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-indigo-500 border-indigo-400 py-0 px-1.5"
                        >
                          Secret
                        </Badge>
                      )}
                    </Label>
                    <Input
                      id={`field-${field.name}`}
                      type={field.isSecret ? 'password' : 'text'}
                      value={fieldValues[field.name]}
                      placeholder={field.default !== undefined ? String(field.default) : ''}
                      onChange={(e) =>
                        setFieldValues((v) => ({ ...v, [field.name]: e.target.value }))
                      }
                      className="bg-background"
                    />
                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Interactive Dry-run Preview */}
            {wizardStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[45vh] border rounded-lg overflow-hidden bg-background">
                {/* File tree browser */}
                <div className="border-r bg-muted/20 p-4 space-y-2 overflow-y-auto">
                  <div className="flex items-center gap-1 text-sm font-semibold text-muted-foreground mb-3">
                    <FolderOpen className="h-4 w-4" />
                    <span>Generated Files</span>
                  </div>
                  {Object.keys(renderedFiles).map((file) => (
                    <button
                      key={file}
                      onClick={() => setActivePreviewFile(file)}
                      className={`w-full flex items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                        activePreviewFile === file
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <FileCode className="h-4 w-4" />
                      <span className="truncate">{file}</span>
                    </button>
                  ))}
                </div>

                {/* Rendered File Viewer */}
                <div className="md:col-span-2 flex flex-col bg-slate-950 p-4 overflow-hidden relative">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2 mb-3">
                    <span>{activePreviewFile}</span>
                    <Badge
                      variant="outline"
                      className="text-slate-500 border-slate-800 text-[10px]"
                    >
                      Rendered Preview
                    </Badge>
                  </div>
                  <pre className="flex-1 overflow-auto text-xs text-slate-100 font-mono leading-relaxed select-all whitespace-pre-wrap p-2 rounded bg-slate-900/50">
                    {renderedFiles[activePreviewFile]}
                  </pre>
                </div>
              </div>
            )}

            {/* Step 4: Success Details */}
            {wizardStep === 4 && (
              <div className="text-center py-10 space-y-5 max-w-md mx-auto">
                <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto animate-bounce" />
                <h3 className="text-2xl font-bold">Configuration Applied!</h3>
                <p className="text-muted-foreground text-sm">
                  The template files have been rendered and all environment variables successfully
                  upserted into your selected environment!
                </p>
                <div className="border border-border/80 rounded-lg p-4 bg-muted/10 text-left space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Summary</p>
                  <div className="grid grid-cols-2 text-sm gap-2">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium">{selectedTemplate?.name}</span>
                    <span className="text-muted-foreground">Variables Saved:</span>
                    <span className="font-medium text-emerald-600">
                      {selectedTemplate?.schema?.fields?.length ?? 0} variables
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Footer Controls */}
          <div className="border-t pt-4 flex items-center justify-between">
            {wizardStep > 1 && wizardStep < 4 ? (
              <Button
                variant="outline"
                onClick={() => setWizardStep((s) => s - 1)}
                disabled={dryRunMutation.isPending || applyMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {wizardStep === 1 && (
              <Button onClick={handleNextStep1}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {wizardStep === 2 && (
              <Button onClick={handleNextStep2} disabled={dryRunMutation.isPending}>
                {dryRunMutation.isPending ? 'Validating...' : 'Dry-run Preview'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            {wizardStep === 3 && (
              <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10"
              >
                {applyMutation.isPending ? 'Applying...' : 'Confirm & Apply'}
                <CheckCircle className="h-4 w-4 ml-2" />
              </Button>
            )}

            {wizardStep === 4 && (
              <Button onClick={() => setIsApplyOpen(false)} className="w-full sm:w-auto">
                Done
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
