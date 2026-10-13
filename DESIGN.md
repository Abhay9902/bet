# Design — "bet" Gaming Platform

High-level design for humans: new developers, stakeholders, architecture reviews. Claude loads it
on demand via the `/design` skill. Update it when the architecture changes.

> **Status:** proposed, 2026-10-13. Sections marked **(open)** need a decision before that part is
> built. Product decisions live in `PRODUCT_SPEC.md`; scope lives in `REQUIREMENTS.md`.

## 1. System overview

```
                ┌──────────────────────────────┐
  Mobile/desktop│  frontend/  (Next.js 16)      │  SSR pages, lobby, game UIs, /admin
  browser  ────►│  React 19 · Tailwind 4        │
                └──────┬───────────────┬────────┘
                  HTTPS│ REST          │ WSS (Socket.IO)
                ┌──────▼───────────────▼────────┐
                │  backend/  (NestJS 12)         │  auth · wallet/ledger · games · admin
                │  stateless API + WS gateways   │  N instances behind a load balancer
                └──────┬───────────────┬────────┘
                       │               │
              ┌────────▼──────┐  ┌─────▼──────────────────────────┐
              │ PostgreSQL 17 │  │ Redis 8                         │
              │ source of     │  │ live round state, pub/sub for   │
              │ truth (Prisma)│  │ WS fan-out, rate limits, locks  │
              └───────────────┘  └────────────────────────────────┘
```

- **The server is authoritative for everything.** The client renders state and sends intents
  ("bet 100 on the next round", "cash out"). It never decides outcomes, multipliers, or balances.
- **PostgreSQL is the only source of truth for coins.** Redis holds ephemeral state that can be
  rebuilt; losing Redis may cancel an in-flight round (bets refunded) but never loses coins.
- `packages/shared` holds types and pure game math used by both sides (e.g. the fairness verifier,
  so players can verify outcomes in the browser with the same code the server uses).

## 2. Backend modules

| Module                             | Responsibility                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `auth`                             | Email/password, Google OIDC, guest accounts, sessions, email verification, password reset  |
| `users`                            | Profile, preferences, account status (active/suspended)                                    |
| `wallet`                           | Double-entry ledger, balances, coin faucets (signup bonus, refill, referral, admin grants) |
| `fairness`                         | Seed generation/commitment/reveal, hash chains, outcome derivation                         |
| `games/aviator`                    | Round loop, bets, cash-outs, WS gateway                                                    |
| `games/dice`, `games/chicken-road` | Single-player, request/response games                                                      |
| `games/ludo`                       | Matchmaking, rooms, turn engine, bots, WS gateway                                          |
| `admin`                            | User management, game config, reports, support tools; RBAC                                 |
| `audit`                            | Append-only audit log for admin and security events                                        |

Each game module talks to the wallet only through the wallet service's public API (`placeBet`,
`settleBet`, `refundBet`); no game writes ledger rows directly.

## 3. Wallet and ledger

Free-to-play coins still get production-grade accounting: it prevents duplication exploits, makes
support questions answerable, and is the foundation if real money is ever approved.

**Double-entry.** Every coin movement is one `ledger_transaction` with ≥2 `ledger_entries` whose
amounts sum to zero. Accounts:

- one `USER_WALLET` per user,
- system accounts: `HOUSE` (bets in, payouts out), `FAUCET` (signup bonus, refills, referral
  rewards), `ADMIN_ADJUSTMENT`, and `ESCROW` (Ludo stakes held during a match).

Example — a 100-coin Aviator bet cashed out at 2.5×:

| Transaction  | Debit       | Credit      | Amount |
| ------------ | ----------- | ----------- | ------ |
| `BET_PLACED` | user wallet | HOUSE       | 10 000 |
| `BET_WON`    | HOUSE       | user wallet | 25 000 |

**Amounts** are `BIGINT` integers in minor units (1 coin = 100 units). Never floats. Payouts are
rounded down to the unit.

**Invariants** (enforced in code _and_ by the database where possible):

1. Entries are append-only — no `UPDATE`/`DELETE` (DB trigger rejects them). Corrections are new
   reversing transactions.
2. Every transaction balances to zero (checked in the service and by a deferred constraint/trigger).
3. A user wallet balance never goes negative (`CHECK (balance >= 0)` on the cached balance).
4. Every money-moving request carries an **idempotency key**, unique per transaction type.
   Replays return the original result instead of moving coins twice.
5. Balance updates and entry inserts happen in the same DB transaction, with the wallet row locked
   (`SELECT … FOR UPDATE`) to serialise concurrent bets.

The cached `wallet.balance` column exists for fast reads; a nightly job re-derives balances from
entries and alerts on any mismatch.

**Coin sources (faucets)** — all amounts and cooldowns are admin-configurable:

| Source          | Rule                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------- |
| Signup bonus    | Once per verified account (guests get a smaller bonus; the remainder on upgrade)              |
| Periodic refill | Claimable when the cooldown has elapsed (e.g. daily) and/or when balance is below a threshold |
| Referral        | Credited only after the referred user reaches an activity threshold (deters fake accounts)    |
| Admin grant     | Requires a reason; written to the audit log                                                   |

## 4. Provably fair outcomes

Players can verify that the server committed to an outcome before they bet and did not change it.
All derivation code lives in `packages/shared` so the browser verifier and the server run
identical math.

**Single-player games (Dice, Chicken Road)** — per-user seed pair:

1. Server generates `serverSeed` (32 random bytes) and shows `SHA-256(serverSeed)` up front.
2. Player sets `clientSeed` (random default, editable).
3. Each bet uses `nonce` (incrementing). Outcome bytes = `HMAC-SHA256(serverSeed, clientSeed:nonce)`.
4. When the player rotates seeds, the old `serverSeed` is revealed so past bets can be verified.

