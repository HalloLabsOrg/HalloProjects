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

  const mutation = useMutation({
    mutationFn: (authCode: string) => providersApi.githubCallback(authCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      toast({ title: 'GitHub account connected successfully!' });
      router.push('/providers');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? 'Failed to exchange authorization code';
      toast({
        title: 'Connection failed',
        description: message,
        variant: 'destructive',
      });
      router.push('/providers');
    },
  });

  useEffect(() => {
    if (!code) {
      toast({
        title: 'Invalid callback parameters',
        description: 'Missing code parameter from GitHub redirect.',
        variant: 'destructive',
      });
      router.push('/providers');
      return;
    }

    if (!triggered.current) {
      triggered.current = true;
      mutation.mutate(code);
    }
  }, [code, router, toast, mutation]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Connecting GitHub</CardTitle>
          <CardDescription>
            Completing secure authentication handshake with GitHub...
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

export default function GitHubCallbackPage() {
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
