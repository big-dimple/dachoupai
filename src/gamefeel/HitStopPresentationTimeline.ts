/**
 * HitStopPresentationTimeline.ts
 * Cancellable Presentation Clock & Micro-freeze (Hit-Stop) Controller.
 * 
 * Strict Domain & Presentation Decoupling:
 * - Only pauses visual tweens, card animations, and presentation timers.
 * - NEVER freezes player input, DOM buttons, rules calculations, or save operations.
 * - Cancellable via AbortSignal (instantly skips freeze on fast-forward, skip, or exit).
 * - Safe timer stacking: new hit-stops cancel and supersede older timers without early release.
 */

export interface HitStopOptions {
  durationMs: number;          // Freeze duration in milliseconds (typically 40ms to 70ms)
  signal?: AbortSignal;        // Cancellation signal for fast-forward or scene exit
  onFreezeStart?: () => void;  // Callback when freeze initiates (e.g. flash/focus)
  onFreezeEnd?: () => void;    // Callback when freeze releases (e.g. camera shake punch)
}

export class HitStopPresentationTimeline {
  private static instance?: HitStopPresentationTimeline;
  public static get shared(): HitStopPresentationTimeline {
    if (!this.instance) this.instance = new HitStopPresentationTimeline();
    return this.instance;
  }

  // Presentation time scaling
  private presentationTimeScale: number = 1.0;
  private isHitStopActive: boolean = false;
  private hitStopRemainingMs: number = 0;
  private activeOnFreezeEnd?: () => void;
  private hitStopGeneration: number = 0;
  private hitStopTimer?: ReturnType<typeof setTimeout>;

  // Dedicated presentation clock (accumulates only when presentation is not frozen)
  private presentationTime: number = 0;

  /**
   * Advances the presentation clock.
   * Call in your scene update(time, deltaMs).
   * @param rawDeltaMs The real hardware frame delta in milliseconds
   * @returns Effective presentation deltaMs (0 while hit-stop is frozen)
   */
  public update(rawDeltaMs: number): number {
    if (!Number.isFinite(rawDeltaMs) || rawDeltaMs <= 0) return 0;
    
    // Clamp frame delta to max 250ms to prevent abnormal spikes
    const clampedRaw = Math.min(rawDeltaMs, 250);

    if (this.isHitStopActive) {
      this.hitStopRemainingMs -= clampedRaw;
      if (this.hitStopRemainingMs <= 0) {
        this.isHitStopActive = false;
        if (this.hitStopTimer) {
          clearTimeout(this.hitStopTimer);
          this.hitStopTimer = undefined;
        }
        const onEnd = this.activeOnFreezeEnd;
        this.activeOnFreezeEnd = undefined;
        onEnd?.();
      }
      return 0;
    }

    const effectiveDelta = clampedRaw * this.presentationTimeScale;
    this.presentationTime += effectiveDelta;
    return effectiveDelta;
  }

  /**
   * Triggers a cancellable micro-freeze frame on presentation.
   */
  public triggerHitStop(options: HitStopOptions): void {
    const { durationMs, signal, onFreezeStart, onFreezeEnd } = options;
    if (signal?.aborted || !Number.isFinite(durationMs) || durationMs <= 0) return;

    // Invalidate and cancel any existing hit-stop timer
    this.hitStopGeneration++;
    const currentGen = this.hitStopGeneration;
    if (this.hitStopTimer) {
      clearTimeout(this.hitStopTimer);
      this.hitStopTimer = undefined;
    }

    this.isHitStopActive = true;
    this.hitStopRemainingMs = durationMs;
    this.activeOnFreezeEnd = onFreezeEnd;
    onFreezeStart?.();

    // Listen for cancellation
    const abortHandler = () => {
      if (this.hitStopGeneration === currentGen) {
        this.cancelHitStop();
      }
    };
    signal?.addEventListener('abort', abortHandler, { once: true });

    // Schedule recovery timer on real wall clock as dual-safety guarantee
    this.hitStopTimer = setTimeout(() => {
      if (this.hitStopGeneration === currentGen && this.isHitStopActive) {
        this.isHitStopActive = false;
        this.hitStopRemainingMs = 0;
        this.hitStopTimer = undefined;
        signal?.removeEventListener('abort', abortHandler);
        const onEnd = this.activeOnFreezeEnd;
        this.activeOnFreezeEnd = undefined;
        onEnd?.();
      }
    }, durationMs);
  }

  /**
   * Instantly cancels any active hit-stop and restores normal presentation speed.
   */
  public cancelHitStop(): void {
    this.hitStopGeneration++;
    if (this.hitStopTimer) {
      clearTimeout(this.hitStopTimer);
      this.hitStopTimer = undefined;
    }
    this.isHitStopActive = false;
    this.hitStopRemainingMs = 0;
    this.activeOnFreezeEnd = undefined;
  }

  public setTimeScale(scale: number): void {
    this.presentationTimeScale = Math.max(0.1, Math.min(5.0, Number.isFinite(scale) ? scale : 1.0));
  }

  public getTimeScale(): number {
    return this.isHitStopActive ? 0 : this.presentationTimeScale;
  }

  public getPresentationTime(): number {
    return this.presentationTime;
  }

  public isFrozen(): boolean {
    return this.isHitStopActive;
  }

  public getGeneration(): number {
    return this.hitStopGeneration;
  }

  public dispose(): void {
    this.cancelHitStop();
    this.presentationTime = 0;
    this.presentationTimeScale = 1.0;
  }
}
