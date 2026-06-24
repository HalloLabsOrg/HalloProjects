'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const triggered = useRef(false);

  const code = searchParams.get('code');
  const installationId = searchParams.get('installation_id');

  const appCreationMutation = useMutation({
    mutationFn: (authCode: string) => providersApi.githubAppCallback(authCode),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['github-app-status'] });
      toast({
        title: 'GitHub App Registered Successfully!',
        description: `Registered app: ${data.appName}`,
      });
      // After App registration, let's trigger the install flow right away for convenience!
      router.push('/providers');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? 'Failed to exchange App creation code';
      toast({
        title: 'App registration failed',
        description: message,
        variant: 'destructive',
      });
      router.push('/providers');
    },
  });

  const installationMutation = useMutation({
    mutationFn: (instId: string) => providersApi.githubAppInstall(instId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast({
        title: 'GitHub Account Connected!',
        description: `Connected organization/user: ${data.owner}`,
      });
      router.push('/providers');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? 'Failed to complete GitHub App installation';
      toast({
        title: 'Installation failed',
        description: message,
        variant: 'destructive',
      });
      router.push('/providers');
    },
  });

  useEffect(() => {
    if (!code && !installationId) {
      toast({
        title: 'Invalid callback parameters',
        description: 'Missing code or installation_id parameter from GitHub redirect.',
        variant: 'destructive',
      });
      router.push('/providers');
      return;
    }

    if (!triggered.current) {
      triggered.current = true;
      if (code) {
        appCreationMutation.mutate(code);
      } else if (installationId) {
        installationMutation.mutate(installationId);
      }
    }
  }, [code, installationId, router, toast, appCreationMutation, installationMutation]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connecting GitHub</CardTitle>
          <CardDescription>
            {code
              ? 'Completing registration handshake for your self-hosted GitHub App...'
              : 'Saving GitHub App installation details...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Please do not close this window</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GitHubAppCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Connecting GitHub</CardTitle>
              <CardDescription>Loading secure callback handler...</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Please do not close this window</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