**Shared-round games (Aviator)** — hash chain:

1. Generate a chain of N hashes offline: `h[N]` random, `h[i] = SHA-256(h[i+1])`. Publish `h[0]`.
2. Round _k_ uses `h[k]`; anyone can check `SHA-256(h[k]) == h[k-1]`.
3. Crash point from the first 52 bits of `HMAC-SHA256(h[k], salt)`, with house edge _e_:
   `crash = max(1.00, floor(100 · (1 − e) · 2^52 / (2^52 − r)) / 100)`.
   **(open)** whether `salt` is a public future value (e.g. a block hash) committed in advance.

**Ludo** — dice rolls per room from a room seed committed at match start, revealed at the end.

**House edge / RTP** is set per game in admin config. Config is versioned; a change applies only to
rounds/bets created after it, and every bet records the config version it ran under.

## 5. Games

### Aviator (first game)

A single **round loop** runs per environment. One backend instance holds a Redis lock and drives
the loop; if it dies another takes over and the in-flight round is cancelled and refunded.

```
BETTING (≈5 s) ──► FLYING (multiplier m(t) = e^(k·t)) ──► CRASHED (≈3 s) ──► BETTING …
```

- Bets are accepted only in `BETTING`; each is a `placeBet` ledger call with an idempotency key.
- During `FLYING` the server broadcasts ticks via Socket.IO (Redis adapter for multi-instance).
  Clients animate locally between ticks.
- **Cash-out is judged on server receipt time**: the server computes m(t) when the request
  arrives; if it is below the crash point the bet settles at that multiplier. Client-reported
  multipliers are ignored.
- Auto cash-out targets are stored server-side and settled by the loop itself.
- Up to two bets per round per player (as in the reference game) **(open)**.

### Dice

Request/response. Player picks a win chance (e.g. 2%–98%) and over/under. Roll 0.00–99.99 from
outcome bytes. Payout multiplier = `(1 − e) · 100 / winChance`.

### Chicken Road

A run is a sequence of steps; each step has a hazard probability that rises by difficulty. All
hazard positions are derived from the seed when the run starts (so they are committed). Multiplier
after step _n_ = `(1 − e) / P(surviving n steps)`. The player can cash out after any step; the run
state lives in Postgres so a disconnect doesn't lose it.

### Ludo

- Modes: quick match (stake per seat), private room (invite code), bots fill seats after a timeout,
  play vs bots only.
- Stakes move to `ESCROW` at match start; the pot (minus rake, admin-configured) pays the winner(s).
  Abandoned players forfeit after a reconnection grace period; bots take over their turns.
- Turn engine is server-side; clients send only "roll" and "move token X". Turn timers enforced by
  the server.
- **(open)** 2-player vs 4-player, and payout split for 2nd place in 4-player games.

## 6. Accounts and sessions

- **Email + password:** argon2id hashing, email verification, password reset with single-use
  hashed tokens that expire.
- **Google sign-in:** OIDC; links to an existing account with the same verified email.
- **Guest play:** a device-bound guest account created on first visit; can play with a reduced
  bonus; upgrading to email/Google keeps coins and history. Guest creation is rate-limited per IP
  and device to stop faucet farming.
- **Sessions:** short-lived JWT access token (≈15 min) + rotating refresh token in an `httpOnly`,
  `Secure`, `SameSite` cookie. Refresh tokens are stored hashed; reuse of a rotated token revokes the
  whole session family. "Log out everywhere" revokes all.
- **WebSockets** authenticate with the access token at handshake and re-check on refresh.
- **Email provider (open)** — e.g. Resend, SES, Postmark.

## 7. Admin

- Lives in the same Next.js app under `/admin`, protected server-side by role.
- **Roles:** `SUPER_ADMIN`, `ADMIN`, `SUPPORT`, `ANALYST` with a permission matrix (e.g. support can
  view users and history, but only admins can adjust coins or change game config).
- Every admin action writes to an append-only **audit log** (who, what, before/after, reason, IP).
- Game configuration is versioned and takes effect for new rounds only.

## 8. Security and anti-cheat

- All validation server-side (DTO validation at the edge; domain checks in services).
- Rate limiting (Redis) on auth, bets, faucet claims, and WS messages.
- Idempotency keys on every coin-moving endpoint.
- Bet limits (min/max stake, max payout per bet) in game config.
- Multi-account signals (device fingerprint, IP, referral graph) flag faucet abuse for review.
- Secrets only in environment variables; `.env` never committed.
- OWASP Top 10 review on auth, wallet, and admin changes (`security-reviewer` agent).

## 9. Operations

- **Containers:** backend and frontend each get a Dockerfile; Docker Compose for local dev.
- **Hosting (open):** chosen before deployment. Requirements: managed Postgres with point-in-time
  recovery, managed Redis, sticky-free WS (Redis adapter handles fan-out), TLS.
- **Observability:** structured JSON logs (pino), health/readiness endpoints, error tracking
  (e.g. Sentry), metrics for round loop lag, bet throughput, and ledger reconciliation.
- **Backups and recovery:** daily snapshots + PITR; documented restore runbook tested before launch.
- **CI:** GitHub Actions on every push/PR — lint, typecheck, tests, build, format check, audit.

## 10. Open decisions

| #   | Decision                                | Needed before |
| --- | --------------------------------------- | ------------- |
| 1   | Aviator public salt for the hash chain  | Aviator       |
| 2   | Aviator: two bets per round?            | Aviator       |
| 3   | Ludo player counts and 2nd-place payout | Ludo          |
| 4   | Email provider                          | Auth          |
| 5   | Cloud provider                          | Deployment    |
| 6   | Brand name and visual identity          | UI prototype  |
