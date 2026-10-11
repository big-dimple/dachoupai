from pathlib import Path
import hashlib
import json
import subprocess

out = Path(__file__).resolve().parent
root = out.parents[3]
previous = '9e64e526b6efc167c183061e60fd8c1e61e578a8'
main = 'ed9a4a58874a448c371a604d40f57a003faa7a50'
base = 'e48fd07a6e7b4575067dc356ad28cb0a94fe15e9'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)

def paths(start, end):
    return git('diff', '--name-only', start, end).decode().splitlines()

def blob(ref, name):
    return git('show', f'{ref}:{name}')

def local(name):
    return (root / name).read_bytes()

def sha(data):
    return hashlib.sha256(data).hexdigest()

old_paths = paths(base, previous)
main_paths = paths(base, main)
assert set(old_paths) & set(main_paths) == {'src/game/GameScene.ts'}
scene = local('src/game/GameScene.ts').replace(b'...(context.routeGrowth?{routeGrowth:context.routeGrowth}:{}),', b'').replace(b"    if(event.sourceType==='rule'&&event.sourceDefinitionId==='route-growth')return '\xe8\xb7\xaf\xe7\xba\xbf\xe8\xb5\x84\xe5\x8e\x86';\n", b'')
assert scene == blob(main, 'src/game/GameScene.ts')
ranking = local('tests/assist-recommendation.test.ts').replace(b"import {completeControlledRouteHistory} from './fixtures/route-growth-history';\n", b'').replace(b'completeControlledRouteHistory(s);', b'')
assert ranking == blob(main, 'tests/assist-recommendation.test.ts')
main_exact = [p for p in main_paths if p not in ['src/game/GameScene.ts', 'tests/assist-recommendation.test.ts']]
for p in main_exact:
    assert local(p) == blob(main, p), p
old_exact = [p for p in old_paths if p != 'src/game/GameScene.ts']
for p in old_exact:
    assert local(p) == blob(previous, p), p
main_src = [p for p in git('ls-tree', '-r', '--name-only', main, 'src').decode().splitlines() if p not in old_paths]
for p in main_src:
    assert local(p) == blob(main, p), p
public = git('ls-tree', '-r', '--name-only', main, 'public').decode().splitlines()
for p in public:
    assert local(p) == blob(main, p), p
plan = 'docs/production/DELIVERY_PLAN.md'
assert local(plan) == blob(previous, plan)
tail = local(plan).split('## 既有规格 工作包合同与历史证据'.encode(), 1)[1]
assert sha(tail) == '664f841aa85193464c760d9d124932c7ae1b7345a8b5a7cd3a0ec8491a0621b5'
source_paths = sorted({p for p in old_paths + main_paths if p.startswith(('src/', 'tests/', 'harness/'))} | {'tests/assist-route-growth-integration.test.ts'})
identity = json.loads((out / 'public-actual-comparisons.json').read_text())['cases'][0]['identity']
assert identity == {'contentVersion': 'quality-r2-route-growth-v1', 'contentHash': 'json-fnv-v1:7414228d95059959'}
facts = {
    'previousC2Head': previous, 'mergedMain': main, 'commonBase': base,
    'overlap': ['src/game/GameScene.ts'],
    'GameSceneExactMainAfterRemovingOnlyTwoC2Additions': True,
    'AssistRecommendationTestExactMainAfterRemovingOnlyControlledBossHistoryHelper': True,
    'newProductChangesBeyondNormalMerge': [],
    'mainChangedFilesExactExceptListedTwo': main_exact,
    'previousC2ChangedFilesExactExceptGameScene': old_exact,
    'remainingMainSourceFilesExact': main_src,
    'publicAssetFilesExactMain': public,
    'planByteExactPreviousC2': True, 'planSha256': sha(local(plan)), 'historicalTailSha256': sha(tail),
    'identity': identity,
    'files': [{'path': p, 'sha256': sha(local(p)), 'bytes': len(local(p))} for p in source_paths],
    'scope': 'source/tree preservation and controlled scoring evidence; no UI pixel, natural acquisition, deployment or overall acceptance claim',
}
(out / 'protection-manifest.json').write_text(json.dumps(facts, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: len(v) if isinstance(v, list) and k not in ['overlap', 'newProductChangesBeyondNormalMerge'] else v for k, v in facts.items() if k != 'files'}, ensure_ascii=False, indent=2))
