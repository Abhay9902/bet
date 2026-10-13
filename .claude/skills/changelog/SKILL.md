---
name: changelog
description: Generate a user-facing changelog entry for recent work and append it to CHANGELOG.md.
disable-model-invocation: true
---

1. Find the range: commits since the last changelog update
   (`git log --oneline $(git log -1 --format=%H -- CHANGELOG.md)..HEAD`). If the user gives a range,
   use it.
2. Read the commit messages and, where unclear, the diffs.
3. Group into Added / Changed / Fixed / Removed / Security.
4. Write one line per change for players, admins, or stakeholders — what changed for them, not how
   it was implemented. Skip pure refactors, test-only, and tooling changes unless they matter to
   the team.
5. Add the lines under `## [Unreleased]` in `CHANGELOG.md`, creating the subsection if missing.
   Never rewrite or delete existing entries.
6. Show the added lines to the user.
