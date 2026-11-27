// Local, developer-only docs site. Run with `npm run docs:dev`.
// The markdown stays where it lives in the repo. This config only decides which files become pages,
// what URL each gets, and how relative links between them resolve. See docs/maintaining-docs.md.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const GITHUB = 'https://github.com/VineMe-App/vineme2.0'
const GITHUB_BRANCH = 'dev'

// Markdown outside docs/ that's worth reading on the site. Everything else links to GitHub.
const EXTRA_PAGES = [
  /^README\.md$/,
  /^CONTRIBUTING\.md$/,
  /^supabase\/README\.md$/,
  /^apps\/web\/README\.md$/,
  /^apps\/web\/docs\/.+\.md$/,
  /^apps\/web\/app\/dashboard\/DESIGN\.md$/,
  /^apps\/mobile\/src\/theme\/[^/]+\.md$/,
  /^apps\/mobile\/src\/components\/(ui|referrals)\/README\.md$/,
]

const isPage = (rel: string) => (rel.startsWith('docs/') && !rel.startsWith('docs/_templates/')) || EXTRA_PAGES.some((re) => re.test(rel))

// Repo-relative source path -> site path (with .md).
function rewrite(rel: string): string {
  let out: string
  if (rel.startsWith('docs/')) out = rel.slice('docs/'.length)
  else if (rel.startsWith('apps/web/docs/dashboard/')) out = 'dashboard/' + rel.slice('apps/web/docs/dashboard/'.length)
  else out = 'repo/' + rel
  return out.replace(/(^|\/)README\.md$/, '$1index.md')
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (entry.name.endsWith('.md')) acc.push(path.relative(REPO_ROOT, full).split(path.sep).join('/'))
  }
  return acc
}

const allMarkdown = walk(REPO_ROOT)
const pages = new Set(allMarkdown.filter(isPage))
const srcExclude = allMarkdown.filter((f) => !pages.has(f))

