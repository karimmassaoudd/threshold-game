import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent } from "../utils/roadMath.js";

export class CarController {
  constructor(model, preset, physics) {
    this.group = new THREE.Group();
    this.model = model;
    // Procedural cars are authored with the nose toward local -Z, while the
    // driving controller moves forward along +Z. Rotate the visible model so
    // chase camera sees the rear of the car when accelerating.
    this.model.rotation.y = Math.PI;
    this.group.add(model);
    this.physics = physics;
    this.stats = model.userData.stats ?? preset;

    // State
    this.position = new THREE.Vector3();
    this.forward  = new THREE.Vector3(0, 0, -1); // car faces -Z by default
    this.speed    = 0;   // m/s
    this.steer    = 0;   // -1 to +1
    this.lateral  = 0;   // lateral offset on road
    this.progress = 0;   // distance along road
    this.yaw      = 0;   // world rotation Y
    this.rpm      = 0;   // 0-1 for HUD
    this.gear     = 1;
    this.turbo    = 100; // 0-100 %
    this.turboActive = false;
    this.damage   = 0;
    this.lap      = 1;
    this.raceTime = 0;
    this.cameraShake = 0;
    this.drifting = false;
    this.driftAmount = 0;
    this.slip = 0;

    // Smooth body roll / pitch for animation
    this._roll  = 0;
    this._pitch = 0;

    // Physics body (larger to match bigger car)
    this.body = new CANNON.Body({
      mass: this.stats.mass,
      material: physics.materials.tire,
      linearDamping: 0.10,
      angularDamping: 0.55,
    });
    this.body.addShape(new CANNON.Box(new CANNON.Vec3(1.45, 0.55, 2.95)));
    physics.addBody(this.body);
    this.reset();
  }

  setPosition(position, speed = 0) {
    this.progress = position.z;
    this.lateral  = 0;
    this.speed    = speed;
    this.syncToRoad();
  }

  reset() {
    this.speed    = 0;
    this.steer    = 0;
    this.lateral  = 0;
    this.progress = 0;
    this.yaw      = 0;
    this.turbo    = 100;
    this.damage   = 0;
    this.lap      = 1;
    this.raceTime = 0;
    this.cameraShake = 0;
    this.driftAmount = 0;
    this.slip = 0;
    this._roll    = 0;
    this._pitch   = 0;
    this.syncToRoad();
  }

