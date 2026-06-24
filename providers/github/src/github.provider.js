"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubProvider = void 0;
const crypto_1 = require("crypto");
const rest_1 = require("@octokit/rest");
class GithubProvider {
    octokit;
    config;
    constructor(config) {
        this.config = config;
        this.octokit = new rest_1.Octokit({ auth: config.token });
    }
    async listRepositories() {
        const repos = [];
        let page = 1;
        while (true) {
            const { data } = await this.octokit.repos.listForAuthenticatedUser({
                per_page: 100,
                page,
                sort: 'updated',
            });
            if (data.length === 0)
                break;
            for (const repo of data) {
                repos.push(this.mapRepo(repo));
            }
            if (data.length < 100)
                break;
            page++;
        }
        return repos;
    }
    async getRepository(externalId) {
        const [owner, repo] = externalId.split('/');
        const { data } = await this.octokit.repos.get({ owner, repo });
        return this.mapRepo(data);
    }
    async getBranches(repositoryExternalId) {
        const [owner, repo] = repositoryExternalId.split('/');
        const { data: repoData } = await this.octokit.repos.get({ owner, repo });
        const defaultBranch = repoData.default_branch;
        const branches = [];
        let page = 1;
        while (true) {
            const { data } = await this.octokit.repos.listBranches({ owner, repo, per_page: 100, page });
            if (data.length === 0)
                break;
            for (const branch of data) {
                branches.push({
                    name: branch.name,
                    sha: branch.commit.sha,
                    isDefault: branch.name === defaultBranch,
                });
            }
            if (data.length < 100)
                break;
            page++;
        }
        return branches;
    }
    async getCommit(repositoryExternalId, branch) {
        const [owner, repo] = repositoryExternalId.split('/');
        const { data } = await this.octokit.repos.getCommit({ owner, repo, ref: branch });
        return {
            sha: data.sha,
            message: data.commit.message,
            authorName: data.commit.author?.name ?? 'Unknown',
            authorEmail: data.commit.author?.email ?? '',
            committedAt: new Date(data.commit.author?.date ?? Date.now()),
            url: data.html_url,
        };
    }
    async registerWebhook(repositoryExternalId, config) {
        const [owner, repo] = repositoryExternalId.split('/');
        const { data } = await this.octokit.repos.createWebhook({
            owner,
            repo,
            name: 'web',
            active: true,
            events: config.events,
            config: {
                url: config.url,
                content_type: 'json',
                secret: config.secret,
                insecure_ssl: '0',
            },
        });
        return {
            id: String(data.id),
            url: data.config.url ?? config.url,
            active: data.active,
        };
    }
    validateWebhookSignature(payload, signature) {
        if (!this.config.webhookSecret)
            return false;
        const expectedSig = `sha256=${(0, crypto_1.createHmac)('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex')}`;
        const actualBuf = Buffer.from(signature);
        const expectedBuf = Buffer.from(expectedSig);
        if (actualBuf.length !== expectedBuf.length)
            return false;
        return (0, crypto_1.timingSafeEqual)(actualBuf, expectedBuf);
    }
    mapRepo(repo) {
        return {
            externalId: repo.full_name,
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            defaultBranch: repo.default_branch,
            visibility: repo.private ? 'private' : 'public',
            description: repo.description ?? undefined,
        };
    }
}
exports.GithubProvider = GithubProvider;
//# sourceMappingURL=github.provider.js.map