// Turn a link written relative to its source file into a site URL, or a GitHub URL for code.
function resolveHref(href: string, sourceFile: string): string | null {
  if (/^([a-z]+:|#|\/)/i.test(href)) return null
  const [target, hash = ''] = href.split('#')
  if (!target) return null
  const abs = path.resolve(path.dirname(sourceFile), decodeURI(target))
  const rel = path.relative(REPO_ROOT, abs).split(path.sep).join('/')
  if (rel.startsWith('..')) return null
  const anchor = hash ? '#' + hash : ''

  const asPage = (p: string) => '/' + rewrite(p).replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  if (pages.has(rel)) return asPage(rel) + anchor
  if (pages.has(rel + '/README.md')) return asPage(rel + '/README.md') + anchor

  const isDir = fs.existsSync(abs) && fs.statSync(abs).isDirectory()
  return `${GITHUB}/${isDir ? 'tree' : 'blob'}/${GITHUB_BRANCH}/${rel}${anchor}`
}

const sidebar = [
  {
    text: 'Start here',
    items: [
      { text: 'Overview', link: '/' },
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Glossary', link: '/glossary' },
      { text: 'Business rules', link: '/business-rules' },
      { text: 'Maintaining the docs', link: '/maintaining-docs' },
      { text: 'Getting started (repo README)', link: '/repo/' },
      { text: 'Contributing', link: '/repo/CONTRIBUTING' },
    ],
  },
  {
    text: 'Architecture',
    items: [
      { text: 'System overview', link: '/architecture/' },
      { text: 'Backend (Supabase)', link: '/architecture/backend' },
      { text: 'Integrations', link: '/architecture/integrations' },
      { text: 'Mobile app', link: '/architecture/mobile' },
      { text: 'Web & dashboard', link: '/architecture/web' },
    ],
  },
  {
    text: 'Decisions (ADRs)',
    collapsed: true,
    items: [
      { text: 'Index & process', link: '/decisions/' },
      { text: '0001 Record decisions', link: '/decisions/0001-record-architecture-decisions' },
      { text: '0002 npm workspaces', link: '/decisions/0002-monorepo-with-npm-workspaces' },
      { text: '0003 Phone-first auth', link: '/decisions/0003-phone-first-authentication' },
      { text: '0004 RLS & views', link: '/decisions/0004-rls-and-security-invoker-views' },
      { text: '0005 Vulnerable flag', link: '/decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag' },
      { text: '0006 Contact sharing', link: '/decisions/0006-join-requests-share-contact-details-by-notice' },
      { text: '0007 Own database', link: '/decisions/0007-keep-own-database' },
      { text: '0008 ChurchSuite contacts only', link: '/decisions/0008-churchsuite-contacts-only' },
      { text: '0009 Website embed', link: '/decisions/0009-church-website-embed-for-group-discovery' },
      { text: '0010 Group members vs users', link: '/decisions/0010-separate-group-members-from-user-accounts' },
    ],
  },
  {
    text: 'Features',
    collapsed: true,
    items: [
      { text: 'Index', link: '/features/' },
      { text: 'Group leader journey', link: '/features/group-leader-journey/' },
      { text: 'Groups & join requests', link: '/features/groups-and-join-requests/' },
      { text: 'ChurchSuite', link: '/features/churchsuite/' },
      { text: 'Church website embed', link: '/features/church-website-embed/' },
      { text: 'Events (phase 2)', link: '/features/events/' },
      {
        text: 'Referrals',
        collapsed: true,
        items: [
          { text: 'Overview', link: '/features/referrals/' },
          { text: 'User guide', link: '/features/referrals/user-guide' },
          { text: 'API', link: '/features/referrals/api' },
          { text: 'Database', link: '/features/referrals/database' },
        ],
      },
    ],
  },
  {
    text: 'Product',
    collapsed: true,
    items: [
      { text: 'Roadmap', link: '/product/roadmap' },
      { text: 'VineMe vs Jovo', link: '/product/vineme-vs-jovo' },
    ],
  },
  {
    text: 'Security & privacy',
    collapsed: true,
    items: [
      { text: 'Overview', link: '/security/' },
      { text: 'Data protection', link: '/security/data-protection' },
      { text: 'Safeguarding', link: '/security/safeguarding' },
      { text: 'Access & secrets', link: '/security/access-and-secrets' },
    ],
  },
  {
    text: 'Clergy Dashboard',
    collapsed: true,
    items: [
      { text: 'Plan', link: '/dashboard/' },
      { text: 'Glossary', link: '/dashboard/glossary' },
      { text: 'Audit', link: '/dashboard/audit' },
      { text: 'Issues', link: '/dashboard/issues' },
      { text: 'DEC-1 Definitions', link: '/dashboard/decisions/dec-1-definitions' },
      { text: 'DEC-2 Follow-up rules', link: '/dashboard/decisions/dec-2-follow-up-rules' },
      { text: 'DEC-3 Insights measures', link: '/dashboard/decisions/dec-3-insights-measures' },
      { text: 'DEC-4 Product choices', link: '/dashboard/decisions/dec-4-product-choices' },
      { text: 'Design system', link: '/repo/apps/web/app/dashboard/DESIGN' },
    ],
  },
  {
    text: 'Guides',
    collapsed: true,
    items: [
      { text: 'Index', link: '/guides/' },
      { text: 'Team workflow', link: '/guides/team-workflow' },
      { text: 'Deployment & releases', link: '/guides/deployment' },
      { text: 'Environment setup', link: '/guides/environment-setup' },
      { text: 'Database migrations', link: '/guides/database-migrations' },
      { text: 'Edge Functions', link: '/guides/edge-functions' },
      { text: 'Testing', link: '/guides/testing/' },
      { text: 'Cross-platform testing', link: '/guides/testing/cross-platform' },
      { text: 'Admin features testing', link: '/guides/testing/admin-features' },
      { text: 'Universal / App Links', link: '/guides/universal-links' },
      { text: 'Email verification hosting', link: '/guides/email-verification-hosting' },
      { text: 'Font setup', link: '/guides/font-setup' },
      { text: 'Runbook: SendGrid click tracking', link: '/guides/runbooks/sendgrid-click-tracking' },
    ],
  },
  {
    text: 'Code-level READMEs',
    collapsed: true,
    items: [
      { text: 'Supabase', link: '/repo/supabase/' },
      { text: 'Web app', link: '/repo/apps/web/' },
      { text: 'Mobile theme', link: '/repo/apps/mobile/src/theme/' },
      { text: 'Theme quick reference', link: '/repo/apps/mobile/src/theme/QUICK_REFERENCE' },
      { text: 'Theme migration guide', link: '/repo/apps/mobile/src/theme/MIGRATION_GUIDE' },
      { text: 'Mobile UI components', link: '/repo/apps/mobile/src/components/ui/' },
      { text: 'Referral components', link: '/repo/apps/mobile/src/components/referrals/' },
    ],
  },
  { text: 'Archive (not maintained)', link: '/archive/' },
]

export default defineConfig({
    title: 'VineMe Dev Docs',
    description: 'Internal developer documentation for the VineMe monorepo',
    srcDir: '..',
    srcExclude: [...srcExclude, 'docs/.vitepress/**'],
    rewrites: (id) => rewrite(id),
    cleanUrls: true,
    ignoreDeadLinks: 'localhostLinks',
    lastUpdated: true,
    head: [['link', { rel: 'icon', type: 'image/png', href: '/vineme-logo-email.png' }]],
    themeConfig: {
      logo: { src: '/vineme-logo-email.png', alt: 'VineMe' },
      siteTitle: 'VineMe Dev Docs',
      nav: [
        { text: 'Architecture', link: '/architecture/' },
        { text: 'Decisions', link: '/decisions/' },
        { text: 'Dashboard', link: '/dashboard/' },
        { text: 'Guides', link: '/guides/' },
      ],
      sidebar,
      search: { provider: 'local' },
      outline: { level: [2, 3] },
      socialLinks: [{ icon: 'github', link: GITHUB }],
      editLink: { pattern: ({ filePath }) => `https://github.com/VineMe-App/vineme2.0/edit/dev/${filePath}` /* serialised to the browser: no closures */, text: 'Edit on GitHub' },
    },
    markdown: {
      // Treat raw <tags> in prose as text: many docs use <placeholder> wording, and Vue would parse it as HTML.
      html: false,
      languageAlias: { env: 'dotenv' },
      config(md) {
        // ```mermaid blocks -> <MermaidDiagram>, rendered client-side in the brand theme (theme/mermaid-theme.ts).
        const fence = md.renderer.rules.fence!
        md.renderer.rules.fence = (tokens, idx, options, env, self) => {
          const token = tokens[idx]
          if (token.info.trim() === 'mermaid') {
            return `<MermaidDiagram code="${encodeURIComponent(token.content)}" />`
          }
          return fence(tokens, idx, options, env, self)
        }

        md.core.ruler.after('inline', 'vineme-repo-links', (state) => {
          const source: string = (state.env as any).realPath ?? (state.env as any).path
          if (!source) return
          for (const block of state.tokens) {
            for (const tok of block.children ?? []) {
              if (tok.type !== 'link_open') continue
              const href = tok.attrGet('href')
              const resolved = href && resolveHref(href, source)
              if (resolved) tok.attrSet('href', resolved)
            }
          }
        })
      },
    },
    vite: {
      // srcDir is the repo root, so Vite would default to the repo's root public/ folder. Keep docs assets in docs/public.
      publicDir: path.join(REPO_ROOT, 'docs/public'),
      // Pre-bundle Mermaid (and its CommonJS deps such as fastdom) so the browser can import it in dev.
      optimizeDeps: { include: ['mermaid', '@mermaid-js/layout-elk'] },
    },
  })