  update(dt, input, settings) {
    const throttle   = input.has("KeyW") || input.has("ArrowUp");
    const braking    = input.has("KeyS") || input.has("ArrowDown");
    const left       = input.has("KeyA") || input.has("ArrowLeft");
    const right      = input.has("KeyD") || input.has("ArrowRight");
    const handbrake  = input.has("Space");
    const turboKey   = input.has("ShiftLeft") || input.has("ShiftRight");

    const maxSpeedMs = this.stats.maxSpeed / 3.6; // km/h → m/s
    const turboMaxMs = 240 / 3.6;

    // ── Turbo ─────────────────────────────────────────────────────────────────
    const turboCanRun = turboKey && throttle && this.turbo > 0;
    this.turboActive  = turboCanRun;
    if (turboCanRun)  this.turbo = Math.max(0, this.turbo - 28 * dt);
    else              this.turbo = Math.min(100, this.turbo + 8 * dt);

    const speedCap = turboCanRun ? turboMaxMs : maxSpeedMs;

    // ── Torque curve — high pull at low speed, tapers near max ───────────────
    const healthFactor = 1 - this.damage * 0.003;
    const turboBoost   = turboCanRun ? 1.85 : 1.0;
    const speedRatio   = Math.abs(this.speed) / speedCap;
    // Torque curve: strong 0→40% speed, then tapers
    const torqueCurve  = Math.max(0.08, 1 - speedRatio * 0.82);
    const accel        = (this.stats.power / this.stats.mass) * turboBoost * torqueCurve * healthFactor;

    if (throttle && this.speed < speedCap) {
      this.speed += accel * dt;
    }

    // Natural drag (aerodynamic) — speed² makes it feel real
    const drag = 0.0028 * this.speed * Math.abs(this.speed);
    this.speed -= drag * dt;

    // Engine braking when off throttle
    if (!throttle && !braking) {
      this.speed -= Math.sign(this.speed) * 6.5 * dt;
    }

    // Brake / reverse
    if (braking) {
      if (this.speed > 0.5) {
        // Forward → brake
        this.speed -= this.stats.brake * dt;
      } else {
        // Reverse — limited to -11 m/s (~40 km/h)
        this.speed -= 9.5 * dt;
        this.speed = Math.max(-11, this.speed);
      }
    }

    // Handbrake — rapid speed bleed + kill lateral stability
    if (handbrake) {
      this.speed *= Math.pow(0.72, dt);
    }

    // Clamp speed
    this.speed = THREE.MathUtils.clamp(this.speed, -11, turboCanRun ? turboMaxMs : maxSpeedMs);

    // ── Steering ─────────────────────────────────────────────────────────────
    // Speed-sensitive: fast car = less steering range, slower response
    const steerTarget  = (right ? 1 : 0) - (left ? 1 : 0);
    const steerRate    = 1 - Math.pow(0.0004, dt);
    this.steer = THREE.MathUtils.lerp(this.steer, steerTarget, steerRate);

    const absSpeedKmh  = Math.abs(this.speed * 3.6);
    const grip         = this.stats.grip * (settings.stabilityAssist ? 1.12 : 0.85);
    // Steering rate: peaks around 50 km/h, reduces at very high speed
    const turnRate     = Math.min(1.6, absSpeedKmh / 30) * Math.max(0.25, 1 - absSpeedKmh / 380);
    const wantsDrift = absSpeedKmh > 28 && Math.abs(this.steer) > 0.06 && (
      handbrake ||
      (this.drifting && throttle && Math.abs(this.steer) > 0.16)
    );
    const driftTarget = wantsDrift
      ? THREE.MathUtils.clamp(this.steer * (handbrake ? 1.28 : 0.82) * Math.min(1.35, absSpeedKmh / 72), -1, 1)
      : 0;
    const driftResponse = wantsDrift ? 1 - Math.pow(0.00002, dt) : 1 - Math.pow(0.015, dt);
    this.driftAmount = THREE.MathUtils.lerp(this.driftAmount, driftTarget, driftResponse);
    this.slip = THREE.MathUtils.clamp(Math.abs(this.driftAmount) + (handbrake && absSpeedKmh > 30 ? 0.25 : 0), 0, 1);
    this.drifting = this.slip > 0.08;
    const driftMul = this.drifting ? 3.15 : 1.0;

    this.lateral += this.steer * this.stats.steering * this.speed * 0.065 * turnRate * driftMul * dt;
    this.lateral += this.driftAmount * Math.abs(this.speed) * 0.105 * dt;
    if (handbrake) {
      this.cameraShake = Math.max(this.cameraShake, 0.08 + this.slip * 0.12);
    }

    // Stability assist — lateral grip restores centre
    if (settings.stabilityAssist) {
      const assistGrip = this.drifting ? 0.22 : 1.0;
      this.lateral *= 1 - Math.min(0.88, dt * 0.7 * grip * assistGrip);
    }

    // Wall collision (lateral limit)
    const wallLimit = 8.5;
    if (Math.abs(this.lateral) > wallLimit) {
      this.lateral = THREE.MathUtils.clamp(this.lateral, -wallLimit, wallLimit);
      const impact = Math.abs(this.speed * 0.4);
      this.speed  *= 0.55;
      this.damage  = Math.min(100, this.damage + 9 * dt);
      this.cameraShake = Math.max(this.cameraShake, 0.35 + impact * 0.01);
      this._wallHit = true;
    } else {
      this._wallHit = false;
    }

    // ── Progress / laps ───────────────────────────────────────────────────────
    this.progress += this.speed * dt;
    if (this.progress >= this.lap * 5200) {
      this.lap   = Math.min(3, this.lap + 1);
      this.turbo = 100;
    }
    this.raceTime += dt;

    // ── RPM / Gear ────────────────────────────────────────────────────────────
    const speedKmh = Math.abs(this.speed * 3.6);
    this.rpm  = THREE.MathUtils.clamp((speedKmh % 68) / 68 + (throttle ? 0.22 : 0.0), 0, 1);
    this.gear = this.speed < 0 ? -1 : (this.speed < 2 ? 0 : Math.min(7, Math.max(1, Math.floor(speedKmh / 44) + 1)));

    // ── Body roll / pitch animation ───────────────────────────────────────────
    const rollTarget  = -this.steer * Math.min(0.14, absSpeedKmh / 800) - this.driftAmount * 0.075;
    const pitchTarget =  throttle ? -0.025 : (braking || handbrake ? 0.032 : 0);
    this._roll  = THREE.MathUtils.lerp(this._roll,  rollTarget,  1 - Math.pow(0.008, dt));
    this._pitch = THREE.MathUtils.lerp(this._pitch, pitchTarget, 1 - Math.pow(0.01, dt));

    this.cameraShake = Math.max(0, this.cameraShake - dt * 3.5);
    this.syncToRoad();
  }

  syncToRoad() {
    const road    = roadPoint(this.progress, this.lateral);
    const tangent = roadTangent(this.progress);
    const curveYaw = Math.atan2(tangent.x, tangent.z);

    // Drift yaw: rear swings out
    const steeringYaw = -this.steer * Math.min(0.38, Math.abs(this.speed) / 140);
    const driftYaw = -this.driftAmount * 0.82;
    this.yaw = THREE.MathUtils.lerp(this.yaw, curveYaw + steeringYaw + driftYaw, this.drifting ? 0.28 : 0.18);

    this.position.copy(road);
    this.position.y += 0.58; // ride height
    this.group.position.copy(this.position);
    this.group.rotation.set(
      this._pitch + 0.014 * Math.sin(this.progress * 0.01),
      this.yaw,
      this._roll
    );

    // Sync physics body
    this.body.position.set(this.position.x, this.position.y, this.position.z);
    this.body.quaternion.setFromEuler(
      this.group.rotation.x,
      this.group.rotation.y,
      this.group.rotation.z
    );

    // Wheel spin & steering
    for (const wheel of this.model.userData.wheels ?? []) {
      const spinRate = this.speed * 0.6;
      wheel.rotation.x -= spinRate * 0.017; // continuous spin
      // Front wheels steer
      if (wheel.userData.isFront) {
        wheel.rotation.y = -this.steer * 0.42;
      }
    }

    // Forward vector (direction car is pointing)
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  dispose() {
    this.physics.removeBody(this.body);
    this.group.removeFromParent();
  }
}
