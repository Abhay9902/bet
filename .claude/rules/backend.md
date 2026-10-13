---
paths:
  - 'backend/**'
---

# Backend conventions (NestJS 12, ESM)

- One Nest module per domain (`auth`, `wallet`, `games/aviator`, …). A module exposes a service API;
  other modules import the module, never reach into its repositories or Prisma models directly.
- Controllers/gateways are thin: validate input, call one service method, map the result. No
  business logic or Prisma calls in controllers.
- Validate every DTO (class-validator or zod — use whichever the module already uses). Reject
  unknown fields. Coin amounts arrive as integer strings and are parsed to `bigint`.
- Relative imports end in `.js` (`nodenext`). Import Prisma types from `../generated/prisma/…`.
- Use Prisma interactive transactions (`$transaction(async (tx) => …)`) for any multi-row write.
  Pass `tx` down explicitly; don't mix `tx` and the global client in one operation.
- Use raw SQL (`$queryRaw` tagged templates only, never `$queryRawUnsafe` with user input) when you
  need `SELECT … FOR UPDATE` or other locking.
- Errors: throw Nest HTTP exceptions at the edge; domain services throw typed domain errors that
  are mapped by an exception filter. Never leak stack traces or SQL to clients.
- Config comes from env via a typed config service; fail fast at boot on missing vars. Add every
  new variable to `backend/.env.example`.
- Log with structured fields (user id, round id, idempotency key); never log passwords, tokens,
  seeds that are not yet revealed, or full request bodies on auth routes.
- WebSocket gateways: authenticate at handshake, validate every inbound message payload, and rate
  limit per socket. Emit to rooms, not to individual socket ids held in memory.
- Prisma schema changes: create a migration with `pnpm --filter backend db:migrate --name <name>`.
  Never edit a migration that has been committed; add a new one.
