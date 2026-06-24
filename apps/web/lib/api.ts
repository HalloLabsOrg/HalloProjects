import apiClient from './api-client';

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// Auth
export const authApi = {
  me: () => apiClient.get<{ data: unknown }>('/api/auth/me').then((r) => r.data.data),
};

// Providers
export const providersApi = {
  list: () => apiClient.get<{ data: unknown[] }>('/api/providers').then((r) => r.data.data),
  create: (type: 'github', dto: unknown) =>
    apiClient.post<{ data: unknown }>(`/api/providers/${type}`, dto).then((r) => r.data.data),
  test: (id: string) =>
    apiClient.post<{ data: unknown }>(`/api/providers/${id}/test`).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/api/providers/${id}`),
};

// Repositories
export const repositoriesApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient
      .get<{ data: unknown[]; meta: unknown }>('/api/repositories', { params })
      .then((r) => r.data),
  sync: (providerId?: string) =>
    apiClient.post('/api/repositories/sync', null, { params: { providerId } }).then((r) => r.data),
  branches: (id: string) =>
    apiClient.get<{ data: unknown[] }>(`/api/repositories/${id}/branches`).then((r) => r.data.data),
};

// Projects
export const projectsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient
      .get<{ data: unknown[]; meta: unknown }>('/api/projects', { params })
      .then((r) => r.data),
  get: (id: string) =>
    apiClient.get<{ data: unknown }>(`/api/projects/${id}`).then((r) => r.data.data),
  create: (dto: { name: string; description?: string }) =>
    apiClient.post<{ data: unknown }>('/api/projects', dto).then((r) => r.data.data),
  update: (id: string, dto: unknown) =>
    apiClient.patch<{ data: unknown }>(`/api/projects/${id}`, dto).then((r) => r.data.data),
  archive: (id: string) =>
    apiClient.post<{ data: unknown }>(`/api/projects/${id}/archive`).then((r) => r.data.data),
  remove: (id: string) => apiClient.delete(`/api/projects/${id}`),
};

// Services
export const servicesApi = {
  list: (projectId: string) =>
    apiClient
      .get<{ data: unknown[] }>(`/api/projects/${projectId}/services`)
      .then((r) => r.data.data),
  create: (projectId: string, dto: unknown) =>
    apiClient
      .post<{ data: unknown }>(`/api/projects/${projectId}/services`, dto)
      .then((r) => r.data.data),
  remove: (projectId: string, id: string) =>
    apiClient.delete(`/api/projects/${projectId}/services/${id}`),
};

// Environments
export const environmentsApi = {
  list: (projectId: string) =>
    apiClient
      .get<{ data: unknown[] }>(`/api/projects/${projectId}/environments`)
      .then((r) => r.data.data),
  update: (
    projectId: string,
    id: string,
    dto: {
      name?: string;
      branch?: string | null;
      domain?: string | null;
      autoDeploy?: boolean;
      healthCheckUrl?: string | null;
    },
  ) =>
    apiClient
      .patch<{ data: unknown }>(`/api/projects/${projectId}/environments/${id}`, dto)
      .then((r) => r.data.data),
  listVariables: (projectId: string, envId: string) =>
    apiClient
      .get<{ data: unknown[] }>(`/api/projects/${projectId}/environments/${envId}/variables`)
      .then((r) => r.data.data),
  createVariable: (
    projectId: string,
    envId: string,
    dto: { key: string; value: string; isSecret?: boolean },
  ) =>
    apiClient
      .post<{ data: unknown }>(`/api/projects/${projectId}/environments/${envId}/variables`, dto)
      .then((r) => r.data.data),
  updateVariable: (
    projectId: string,
    envId: string,
    varId: string,
    dto: { value?: string; isSecret?: boolean },
  ) =>
    apiClient
      .patch<{
        data: unknown;
      }>(`/api/projects/${projectId}/environments/${envId}/variables/${varId}`, dto)
      .then((r) => r.data.data),
  removeVariable: (projectId: string, envId: string, varId: string) =>
    apiClient.delete(`/api/projects/${projectId}/environments/${envId}/variables/${varId}`),
  revealVariable: (projectId: string, envId: string, varId: string) =>
    apiClient
      .get<{
        value: string;
      }>(`/api/projects/${projectId}/environments/${envId}/variables/${varId}/reveal`)
      .then((r) => r.data),
};

// Deployments
export const deploymentsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    serviceId?: string;
    environmentId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) =>
    apiClient
      .get<{ data: unknown[]; meta: unknown }>('/api/deployments', { params })
      .then((r) => r.data),
  get: (id: string) =>
    apiClient.get<{ data: unknown }>(`/api/deployments/${id}`).then((r) => r.data.data),
  trigger: (serviceId: string, dto: unknown) =>
    apiClient
      .post<{ data: unknown }>(`/api/services/${serviceId}/deploy`, dto)
      .then((r) => r.data.data),
  cancel: (id: string) =>
    apiClient.post<{ data: unknown }>(`/api/deployments/${id}/cancel`).then((r) => r.data.data),
};

// Users
export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<{ data: unknown[]; meta: unknown }>('/api/users', { params }).then((r) => r.data),
  create: (dto: unknown) =>
    apiClient.post<{ data: unknown }>('/api/users', dto).then((r) => r.data.data),
  disable: (id: string) =>
    apiClient.patch<{ data: unknown }>(`/api/users/${id}/disable`).then((r) => r.data.data),
};

// Audit Logs
export const auditLogsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    from?: string;
    to?: string;
  }) =>
    apiClient
      .get<{ data: unknown[]; meta: unknown }>('/api/audit-logs', { params })
      .then((r) => r.data),
};

// Monitoring
export const monitoringApi = {
  getSummary: () =>
    apiClient
      .get<{ data: { id: string; name: string; services: any[] }[] }>('/api/monitoring')
      .then((r) => r.data.data),
  getServiceDetail: (serviceId: string) =>
    apiClient.get<any>(`/api/monitoring/${serviceId}`).then((r) => r.data.data),
  getServiceHistory: (serviceId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<{
        data: {
          results: any[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(`/api/monitoring/${serviceId}/history`, { params })
      .then((r) => r.data.data),
};
