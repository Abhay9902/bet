#!/usr/bin/env node
// PreToolUse hook: block edits to files that must not be hand-edited. Exit 2 = block.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const file = input.tool_input?.file_path;
if (!file) process.exit(0);
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = path.relative(root, file).split(path.sep).join('/');
const base = path.basename(rel);

const reasons = [
  [
    /^\.env(\..+)?$/.test(base) && base !== '.env.example',
    'env files hold secrets; edit .env.example and tell the user what to set',
  ],
  [
    base === 'pnpm-lock.yaml',
    'lockfile is managed by pnpm; run pnpm add/remove instead',
  ],
  [
    rel === 'PRODUCT_SPEC.md',
    'PRODUCT_SPEC.md is a frozen artifact; use /spec-check to report drift',
  ],
  [
    rel.startsWith('backend/src/generated/'),
    'generated Prisma client; run pnpm --filter backend db:generate',
  ],
  [
    /^backend\/prisma\/migrations\/.+\/migration\.sql$/.test(rel) &&
      existsSync(file),
    'existing migrations are immutable; create a new migration',
  ],
];

const hit = reasons.find(([blocked]) => blocked);
if (hit) {
  process.stderr.write(`Blocked edit to ${rel}: ${hit[1]}.\n`);
  process.exit(2);
}
