import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class CameraRig {
  constructor(camera, canvas, settings) {
    this.camera = camera;
    this.canvas = canvas;
    this.settings = settings;
    this.modes = ["Chase", "Cockpit", "Hood", "Cinematic", "Free"];
    this.mode = settings.cameraMode;

    // Free-cam orbit
    this.orbit = new OrbitControls(camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.enabled = false;

    // Smoothed camera state
    this.camPos = new THREE.Vector3(0, 5, 20);
    this.camTarget = new THREE.Vector3(0, 0, 0);

    // Cinematic orbit angle
    this._cinematicAngle = 0;
  }

  applySettings(settings) {
    this.settings = settings;
    this.mode = settings.cameraMode;
  }

  // Legacy pointer-lock support (no longer locks but keeps compat)
  requestPointer() {}
  releasePointer() {}

  nextMode() {
    const idx = (this.modes.indexOf(this.mode) + 1) % this.modes.length;
    this.mode = this.modes[idx];
    this.settings.cameraMode = this.mode;
  }

  update(dt, car, input) {
    const cam = this.camera;
    const pos = car.position;          // world position of car centre
    const fwd = car.forward.clone();   // unit vector car is FACING (toward -Z local)
    // "behind" = opposite of forward
    const back = fwd.clone().negate();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x).normalize();
    const shake = car.cameraShake * (Math.random() - 0.5) * 0.6;

    // Target point to look at — slightly ahead of the car on the road
    const lookTarget = pos.clone().addScaledVector(fwd, 20).add(new THREE.Vector3(0, 0.8, 0));

    // ── Chase (3rd person close behind) ──────────────────────────────────────
    if (this.mode === "Chase") {
      // Camera sits back-8.5 m and up-3.0 m from car; lowers when braking
      const speedKmh = Math.abs(car.speed * 3.6);
      const heightBias = 0.4 + Math.min(1.2, speedKmh * 0.009);
      const distBias   = 7.5 + Math.min(2.5, speedKmh * 0.015);

      _v.copy(pos)
        .addScaledVector(back, distBias)
        .add(new THREE.Vector3(0, 3.0 + heightBias + shake, 0));

      // Lateral lag — camera drifts slightly with steering
      _v.addScaledVector(right, -car.steer * 1.2 * this.settings.cameraSensitivity);

      const lerpSpeed = 1 - Math.pow(0.003, dt);
      this.camPos.lerp(_v, lerpSpeed);
      this.camTarget.lerp(lookTarget, lerpSpeed * 1.4);

      cam.position.copy(this.camPos);
      cam.lookAt(this.camTarget);

    // ── Cockpit ──────────────────────────────────────────────────────────────
    } else if (this.mode === "Cockpit") {
      // Inside cabin — forward of centre, elevated to driver eye
      _v.copy(pos)
        .addScaledVector(fwd, 0.5)
        .add(new THREE.Vector3(0, 1.05 + shake, 0));

      const look = pos.clone().addScaledVector(fwd, 80).add(new THREE.Vector3(0, 0.3, 0));

      cam.position.lerp(_v, 1 - Math.pow(0.001, dt));
      this.camTarget.lerp(look, 1 - Math.pow(0.0005, dt));
      cam.lookAt(this.camTarget);

    // ── Hood ─────────────────────────────────────────────────────────────────
    } else if (this.mode === "Hood") {
      // Just above the bonnet, looking ahead
      _v.copy(pos)
        .addScaledVector(back, 0.25)
        .add(new THREE.Vector3(0, 1.32 + shake, 0));

      const look = pos.clone().addScaledVector(fwd, 55).add(new THREE.Vector3(0, 0.0, 0));

      cam.position.lerp(_v, 1 - Math.pow(0.001, dt));
      this.camTarget.lerp(look, 1 - Math.pow(0.0005, dt));
      cam.lookAt(this.camTarget);

    // ── Cinematic ────────────────────────────────────────────────────────────
    } else if (this.mode === "Cinematic") {
      this._cinematicAngle += dt * 0.22;
      const a = this._cinematicAngle;
      const radius = 11 + Math.sin(a * 0.7) * 4;
      const height  = 4.5 + Math.sin(a * 0.4) * 2;

      _v.copy(pos)
        .addScaledVector(back, radius * Math.cos(a * 0.3))
        .addScaledVector(right, Math.sin(a) * radius * 0.6)
        .add(new THREE.Vector3(0, height + shake, 0));

      const look = pos.clone().add(new THREE.Vector3(0, 1.0, 0));

      cam.position.lerp(_v, 1 - Math.pow(0.001, dt));
      this.camTarget.lerp(look, 1 - Math.pow(0.001, dt));
      cam.lookAt(this.camTarget);

    // ── Free ─────────────────────────────────────────────────────────────────
    } else if (this.mode === "Free") {
      this.orbit.enabled = true;
      this.orbit.target.lerp(pos, 1 - Math.pow(0.001, dt));
      this.orbit.update();
      return;
    }

    // Disable orbit when not in Free mode
    if (this.orbit.enabled) {
      this.orbit.enabled = false;
    }

    // Q / E for manual lateral offset (all non-free modes)
    if (input.has("KeyQ")) cam.position.addScaledVector(right, -this.settings.cameraSensitivity * 4 * dt);
    if (input.has("KeyE")) cam.position.addScaledVector(right, this.settings.cameraSensitivity * 4 * dt);
  }
}
