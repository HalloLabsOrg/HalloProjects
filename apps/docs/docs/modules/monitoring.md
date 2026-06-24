---
id: monitoring
title: Monitoring Module
---

# Monitoring Module

HTTP health check otomatis untuk semua services. Berjalan sebagai recurring job di worker, bukan triggered oleh user.

## Endpoints

| Method | Path                             | Description                      |
| ------ | -------------------------------- | -------------------------------- |
| `GET`  | `/monitoring`                    | Overview status semua services   |
| `GET`  | `/monitoring/:serviceId`         | Status + uptime 24h satu service |
| `GET`  | `/monitoring/:serviceId/history` | Riwayat check (pagination)       |

## Status

| Status    | Kondisi                                           |
| --------- | ------------------------------------------------- |
| `ONLINE`  | Response time < 1000ms, status code 2xx/3xx       |
| `SLOW`    | Response time ≥ 1000ms                            |
| `OFFLINE` | Timeout, connection error, atau status code ≥ 500 |
| `UNKNOWN` | Belum pernah di-check                             |

## Check Logic

```typescript
// Interval: setiap 60 detik (HEALTH_CHECK_INTERVAL env)
// Timeout: 10 detik per request (HEALTH_CHECK_TIMEOUT env)
// Concurrency: 20 checks parallel

async function checkHealth(url: string): Promise<MonitoringResult> {
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const responseTime = Date.now() - start;

    if (response.status >= 500) return { status: 'OFFLINE', responseTime };
    if (responseTime >= 1000) return { status: 'SLOW', responseTime };
    return { status: 'ONLINE', responseTime };
  } catch {
    return { status: 'OFFLINE', responseTime: Date.now() - start };
  }
}
```

## Configuration per Environment

Health check URL dikonfigurasi di Environment settings. Jika tidak diisi, worker menggunakan domain root.

```
Environment: production
  domain: app.example.com
  healthCheckUrl: https://app.example.com/api/health  ← digunakan untuk check
```

## Data Retention

Monitoring results disimpan dengan index `(serviceId, checkedAt)` untuk query efisien. Cleanup job menghapus data lebih dari 30 hari.
