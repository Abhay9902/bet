---
paths:
  - 'backend/src/games/**'
  - 'backend/src/fairness/**'
  - 'packages/shared/src/**'
---

# Game logic and fairness rules

Read DESIGN.md §4–5 before changing game math or round flow.

- Outcomes derive only from the fairness module: committed server seed + client seed + nonce
  (single-player) or the hash chain (Aviator). Use `node:crypto` HMAC-SHA256. Never `Math.random()`.
- Derivation math lives in `packages/shared` as pure functions so the browser verifier runs the
  same code. Changing derivation is a breaking change: add a new algorithm version, never alter an
  existing one.
- Never reveal a server seed / chain hash before its round or seed pair is finished.
- House edge, limits, and timings come from versioned game config. Record the config version on
  every bet. Never hard-code payout constants.
- Server time decides timing (Aviator cash-out = multiplier at server receipt). Ignore client
  timestamps and client-computed multipliers.
- Game state transitions are explicit state machines; reject actions invalid for the current state
  (e.g. bet during FLYING, cash-out after CRASHED, move on someone else's turn).
- Coins move only via wallet service calls with idempotency keys derived from the bet id.
- If a round can't complete (crash, lost lock, Redis loss), cancel it and refund every open bet.
- Don't invent game rules or payout tables — if a rule isn't in DESIGN.md or the code, ask the user.
