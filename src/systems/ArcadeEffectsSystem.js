import * as THREE from "three";
import { roadPoint, roadTangent, seeded } from "../utils/roadMath.js";

const LOOP = 3600;
const BEHIND = 220;
const BOOST_SPEED = 28;
const BOOST_COOLDOWN = 0.55;
const SPEED_TRAP_MIN = 210;

const cyan = new THREE.Color(0x13e8ff);
const pink = new THREE.Color(0xff2b6d);
const gold = new THREE.Color(0xffcc33);

const padMat = new THREE.MeshBasicMaterial({ color: 0x0cd4ff, transparent: true, opacity: 0.72 });
const padTrimMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.95 });
const orbMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.9 });
const orbShellMat = new THREE.MeshBasicMaterial({ color: 0x14f1ff, transparent: true, opacity: 0.24, wireframe: true });
const gateMat = new THREE.MeshBasicMaterial({ color: 0x14f1ff, transparent: true, opacity: 0.42 });
const trailMat = new THREE.MeshBasicMaterial({ color: 0x10d9ff, transparent: true, opacity: 0.0, depthWrite: false });
const hotTrailMat = new THREE.MeshBasicMaterial({ color: 0xff2448, transparent: true, opacity: 0.0, depthWrite: false });
const speedTrapMat = new THREE.MeshBasicMaterial({ color: 0xff2b6d, transparent: true, opacity: 0.56 });
const smokeMat = new THREE.MeshBasicMaterial({ color: 0xb8c7cc, transparent: true, opacity: 0, depthWrite: false });
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0, depthWrite: false });
const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0, depthWrite: false });

export class ArcadeEffectsSystem {
  constructor(scene, audio, hud) {
    this.scene = scene;
    this.audio = audio;
    this.hud = hud;
    this.root = new THREE.Group();
    this.boostPads = [];
    this.orbs = [];
    this.gates = [];
    this.speedTraps = [];
    this.billboards = [];
    this.particles = [];
    this.collected = new Set();
    this.triggeredPads = new Set();
    this.triggeredGates = new Set();
    this.triggeredSpeedTraps = new Set();
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.boostTimer = 0;
    this.driftScoreTimer = 0;
    this.particleTimer = 0;
    this._prevProgress = 0;

    scene.add(this.root);
    this._createBoostPads();
    this._createOrbs();
    this._createGates();
    this._createSpeedTraps();
    this._createBillboards();
    this._createSpeedTrails();
    this._createFlames();
    this._createParticlePool();
  }

  reset() {
    this.collected.clear();
    this.triggeredPads.clear();
    this.triggeredGates.clear();
    this.triggeredSpeedTraps.clear();
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.boostTimer = 0;
    this.driftScoreTimer = 0;
    this.particleTimer = 0;
    this._prevProgress = 0;
    for (const particle of this.particles) {
      particle.life = 0;
      particle.object.visible = false;
    }
    this.hud?.setArcade(this.score, this.combo, "");
  }

  _createBoostPads() {
    for (let i = 0; i < 14; i++) {
      const grp = new THREE.Group();
      const pad = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.08, 9.2), padMat);
      pad.position.y = 0.08;
      grp.add(pad);

