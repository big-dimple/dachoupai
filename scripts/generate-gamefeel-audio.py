#!/usr/bin/env python3
"""
Audio Generator for GameFeel & Audio Elevation RFC
Generates:
1. Stranger Things Theme (80s Analog Synth Arpeggiator + Deep Sub-bass + 80s Drums)
2. Tang-Song Cyber Groove (Guzheng Pentatonic Melodies + 80s Lo-fi Bass + Chill Beat)
3. Pentatonic Scale SFX (Gong, Shang, Jiao, Zhi, Yu)
4. Heavy War Drum Sub-Bass Impact (Multi-hit)
5. Temple Bronze Bell Victory Resonator
"""
import os, sys, math, wave, subprocess
import numpy as np

SAMPLE_RATE = 44100

def create_synth_note(freq, duration, wave_type='saw', cutoff=800, decay=0.15):
    """Analog synth note with envelope and low-pass filter simulation."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    # Dual detuned oscillators for analog fatness
    detune = 1.004
    if wave_type == 'saw':
        # Bandlimited-ish saw via harmonics
        sig = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2 * t) + 0.33 * np.sin(2 * np.pi * freq * 3 * t) + 0.25 * np.sin(2 * np.pi * freq * 4 * t)
        sig += np.sin(2 * np.pi * freq * detune * t) + 0.5 * np.sin(2 * np.pi * freq * detune * 2 * t)
    elif wave_type == 'pulse':
        sig = np.sign(np.sin(2 * np.pi * freq * t)) * 0.5 + np.sign(np.sin(2 * np.pi * freq * detune * t)) * 0.5
    else: # sine
        sig = np.sin(2 * np.pi * freq * t)
    
    # ADSR Envelope
    attack_samples = int(SAMPLE_RATE * 0.01)
    decay_samples = int(SAMPLE_RATE * decay)
    sustain_level = 0.3
    
    env = np.ones_like(t)
    if attack_samples > 0:
        env[:attack_samples] = np.linspace(0, 1, attack_samples)
    if len(env) > attack_samples + decay_samples:
        env[attack_samples:attack_samples+decay_samples] = np.linspace(1, sustain_level, decay_samples)
        env[attack_samples+decay_samples:] = np.linspace(sustain_level, 0.01, len(env) - attack_samples - decay_samples)
    else:
        env[attack_samples:] = np.linspace(1, 0, len(env) - attack_samples)
        
    return sig * env * 0.5

def generate_stranger_things_theme(output_path, total_bars=16):
    """
    Renders the iconic Stranger Things main title theme:
    BPM: 84
    Arpeggio: C3 (130.81Hz), E3 (164.81Hz), G3 (196.00Hz), B3 (246.94Hz), 
              C4 (261.63Hz), B3 (246.94Hz), G3 (196.00Hz), E3 (164.81Hz)
    Plus deep sub-bass (C2), eerie choir pad, and driving 80s kick/snare pulse.
    """
    bpm = 84.0
    beat_dur = 60.0 / bpm
    step_dur = beat_dur / 4.0 # 16th note arpeggio = ~0.178s
    bar_dur = beat_dur * 4.0 # ~2.857s
    total_dur = bar_dur * total_bars
    total_samples = int(SAMPLE_RATE * total_dur)
    
    # Audio buffers: Left and Right
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)
    
    # 1. Iconic Arpeggio notes (C3, E3, G3, B3, C4, B3, G3, E3)
    arp_freqs = [130.81, 164.81, 196.00, 246.94, 261.63, 246.94, 196.00, 164.81]
    
    # Render arpeggio throughout
    num_steps = int(total_dur / step_dur)
    for i in range(num_steps):
        freq = arp_freqs[i % len(arp_freqs)]
        note_dur = step_dur * 1.5 # slight overlap for analog legato
        note = create_synth_note(freq, note_dur, wave_type='saw', decay=step_dur * 0.8)
        
        start = int(i * step_dur * SAMPLE_RATE)
        end = min(start + len(note), total_samples)
        note_slice = note[:end - start]
        
        # Stereo ping-pong panning
        pan = 0.5 + 0.3 * np.sin(i * 0.5)
        left[start:end] += note_slice * (1.0 - pan) * 0.7
        right[start:end] += note_slice * pan * 0.7
        
        # Ping-pong delay effect (3/16th delay)
        delay_offset = int(step_dur * 3 * SAMPLE_RATE)
        if start + delay_offset < total_samples:
            d_end = min(start + delay_offset + len(note_slice), total_samples)
            left[start + delay_offset : d_end] += note_slice[:d_end - (start + delay_offset)] * 0.25 * pan
            right[start + delay_offset : d_end] += note_slice[:d_end - (start + delay_offset)] * 0.25 * (1.0 - pan)

    # 2. Heavy Sub-Bass drone (C2 = 65.41 Hz, C1 = 32.7 Hz)
    t = np.linspace(0, total_dur, total_samples, endpoint=False)
    sub = (np.sin(2 * np.pi * 65.41 * t) * 0.6 + 
           np.sin(2 * np.pi * 32.70 * t) * 0.4 + 
           np.sin(2 * np.pi * 130.81 * t) * 0.2)
    # Bass sidechain ducking on every beat
    beat_phase = (t % beat_dur) / beat_dur
    duck = np.clip(beat_phase * 2.0, 0.2, 1.0) # ducks down to 0.2 on beat hit
    left += sub * duck * 0.5
    right += sub * duck * 0.5
    
    # 3. Eerie analog string pad (C minor / C major 7 floating)
    pad = (np.sin(2 * np.pi * 261.63 * t) * 0.15 + 
           np.sin(2 * np.pi * 329.63 * t) * 0.12 + 
           np.sin(2 * np.pi * 392.00 * t) * 0.12 + 
           np.sin(2 * np.pi * 493.88 * t) * 0.1)
    # Slow LFO filter sweep (period = 4 bars)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * (1.0 / (bar_dur * 4)) * t)
    left += pad * lfo * 0.35
    right += pad * (1.0 - lfo * 0.5) * 0.35
    
    # 4. Driving 80s drums (Kick on 1, 3; Gated Snare on 2, 4)
    kick_len = int(SAMPLE_RATE * 0.35)
    t_k = np.linspace(0, 0.35, kick_len, endpoint=False)
    # Pitch sweep kick 130Hz -> 45Hz
    kick_freq = 45.0 + 90.0 * np.exp(-t_k * 25.0)
    kick_phase = 2 * np.pi * np.cumsum(kick_freq) / SAMPLE_RATE
    kick = np.sin(kick_phase) * np.exp(-t_k * 10.0) * 0.8
    
    # Gated 80s snare
    snare_len = int(SAMPLE_RATE * 0.25)
    t_s = np.linspace(0, 0.25, snare_len, endpoint=False)
    noise = np.random.uniform(-1, 1, snare_len)
    tone = np.sin(2 * np.pi * 180.0 * t_s) * np.exp(-t_s * 15.0)
    snare = (noise * 0.6 + tone * 0.4) * np.exp(-t_s * 12.0) * 0.6
    
    for bar in range(total_bars):
        # Kick on beat 0 and 2
        for b in [0, 2]:
            idx = int((bar * 4 + b) * beat_dur * SAMPLE_RATE)
            end = min(idx + kick_len, total_samples)
            left[idx:end] += kick[:end-idx]
            right[idx:end] += kick[:end-idx]
        # Snare on beat 1 and 3
        for b in [1, 3]:
            idx = int((bar * 4 + b) * beat_dur * SAMPLE_RATE)
            end = min(idx + snare_len, total_samples)
            left[idx:end] += snare[:end-idx] * 0.8
            right[idx:end] += snare[:end-idx] * 0.8
            
    # Normalize & Soft Clip (warm analog saturation)
    stereo = np.vstack([left, right])
    peak = np.max(np.abs(stereo))
    if peak > 0.01:
        stereo = stereo / peak * 0.92
    stereo = np.tanh(stereo * 1.1) / 1.1 # analog tape warmth
    
    save_wav(output_path, stereo)

def generate_tangsong_cyber_groove(output_path, total_bars=16):
    """
    Renders Tang-Song Cyber Groove:
    Fusion of traditional Guzheng / Pipa pentatonic scales (宫商角徵羽)
    with Balatro-style hypnotic lo-fi beat and 80s synth bassline.
    """
    bpm = 92.0
    beat_dur = 60.0 / bpm
    bar_dur = beat_dur * 4.0
    total_dur = bar_dur * total_bars
    total_samples = int(SAMPLE_RATE * total_dur)
    
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)
    
    # Pentatonic Frequencies (D major pentatonic: D4, E4, F#4, A4, B4, D5)
    # D: 293.66, E: 329.63, F#: 369.99, A: 440.00, B: 493.88, D5: 587.33
    penta = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33]
    
    # Guzheng pluck synthesis function (Karplus-Strong style plucked string)
    def pluck(freq, duration):
        N = int(SAMPLE_RATE / freq)
        buf = np.random.uniform(-1, 1, N)
        samples = np.zeros(int(SAMPLE_RATE * duration))
        samples[:N] = buf
        # Feedback loop with lowpass filter
        decay = 0.992
        for n in range(N, len(samples)):
            samples[n] = 0.5 * (samples[n - N] + samples[n - N + 1]) * decay
        return samples * 0.5
        
    # Pipa / Guzheng rolling pattern
    pattern = [0, 2, 3, 4, 3, 2, 0, 1, 3, 4, 5, 4, 3, 1, 0, 2]
    step_dur = beat_dur / 4.0
    for i in range(int(total_dur / step_dur)):
        idx = pattern[i % len(pattern)]
        freq = penta[idx % len(penta)]
        p = pluck(freq, step_dur * 3.0)
        start = int(i * step_dur * SAMPLE_RATE)
        end = min(start + len(p), total_samples)
        p_slice = p[:end - start]
        pan = 0.5 + 0.35 * np.cos(i * 0.4)
        left[start:end] += p_slice * (1.0 - pan) * 0.6
        right[start:end] += p_slice * pan * 0.6
        
    # Lo-fi Chill Hop Beat + Warm Bass
    t = np.linspace(0, total_dur, total_samples, endpoint=False)
    bass = np.sin(2 * np.pi * 73.42 * t) * 0.4 + np.sin(2 * np.pi * 146.83 * t) * 0.25
    left += bass * 0.4
    right += bass * 0.4
    
    # Soft kick and rimshot
    kick_len = int(SAMPLE_RATE * 0.25)
    t_k = np.linspace(0, 0.25, kick_len, endpoint=False)
    kick = np.sin(2 * np.pi * (50.0 + 80.0 * np.exp(-t_k * 30.0)) * t_k) * np.exp(-t_k * 12.0) * 0.7
    
    rim_len = int(SAMPLE_RATE * 0.1)
    t_r = np.linspace(0, 0.1, rim_len, endpoint=False)
    rim = np.sin(2 * np.pi * 850.0 * t_r) * np.exp(-t_r * 40.0) * 0.4
    
    for bar in range(total_bars):
        # Kick on 0, 1.5, 2
        for b in [0, 1.75, 2.5]:
            idx = int((bar * 4 + b) * beat_dur * SAMPLE_RATE)
            end = min(idx + kick_len, total_samples)
            left[idx:end] += kick[:end-idx]
            right[idx:end] += kick[:end-idx]
        # Rim on 1 and 3
        for b in [1, 3]:
            idx = int((bar * 4 + b) * beat_dur * SAMPLE_RATE)
            end = min(idx + rim_len, total_samples)
            left[idx:end] += rim[:end-idx]
            right[idx:end] += rim[:end-idx]
            
    stereo = np.vstack([left, right])
    peak = np.max(np.abs(stereo))
    if peak > 0.01:
        stereo = stereo / peak * 0.90
    save_wav(output_path, stereo)

def generate_pentatonic_sfx(dir_path):
    """
    Renders 5 pristine pentatonic scale chimes for card triggers:
    1. Gong (宫 - C5 523.25 Hz)
    2. Shang (商 - D5 587.33 Hz)
    3. Jiao (角 - E5 659.25 Hz)
    4. Zhi (徵 - G5 783.99 Hz)
    5. Yu (羽 - A5 880.00 Hz)
    """
    notes = [
        ("sfx-penta-1-gong.wav", 523.25, "宫 (Gong)"),
        ("sfx-penta-2-shang.wav", 587.33, "商 (Shang)"),
        ("sfx-penta-3-jiao.wav", 659.25, "角 (Jiao)"),
        ("sfx-penta-4-zhi.wav", 783.99, "徵 (Zhi)"),
        ("sfx-penta-5-yu.wav", 880.00, "羽 (Yu)"),
    ]
    dur = 0.55
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur), endpoint=False)
    env = np.exp(-t * 9.0) # clean bell decay
    
    for fname, freq, name in notes:
        # Ceramic / bronze chime overtones
        sig = (np.sin(2 * np.pi * freq * t) * 0.6 + 
               np.sin(2 * np.pi * freq * 2.76 * t) * 0.25 + 
               np.sin(2 * np.pi * freq * 5.4 * t) * 0.15) * env
        stereo = np.vstack([sig, sig]) * 0.85
        save_wav(os.path.join(dir_path, fname), stereo)

def generate_war_drum_impact(file_path):
    """Tang Dynasty War Drum Sub-Bass Hit for High Multipliers (Mult)"""
    dur = 0.8
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur), endpoint=False)
    # Heavy pitch drop: 120Hz down to 38Hz
    f_inst = 38.0 + 82.0 * np.exp(-t * 18.0)
    phase = 2 * np.pi * np.cumsum(f_inst) / SAMPLE_RATE
    # Punchy skin hit + sub thud
    skin_noise = np.random.uniform(-1, 1, len(t)) * np.exp(-t * 40.0) * 0.35
    thud = np.sin(phase) * np.exp(-t * 6.5) * 0.8
    sig = np.tanh((skin_noise + thud) * 1.2) * 0.95
    stereo = np.vstack([sig, sig])
    save_wav(file_path, stereo)

def generate_temple_bell_victory(file_path):
    """Temple Bronze Bell (编钟 / 铜磬) for Round Victory / Threshold Pass"""
    dur = 2.5
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur), endpoint=False)
    # Harmonic ring-down of bronze bell
    f0 = 432.0 # sacred harmonic frequency
    bell = (np.sin(2 * np.pi * f0 * t) * 0.5 * np.exp(-t * 1.2) + 
            np.sin(2 * np.pi * f0 * 2.01 * t) * 0.3 * np.exp(-t * 1.8) + 
            np.sin(2 * np.pi * f0 * 3.42 * t) * 0.2 * np.exp(-t * 2.5) + 
            np.sin(2 * np.pi * f0 * 5.15 * t) * 0.1 * np.exp(-t * 3.5))
    stereo = np.vstack([bell, bell]) * 0.9
    save_wav(file_path, stereo)

def save_wav(path, stereo_data):
    # Convert float32 [-1, 1] to int16
    int16_data = np.clip(stereo_data * 32767.0, -32768.0, 32767.0).astype(np.int16)
    interleaved = np.empty((stereo_data.shape[1] * 2,), dtype=np.int16)
    interleaved[0::2] = int16_data[0]
    interleaved[1::2] = int16_data[1]
    
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(interleaved.tobytes())
    print(f"Generated WAV: {path}")

def convert_to_mp3_ogg(wav_path, mp3_path=None, ogg_path=None):
    if mp3_path:
        subprocess.run(['ffmpeg', '-y', '-i', wav_path, '-b:a', '192k', mp3_path], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        print(f"Converted MP3: {mp3_path}")
    if ogg_path:
        subprocess.run(['ffmpeg', '-y', '-i', wav_path, '-q:a', '6', ogg_path], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        print(f"Converted OGG: {ogg_path}")

def main():
    out_dir = "/var/www/dachoupai/public/assets/audio/gamefeel-rfc"
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Stranger Things Theme
    st_wav = os.path.join(out_dir, "stranger-things-theme.wav")
    st_mp3 = os.path.join(out_dir, "boss-stranger-things-theme.mp3")
    generate_stranger_things_theme(st_wav, total_bars=16) # ~45s seamless loop
    convert_to_mp3_ogg(st_wav, mp3_path=st_mp3)
    if os.path.exists(st_wav): os.remove(st_wav)
    
    # 2. Tang-Song Cyber Groove
    cg_wav = os.path.join(out_dir, "tangsong-cyber-groove.wav")
    cg_mp3 = os.path.join(out_dir, "table-tangsong-cyber-groove.mp3")
    generate_tangsong_cyber_groove(cg_wav, total_bars=16) # ~42s seamless loop
    convert_to_mp3_ogg(cg_wav, mp3_path=cg_mp3)
    if os.path.exists(cg_wav): os.remove(cg_wav)
    
    # 3. Pentatonic SFX
    generate_pentatonic_sfx(out_dir)
    for i in range(1, 6):
        w = os.path.join(out_dir, f"sfx-penta-{i}-*.wav")
        # Find exact
        for f in os.listdir(out_dir):
            if f.startswith(f"sfx-penta-{i}") and f.endswith(".wav"):
                wpath = os.path.join(out_dir, f)
                opath = os.path.join(out_dir, f.replace(".wav", ".ogg"))
                convert_to_mp3_ogg(wpath, ogg_path=opath)
                os.remove(wpath)
                
    # 4. War Drum Hit
    wd_wav = os.path.join(out_dir, "sfx-wardrum-mult-hit.wav")
    wd_ogg = os.path.join(out_dir, "sfx-wardrum-mult-hit.ogg")
    generate_war_drum_impact(wd_wav)
    convert_to_mp3_ogg(wd_wav, ogg_path=wd_ogg)
    if os.path.exists(wd_wav): os.remove(wd_wav)
    
    # 5. Temple Bell Victory
    tb_wav = os.path.join(out_dir, "sfx-temple-bell-victory.wav")
    tb_ogg = os.path.join(out_dir, "sfx-temple-bell-victory.ogg")
    generate_temple_bell_victory(tb_wav)
    convert_to_mp3_ogg(tb_wav, ogg_path=tb_ogg)
    if os.path.exists(tb_wav): os.remove(tb_wav)
    
    print("All GameFeel audio assets generated successfully!")

if __name__ == '__main__':
    main()
