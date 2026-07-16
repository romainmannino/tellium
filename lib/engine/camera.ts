import { mapRect, type Rect } from "./projection";

/**
 * CameraController — pan / zoom fluides avec INERTIE (comportement type Google Maps).
 *
 *   screen = center + (baseRectPoint - center) * z + pan
 *
 * - zoom : easing exponentiel vers `tz`.
 * - pan pendant recentrage / zoom fluide : easing vers (tpx, tpy).
 * - pan après un lâcher de drag : inertie avec décélération.
 */
export class CameraController {
  private W = 0;
  private H = 0;
  private base: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private z = 1;
  private px = 0;
  private py = 0;
  private tz = 1;
  private tpx = 0;
  private tpy = 0;

  private vx = 0;
  private vy = 0;
  private dragging = false;
  private easingPan = false;

  readonly minZoom = 1;
  readonly maxZoom = 8;

  setViewport(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.base = mapRect(W, H);
    this.clampTarget();
  }

  getBase(): Rect {
    return this.base;
  }
  get zoom() {
    return this.z;
  }
  get pxScale() {
    return (this.base.w / 1400) * this.z;
  }

  private cx() {
    return this.W / 2;
  }
  private cy() {
    return this.H / 2;
  }

  update() {
    this.z += (this.tz - this.z) * 0.16;
    if (Math.abs(this.z - this.tz) < 0.0008) this.z = this.tz;

    if (this.easingPan) {
      this.px += (this.tpx - this.px) * 0.16;
      this.py += (this.tpy - this.py) * 0.16;
      if (Math.abs(this.px - this.tpx) < 0.4 && Math.abs(this.py - this.tpy) < 0.4) {
        this.px = this.tpx;
        this.py = this.tpy;
        this.easingPan = false;
      }
    } else if (!this.dragging && (Math.abs(this.vx) > 0.08 || Math.abs(this.vy) > 0.08)) {
      const c = this.clampPan(this.px + this.vx, this.py + this.vy, this.z);
      this.px = c.px;
      this.py = c.py;
      this.tpx = c.px;
      this.tpy = c.py;
      this.vx *= 0.92;
      this.vy *= 0.92;
    }
  }

  toScreen(nx: number, ny: number) {
    const bx = this.base.x + nx * this.base.w;
    const by = this.base.y + ny * this.base.h;
    return {
      x: this.cx() + (bx - this.cx()) * this.z + this.px,
      y: this.cy() + (by - this.cy()) * this.z + this.py,
    };
  }

  toNorm(sx: number, sy: number) {
    const bx = (sx - this.px - this.cx()) / this.z + this.cx();
    const by = (sy - this.py - this.cy()) / this.z + this.cy();
    return { nx: (bx - this.base.x) / this.base.w, ny: (by - this.base.y) / this.base.h };
  }

  private clampZoom(z: number) {
    return Math.max(this.minZoom, Math.min(this.maxZoom, z));
  }

  private clampPan(px: number, py: number, z: number) {
    const halfW = (this.base.w * z) / 2;
    const halfH = (this.base.h * z) / 2;
    const maxX = Math.max(0, halfW - this.W / 2 + this.W * 0.5);
    const maxY = Math.max(0, halfH - this.H / 2 + this.H * 0.5);
    return { px: Math.max(-maxX, Math.min(maxX, px)), py: Math.max(-maxY, Math.min(maxY, py)) };
  }

  private clampTarget() {
    this.tz = this.clampZoom(this.tz);
    const c = this.clampPan(this.tpx, this.tpy, this.tz);
    this.tpx = c.px;
    this.tpy = c.py;
  }

  startPan() {
    this.dragging = true;
    this.easingPan = false;
    this.vx = 0;
    this.vy = 0;
  }

  panBy(dx: number, dy: number) {
    const c = this.clampPan(this.px + dx, this.py + dy, this.z);
    this.px = c.px;
    this.py = c.py;
    this.tpx = c.px;
    this.tpy = c.py;
    // vélocité lissée pour un fling naturel
    this.vx = this.vx * 0.6 + dx * 0.4;
    this.vy = this.vy * 0.6 + dy * 0.4;
  }

  endPan() {
    this.dragging = false;
  }

  zoomAt(sx: number, sy: number, factor: number, smooth = false) {
    const nz = this.clampZoom((smooth ? this.tz : this.z) * factor);
    const refZ = smooth ? this.tz : this.z;
    const refPx = smooth ? this.tpx : this.px;
    const refPy = smooth ? this.tpy : this.py;
    const bx = (sx - refPx - this.cx()) / refZ + this.cx();
    const by = (sy - refPy - this.cy()) / refZ + this.cy();
    const npx = sx - this.cx() - (bx - this.cx()) * nz;
    const npy = sy - this.cy() - (by - this.cy()) * nz;
    const c = this.clampPan(npx, npy, nz);
    this.tz = nz;
    this.tpx = c.px;
    this.tpy = c.py;
    this.vx = 0;
    this.vy = 0;
    if (smooth) {
      this.easingPan = true;
    } else {
      this.z = nz;
      this.px = c.px;
      this.py = c.py;
    }
  }

  focus(nx: number, ny: number, zoom: number) {
    const nz = this.clampZoom(zoom);
    const bx = this.base.x + nx * this.base.w;
    const by = this.base.y + ny * this.base.h;
    const c = this.clampPan((this.cx() - bx) * nz, (this.cy() - by) * nz, nz);
    this.tz = nz;
    this.tpx = c.px;
    this.tpy = c.py;
    this.vx = 0;
    this.vy = 0;
    this.easingPan = true;
  }

  reset() {
    this.tz = 1;
    this.tpx = 0;
    this.tpy = 0;
    this.vx = 0;
    this.vy = 0;
    this.easingPan = true;
  }

  nudgeZoom(factor: number) {
    this.zoomAt(this.cx(), this.cy(), factor, true);
  }
}
