---
name: pre-commit
description: Run related tests, typecheck, and lint for changed files before committing.
disable-model-invocation: true
---

1. List changed files: `git status --porcelain` (staged + unstaged + untracked).
2. Work out which packages changed (`frontend/`, `backend/`, `packages/shared/`). If
   `packages/shared` changed, also check both dependants and run `pnpm --filter @bet/shared build`
   first.
3. For each changed package run, from the repo root:
   - `pnpm --filter <pkg> typecheck`
   - `pnpm --filter <pkg> lint`
   - Related tests: for backend/shared, `pnpm --filter <pkg> exec vitest run --changed`; if
     `backend/src/**` changed, also run `pnpm --filter backend test:e2e`.
4. If `backend/prisma/schema.prisma` changed, confirm a new migration exists under
   `backend/prisma/migrations/` and run `pnpm --filter backend db:generate`.
5. Run `pnpm format:check`.
6. Check no secrets are staged: no `.env` files, no keys/tokens in the diff.
7. Report a pass/fail table with the real output of any failure. Do NOT commit if anything fails;
   propose fixes instead. If everything passes, suggest a commit message (imperative, ≤72 chars
   subject).
