"""Offline derivative preparation; source MP3s stay byte-exact outside public."""
import pathlib,sys,subprocess,json,hashlib
import numpy as np
root=pathlib.Path(sys.argv[1]);archive=root/'art/sources/audio-gamefeel-rfc-20261017';out=root/'public/assets/audio/gamefeel-rfc'
upstream=json.loads((archive/'upstream.json').read_text());rows=[]
def measure(file):
    text=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(file),'-af','loudnorm=I=-18:TP=-2:LRA=11:print_format=json','-f','null','-'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True,check=True).stderr
    return json.loads(text[text.rfind('{'):text.rfind('}')+1])
def digest(file):return hashlib.sha256(file.read_bytes()).hexdigest()
for name in ['boss-stranger-things-theme.mp3','table-tangsong-cyber-groove.mp3']:
    source=archive/name;metrics=measure(source)
    gain=min(-18-float(metrics['input_i']),-2-float(metrics['input_tp']))
    pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-ar','44100','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2).copy()
    pcm*=10**(gain/20)
    # Keep the complete 16-bar duration/tempo. Smooth only 8ms at each loop edge.
    n=round(.008*44100);fade=np.sin(np.linspace(0,np.pi/2,n))**2
    pcm[:n]*=fade[:,None];pcm[-n:]*=fade[::-1,None]
    target=out/name
    subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar','44100','-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','192k','-write_xing','1',str(target)],input=pcm.astype('<f4').tobytes(),check=True)
    decoded=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(target),'-f','f32le','-ac','2','pipe:1']),dtype='<f4').reshape(-1,2)
    rows.append({'name':name,'sourceSHA256':digest(source),'sha256':digest(target),'bytes':target.stat().st_size,'durationSeconds':len(decoded)/44100,'gainDb':gain,'loopEdgeFadeMs':8,'samplePeak':float(np.max(np.abs(decoded))),'loopBoundaryStep':float(np.max(np.abs(decoded[0]-decoded[-1]))),'loudness':measure(target)})
manifestPath=root/'public/assets/audio/bgm/manifest.json';manifest=json.loads(manifestPath.read_text())
for track in manifest['tracks']:
    if track['id']=='table-zuiyu':track['scenes']=['success']
    if track['id'] not in ['boss-dark-things','table-tango']:continue
    boss=track['id']=='boss-dark-things';row=rows[0 if boss else 1]
    track.update({'id':'boss-gamefeel-synth' if boss else 'table-gamefeel-groove','file':'../gamefeel-rfc/'+row['name'],'runtimePath':'assets/audio/gamefeel-rfc/'+row['name'],'title':'Stranger Things Theme (Singapore Synth)' if boss else 'Tang-Song Cyber Groove','composer':'Singapore RFC synthesis / Kyle Dixon & Michael Stein (theme)' if boss else 'Singapore RFC procedural composition','style':'80s Synth Arpeggio' if boss else 'Pentatonic Pluck / Lo-fi','license':'User-directed personal use; no separate upstream license supplied','durationSeconds':row['durationSeconds'],'bytes':row['bytes'],'sha256':row['sha256']})
manifestPath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assets=[{'name':pathlib.Path(row['name']).stem,'runtimePath':'assets/audio/gamefeel-rfc/'+row['name'],'bytes':row['bytes'],'sha256':row['sha256'],'license':'User-directed personal use; no separate upstream license supplied'} for row in upstream['files'] if row['name'].endswith('.ogg')]
(out/'sources.json').write_text(json.dumps({'upstreamCommit':upstream['commit'],'source':upstream['source'],'adoption':upstream['adoption'],'assets':assets,'musicDerivatives':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(rows,indent=2))
