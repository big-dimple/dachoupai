/**
 * CardTiltEffect.ts
 * 2.5D Perspective Card Tilt and Dynamic Specular Glare (Balatro-style tactile card feel).
 * 
 * Tracks mouse/touch movement relative to the card center and calculates:
 * - 3D rotation angles (rotateX, rotateY)
 * - Dynamic specular reflection angle for holographic/gold foil glint
 * - Smooth spring interpolation back to flat rest state on pointer exit
 */

export interface TiltState {
  rotateX: number; // degrees
  rotateY: number; // degrees
  glareX: number;  // 0% - 100%
  glareY: number;  // 0% - 100%
  glareOpacity: number; // 0 - 1
}

export class CardTiltEffect {
  private element: HTMLElement;
  private maxTiltDeg: number;
  private currentRotateX: number = 0;
  private currentRotateY: number = 0;
  private targetRotateX: number = 0;
  private targetRotateY: number = 0;
  private targetGlareX: number = 50;
  private targetGlareY: number = 50;
  private targetGlareOpacity: number = 0;
  private isHovered: boolean = false;

  constructor(element: HTMLElement, maxTiltDeg: number = 14) {
    this.element = element;
    this.maxTiltDeg = maxTiltDeg;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.element.addEventListener('pointerenter', () => {
      this.isHovered = true;
      this.targetGlareOpacity = 0.35;
    });

    this.element.addEventListener('pointermove', (e: PointerEvent) => {
      const rect = this.element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalized coordinates: -1 to +1 from center
      const normX = (x / rect.width) * 2 - 1;
      const normY = (y / rect.height) * 2 - 1;

      // Inverse Y for 3D rotation (tilting up when mouse is top)
      this.targetRotateX = -normY * this.maxTiltDeg;
      this.targetRotateY = normX * this.maxTiltDeg;

      this.targetGlareX = (x / rect.width) * 100;
      this.targetGlareY = (y / rect.height) * 100;
    });

    this.element.addEventListener('pointerleave', () => {
      this.isHovered = false;
      this.targetRotateX = 0;
      this.targetRotateY = 0;
      this.targetGlareOpacity = 0;
    });
  }

  /**
   * Call in game loop or requestAnimationFrame to smoothly update transform matrix.
   */
  public update(lerpFactor: number = 0.15): void {
    this.currentRotateX += (this.targetRotateX - this.currentRotateX) * lerpFactor;
    this.currentRotateY += (this.targetRotateY - this.currentRotateY) * lerpFactor;

    // Apply 3D perspective matrix
    this.element.style.transform = `perspective(800px) rotateX(${this.currentRotateX.toFixed(2)}deg) rotateY(${this.currentRotateY.toFixed(2)}deg)`;
    
    // If element has a glare layer, update its background position
    const glare = this.element.querySelector<HTMLElement>('.card-glare-overlay');
    if (glare) {
      glare.style.background = `radial-gradient(circle at ${this.targetGlareX}% ${this.targetGlareY}%, rgba(255,215,0,${this.targetGlareOpacity}) 0%, transparent 70%)`;
    }
  }

  public destroy(): void {
    this.element.style.transform = '';
  }
}
