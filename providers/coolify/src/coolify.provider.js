"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoolifyProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const COOLIFY_STATUS_MAP = {
    running: 'SUCCESS',
    stopped: 'FAILED',
    exited: 'FAILED',
    restarting: 'DEPLOYING',
    starting: 'BUILDING',
    removing: 'CANCELLED',
};
class CoolifyProvider {
    client;
    constructor(config) {
        this.client = axios_1.default.create({
            baseURL: config.apiUrl.replace(/\/$/, ''),
            headers: {
                Authorization: `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json',
            },
            timeout: 30_000,
        });
    }
    async listApplications() {
        const { data } = await this.client.get('/api/v1/applications');
        return data.map(this.mapApplication);
    }
    async deploy(config) {
        const payload = {
            uuid: config.applicationUuid,
            force: config.force ?? false,
        };
        if (config.commitSha) {
            payload.commit_sha = config.commitSha;
        }
        const { data } = await this.client.post(`/api/v1/deploy?uuid=${config.applicationUuid}&force=${config.force ?? false}`);
        return { externalId: data.deployment_uuid };
    }
    async getStatus(externalId) {
        const { data } = await this.client.get(`/api/v1/deployments/${externalId}`);
        return this.mapStatus(data.status);
    }
    async getLogs(externalId) {
        const { data } = await this.client.get(`/api/v1/deployments/${externalId}/logs`);
        return data.logs ?? '';
    }
    async rollback(externalId) {
        await this.client.post(`/api/v1/deployments/${externalId}/restart`);
    }
    mapStatus(coolifyStatus) {
        return COOLIFY_STATUS_MAP[coolifyStatus?.toLowerCase()] ?? 'PENDING';
    }
    mapApplication(app) {
        return {
            uuid: app.uuid,
            name: app.name,
            fqdn: app.fqdn ?? undefined,
            status: app.status,
        };
    }
}
exports.CoolifyProvider = CoolifyProvider;
//# sourceMappingURL=coolify.provider.js.map