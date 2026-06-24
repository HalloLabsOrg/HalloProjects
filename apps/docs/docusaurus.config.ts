import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'HALLO Projects',
  tagline: 'One Dashboard for Every Project',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.halloprojects.io',
  baseUrl: '/',

  organizationName: 'hallolabs',
  projectName: 'hallo-projects',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/hallolabs/hallo-projects/tree/main/apps/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/hallo-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'HALLO Projects',
      logo: {
        alt: 'HALLO Projects Logo',
        src: 'img/logo-light.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/hallolabs/hallo-projects',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Get Started',
          items: [
            { label: 'Overview', to: '/docs' },
            { label: 'Installation', to: '/docs/deployment/installation' },
            { label: 'Architecture', to: '/docs/architecture' },
          ],
        },
        {
          title: 'Integrations',
          items: [
            { label: 'GitHub Provider', to: '/docs/providers/github' },
            { label: 'Coolify Provider', to: '/docs/providers/coolify' },
            { label: 'Template Engine', to: '/docs/template-engine' },
          ],
        },
        {
          title: 'Develop',
          items: [
            { label: 'Contributing', to: '/docs/contributing' },
            { label: 'Roadmap', to: '/docs/roadmap' },
            {
              label: 'GitHub',
              href: 'https://github.com/hallolabs/hallo-projects',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} HALLO Labs. Open Source, Self-Hosted.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json', 'yaml', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
