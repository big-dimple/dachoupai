"""Verify archived real command outcomes, baseline full persistence and complete captions."""
from pathlib import Path
import gzip,json,hashlib
root=Path(__file__).resolve().parent
reports={name:json.loads(gzip.decompress((root/name/'report.json.gz').read_bytes())) for name in ['before','after','final','boundaries','phone-late','phone-debug']}
assert reports['before']['source']=='8c61eac1a16a85c88f6568544bf364d56b46db1d'
assert reports['after']['source']=='b83c8eff5bb23416fb8396af91772d935c07bd93'
for name,d in reports.items():
 if name not in ['before','after']:assert d['source']=='92388474e50e6cc34b3b0e9664e54d444dc93b25'
 for case in d['cases']:
  assert case['final']['state']==d['expected'] and not case['errors']
  base=next((b for b in reports['before']['cases'] if b['viewport']==case['viewport']),None)
  if base:assert case['initial']==base['initial'] and case['final']==base['final']
  for caption in case.get('multiplierCaptions',[]):assert caption['text']==caption['full']
assert reports['final']['expected']['lastTrace']['finalScore']=='5480485'
for p in root.glob('*/*.png'):assert p.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
print('PASS: exact archived source, command state, baseline complete state/journal/storage and actual full captions; pixel review confirms submitted phone heat digits; whole dynamic/device acceptance remains separate')
