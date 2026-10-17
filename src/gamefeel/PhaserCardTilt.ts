/**
 * PhaserCardTilt.ts
 * 2.5D Perspective Tilt & Parallax Component specifically designed for Phaser 3 Containers.
 * 
 * Complies with Dachoupai Table Architecture:
 * - Operates strictly on an inner visual container (innerVisual), NEVER mutating outer container position/scale/rotation.
 * - Uses container.getLocalPoint(worldX, worldY) to correctly respect parent transforms, zoom, and nested containers.
 * - Retains full pointer click, selection, and drag hit-testing without hijacking drag x/y.
 * - Multi-layer internal parallax (art shifts relative to tilt).
 * - Complete teardown and listener cleanup in destroy(), resetting visual layer to identity.
 */

import Phaser from 'phaser';

export interface PhaserCardTiltConfig {
  maxRotationDeg?: number;    // Maximum tilt angle in degrees (default 6.0)
  scaleModulation?: number;   // Perspective foreshortening ratio (default 0.04)
  artParallaxPx?: number;     // Multi-layer art displacement in pixels (default 5.0)
  dragLeanFactor?: number;    // Tilt intensity during drag velocity (default 0.08)
  lerpSpeed?: number;         // Interpolation smoothness (default 0.20)
}

export class PhaserCardTilt {
  private container: Phaser.GameObjects.Container;
  private innerVisual: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private config: Required<PhaserCardTiltConfig>;

  // Target visual transforms (applied strictly to innerVisual)
  private targetRotation: number = 0;
  private targetScaleX: number = 1.0;
  private targetScaleY: number = 1.0;
  private targetArtOffsetX: number = 0;
  private targetArtOffsetY: number = 0;

  // Internal child references
  private artChild?: Phaser.GameObjects.GameObject;
  private glareChild?: Phaser.GameObjects.Graphics;

  // State flags
  private isHovered: boolean = false;
  private isDragging: boolean = false;
  private lastDragX: number = 0;
  private lastDragY: number = 0;
  private isDestroyed: boolean = false;

  // Bound listener references for strict cleanup
  private onPointerOverBound: (p: Phaser.Input.Pointer) => void;
  private onPointerMoveBound: (p: Phaser.Input.Pointer) => void;
  private onPointerOutBound: (p: Phaser.Input.Pointer) => void;
  private onDragStartBound: (p: Phaser.Input.Pointer) => void;
  private onDragBound: (p: Phaser.Input.Pointer) => void;
  private onDragEndBound: (p: Phaser.Input.Pointer) => void;

  constructor(
    container: Phaser.GameObjects.Container,
    cardWidth: number,
    cardHeight: number,
    innerVisualOrArtName?: Phaser.GameObjects.Container | string,
    config: PhaserCardTiltConfig = {}
  ) {
    this.container = container;
    this.scene = container.scene;

    this.config = {
      maxRotationDeg: config.maxRotationDeg ?? 6.0,
      scaleModulation: config.scaleModulation ?? 0.04,
      artParallaxPx: config.artParallaxPx ?? 5.0,
      dragLeanFactor: config.dragLeanFactor ?? 0.08,
      lerpSpeed: config.lerpSpeed ?? 0.20
    };

    // Resolve or establish inner visual layer
    if (innerVisualOrArtName instanceof Phaser.GameObjects.Container) {
      this.innerVisual = innerVisualOrArtName;
    } else {
      const found = container.getByName('card-visual') as Phaser.GameObjects.Container | null;
      if (found && found instanceof Phaser.GameObjects.Container) {
        this.innerVisual = found;
      } else {
        // If container already has children but no dedicated visual layer, wrap them
        this.innerVisual = this.scene.add.container(0, 0);
        this.innerVisual.setName('card-visual');
        const children = [...container.list];
        for (const child of children) {
          container.remove(child);
          this.innerVisual.add(child);
        }
        container.add(this.innerVisual);
      }
    }

    // Resolve art child for layered parallax
    if (typeof innerVisualOrArtName === 'string') {
      this.artChild = this.innerVisual.getByName(innerVisualOrArtName) ?? container.getByName(innerVisualOrArtName);
    } else {
      this.artChild = this.innerVisual.getByName('card-art') ?? this.innerVisual.getAt(0);
    }

    // Optional subtle additive specular glare layer inside inner visual
    this.glareChild = this.scene.add.graphics();
    this.glareChild.setBlendMode(Phaser.BlendModes.ADD);
    this.glareChild.setAlpha(0);
    this.innerVisual.add(this.glareChild);

    // Bind event handlers
    this.onPointerOverBound = this.handlePointerOver.bind(this);
    this.onPointerMoveBound = (p) => this.handlePointerMove(p, cardWidth, cardHeight);
    this.onPointerOutBound = this.handlePointerOut.bind(this);
    this.onDragStartBound = this.handleDragStart.bind(this);
    this.onDragBound = this.handleDrag.bind(this);
    this.onDragEndBound = this.handleDragEnd.bind(this);

    this.setupInteractivity(cardWidth, cardHeight);
  }

