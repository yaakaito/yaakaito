# yaakaito

Personal monorepo for yaakaito (UKYO Kazuma) containing a technical blog, notes, MCP server, and related articles recommendation service. Deployed on Cloudflare Workers.

- Astro-based blog with blog posts and notes (in Japanese)
- MCP (Model Context Protocol) server for AI integrations
- Related articles recommendation using OpenAI embeddings
- GitHub Actions automation with Claude Code integration

## Architecture Overview

- `web/`: Astro static site deployed to Cloudflare Workers Static Assets
- `mcp-server/`: MCP server using Cloudflare Workers, Durable Objects, and Vectorize
- `related-articles-worker/`: Related articles API using OpenAI for embeddings
- Deploy pipeline: Push to main triggers build and deploy via GitHub Actions

## Directory Structure

```
/
├── web/                          # Astro blog site
│   ├── src/
│   │   ├── pages/
│   │   │   ├── blog/             # Blog posts (Markdown)
│   │   │   └── note/             # Notes (Markdown)
│   │   ├── components/           # Astro components
│   │   ├── layouts/              # Page layouts
│   │   └── utils/                # Utility functions
│   └── scripts/                  # Build scripts
├── mcp-server/                   # MCP server (Cloudflare Workers)
│   └── src/
├── related-articles-worker/      # Related articles API (Cloudflare Workers)
│   ├── src/
│   └── test/
├── icon/                         # Icon assets
├── .claude/                      # Claude Code configuration
│   ├── commands/                 # Custom commands
│   └── skills/                   # Custom skills
└── .github/
    └── workflows/                # GitHub Actions workflows
```

## Core Principles

- Correspond to the current codebase, data, and terminology over theory or general practices; always review thoroughly
- Avoid adding new dependencies unless necessary; remove when possible
- Follow clean code principles (simplicity, clarity, descriptive names, remove unused code)
- Follow Conventional Commits for commit messages unless otherwise instructed
- Each component (web, mcp-server, related-articles-worker) is independently deployable

## Commands

### web/
- `bun install` - Install dependencies
- `bun run dev` - Start development server
- `bun run build` - Production build
- `bun run deploy` - Deploy to Cloudflare Workers

### mcp-server/
- `bun install` - Install dependencies
- `bun run dev` - Start development server
- `bun run deploy` - Deploy to Cloudflare Workers
- `bun run lint:fix` - Run Biome linter

### related-articles-worker/
- `bun install` - Install dependencies
- `bun run dev` - Start development server
- `bun run test` - Run tests (Vitest)
- `bun run deploy` - Deploy to Cloudflare Workers

## Testing

- Prefer integration tests over unit tests; write unit tests to cover edge cases
- Do not use mocks by default; use them only for external communication or resource fetching
- Test names should follow the user's language
- New features require corresponding tests
- `related-articles-worker/` uses Vitest with `@cloudflare/vitest-pool-workers`

## Language Policy

- Follow the user's language by default (comments, commits, tests)
- The following files must always be written in English:
  - CLAUDE.md, AGENTS.md
  - Files under .claude/
  - Files under docs/agents/
- Blog posts and notes are written in Japanese
