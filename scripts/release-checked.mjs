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
// 退出码本身是结果的检查（diff --quiet 系列），不能抛异常，要看 code
const gitStatus = (...gitArgs) => {
  try {
    return { code: 0, out: git(...gitArgs) };
  } catch (error) {
    return { code: error.status ?? 1, out: '' };
  }
};

function fail(reason) {
  console.error(reason);
  process.exit(3);
}

function assertCleanSinceGates(label) {
  if (gitStatus('diff', '--quiet', '--').code !== 0) fail(`${label}: working tree changed`);
  if (gitStatus('ls-files', '--others', '--exclude-standard').out) fail(`${label}: untracked files appeared`);
}

const branch = git('branch', '--show-current');
if (branch !== 'main') fail(`release requires main, found: ${branch || 'detached'}`);
if (gitStatus('remote', 'get-url', 'origin').code !== 0) fail('origin remote is required');

if (gitStatus('diff', '--cached', '--quiet', '--').code === 0) fail('stage the reviewed release files first');
if (gitStatus('diff', '--quiet', '--').code !== 0) fail('unstaged tracked changes are not allowed');
if (gitStatus('ls-files', '--others', '--exclude-standard').out) fail('untracked files are not allowed');
if (gitStatus('diff', '--cached', '--check').code !== 0) fail('git diff --cached --check failed');

console.log(`repository=${root}`);
console.log('gates=test,build,smoke');
if (plan) {
  console.log('mode=plan');
  process.exit(0);
}

const indexBefore = git('write-tree');
// Windows 上 npm 是 npm.cmd，spawn 找不到；经 npm run 进来时必有 npm_execpath
const npmCli = process.env.npm_execpath;
if (!npmCli) fail('run via npm: npm run release:checked -- "type: message"');
const npmRun = (script) => execFileSync(process.execPath, [npmCli, 'run', script], { cwd: root, stdio: 'inherit' });
npmRun('test');
npmRun('build');
npmRun('verify:smoke');

assertCleanSinceGates('a release gate');
if (indexBefore !== git('write-tree')) fail('a release gate changed the staged file set');

git('commit', '-m', message);
git('push', 'origin', 'main');
console.log('release=committed-and-pushed');
