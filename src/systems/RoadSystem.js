import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent, roadCenter, seeded } from "../utils/roadMath.js";

// ── Materials ─────────────────────────────────────────────────────────────────
const roadMat      = new THREE.MeshStandardMaterial({ color: 0x1a1e22, roughness: 0.82, metalness: 0.04 });
const shoulderMat  = new THREE.MeshStandardMaterial({ color: 0x252d30, roughness: 0.90 });
const rumbleMat    = new THREE.MeshStandardMaterial({ color: 0xcc2211, roughness: 0.75 }); // red rumble strip
const rumbleMat2   = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.75 }); // white rumble
const barrierMat   = new THREE.MeshStandardMaterial({ color: 0x55676e, roughness: 0.45, metalness: 0.28 });
const barrierTop   = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.35 });
const centreDash   = new THREE.MeshBasicMaterial({ color: 0xffffff });
const laneDash     = new THREE.MeshBasicMaterial({ color: 0xffffff });
const neonMat      = new THREE.MeshBasicMaterial({ color: 0x33ddff });
const terrainMat   = new THREE.MeshStandardMaterial({ color: 0x1a2e24, roughness: 0.96 });
const mountainMat  = new THREE.MeshStandardMaterial({ color: 0x263a46, roughness: 0.92 });
const buildingMat  = new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.55, metalness: 0.18 });
const windowMat    = new THREE.MeshBasicMaterial({ color: 0x55eeff, transparent: true, opacity: 0.9 });
const windowWarm   = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.85 });
const treeMat      = new THREE.MeshStandardMaterial({ color: 0x0d3525, roughness: 0.86 });
const trunkMat     = new THREE.MeshStandardMaterial({ color: 0x3c2b1d, roughness: 0.85 });
const poleMat      = new THREE.MeshStandardMaterial({ color: 0x5a6a70, roughness: 0.5, metalness: 0.4 });
const lampMat      = new THREE.MeshBasicMaterial({ color: 0xffffcc });

// Shared geometries (reused across all segments)
const SEG_LEN  = 64;
const ROAD_W   = 22; // wider road
const SHOULDER = ROAD_W + 20;

const roadGeo     = new THREE.PlaneGeometry(ROAD_W, SEG_LEN);
roadGeo.rotateX(-Math.PI / 2);
const shoulderGeo = new THREE.PlaneGeometry(SHOULDER, SEG_LEN);
shoulderGeo.rotateX(-Math.PI / 2);

export class RoadSystem {
  constructor(scene, physics) {
    this.physics     = physics;
    this.segmentLength = SEG_LEN;
    this.roadWidth   = ROAD_W;
    this.distance    = 0;
    this.root        = new THREE.Group();
    this.segments    = [];
    this.scenery     = [];
    this.mountains   = [];
    this.streetLamps = [];
    scene.add(this.root);
    this._createTerrain();
    this._createSegments();
    this._createPhysicsBarriers();
    this._createEnvironment();
  }

