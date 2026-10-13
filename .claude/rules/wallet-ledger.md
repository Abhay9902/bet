---
paths:
  - 'backend/src/wallet/**'
  - 'backend/src/ledger/**'
  - 'backend/prisma/**'
---

# Wallet and ledger rules

These protect coin integrity. Read DESIGN.md §3 before changing the ledger model.

- Amounts: `bigint` minor units in TypeScript, `BIGINT` in Postgres. No floats, no `Decimal`
  rounding surprises. Multiply by multipliers in integer basis points and round **down**.
- Double-entry: every `ledger_transaction` has ≥2 entries summing to exactly zero. Build entries
  with the ledger helper; never insert entries ad hoc.
- Append-only: no `update`/`delete` on ledger tables, ever. Corrections are new reversing
  transactions referencing the original.
- Idempotency: every public wallet method takes an `idempotencyKey`. Uniqueness is enforced by a DB
  unique index on (type, idempotency_key). On conflict, return the existing transaction's result.
- Concurrency: lock the wallet row (`SELECT … FOR UPDATE`) inside the same DB transaction that
  inserts entries and updates the cached balance. Balance must never go negative (DB CHECK).
- Every transaction records: type, reference (bet/round/claim id), actor (user/system/admin id),
  and metadata needed to explain it to support.
- Faucets (signup bonus, refill, referral, admin grant) read amounts/cooldowns from config and
  enforce eligibility server-side. Admin grants require a reason and write an audit log entry.
- No endpoint lets a user move coins to another user (out of scope in v1).
