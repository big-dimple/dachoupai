import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

// Structural validation only: this cannot certify gameplay, logs, or human approval authenticity.
export function validatePlan(plan, io) {
  const errors = [];
  const fail = message => errors.push(message);
  const statuses = new Set(['planned', 'ready', 'in_progress', 'blocked', 'done']);
  const safePath = value => typeof value === 'string' && value.length > 0 &&
    !value.includes('\\') && !path.posix.isAbsolute(value) &&
    !value.split('/').includes('..') && !/^[a-z]+:/i.test(value);
  const file = (value, label) => {
    if (!safePath(value)) { fail(`${label}: unsafe or empty path`); return false; }
    if (!io.exists(value)) { fail(`${label}: missing file ${value}`); return false; }
    return true;
  };
  if (!plan || plan.schemaVersion !== 1 || !Array.isArray(plan.tasks) || !plan.tasks.length) {
    return ['invalid plan schema'];
  }
  if (!/^[a-f0-9]{40}$/.test(plan.auditCommit ?? '')) fail('invalid auditCommit');
  const tasks = new Map();
  for (const task of plan.tasks) {
    if (!task || !/^[A-Z]\d{2}$/.test(task.id ?? '')) { fail('invalid task id'); continue; }
    if (tasks.has(task.id)) fail(`duplicate id ${task.id}`);
    tasks.set(task.id, task);
    if (typeof task.title !== 'string' || !task.title.trim()) fail(`${task.id}: missing title`);
    if (!statuses.has(task.status)) fail(`${task.id}: invalid status`);
    if (!Array.isArray(task.dependsOn)) fail(`${task.id}: dependencies must be an array`);
    if (!Array.isArray(task.reads) || !task.reads.length) fail(`${task.id}: missing reads`);
    for (const read of task.reads ?? []) file(read, `${task.id} read`);
    const [packagePath, anchor] = String(task.package ?? '').split('#');
    if (file(packagePath, `${task.id} package`)) {
      if (anchor !== task.id.toLowerCase()) fail(`${task.id}: wrong package anchor`);
      if (!io.read(packagePath).split(/\r?\n/).includes(`## ${task.id}`)) fail(`${task.id}: missing work package heading`);
    }
    if (!Array.isArray(task.evidence)) fail(`${task.id}: evidence must be an array`);
    if (task.status === 'blocked' && !String(task.blockedReason ?? '').trim()) fail(`${task.id}: missing blockedReason`);
    const records = [];
    for (const evidence of task.evidence ?? []) {
      if (!file(evidence, `${task.id} evidence`)) continue;
      try {
        const record = JSON.parse(io.read(evidence));
        if (record.taskId !== task.id || !/^[a-f0-9]{40}$/.test(record.testedCommit ?? '')) fail(`${task.id}: invalid evidence record`);
        records.push(record);
      } catch { fail(`${task.id}: unreadable evidence JSON`); }
    }
    if (task.status === 'done') {
      if (!records.length) fail(`${task.id}: done without evidence`);
      if (task.humanGate && !records.some(record => record.humanReview?.status === 'PASS' &&
        String(record.humanReview.reviewer ?? '').trim() && String(record.humanReview.evidence ?? '').trim())) {
        fail(`${task.id}: human acceptance missing`);
      }
    }
  }
  for (const task of tasks.values()) {
    for (const dep of task.dependsOn ?? []) {
      if (!tasks.has(dep)) fail(`${task.id}: unknown dependency ${dep}`);
      else if (['ready', 'in_progress', 'done'].includes(task.status) && tasks.get(dep).status !== 'done') {
        fail(`${task.id}: unfinished dependency ${dep}`);
      }
    }
  }
  const colors = new Map();
  const visit = id => {
    if (colors.get(id) === 1) { fail(`dependency cycle at ${id}`); return; }
    if (colors.get(id) === 2 || !tasks.has(id)) return;
    colors.set(id, 1);
    for (const dep of tasks.get(id).dependsOn ?? []) visit(dep);
    colors.set(id, 2);
  };
  for (const id of tasks.keys()) visit(id);
  const active = [...tasks.values()].filter(task => ['ready', 'in_progress'].includes(task.status));
  const allDone = tasks.size > 0 && [...tasks.values()].every(task => task.status === 'done');
  if (allDone) {
    if (plan.currentTask !== null) fail('all done requires null currentTask');
  } else {
    const current = tasks.get(plan.currentTask);
    if (!current || !['ready', 'in_progress', 'blocked'].includes(current.status)) fail('invalid currentTask');
    if (current?.status === 'blocked') {
      if (active.length) fail('blocked currentTask conflicts with active task');
    } else if (active.length !== 1 || active[0]?.id !== plan.currentTask) fail('exactly one current ready/in_progress task is required');
  }
  return errors;
}

function selfTest() {
  const base = {
    schemaVersion: 1, auditCommit: 'a'.repeat(40), currentTask: 'R00',
    tasks: [
      {id:'R00',title:'start',status:'ready',dependsOn:[],reads:['a.md'],package:'WORK_PACKAGES.md#r00',evidence:[]},
      {id:'R01',title:'next',status:'planned',dependsOn:['R00'],reads:['a.md'],package:'WORK_PACKAGES.md#r01',evidence:[]}
    ]
  };
  const io = {exists: p => p !== 'missing.md', read: p => p.endsWith('.json')
    ? JSON.stringify({taskId:'R00',testedCommit:'b'.repeat(40)}) : '## R00\n## R01\n'};
  assert.deepEqual(validatePlan(base, io), []);
  const bad = mutate => {const copy = structuredClone(base); mutate(copy); assert.ok(validatePlan(copy, io).length > 0);};
  bad(p => p.tasks.push(structuredClone(p.tasks[0])));
  bad(p => p.tasks[0].dependsOn = ['R01']);
  bad(p => p.tasks[1].dependsOn = ['Z99']);
  bad(p => {p.tasks[1].dependsOn=[];p.tasks[1].status='ready';});
  bad(p => p.currentTask = 'R01');
  bad(p => p.tasks[1].status = 'done');
  bad(p => {p.tasks[0].status='done';p.currentTask='R01';p.tasks[1].status='ready';});
  bad(p => p.tasks[0].reads = ['../escape.md']);
  bad(p => p.tasks[0].reads = ['missing.md']);
  bad(p => p.tasks[0].status = 'complete');
  bad(p => p.tasks[0].status = 'blocked');
  bad(p => {p.tasks[0].status='done';p.tasks[0].humanGate=true;p.tasks[0].evidence=['proof.json'];p.currentTask='R01';p.tasks[1].status='ready';});
  bad(p => p.tasks[0].package = 'WORK_PACKAGES.md#r99');
  console.log('PLAN_CHECKER_SELF_TEST_PASS: 1 valid and 13 invalid fixtures');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    if (process.argv.includes('--self-test')) selfTest();
    else {
      const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const plan = JSON.parse(fs.readFileSync(path.join(root, 'docs/production/plan.json'), 'utf8'));
      const errors = validatePlan(plan, {
        exists: p => { try {return fs.statSync(path.join(root, p)).isFile();} catch {return false;} },
        read: p => fs.readFileSync(path.join(root, p), 'utf8')
      });
      if (errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
      else console.log(`PLAN_VALID: ${plan.tasks.length} work packages; current=${plan.currentTask}; not a gameplay acceptance`);
    }
  } catch (error) {console.error(`PLAN_CHECK_FAILED: ${error.message}`);process.exitCode=1;}
}
