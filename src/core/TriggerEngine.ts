export type TriggerName = 'hand:played' | 'role:triggered' | 'score:resolved';
export type TriggerListener<T = unknown> = (payload: T) => void;

export class TriggerEngine {
  private listeners = new Map<TriggerName, Set<TriggerListener>>();

  on<T>(name: TriggerName, listener: TriggerListener<T>): () => void {
    const bucket = this.listeners.get(name) ?? new Set<TriggerListener>();
    bucket.add(listener as TriggerListener);
    this.listeners.set(name, bucket);
    return () => bucket.delete(listener as TriggerListener);
  }

  emit<T>(name: TriggerName, payload: T): void {
    this.listeners.get(name)?.forEach((listener) => listener(payload));
  }

  clear(): void {
    this.listeners.clear();
  }
}
