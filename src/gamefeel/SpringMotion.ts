/**
 * SpringMotion.ts
 * High-performance 2D/3D Spring Physics for tactile card interactions.
 * Replaces rigid linear tweens with Hooke's Law + viscous damping.
 * 
 * Based on the spring simulation used in Balatro (Love2D) and Apple UIKit dynamics.
 */

export interface SpringConfig {
  stiffness: number; // Spring tension (e.g. 180 - 300)
  damping: number;   // Friction/damping (e.g. 12 - 24)
  mass: number;      // Inertia mass (e.g. 1.0)
  precision?: number; // Settle threshold (default 0.001)
}

export const SPRING_PRESETS = {
  // Snappy, energetic card selection / pop
  snappy: { stiffness: 260, damping: 20, mass: 1.0, precision: 0.001 },
  // Soft, organic card return / settle
  gentle: { stiffness: 140, damping: 16, mass: 1.2, precision: 0.001 },
  // Exaggerated bounce for big multiplier explosion
  bouncy: { stiffness: 320, damping: 12, mass: 0.8, precision: 0.0005 },
  // Stiff for UI button clicks
  stiff: { stiffness: 400, damping: 28, mass: 1.0, precision: 0.001 }
} as const;

export class Spring1D {
  public value: number;
  public target: number;
  public velocity: number = 0;
  private config: SpringConfig;

  constructor(initial: number, config: SpringConfig = SPRING_PRESETS.snappy) {
    this.value = initial;
    this.target = initial;
    this.config = config;
  }

  public setTarget(target: number): void {
    this.target = target;
  }

  public reset(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  public step(dtSeconds: number): boolean {
    const { stiffness, damping, mass, precision = 0.001 } = this.config;
    // Semi-implicit Euler integration
    const displacement = this.value - this.target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * this.velocity;
    const acceleration = (springForce + dampingForce) / mass;

    this.velocity += acceleration * dtSeconds;
    this.value += this.velocity * dtSeconds;

    if (Math.abs(displacement) < precision && Math.abs(this.velocity) < precision) {
      this.value = this.target;
      this.velocity = 0;
      return true; // Settled
    }
    return false; // Still moving
  }
}

export class Spring2D {
  public x: Spring1D;
  public y: Spring1D;
  public scale: Spring1D;
  public rotation: Spring1D;

  constructor(x: number, y: number, scale: number = 1.0, rotation: number = 0) {
    this.x = new Spring1D(x);
    this.y = new Spring1D(y);
    this.scale = new Spring1D(scale);
    this.rotation = new Spring1D(rotation);
  }

  public setTarget(x: number, y: number, scale?: number, rotation?: number): void {
    this.x.setTarget(x);
    this.y.setTarget(y);
    if (scale !== undefined) this.scale.setTarget(scale);
    if (rotation !== undefined) this.rotation.setTarget(rotation);
  }

  public step(dtSeconds: number): boolean {
    const settledX = this.x.step(dtSeconds);
    const settledY = this.y.step(dtSeconds);
    const settledS = this.scale.step(dtSeconds);
    const settledR = this.rotation.step(dtSeconds);
    return settledX && settledY && settledS && settledR;
  }
}