  private setupInteractivity(width: number, height: number): void {
    // If container not already interactive, set centered hit area
    if (!this.container.input) {
      this.container.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
    }

    this.container.on(Phaser.Input.Events.POINTER_OVER, this.onPointerOverBound);
    this.container.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMoveBound);
    this.container.on(Phaser.Input.Events.POINTER_OUT, this.onPointerOutBound);
    this.container.on(Phaser.Input.Events.DRAG_START, this.onDragStartBound);
    this.container.on(Phaser.Input.Events.DRAG, this.onDragBound);
    this.container.on(Phaser.Input.Events.DRAG_END, this.onDragEndBound);
  }

  private handlePointerOver(): void {
    if (this.isDestroyed) return;
    this.isHovered = true;
    if (this.glareChild) this.glareChild.setAlpha(0.25);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer, width: number, height: number): void {
    if (this.isDestroyed || this.isDragging) return;

    // Convert world pointer coordinates into container local coordinate space properly
    const localPoint = this.container.getLocalPoint(pointer.worldX, pointer.worldY);
    const normX = Phaser.Math.Clamp(localPoint.x / (width * 0.5), -1, 1);
    const normY = Phaser.Math.Clamp(localPoint.y / (height * 0.5), -1, 1);

    // Tilt rotation in radians (applied to innerVisual)
    const maxRad = Phaser.Math.DegToRad(this.config.maxRotationDeg);
    this.targetRotation = normX * maxRad;

    // Perspective foreshortening: slight scale compression perpendicular to tilt
    this.targetScaleX = 1 - Math.abs(normX) * this.config.scaleModulation;
    this.targetScaleY = 1 - Math.abs(normY) * this.config.scaleModulation;

    // Multi-layer parallax: art shifts slightly opposite to perspective
    this.targetArtOffsetX = normX * this.config.artParallaxPx;
    this.targetArtOffsetY = normY * this.config.artParallaxPx;

    // Update specular glare highlight
    if (this.glareChild) {
      this.glareChild.clear();
      this.glareChild.fillStyle(0xfff4c2, 0.22);
      this.glareChild.fillCircle(-normX * (width * 0.3), -normY * (height * 0.3), width * 0.45);
    }
  }

  private handlePointerOut(): void {
    if (this.isDestroyed) return;
    this.isHovered = false;
    this.resetTargets();
  }

  private handleDragStart(pointer: Phaser.Input.Pointer): void {
    if (this.isDestroyed) return;
    this.isDragging = true;
    this.lastDragX = pointer.x;
    this.lastDragY = pointer.y;
    this.targetScaleX = 1.05;
    this.targetScaleY = 1.05;
  }

  private handleDrag(pointer: Phaser.Input.Pointer): void {
    if (this.isDestroyed) return;
    // Calculate drag velocity for dynamic lean without hijacking container x/y
    const vx = pointer.x - this.lastDragX;
    this.lastDragX = pointer.x;
    this.lastDragY = pointer.y;

    const leanAngle = Phaser.Math.Clamp(vx * this.config.dragLeanFactor, -12, 12);
    this.targetRotation = Phaser.Math.DegToRad(leanAngle);
  }

  private handleDragEnd(): void {
    if (this.isDestroyed) return;
    this.isDragging = false;
    this.resetTargets();
  }

  private resetTargets(): void {
    this.targetRotation = 0;
    this.targetScaleX = 1.0;
    this.targetScaleY = 1.0;
    this.targetArtOffsetX = 0;
    this.targetArtOffsetY = 0;
    if (this.glareChild) this.glareChild.setAlpha(0);
  }

  /**
   * Advances smooth interpolation. Call within Phaser scene update(time, delta).
   */
  public update(): void {
    if (this.isDestroyed) return;
    const lerp = this.config.lerpSpeed;

    // Interpolate strictly on innerVisual
    this.innerVisual.rotation = Phaser.Math.Linear(this.innerVisual.rotation, this.targetRotation, lerp);
    this.innerVisual.scaleX = Phaser.Math.Linear(this.innerVisual.scaleX, this.targetScaleX, lerp);
    this.innerVisual.scaleY = Phaser.Math.Linear(this.innerVisual.scaleY, this.targetScaleY, lerp);

    // Interpolate internal art parallax offset
    if (this.artChild && 'x' in this.artChild && 'y' in this.artChild) {
      const art = this.artChild as unknown as { x: number; y: number };
      art.x = Phaser.Math.Linear(art.x, this.targetArtOffsetX, lerp);
      art.y = Phaser.Math.Linear(art.y, this.targetArtOffsetY, lerp);
    }
  }

  public getInnerVisual(): Phaser.GameObjects.Container {
    return this.innerVisual;
  }

  /**
   * Strict teardown: unbinds all listeners and resets inner visual transforms to identity.
   */
  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Unbind listeners from container
    this.container.off(Phaser.Input.Events.POINTER_OVER, this.onPointerOverBound);
    this.container.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMoveBound);
    this.container.off(Phaser.Input.Events.POINTER_OUT, this.onPointerOutBound);
    this.container.off(Phaser.Input.Events.DRAG_START, this.onDragStartBound);
    this.container.off(Phaser.Input.Events.DRAG, this.onDragBound);
    this.container.off(Phaser.Input.Events.DRAG_END, this.onDragEndBound);

    // Reset innerVisual to baseline
    this.innerVisual.rotation = 0;
    this.innerVisual.scaleX = 1.0;
    this.innerVisual.scaleY = 1.0;

    if (this.artChild && 'x' in this.artChild && 'y' in this.artChild) {
      const art = this.artChild as unknown as { x: number; y: number };
      art.x = 0;
      art.y = 0;
    }

    if (this.glareChild) {
      this.glareChild.destroy();
      this.glareChild = undefined;
    }

    this.artChild = undefined;
  }
}
