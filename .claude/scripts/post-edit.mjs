#!/usr/bin/env node
// PostToolUse hook: format + lint the single edited file. Must stay under ~2s.
// Exit 2 (stderr shown to Claude) only when lint errors remain after auto-fix.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const file = input.tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
if (!file || !existsSync(file)) process.exit(0);

const rel = path.relative(root, file).split(path.sep).join('/');
if (
  rel.startsWith('..') ||
  /(^|\/)(node_modules|dist|\.next|generated)\//.test(rel)
) {
  process.exit(0);
}

const isWin = process.platform === 'win32';
const bin = (dir, name) => {
  const p = path.join(
    root,
    dir,
    'node_modules',
    '.bin',
    isWin ? `${name}.cmd` : name,
  );
  return existsSync(p) ? p : null;
};
const run = (cmd, args, cwd) =>
  spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: isWin, timeout: 8000 });

const ext = path.extname(file);
const formattable = [
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.json',
  '.css',
  '.md',
  '.yml',
  '.yaml',
];
const prettier = bin('.', 'prettier');
if (prettier && formattable.includes(ext)) {
  run(
    prettier,
    ['--write', '--log-level', 'warn', '--ignore-unknown', file],
    root,
  );
}

const lintable = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
if (!lintable.includes(ext)) process.exit(0);

let result;
if (rel.startsWith('frontend/')) {
  const eslint = bin('frontend', 'eslint');
  if (eslint)
    result = run(eslint, ['--fix', file], path.join(root, 'frontend'));
} else if (rel.startsWith('backend/')) {
  const oxlint = bin('backend', 'oxlint');
  if (oxlint)
    result = run(
      oxlint,
      ['--fix', '--deny-warnings', file],
      path.join(root, 'backend'),
    );
}

if (result && result.status !== 0) {
  process.stderr.write(
    `Lint errors in ${rel}:\n${result.stdout}${result.stderr}`,
  );
  process.exit(2);
}