      for (let a = 0; a < 3; a++) {
        const chevron = new THREE.Group();
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 3.2), padTrimMat);
        const right = left.clone();
        left.position.set(-0.75, 0.17, -1.7 + a * 1.8);
        right.position.set(0.75, 0.17, -1.7 + a * 1.8);
        left.rotation.y = -0.72;
        right.rotation.y = 0.72;
        chevron.add(left, right);
        grp.add(chevron);
      }

      this.root.add(grp);
      this.boostPads.push({ object: grp, seed: i + 120, spacing: 255, lateral: [-6.2, 0, 6.2][i % 3] });
    }
  }

  _createOrbs() {
    const orbGeo = new THREE.SphereGeometry(0.55, 16, 12);
    const shellGeo = new THREE.TorusGeometry(0.86, 0.035, 8, 28);
    for (let i = 0; i < 24; i++) {
      const grp = new THREE.Group();
      const orb = new THREE.Mesh(orbGeo, orbMat);
      const shellA = new THREE.Mesh(shellGeo, orbShellMat);
      const shellB = new THREE.Mesh(shellGeo, orbShellMat);
      shellB.rotation.x = Math.PI / 2;
      grp.add(orb, shellA, shellB);
      this.root.add(grp);
      this.orbs.push({ object: grp, seed: i + 420, spacing: 145, lateral: [-7.4, -3.1, 3.1, 7.4][i % 4] });
    }
  }

  _createGates() {
    for (let i = 0; i < 9; i++) {
      const grp = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(22, 0.28, 0.28), gateMat);
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.28, 6.2, 0.28), gateMat);
      const right = left.clone();
      top.position.y = 6.2;
      left.position.set(-11.2, 3.1, 0);
      right.position.set(11.2, 3.1, 0);
      grp.add(top, left, right);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.06, 8, 40), gateMat);
      ring.position.y = 4.3;
      ring.rotation.x = Math.PI / 2;
      grp.add(ring);

      this.root.add(grp);
      this.gates.push({ object: grp, seed: i + 900, spacing: 420 });
    }
  }

  _createSpeedTraps() {
    for (let i = 0; i < 8; i++) {
      const grp = new THREE.Group();
      const arch = new THREE.Mesh(new THREE.BoxGeometry(23.5, 0.22, 0.22), speedTrapMat);
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 5.2, 0.24), speedTrapMat);
      const right = left.clone();
      arch.position.y = 5.2;
      left.position.set(-11.8, 2.6, 0);
      right.position.set(11.8, 2.6, 0);

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(6.8, 1.9, 0.16),
        this._createBillboardMaterial("SPEED", "TRAP", "#ff2b6d", "#101820")
      );
      sign.position.y = 4.0;
      grp.add(arch, left, right, sign);

      this.root.add(grp);
      this.speedTraps.push({ object: grp, seed: i + 1500, spacing: 500, target: SPEED_TRAP_MIN + (i % 3) * 25 });
    }
  }

  _createBillboards() {
    const labels = [
      ["TURBO", "ZONE", "#10d9ff", "#081018"],
      ["NIGHT", "RUN", "#ffcc33", "#15130a"],
      ["APEX", "DRIVE", "#ff2b6d", "#10080c"],
      ["DRIFT", "KING", "#44ff99", "#07110b"],
      ["CAFE", "OPEN", "#ffd0a3", "#21110a"],
    ];

    for (let i = 0; i < 18; i++) {
      const grp = new THREE.Group();
      const [a, b, fg, bg] = labels[i % labels.length];
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(10.5, 4.4, 0.26),
        this._createBillboardMaterial(a, b, fg, bg)
      );
      board.position.y = 4.7;
      const poleA = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.2, 0.18), speedTrapMat);
      const poleB = poleA.clone();
      poleA.position.set(-3.6, 2.1, 0.18);
      poleB.position.set(3.6, 2.1, 0.18);
      grp.add(board, poleA, poleB);
      this.root.add(grp);
      this.billboards.push({ object: grp, seed: i + 2100, spacing: 235, lane: i % 2 === 0 ? -1 : 1 });
    }
  }

  _createBillboardMaterial(top, bottom, foreground, background) {
    this._billboardMaterials ??= new Map();
    const key = `${top}:${bottom}:${foreground}:${background}`;
    if (this._billboardMaterials.has(key)) return this._billboardMaterials.get(key);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let y = 0; y < canvas.height; y += 28) ctx.fillRect(0, y, canvas.width, 3);
    ctx.strokeStyle = foreground;
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
    ctx.fillStyle = foreground;
    ctx.font = "900 78px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(top, canvas.width / 2, 92);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 58px Arial";
    ctx.fillText(bottom, canvas.width / 2, 166);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    this._billboardMaterials.set(key, material);
    return material;
  }

  _createSpeedTrails() {
    this.trailRoot = new THREE.Group();
    this.trailMeshes = [];
    const geo = new THREE.BoxGeometry(0.18, 0.08, 8.5);
    for (const [x, mat] of [[-1.15, trailMat], [1.15, trailMat], [-0.74, hotTrailMat], [0.74, hotTrailMat]]) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(x, 0.12, -5.0);
      this.trailRoot.add(mesh);
      this.trailMeshes.push(mesh);
    }
    this.scene.add(this.trailRoot);
  }

  _createFlames() {
    this.flameRoot = new THREE.Group();
    this.flames = [];
    const geo = new THREE.ConeGeometry(0.18, 1.15, 10);
    for (const x of [-0.55, 0.55]) {
      const flame = new THREE.Mesh(geo, flameMat.clone());
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(x, 0.16, -3.65);
      this.flameRoot.add(flame);
      this.flames.push(flame);
    }
    this.scene.add(this.flameRoot);
  }

  _createParticlePool() {
    const smokeGeo = new THREE.SphereGeometry(0.32, 8, 6);
    const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.72);
    for (let i = 0; i < 72; i++) {
      const isSpark = i >= 42;
      const object = new THREE.Mesh(isSpark ? sparkGeo : smokeGeo, (isSpark ? sparkMat : smokeMat).clone());
      object.visible = false;
      this.scene.add(object);
      this.particles.push({
        object,
        life: 0,
        maxLife: 1,
        velocity: new THREE.Vector3(),
        spin: (seeded(i + 77) - 0.5) * 5,
        spark: isSpark,
      });
    }
  }

  update(dt, car) {
    const progress = car.progress;
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.boostTimer = Math.max(0, this.boostTimer - dt);
    if (this.comboTimer <= 0) this.combo = 1;

    this._updateBoostPads(dt, car, progress);
    this._updateOrbs(dt, car, progress);
    this._updateGates(dt, car, progress);
    this._updateSpeedTraps(dt, car, progress);
    this._updateBillboards(dt, car, progress);
    this._updateDriftScoring(dt, car);
    this._updateSpeedTrails(dt, car);
    this._updateFlames(dt, car);
    this._updateParticles(dt, car);
    this.hud?.setArcade(this.score, this.combo);
    this._prevProgress = progress;
  }

  _loopedZ(progress, item, offset = 0) {
    const raw = item.seed * item.spacing + offset;
    return progress - BEHIND + ((((raw - progress + BEHIND) % LOOP) + LOOP) % LOOP);
  }

  _placeOnRoad(object, z, lateral, y = 0) {
    object.position.copy(roadPoint(z, lateral));
    object.position.y += y;
    object.rotation.y = Math.atan2(roadTangent(z).x, roadTangent(z).z);
  }

  _updateBoostPads(dt, car, progress) {
    for (const item of this.boostPads) {
      const z = this._loopedZ(progress, item, 80);
      const wobble = (seeded(item.seed + Math.floor(z / 400)) - 0.5) * 2.4;
      const lateral = item.lateral + wobble;
      this._placeOnRoad(item.object, z, lateral, 0.03);

      const dz = z - progress;
      const dx = lateral - car.lateral;
      const key = `${item.seed}:${Math.floor(z / item.spacing)}`;
      const hit = Math.abs(dz) < 7.4 && Math.abs(dx) < 3.9 && !this.triggeredPads.has(key);
      if (hit) {
        this.triggeredPads.add(key);
        this._boostCar(car, 0.86, "BOOST PAD");
        this._addScore(150);
      }

      const pulse = 0.65 + Math.sin(performance.now() * 0.008 + item.seed) * 0.22;
      item.object.scale.setScalar(hit ? 1.16 : 1);
      for (const child of item.object.children) {
        if (child.material?.opacity) child.material.opacity = child === item.object.children[0] ? 0.58 + pulse * 0.16 : 0.82 + pulse * 0.12;
      }
    }
  }

  _updateOrbs(dt, car, progress) {
    for (const item of this.orbs) {
      const z = this._loopedZ(progress, item, 20);
      const key = `${item.seed}:${Math.floor(z / item.spacing)}`;
      const isCollected = this.collected.has(key);
      const lateral = item.lateral + (seeded(item.seed + Math.floor(z / 600)) - 0.5) * 1.5;
      this._placeOnRoad(item.object, z, lateral, 1.75 + Math.sin(performance.now() * 0.004 + item.seed) * 0.25);
      item.object.rotation.y += dt * 1.8;
      item.object.rotation.z += dt * 0.95;
      item.object.visible = !isCollected;

      if (!isCollected && Math.abs(z - progress) < 4.8 && Math.abs(lateral - car.lateral) < 2.4) {
        this.collected.add(key);
        car.turbo = Math.min(100, car.turbo + 24);
        car.cameraShake = Math.max(car.cameraShake, 0.16);
        this.audio?.playPickup?.();
        this._addScore(250, "TURBO ORB");
      }
    }
  }

  _updateGates(dt, car, progress) {
    for (const item of this.gates) {
      const z = this._loopedZ(progress, item, 260);
      const key = `${item.seed}:${Math.floor(z / item.spacing)}`;
      this._placeOnRoad(item.object, z, 0, 0.02);
      item.object.scale.setScalar(1 + Math.sin(performance.now() * 0.003 + item.seed) * 0.035);

      const crossed = this._prevProgress < z && progress >= z && !this.triggeredGates.has(key);
      if (crossed && Math.abs(car.lateral) < 9.5) {
        this.triggeredGates.add(key);
        car.turbo = Math.min(100, car.turbo + 16);
        this._boostCar(car, 0.45, "CHECKPOINT");
        this._addScore(400);
      }
    }
  }

  _updateSpeedTraps(dt, car, progress) {
    for (const item of this.speedTraps) {
      const z = this._loopedZ(progress, item, 360);
      const key = `${item.seed}:${Math.floor(z / item.spacing)}`;
      this._placeOnRoad(item.object, z, 0, 0.02);
      const glow = 0.48 + Math.sin(performance.now() * 0.006 + item.seed) * 0.16;
      for (const child of item.object.children) {
        if (child.material?.opacity) child.material.opacity = glow;
      }

      const crossed = this._prevProgress < z && progress >= z && !this.triggeredSpeedTraps.has(key);
      if (!crossed) continue;
      this.triggeredSpeedTraps.add(key);
      const kmh = Math.round(Math.abs(car.speed * 3.6));
      if (kmh >= item.target) {
        this._addScore(550 + (kmh - item.target) * 5, `SPEED TRAP ${kmh} KM/H`);
        car.turbo = Math.min(100, car.turbo + 20);
        car.cameraShake = Math.max(car.cameraShake, 0.22);
        this.audio?.playSpeedTrap?.();
      } else {
        this.hud?.setArcade(this.score, this.combo, `${kmh}/${item.target} KM/H`);
      }
    }
  }

  _updateBillboards(dt, car, progress) {
    for (const item of this.billboards) {
      const z = this._loopedZ(progress, item, 120);
      const side = item.lane * (27 + seeded(item.seed + 2) * 18);
      this._placeOnRoad(item.object, z, side, -0.2);
      const toRoad = roadPoint(z, 0).sub(item.object.position);
      item.object.rotation.y = Math.atan2(-toRoad.x, -toRoad.z);
      item.object.scale.setScalar(1 + Math.sin(performance.now() * 0.002 + item.seed) * 0.025);
    }
  }

  _updateDriftScoring(dt, car) {
    const speedKmh = Math.abs(car.speed * 3.6);
    if (!car.drifting || speedKmh < 45) {
      this.driftScoreTimer = 0;
      return;
    }

    this.driftScoreTimer += dt;
    if (this.driftScoreTimer >= 0.22) {
      this.driftScoreTimer = 0;
      const points = 35 + car.slip * 90 + speedKmh * 0.18;
      this._addScore(points, "DRIFT");
    }
  }

  _updateSpeedTrails(dt, car) {
    const speedKmh = Math.abs(car.speed * 3.6);
    const intensity = THREE.MathUtils.clamp((speedKmh - 90) / 180, 0, 1);
    const turboGlow = car.turboActive || this.boostTimer > 0 ? 1 : 0;
    this.trailRoot.position.copy(car.position);
    this.trailRoot.rotation.y = car.yaw;
    this.trailRoot.visible = intensity > 0.02 || turboGlow > 0;
    for (let i = 0; i < this.trailMeshes.length; i++) {
      const mesh = this.trailMeshes[i];
      const hot = i > 1;
      mesh.material.opacity = hot ? turboGlow * 0.52 : intensity * 0.36;
      mesh.scale.z = 0.7 + intensity * 1.55 + turboGlow * 0.9;
      mesh.position.z = -4.0 - mesh.scale.z * 2.2;
    }
  }

  _updateFlames(dt, car) {
    const active = car.turboActive || this.boostTimer > 0;
    const speedKmh = Math.abs(car.speed * 3.6);
    const amount = active ? 1 : THREE.MathUtils.clamp((speedKmh - 270) / 120, 0, 0.45);
    this.flameRoot.position.copy(car.position);
    this.flameRoot.rotation.y = car.yaw;
    this.flameRoot.visible = amount > 0.02;
    for (let i = 0; i < this.flames.length; i++) {
      const flame = this.flames[i];
      flame.material.opacity = amount * (0.65 + Math.sin(performance.now() * 0.02 + i) * 0.18);
      flame.scale.setScalar(0.72 + amount * 1.35 + Math.sin(performance.now() * 0.018 + i) * 0.16);
    }
  }

  _updateParticles(dt, car) {
    const speedKmh = Math.abs(car.speed * 3.6);
    this.particleTimer += dt;
    if (car.drifting && speedKmh > 35 && this.particleTimer > 0.035) {
      this.particleTimer = 0;
      this._spawnWheelParticles(car, speedKmh);
    }

    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      particle.life -= dt;
      const t = Math.max(0, particle.life / particle.maxLife);
      particle.object.position.addScaledVector(particle.velocity, dt);
      particle.velocity.y -= particle.spark ? 8 * dt : 0.55 * dt;
      particle.object.rotation.y += particle.spin * dt;
      particle.object.scale.setScalar(particle.spark ? 0.75 + t * 0.8 : 0.7 + (1 - t) * 1.8);
      particle.object.material.opacity = particle.spark ? t * 0.9 : t * 0.34;
      if (particle.life <= 0) {
        particle.object.visible = false;
        particle.object.material.opacity = 0;
      }
    }
  }

  _spawnWheelParticles(car, speedKmh) {
    const forward = new THREE.Vector3(Math.sin(car.yaw), 0, Math.cos(car.yaw));
    const right = new THREE.Vector3(Math.cos(car.yaw), 0, -Math.sin(car.yaw));
    const rear = car.position.clone().addScaledVector(forward, -2.45);
    const smokeCount = car.slip > 0.5 ? 3 : 2;
    for (let i = 0; i < smokeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const pos = rear.clone().addScaledVector(right, side * 1.25);
      pos.y = 0.5;
      const vel = forward.clone().multiplyScalar(-1.8 - speedKmh / 140);
      vel.addScaledVector(right, side * (0.5 + car.slip));
      vel.y = 0.5 + seeded(this.score + i) * 0.8;
      this._spawnParticle(pos, vel, false);
    }

    if (car.slip > 0.38) {
      for (let i = 0; i < 2; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const pos = rear.clone().addScaledVector(right, side * 1.45);
        pos.y = 0.38;
        const vel = forward.clone().multiplyScalar(-2.2 - speedKmh / 120);
        vel.addScaledVector(right, side * (2.0 + seeded(this.score + i + 9) * 2.8));
        vel.y = 1.1 + seeded(this.score + i + 14) * 1.8;
        this._spawnParticle(pos, vel, true);
      }
    }
  }

  _spawnParticle(position, velocity, spark) {
    const particle = this.particles.find((item) => item.spark === spark && item.life <= 0);
    if (!particle) return;
    particle.object.position.copy(position);
    particle.object.visible = true;
    particle.velocity.copy(velocity);
    particle.maxLife = spark ? 0.28 : 0.95;
    particle.life = particle.maxLife;
    const color = spark
      ? gold.clone().lerp(pink, seeded(this.score + 4) * 0.35)
      : cyan.clone().lerp(new THREE.Color(0xc8d4d8), 0.8);
    particle.object.material.color.copy(color);
  }

  _boostCar(car, strength = 1, label = "BOOST") {
    const cap = 550 / 3.6;
    car.speed = Math.min(cap, car.speed + BOOST_SPEED * strength);
    car.turbo = Math.min(100, car.turbo + 18 * strength);
    car.cameraShake = Math.max(car.cameraShake, 0.28 * strength);
    this.boostTimer = Math.max(this.boostTimer, BOOST_COOLDOWN);
    this.audio?.playBoost?.();
    this.hud?.setArcade(this.score, this.combo, label);
  }

  _addScore(points, label = "") {
    this.score += Math.round(points * this.combo);
    this.combo = Math.min(9, this.combo + 1);
    this.comboTimer = 4.0;
    if (label) this.hud?.setArcade(this.score, this.combo, label);
  }
}
