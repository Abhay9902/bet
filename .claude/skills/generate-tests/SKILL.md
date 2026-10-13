---
name: generate-tests
description: Generate unit and e2e tests for new or changed code on the current branch.
disable-model-invocation: true
---

1. Find new/changed source files: `git diff --name-only HEAD` plus untracked files from
   `git status --porcelain`. If the user named files, use those instead.
2. For each file, read it and its existing tests. Follow `.claude/rules/tests.md`.
3. Write tests for the public behaviour: happy path, validation failures, edge cases, and
   permission checks. For wallet/ledger code add zero-sum, idempotent replay, insufficient balance,
   and concurrency cases. For fairness code add fixed known-vector tests.
4. For new HTTP endpoints or gateways, add an e2e test in `backend/test/`.
5. Run the new tests and show the output. A new test that fails because of a real bug is a
   finding — report it; don't change the assertion to match buggy behaviour.
6. Summarise what is covered and what still isn't.
