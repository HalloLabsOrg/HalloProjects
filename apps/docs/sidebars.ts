import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: '👋 Overview',
    },
    {
      type: 'doc',
      id: 'architecture',
      label: '🏗️ Architecture',
    },
    {
      type: 'doc',
      id: 'tech-stack',
      label: '⚙️ Tech Stack',
    },
    {
      type: 'doc',
      id: 'monorepo-structure',
      label: '📁 Monorepo Structure',
    },
    {
      type: 'doc',
      id: 'database-schema',
      label: '🗄️ Database Schema',
    },
    {
      type: 'category',
      label: '📦 Module Reference',
      collapsed: false,
      items: [
        'modules/auth',
        'modules/users',
        'modules/projects',
        'modules/services',
        'modules/environments',
        'modules/deployments',
        'modules/monitoring',
        'modules/providers',
        'modules/webhooks',
        'modules/audit-logs',
        'modules/templates',
      ],
    },
    {
      type: 'category',
      label: '🔌 Providers',
      collapsed: false,
      items: ['providers/overview', 'providers/github', 'providers/coolify'],
    },
    {
      type: 'doc',
      id: 'api-contracts',
      label: '📡 API Contracts',
    },
    {
      type: 'doc',
      id: 'queue-jobs',
      label: '🔄 Queue & Jobs',
    },
    {
      type: 'doc',
      id: 'template-engine',
      label: '🧩 Template Engine',
    },
    {
      type: 'doc',
      id: 'auth-authorization',
      label: '🔐 Auth & Authorization',
    },
    {
      type: 'category',
      label: '🚀 Deployment',
      collapsed: false,
      items: [
        'deployment/installation',
        'deployment/docker-compose',
        'deployment/environment-variables',
      ],
    },
    {
      type: 'doc',
      id: 'contributing',
      label: '🤝 Contributing',
    },
    {
      type: 'doc',
      id: 'roadmap',
      label: '🗺️ Roadmap & Checklist',
    },
  ],
};

export default sidebars;
