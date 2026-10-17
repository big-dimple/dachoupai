/**
 * HitStopManager.ts
 * Micro-freeze Frame Orchestrator (Hit-Stop / Screen Pause).
 * 
 * Slay the Spire / Street Fighter design pattern:
 * When a major multiplier or game-winning hand triggers, freezing the game loop
 * for 40-60 milliseconds creates visceral psychological weight and immense impact.
 */

export class HitStopManager {
  private static isFrozen: boolean = false;
  private static freezeEndTime: number = 0;

  /**
   * Triggers a micro-freeze frame effect.
   * @param durationMs Freeze duration in milliseconds (typically 40ms to 80ms)
   * @param onComplete Callback invoked when freeze releases (e.g. trigger screen shake, camera punch)
   */
  public static trigger(durationMs: number = 50, onComplete?: () => void): void {
    if (this.isFrozen) return; // Prevent cascading freeze locks

    this.isFrozen = true;
    this.freezeEndTime = performance.now() + durationMs;

    window.setTimeout(() => {
      this.isFrozen = false;
      if (onComplete) {
        onComplete();
      }
    }, durationMs);
  }

  /**
   * Check if the current frame update should be paused by hit-stop.
   */
  public static shouldPauseUpdate(): boolean {
    if (!this.isFrozen) return false;
    if (performance.now() >= this.freezeEndTime) {
      this.isFrozen = false;
      return false;
    }
    return true;
  }
}
