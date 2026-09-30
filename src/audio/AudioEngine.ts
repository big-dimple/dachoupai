export class AudioEngine {
  static readonly shared=new AudioEngine();
  private context?: AudioContext;
  muted=false;

  private getContext(): AudioContext | undefined {
    if (!window.AudioContext) return undefined;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume().catch(()=>{});
    return this.context;
  }

  private tone(frequency: number, duration: number, volume: number): void {
    if(this.muted||document.hidden)return;
    try {
      const context = this.getContext();
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      gain.gain.setValueAtTime(volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {/* Audio construction or permission failure never interrupts a rule command. */}
  }

  select(): void {
    this.tone(420, 0.05, 0.025);
  }

  playHand(): void {
    this.tone(180, 0.12, 0.05);
  }

  score(intensity = 0): void {
    this.tone(520 + intensity * 80, 0.2, 0.04);
  }

  role(): void {
    this.tone(740, 0.24, 0.045);
  }

  joker(chainIndex: number): void {
    this.tone(600 + Math.min(chainIndex, 6) * 70, 0.16, 0.04);
  }
}