  // ── Terrain ────────────────────────────────────────────────────────────────
  _createTerrain() {
    this.terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      terrainMat
    );
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.position.y = -8;
    this.terrain.receiveShadow = true;
    this.root.add(this.terrain);
  }

  // ── Road segments (pool) ───────────────────────────────────────────────────
  _createSegments() {
    const SEG_COUNT = 24;

    for (let i = 0; i < SEG_COUNT; i++) {
      const grp = new THREE.Group();

      // Asphalt
      const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulder.position.y = -0.05;
      shoulder.receiveShadow = true;

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.receiveShadow = true;

      grp.add(shoulder, road);

      // Rumble strips (alternating red/white at edges)
      for (const side of [-1, 1]) {
        const x = side * (ROAD_W / 2 - 0.6);
        for (let k = 0; k < 8; k++) {
          const col = k % 2 === 0 ? rumbleMat : rumbleMat2;
          const strip = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.04, SEG_LEN / 8 - 0.2),
            col
          );
          strip.position.set(x, 0.02, -SEG_LEN / 2 + (k + 0.5) * (SEG_LEN / 8));
          grp.add(strip);
        }
      }

      // Dashed centre line (yellow)
      const centreLineMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
      for (let d = 0; d < 4; d++) {
        const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 7), centreLineMat);
        dash.position.set(0, 0.025, -SEG_LEN / 2 + d * 16 + 4);
        grp.add(dash);
      }

      // Lane dividers (white dashes) — two lanes each side
      for (const lx of [-ROAD_W / 6, ROAD_W / 6]) {
        for (let d = 0; d < 4; d++) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 5), laneDash);
          dash.position.set(lx, 0.025, -SEG_LEN / 2 + d * 16 + 3);
          grp.add(dash);
        }
      }

      // Jersey barriers
      for (const side of [-1, 1]) {
        const bx = side * (ROAD_W / 2 + 0.6);

        // Main barrier body
        const barrier = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.88, SEG_LEN - 0.3),
          barrierMat
        );
        barrier.position.set(bx, 0.44, 0);
        barrier.castShadow = true;
        barrier.receiveShadow = true;

        // Barrier cap
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.12, SEG_LEN - 0.3),
          barrierTop
        );
        cap.position.set(bx, 0.94, 0);

        // Neon edge strip on barrier
        const neon = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.06, SEG_LEN - 2),
          neonMat
        );
        neon.position.set(bx * 0.98, 1.05, 0);

        grp.add(barrier, cap, neon);
      }

      // Street lamps are sparse in 240 FPS mode.
      if (i % 6 === 0) {
        const lampGrp = this._createStreetLamp();
        lampGrp.position.set(ROAD_W / 2 + 3.5, 0, 0);
        grp.add(lampGrp);

        const lampGrp2 = this._createStreetLamp();
        lampGrp2.position.set(-(ROAD_W / 2 + 3.5), 0, 0);
        grp.add(lampGrp2);

        this.streetLamps.push(lampGrp, lampGrp2);
      }

      this.root.add(grp);
      this.segments.push(grp);
    }
  }

  _createStreetLamp() {
    const grp = new THREE.Group();

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 7.5, 8),
      poleMat
    );
    pole.position.y = 3.75;
    pole.castShadow = true;

    // Arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.12, 0.12),
      poleMat
    );
    arm.position.set(1.25, 7.5, 0);

    // Lamp head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.22, 0.45),
      lampMat
    );
    head.position.set(2.5, 7.35, 0);

    grp.add(pole, arm, head);
    return grp;
  }

  // ── Physics barriers ───────────────────────────────────────────────────────
  _createPhysicsBarriers() {
    this.leftBarrier  = new CANNON.Body({ mass: 0, material: this.physics.materials.barrier });
    this.rightBarrier = new CANNON.Body({ mass: 0, material: this.physics.materials.barrier });
    this.leftBarrier.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 1.2, 900)));
    this.rightBarrier.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 1.2, 900)));
    this.physics.addBody(this.leftBarrier);
    this.physics.addBody(this.rightBarrier);
  }

  // ── Environment (mountains, buildings, trees) ──────────────────────────────
  _createEnvironment() {
    // Mountains
    for (let i = 0; i < 24; i++) {
      const h = 90 + seeded(i + 1) * 180;
      const r = 40 + seeded(i) * 80;
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 5 + Math.floor(seeded(i + 2) * 3)),
        mountainMat
      );
      peak.castShadow = true;
      this.root.add(peak);
      this.mountains.push({ object: peak, seed: i + 3000, lane: seeded(i + 99) > 0.5 ? 1 : -1, mountain: true });
    }

    // Scenery (buildings + trees)
    for (let i = 0; i < 56; i++) {
      const item = seeded(i) > 0.4 ? this._createBuilding(i) : this._createTree(i);
      this.root.add(item.object);
      this.scenery.push({ ...item, seed: i + 1000, lane: seeded(i + 120) > 0.5 ? 1 : -1 });
    }
  }

  _createBuilding(i) {
    const grp = new THREE.Group();
    const h = 12 + seeded(i + 7) * 60;
    const w = 8  + seeded(i + 8) * 20;
    const d = 8  + seeded(i + 9) * 20;

    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    tower.position.y = h / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    grp.add(tower);

    // Windows — alternate warm/cool
    const winMat = seeded(i + 50) > 0.5 ? windowMat : windowWarm;
    const rows = Math.floor(h / 4);
    for (let row = 0; row < rows; row++) {
      if (seeded(i * 17 + row) < 0.3) continue; // some unlit windows
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.78, 0.22, 0.04),
        winMat
      );
      win.position.set(0, 2.5 + row * 4, -d / 2 - 0.04);
      grp.add(win);
      // Side windows
      const winS = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.22, d * 0.78),
        winMat
      );
      winS.position.set(-w / 2 - 0.04, 2.5 + row * 4, 0);
      grp.add(winS);
    }

    // Roof antenna / neon sign
    const antennaH = 1.5 + seeded(i + 30) * 5;
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, antennaH, 5),
      poleMat
    );
    antenna.position.y = h + antennaH / 2;
    grp.add(antenna);

    return { object: grp, type: "building" };
  }

  _createTree(i) {
    const grp = new THREE.Group();
    const scale = 0.8 + seeded(i + 20) * 0.8;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 2.8 * scale, 8),
      trunkMat
    );
    trunk.position.y = 1.4 * scale;
    trunk.castShadow = true;

    const crown1 = new THREE.Mesh(
      new THREE.ConeGeometry(1.6 * scale, 4.5 * scale, 8),
      treeMat
    );
    crown1.position.y = 4.8 * scale;
    crown1.castShadow = true;

    const crown2 = new THREE.Mesh(
      new THREE.ConeGeometry(1.1 * scale, 3.5 * scale, 7),
      treeMat
    );
    crown2.position.y = 6.8 * scale;

    grp.add(trunk, crown1, crown2);
    return { object: grp, type: "tree" };
  }

  // ── Update (called every frame with car Z) ─────────────────────────────────
  update(carZ) {
    this.distance = carZ;

    // Terrain follows car
    this.terrain.position.set(roadCenter(carZ), -8, carZ);

    // Place segments so they span from 2 segments behind to far ahead
    // This ensures there is ALWAYS road in front of the player
    const startZ = Math.floor((carZ - this.segmentLength * 2) / this.segmentLength) * this.segmentLength;

    for (let i = 0; i < this.segments.length; i++) {
      const z = startZ + i * this.segmentLength;
      const p = roadPoint(z, 0);
      this.segments[i].position.copy(p);
      this.segments[i].rotation.y = Math.atan2(roadTangent(z).x, roadTangent(z).z);
    }

    // Physics barriers follow car ahead
    const yaw = Math.atan2(roadTangent(carZ).x, roadTangent(carZ).z);
    const halfW = this.roadWidth / 2 + 0.65;
    for (const [body, side] of [[this.leftBarrier, -halfW], [this.rightBarrier, halfW]]) {
      const p = roadPoint(carZ + 250, side);
      body.position.set(p.x, p.y + 0.7, p.z);
      body.quaternion.setFromEuler(0, yaw, 0);
    }

    // Loop scenery and mountains
    this._updateLoopedObjects(carZ, this.mountains, 5800, 1000, 240, 380);
    this._updateLoopedObjects(carZ, this.scenery,   4400,  700,  40, 100);
  }

  _updateLoopedObjects(carZ, objects, loop, behind, minSide, extraSide) {
    for (const item of objects) {
      const raw = carZ - behind + ((item.seed * 79) % loop);
      const z   = carZ - behind + ((((raw - carZ + behind) % loop) + loop) % loop);
      const side = item.lane * (minSide + seeded(item.seed + 80) * extraSide);
      item.object.position.copy(roadPoint(z, side));
      item.object.rotation.y = seeded(item.seed) * Math.PI;
      if (item.type === "building") item.object.position.y -= 0.2;
      if (item.mountain)           item.object.position.y -= 14;
    }
  }
}
