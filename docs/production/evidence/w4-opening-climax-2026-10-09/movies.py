import pathlib,json,subprocess,math,struct,shutil
base=pathlib.Path('/tmp/opening-capture');out=pathlib.Path('/workspace/dachoupai/docs/production/evidence/w4-opening-climax-2026-10-09');rows=[]
for w in [1366,390]:
 for label in ['before','after']:
  d=base/f'{label}-{w}';r=json.loads((d/'report.json').read_text());target=out/f'{label}-{w}.mp4';delay=round((r['audioStart']-r['start'])*1000);duration=r['end']-r['start']+.08
  subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(d/'frames.txt'),'-i',str(d/'actual-output.webm'),'-filter_complex',f'[0:v]fps=15,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text={label.upper()}  BGM7pct SFX100pct:fontcolor=white:fontsize=18:box=1:boxcolor=black@0.7:x=8:y=h-28[v];[1:a]adelay={delay}|{delay},apad[a]','-map','[v]','-map','[a]','-t',str(duration),'-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(target)],check=True)
  # Actual output statistics, not subjective loudness judgement.
  pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(d/'actual-output.webm'),'-f','f32le','-ac','1','-ar','48000','pipe:1']);values=struct.unpack('<'+'f'*(len(pcm)//4),pcm);peak=max(abs(x) for x in values);rms=math.sqrt(sum(x*x for x in values)/len(values));rows.append({'label':label,'width':w,'actualAudioBytes':r['audioBytes'],'peak':peak,'rms':rms,'dBFS':20*math.log10(rms),'nearClipping':sum(abs(x)>=.99 for x in values),'audioDelaySeconds':delay/1000,'duration':duration,'movieBytes':target.stat().st_size})
  (out/f'{label}-{w}.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
  for name in ['title-entrance','ink-cover','hero-strike']:(out/f'{label}-{w}-{name}.png').write_bytes((d/f'{name}.png').read_bytes())
 (out/f'pair-{w}.txt').write_text(f"file '{out}/before-{w}.mp4'\nfile '{out}/after-{w}.mp4'\n")
 subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(out/f'pair-{w}.txt'),'-c','copy','-movflags','+faststart',str(out/f'comparison-{w}.mp4')],check=True)
 (out/f'pair-{w}.txt').unlink()
 # Only retain the compact comparison with its real audio. Full individual clips remain /tmp.
 for label in ['before','after']:shutil.move(str(out/f'{label}-{w}.mp4'),str(base/f'{label}-{w}.mp4'))
(out/'actual-audio-metrics.json').write_text(json.dumps({'scope':'Final WebAudio ceiling node actual output including same Schubert track; whole short clip statistics, not event isolation or subjective audibility acceptance. No listening performed.','rows':rows},indent=2)+'\n')
print(json.dumps(rows))
