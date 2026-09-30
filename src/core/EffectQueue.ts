export type Effect = () => void | Promise<void>;

export class EffectQueue {
  private effects: Effect[] = [];
  private running = false;

  enqueue(effect: Effect): void {
    this.effects.push(effect);
  }

  clear(): void {
    this.effects = [];
  }

  async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.effects.length > 0) {
        const effect = this.effects.shift();
        if (effect) await effect();
      }
    } finally {
      this.running = false;
    }
  }
}
