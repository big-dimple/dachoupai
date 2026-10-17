/**
 * SpringMotion.ts
 * Robust 1D and Multi-axis Spring Physics for tactile card interactions.
 * 
 * Hardened for production:
 * - Clamped sub-step numerical integration (sub-stepping dt <= 8ms).
 * - Guaranteed stability against extreme frame drops, lag spikes, and browser tab switches.
 * - Guarded against zero/negative mass, NaN/Infinity propagation, and explosive overshoots.
 */

export interface SpringConfig {
  stiffness: number; // Spring tension (e.g. 180 - 350)
  damping: number;   // Viscous friction (e.g. 14 - 30)
  mass: number;      // Inertial mass (guarded > 0.01)
  precision?: number; // Settle threshold (default 0.001)
  maxVelocity?: number; // Hard clamp on velocity to prevent runaway physics
}

export const SPRING_PRESETS = {
  // Snappy, responsive card selection / lift
  snappy: { stiffness: 280, damping: 22, mass: 1.0, precision: 0.001, maxVelocity: 3000 },
  // Soft, organic card return / settle onto table
  gentle: { stiffness: 150, damping: 18, mass: 1.2, precision: 0.001, maxVelocity: 2000 },
  // Exaggerated energetic bounce for multiplier explosion
  bouncy: { stiffness: 340, damping: 14, mass: 0.8, precision: 0.0005, maxVelocity: 4000 },
  // Stiff, crisp for UI button presses
  stiff: { stiffness: 420, damping: 32, mass: 1.0, precision: 0.001, maxVelocity: 5000 }
} as const;

export class Spring1D {
  public value: number;
  public target: number;
  public velocity: number = 0;
  private config: Required<SpringConfig>;

  constructor(initial: number, config: SpringConfig = SPRING_PRESETS.snappy) {
    this.value = Number.isFinite(initial) ? initial : 0;
    this.target = this.value;
    this.config = {
      stiffness: Math.max(1, config.stiffness || 200),
      damping: Math.max(0.1, config.damping || 15),
      mass: Math.max(0.01, config.mass || 1.0),
      precision: Math.max(0.00001, config.precision || 0.001),
      maxVelocity: Math.max(100, config.maxVelocity || 3000)
    };
  }

  public setTarget(target: number): void {
    if (Number.isFinite(target)) {
      this.target = target;
    }
  }

  public reset(value: number): void {
    const v = Number.isFinite(value) ? value : 0;
    this.value = v;
    this.target = v;
    this.velocity = 0;
  }

  public setConfig(config: Partial<SpringConfig>): void {
    if (config.stiffness !== undefined) this.config.stiffness = Math.max(1, config.stiffness);
    if (config.damping !== undefined) this.config.damping = Math.max(0.1, config.damping);
    if (config.mass !== undefined) this.config.mass = Math.max(0.01, config.mass);
    if (config.precision !== undefined) this.config.precision = Math.max(0.00001, config.precision);
    if (config.maxVelocity !== undefined) this.config.maxVelocity = Math.max(100, config.maxVelocity);
  }

  /**
   * Advances spring physics by dtSeconds with sub-stepping for unconditional numerical stability.
   * Clamps max frame delta to 0.1s to prevent explosions after tab switching or long pauses.
   */
  public step(dtSeconds: number): boolean {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
      return Math.abs(this.value - this.target) < this.config.precision && Math.abs(this.velocity) < this.config.precision;
    }

    // Guard against massive frame delta (e.g. background tab return)
    const clampedDt = Math.min(dtSeconds, 0.1);
    
    // Sub-step: break into max 8ms increments (125Hz sub-stepping) for smooth integration
    const maxSubStep = 0.008;
    const steps = Math.min(20, Math.ceil(clampedDt / maxSubStep));
    const subDt = clampedDt / steps;

    const { stiffness, damping, mass, precision, maxVelocity } = this.config;

    for (let i = 0; i < steps; i++) {
      const displacement = this.value - this.target;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * this.velocity;
      const acceleration = (springForce + dampingForce) / mass;

      this.velocity += acceleration * subDt;
      // Clamp velocity to prevent runaway divergence
      if (this.velocity > maxVelocity) this.velocity = maxVelocity;
      else if (this.velocity < -maxVelocity) this.velocity = -maxVelocity;

      this.value += this.velocity * subDt;

      // Fail-safe against NaN/Infinity
      if (!Number.isFinite(this.value) || !Number.isFinite(this.velocity)) {
        this.value = this.target;
        this.velocity = 0;
        return true;
      }
    }

    // Settle check
    if (Math.abs(this.value - this.target) < precision && Math.abs(this.velocity) < precision) {
      this.value = this.target;
      this.velocity = 0;
      return true; // Settled
    }
    return false; // Still animating
  }
}

export class SpringCardTransform {
  public x: Spring1D;
  public y: Spring1D;
  public scaleX: Spring1D;
  public scaleY: Spring1D;
  public rotation: Spring1D; // in radians

  constructor(x: number, y: number, scale: number = 1.0, rotation: number = 0) {
    this.x = new Spring1D(x);
    this.y = new Spring1D(y);
    this.scaleX = new Spring1D(scale);
    this.scaleY = new Spring1D(scale);
    this.rotation = new Spring1D(rotation, { ...SPRING_PRESETS.snappy, precision: 0.0001 });
  }

  public setTarget(x: number, y: number, scale?: number, rotation?: number): void {
    this.x.setTarget(x);
    this.y.setTarget(y);
    if (scale !== undefined) {
      this.scaleX.setTarget(scale);
      this.scaleY.setTarget(scale);
    }
    if (rotation !== undefined) {
      this.rotation.setTarget(rotation);
    }
  }

  public reset(x: number = 0, y: number = 0, scale: number = 1.0, rotation: number = 0): void {
    this.x.reset(x);
    this.y.reset(y);
    this.scaleX.reset(scale);
    this.scaleY.reset(scale);
    this.rotation.reset(rotation);
  }

  public step(dtSeconds: number): boolean {
    const sX = this.x.step(dtSeconds);
    const sY = this.y.step(dtSeconds);
    const sScaleX = this.scaleX.step(dtSeconds);
    const sScaleY = this.scaleY.step(dtSeconds);
    const sRot = this.rotation.step(dtSeconds);
    return sX && sY && sScaleX && sScaleY && sRot;
  }
}
