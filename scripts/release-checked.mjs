#!/usr/bin/env node
/**
 * 发布门禁：测试 + 构建 + 浏览器冒烟全过后，才允许提交并推送 main。
 * board-race release-checked.sh 的 Node 移植版，Windows / WSL / CI 行为一致。
 *
 * 用法：
 *   npm run release:checked -- [--plan] "type: message"
 *
 * 纪律（沿用 board-race）：
 * - 必须在 main 分支，origin 必须存在
 * - 只允许提交已 stage 的评审文件：无未 stage 改动、无未跟踪文件
 * - 门禁运行期间工作区不得发生任何变化（防止测试顺手改文件）
 * - 成功即提交并 push；push 即发布动作
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
let plan = false;
const positional = [];
for (const arg of args) {
  if (arg === '--plan') plan = true;
  else if (arg.startsWith('--')) fail(`unknown option: ${arg}`);
  else positional.push(arg);
}

const message = positional[0];
if (!message || positional.length !== 1 || message.includes('\n')) {
  fail('usage: npm run release:checked -- [--plan] "type: message"');
}

const git = (...gitArgs) => execFileSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8' }).trim();

function fail(reason) {
  console.error(reason);
  process.exit(3);
}

function assertCleanSinceGates(label) {
  git('diff', '--quiet', '--') || fail(`${label}: working tree changed`);
  !git('ls-files', '--others', '--exclude-standard') || fail(`${label}: untracked files appeared`);
}

const branch = git('branch', '--show-current');
if (branch !== 'main') fail(`release requires main, found: ${branch || 'detached'}`);
try {
  git('remote', 'get-url', 'origin');
} catch {
  fail('origin remote is required');
}

git('diff', '--cached', '--quiet', '--') && fail('stage the reviewed release files first');
git('diff', '--quiet', '--') || fail('unstaged tracked changes are not allowed');
!git('ls-files', '--others', '--exclude-standard') || fail('untracked files are not allowed');
execFileSync('git', ['-C', root, 'diff', '--cached', '--check'], { stdio: 'inherit' });

console.log(`repository=${root}`);
console.log('gates=test,build,smoke');
if (plan) {
  console.log('mode=plan');
  process.exit(0);
}

const indexBefore = git('write-tree');
const npmRun = (script) => execFileSync('npm', ['run', script], { cwd: root, stdio: 'inherit' });
npmRun('test');
npmRun('build');
npmRun('verify:smoke');

assertCleanSinceGates('a release gate');
if (indexBefore !== git('write-tree')) fail('a release gate changed the staged file set');

git('commit', '-m', message);
git('push', 'origin', 'main');
console.log('release=committed-and-pushed');
