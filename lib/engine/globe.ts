import { normToLatLng } from "./projection";

/**
 * GlobeController — projection orthographique sur une sphère (mode "globe").
 * Rotation automatique lente + rotation au doigt/souris, zoom, et recentrage
 * doux sur un point (ex. la lumière de l'utilisateur). Les points de la face
 * arrière (depth <= 0) sont masqués par l'appelant.
 */
export type GlobePoint = { x: number; y: number; vis: boolean; depth: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const D2R = Math.PI / 180;

export class GlobeController {
  private W = 0;
  private H = 0;
  private R0 = 0;

  private z = 1;
  private tz = 1;
  private yaw = 0; // rotation autour de l'axe vertical (radians)
  private pitch = 0.32; // inclinaison
  private yawTarget = 0;
  private pitchTarget = 0.32;
  private focusing = false;
  private dragging = false;
  private vyaw = 0;
  private vpitch = 0;

  private autoSpeed = 0.0011;

  setViewport(W: number, H: number) {
    this.W = W;
    this.H = H;
    this.R0 = Math.min(W, H) * 0.42;
  }

  get radius() {
    return this.R0 * this.z;
  }
  get pxScale() {
    return this.radius / 320;
  }

  setDragging(v: boolean) {
    this.dragging = v;
    if (v) {
      this.focusing = false;
      this.vyaw = 0;
      this.vpitch = 0;
    }
  }

  update() {
    this.z += (this.tz - this.z) * 0.18;
    if (Math.abs(this.tz - this.z) < 0.001) this.z = this.tz;
    if (this.focusing) {
      this.yaw += (this.yawTarget - this.yaw) * 0.1;
      this.pitch += (this.pitchTarget - this.pitch) * 0.1;
      if (Math.abs(this.yawTarget - this.yaw) < 0.003 && Math.abs(this.pitchTarget - this.pitch) < 0.003) {
        this.focusing = false;
      }
    } else if (!this.dragging) {
      if (Math.abs(this.vyaw) > 0.0004 || Math.abs(this.vpitch) > 0.0004) {
        // inertie de rotation
        this.yaw += this.vyaw;
        this.pitch = clamp(this.pitch + this.vpitch, -1.15, 1.15);
        this.vyaw *= 0.94;
        this.vpitch *= 0.9;
      } else {
        // reprise douce de la rotation automatique
        this.yaw += this.autoSpeed;
      }
    }
  }

  projectNorm(nx: number, ny: number): GlobePoint {
    const { lat, lng } = normToLatLng(nx, ny);
    const phi = lat * D2R;
    const lam = lng * D2R - this.yaw;
    const cosphi = Math.cos(phi);
    const x = cosphi * Math.sin(lam);
    const y = Math.sin(phi);
    const z = cosphi * Math.cos(lam);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const y2 = y * cp - z * sp;
    const z2 = z * cp + y * sp;
    const R = this.radius;
    return { x: this.W / 2 + R * x, y: this.H / 2 - R * y2, vis: z2 > 0, depth: z2 };
  }

  rotateBy(dxPx: number, dyPx: number) {
    this.dragging = true;
    this.focusing = false;
    const dyaw = -dxPx * 0.005;
    const dpitch = dyPx * 0.005;
    this.yaw += dyaw;
    this.pitch = clamp(this.pitch + dpitch, -1.15, 1.15);
    this.vyaw = this.vyaw * 0.5 + dyaw * 0.5;
    this.vpitch = this.vpitch * 0.5 + dpitch * 0.5;
  }

  zoomBy(factor: number) {
    this.tz = clamp(this.tz * factor, 0.85, 4);
  }

  /** Oriente la sphère pour amener un point normalisé face à l'observateur. */
  faceNorm(nx: number, ny: number) {
    const { lat, lng } = normToLatLng(nx, ny);
    this.yawTarget = lng * D2R;
    // ramène yaw courant dans le même tour que la cible pour un chemin court
    const twoPi = Math.PI * 2;
    while (this.yawTarget - this.yaw > Math.PI) this.yaw += twoPi;
    while (this.yawTarget - this.yaw < -Math.PI) this.yaw -= twoPi;
    this.pitchTarget = clamp(lat * D2R * 0.6, -0.9, 0.9);
    this.tz = Math.max(this.tz, 1.5);
    this.focusing = true;
  }

  reset() {
    this.tz = 1;
    this.pitchTarget = 0.3;
    this.yawTarget = this.yaw;
    this.focusing = true;
  }
}
