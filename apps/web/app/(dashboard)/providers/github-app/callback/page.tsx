'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { providersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const triggered = useRef(false);
  const [error, setError] = useState<string | null>(null);

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
      if (typeof window !== 'undefined' && window.opener) {
        window.opener.postMessage('github-app-connected', '*');
        window.close();
      } else {
        router.push('/providers');
        router.refresh();
      }
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Failed to exchange App creation code';
      setError(message);
      toast({
        title: 'App registration failed',
        description: message,
        variant: 'destructive',
      });
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
      if (typeof window !== 'undefined' && window.opener) {
        window.opener.postMessage('github-connected', '*');
        window.close();
      } else {
        router.push('/providers');
        router.refresh();
      }
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        'Failed to complete GitHub App installation';
      setError(message);
      toast({
        title: 'Installation failed',
        description: message,
        variant: 'destructive',
      });
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
      router.refresh();
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive">Connection Failed</CardTitle>
            <CardDescription>
              An error occurred during the GitHub App setup handshake.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="w-full bg-destructive/5 border border-destructive/10 text-destructive-foreground p-3 rounded-lg text-sm font-mono break-all whitespace-pre-wrap">
              {error}
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                window.location.href = '/providers';
              }}
            >
              Return to Providers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
