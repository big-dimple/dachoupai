import json,subprocess,math,array
from pathlib import Path
rows=[]
for version in ['before','after']:
 for mix in ['default','custom']:
  path=Path(f'/tmp/tool-wood-after-{mix}' if version=='after' else f'/tmp/tool-audio-before-{mix}');r=json.load(open(path/'report.json'));row={'version':version,'mix':mix,'source':r['source'],'preferences':r['preferences'],'events':[]};data={};starts={}
  for name in ['music','effects','final']:
   raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path/('same-inputs.webm' if name=='final' else name+'.webm')),'-af','aresample=async=1000:first_pts=0','-f','f32le','-ac','1','-ar','48000','-']);data[name]=array.array('f',raw);starts[name]=r['clip']['audioStart'] if name=='final' else next(b['epoch'] for b in r['buses'] if b['name']==name)
  selects=[e for e in r['events'] if e['kind']=='select' and e['voices']][-4:-1]
  purchase=next(e for e in r['events'] if e['kind']=='purchase');score=[e for e in r['events'] if e['kind']=='scoreImpact']
  for i,e in enumerate(selects+[purchase]+score):
   duration=max(v['endsAt'] for v in e['voices'])-e['time'];entry={'kind':e['kind'],'sample':[v.get('sample',v['semantic']) for v in e['voices']],'duration':duration,'context':e['active'],'gate':e['gate'],'metrics':{}}
   for name,values in data.items():
    at=max(0,round((e['epoch']-starts[name])*48000));chunk=values[at:at+round((duration+.03)*48000)];peak=max(map(abs,chunk),default=0);rms=math.sqrt(sum(v*v for v in chunk)/max(1,len(chunk)));blocks=[math.sqrt(sum(v*v for v in chunk[j:j+960])/len(chunk[j:j+960])) for j in range(0,len(chunk),960) if len(chunk[j:j+960])>=480];max20=max(blocks,default=0)
    entry['metrics'][name]={'rms':rms,'peak':peak,'rmsDB':20*math.log10(max(rms,1e-12)),'max20msDB':20*math.log10(max(max20,1e-12))}
   entry['effectMusicDB']=entry['metrics']['effects']['rmsDB']-entry['metrics']['music']['rmsDB'];row['events'].append(entry)
  final=data['final'];row['finalPeak']=max(map(abs,final));row['fullScaleSamples']=sum(abs(v)>=.999 for v in final);rows.append(row)
Path('/tmp/tool-audio-event-metrics.json').write_text(json.dumps({'scope':'Event duration +30ms, 20ms blocks; real separated pre-compressor music/effects buses and real final post-ceiling output. Opus timing is approximate; numeric level is not subjective hearing.','rows':rows},indent=2)+'\n')
for r in rows:
 print(r['version'],r['mix'],'peak',round(r['finalPeak'],3),'clips',r['fullScaleSamples'])
 for e in r['events']:print(e['kind'],e['sample'],round(e['effectMusicDB'],1),round(e['metrics']['final']['max20msDB'],1))
