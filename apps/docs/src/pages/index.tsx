import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  link: string;
}

function FeatureCard({ title, description, icon, link }: FeatureCardProps) {
  return (
    <Link to={link} className="homepage-card-link">
      <div className="homepage-card">
        <div className="homepage-card-icon">{icon}</div>
        <h3 className="homepage-card-title">{title}</h3>
        <p className="homepage-card-description">{description}</p>
        <span className="homepage-card-action">Read Guide &rarr;</span>
      </div>
    </Link>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();

  const coreFeatures: FeatureCardProps[] = [
    {
      title: 'Architecture & Stack',
      description: 'Understand the underlying architecture, Turborepo setup, NestJS modules, and data flow.',
      icon: '🏗️',
      link: '/docs/architecture',
    },
    {
      title: 'Installation & VPS',
      description: 'Step-by-step guide to deploying the platform, configuring docker-compose, and reverse proxy settings.',
      icon: '🚀',
      link: '/docs/deployment/installation',
    },
    {
      title: 'Provider Integrations',
      description: 'Configure and link GitHub for repository sync and Coolify for deployment controls.',
      icon: '🔌',
      link: '/docs/providers/overview',
    },
    {
      title: 'Database Schema',
      description: 'Explore the complete Prisma schema including models for Users, Deployments, and Monitoring.',
      icon: '🗄️',
      link: '/docs/database-schema',
    },
    {
      title: 'Queue & Background Jobs',
      description: 'Understand BullMQ processor jobs for sync tasks and deployments status polling.',
      icon: '🔄',
      link: '/docs/queue-jobs',
    },
    {
      title: 'Roadmap & Checklist',
      description: 'Track the completed features and upcoming roadmap for versions v0.2, v0.3, and v1.0.',
      icon: '🗺️',
      link: '/docs/roadmap',
    },
  ];

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      <div className="homepage-hero">
        <div className="homepage-hero-glow"></div>
        <div className="container homepage-hero-container">
          <div className="homepage-badge">Documentation</div>
          <h1 className="homepage-title">{siteConfig.title}</h1>
          <p className="homepage-tagline">{siteConfig.tagline}</p>
          <div className="homepage-actions">
            <Link className="homepage-btn homepage-btn-primary" to="/docs">
              Get Started
            </Link>
            <a 
              className="homepage-btn homepage-btn-secondary" 
              href="https://github.com/hallolabs/hallo-projects"
              target="_blank" 
              rel="noopener noreferrer"
            >
              GitHub Repo
            </a>
          </div>
        </div>
      </div>

      <main className="homepage-main">
        <div className="container">
          <div className="homepage-section-header">
            <h2>Explore the Guides</h2>
            <p>Select a section below to learn more about the structure, modules, and deployment of HALLO Projects.</p>
          </div>
          <div className="homepage-grid">
            {coreFeatures.map((feat, idx) => (
              <FeatureCard key={idx} {...feat} />
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
