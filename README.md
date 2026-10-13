# bet

Mobile-first web gaming platform (Aviator, Ludo, Chicken Road, Dice) using virtual coins.
Working name — branding TBD.

- What we're building and why: [PRODUCT_SPEC.md](PRODUCT_SPEC.md)
- Architecture: [DESIGN.md](DESIGN.md)
- Scope and progress: [REQUIREMENTS.md](REQUIREMENTS.md)
- Release notes: [CHANGELOG.md](CHANGELOG.md)

## Prerequisites (macOS, Windows, Linux)

- **Node.js 24 LTS** (`.nvmrc`). Use [fnm](https://github.com/Schniz/fnm) or nvm to switch versions.
- **pnpm 10**: `npm install -g pnpm@10`
- **A Docker runtime** for Postgres + Redis — any of these work with the same `docker-compose.yml`:
  - macOS: [OrbStack](https://orbstack.dev) (lightweight) or Docker Desktop
  - Windows: Docker Desktop or [Rancher Desktop](https://rancherdesktop.io) (WSL 2)
  - Linux: Docker Engine + Compose plugin

## Getting started

```sh
pnpm install
cp backend/.env.example backend/.env     # Windows (PowerShell): Copy-Item backend/.env.example backend/.env
pnpm db:up                                # Postgres :5432, Redis :6379
pnpm --filter @bet/shared build
pnpm --filter backend db:generate
pnpm dev                                  # frontend http://localhost:3000, backend http://localhost:4000
```

## Common commands

| Task                               | Command                                          |
| ---------------------------------- | ------------------------------------------------ |
| Lint / typecheck / test everything | `pnpm lint` · `pnpm typecheck` · `pnpm test`     |
| Backend e2e tests                  | `pnpm --filter backend test:e2e`                 |
| New DB migration                   | `pnpm --filter backend db:migrate --name <name>` |
| Browse the DB                      | `pnpm --filter backend db:studio`                |
| Format                             | `pnpm format`                                    |

## Repo layout

```
frontend/         Next.js 16 app (player UI + /admin)
backend/          NestJS 12 API + WebSocket gateways, Prisma schema
packages/shared/  Types and game/fairness math shared by both
.claude/          Claude Code rules, skills, agents, hooks
```

## Working with Claude Code

This repo follows the team's Claude Code standard. `CLAUDE.md` loads automatically; layer rules in
`.claude/rules/` load when matching files are touched. Useful commands:

| Command                    | When                                                 |
| -------------------------- | ---------------------------------------------------- |
| `/pre-commit`              | Before every commit — typecheck, lint, related tests |
| `/generate-tests`          | After writing new code                               |
| `/changelog`               | Before a release — appends to CHANGELOG.md           |
| `/spec-check`              | Compare what's built against the spec                |
| `/design`, `/product-spec` | Load the full design or original brief into context  |

Review agents: ask Claude to "use the code-reviewer / security-reviewer / game-integrity-reviewer
agent" on your changes.
