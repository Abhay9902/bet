---
paths:
  - '**/*.spec.ts'
  - '**/*.test.ts'
  - '**/*.spec.tsx'
  - '**/*.test.tsx'
  - '**/test/**'
  - '**/tests/**'
  - '**/e2e/**'
---

# Test conventions (Vitest)

- Unit tests sit next to the code: `foo.service.ts` → `foo.service.spec.ts`. Backend e2e tests live
  in `backend/test/*.e2e-spec.ts` and run with `pnpm --filter backend test:e2e`.
- Test behaviour through public APIs, not private helpers. One behaviour per `it`, named as a
  sentence: `it('refunds all bets when a round is cancelled')`.
- Money/ledger code must test: zero-sum entries, idempotent replay (same key → same result, one
  ledger transaction), insufficient balance, and concurrent requests on one wallet.
- Fairness code must test against fixed known vectors (seed + nonce → expected outcome) so any
  change to the derivation is caught. Also test that the browser verifier in `@bet/shared` matches
  the server.
- Game loops: use fake timers; never `sleep` in tests.
- Tests that need Postgres/Redis use the Docker Compose services and a separate database; each test
  cleans up what it creates. Unit tests must not need Docker.
- No snapshot tests for logic. Don't assert on log output.
- Never weaken or delete a failing test to make a change pass — fix the code or ask.
