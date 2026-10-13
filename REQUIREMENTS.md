# Requirements

## Implemented

- [x] Monorepo scaffold: Next.js frontend, NestJS backend, shared package, Postgres + Redis via Docker Compose

## Planned

### Phase 1 — UI/UX prototype + core website

- [ ] Dark-blue design system, mobile-first layout, bottom navigation, game cards lobby
- [ ] Email + password registration/login, email verification, password reset
- [ ] Google sign-in
- [ ] Guest play, upgradeable to a full account (keeps coins and history)
- [ ] Session security: short-lived access token + rotating refresh token, logout everywhere
- [ ] Profile page and game history
- [ ] Virtual-coin wallet on a double-entry ledger; idempotent coin movements
- [ ] Signup bonus and periodic free refill

### Phase 2 — First game: Aviator

- [ ] Provably fair crash rounds (hash chain), configurable house edge
- [ ] Real-time rounds over WebSockets: bet, live multiplier, manual + auto cash-out
- [ ] Round history and fairness verification page

### Phase 3 — Remaining games

- [ ] Dice (provably fair, adjustable win chance)
- [ ] Chicken Road (progressive steps, cash out any time)
- [ ] Ludo: quick match, private rooms, bots fill seats, play vs bots

### Phase 4 — Admin dashboard

- [ ] User management (search, view, suspend, coin adjustments with reason)
- [ ] Game configuration (house edge, limits, timings), versioned
- [ ] Monitoring and reporting (active users, coin flow, game stats)
- [ ] Support tools, role-based permissions, append-only audit log
- [ ] Referral/rewards configuration

### Phase 5 — Hardening + delivery

- [ ] Anti-cheat: rate limits, multi-account detection for coin faucets
- [ ] E2E tests, load test for Aviator rounds
- [ ] Cloud deployment, backups, monitoring/alerting, recovery runbook
- [ ] Documentation and handover

## Out of Scope (v1)

- Real money: no deposits, purchases, withdrawals, or payment gateways
- Player-to-player coin transfers
- Age gate / KYC / ID verification
- Phone + OTP sign-in
- Native mobile apps (responsive web only)
