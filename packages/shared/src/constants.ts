export const QUEUE_NAMES = {
  DEPLOYMENTS: 'deployments',
  REPOSITORY_SYNC: 'repository-sync',
  WEBHOOKS: 'webhooks',
  HEALTH_CHECKS: 'health-checks',
} as const;

export const JOB_NAMES = {
  DEPLOY_SERVICE: 'deploy-service',
  SYNC_REPOSITORY: 'sync-repository',
  PROCESS_GITHUB_WEBHOOK: 'process-github-webhook',
  CHECK_SERVICE_HEALTH: 'check-service-health',
} as const;

export const DEFAULT_ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
