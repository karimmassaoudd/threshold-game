import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent, roadCenter, seeded } from "../utils/roadMath.js";

// ── Materials ─────────────────────────────────────────────────────────────────
const roadMat      = new THREE.MeshStandardMaterial({ color: 0x202327, roughness: 0.9, metalness: 0.02 });
const shoulderMat  = new THREE.MeshStandardMaterial({ color: 0x42464a, roughness: 0.92 });
const sidewalkMat  = new THREE.MeshStandardMaterial({ color: 0x6b6f72, roughness: 0.95 });
const curbMat      = new THREE.MeshStandardMaterial({ color: 0xd6d1c7, roughness: 0.78 });
const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xf2f2e8 });
const sideRoadMat  = new THREE.MeshStandardMaterial({ color: 0x1c2024, roughness: 0.92, metalness: 0.01 });
const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffd629 });
const signalRed    = new THREE.MeshBasicMaterial({ color: 0xff2222 });
const signalAmber  = new THREE.MeshBasicMaterial({ color: 0xffbb22 });
const signalGreen  = new THREE.MeshBasicMaterial({ color: 0x28ff5f });
const signalCase   = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.55, metalness: 0.35 });
const centreDash   = new THREE.MeshBasicMaterial({ color: 0xffffff });
const laneDash     = new THREE.MeshBasicMaterial({ color: 0xffffff });
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
const SHOULDER = ROAD_W + 26;

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

      // Sidewalks and curbs: urban GTA-style street instead of race barriers.
      for (const side of [-1, 1]) {
        const curbX = side * (ROAD_W / 2 + 0.18);
        const walkX = side * (ROAD_W / 2 + 3.5);
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, SEG_LEN - 0.3), curbMat);
        curb.position.set(curbX, 0.08, 0);
        curb.receiveShadow = true;

        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.12, SEG_LEN - 0.4), sidewalkMat);
        sidewalk.position.set(walkX, 0.015, 0);
        sidewalk.receiveShadow = true;

        const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, SEG_LEN - 0.8), laneDash);
        gutter.position.set(side * (ROAD_W / 2 - 0.55), 0.031, 0);
        grp.add(sidewalk, curb, gutter);
      }

      // Dashed centre line (yellow)
      for (const x of [-0.28, 0.28]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, SEG_LEN - 1.0), yellowLineMat);
        line.position.set(x, 0.032, 0);
        grp.add(line);
      }

      // Lane dividers (white dashes) — two lanes each side
      for (const lx of [-ROAD_W / 3, ROAD_W / 3]) {
        for (let d = 0; d < 4; d++) {
          const dash = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 5), laneDash);
          dash.position.set(lx, 0.025, -SEG_LEN / 2 + d * 16 + 3);
          grp.add(dash);
        }
      }

      for (const laneX of [-8.2, -3.6, 3.6, 8.2]) {
        for (const z of [-18, 14]) {
          const arrow = this._createLaneArrow(laneX > 0 ? 1 : -1);
          arrow.position.set(laneX, 0.052, z);
          grp.add(arrow);
        }
      }

      // Intersections every few pooled segments: cross street, crosswalks, stop bars.
      if (i % 2 === 0) {
        const crossStreetWidth = SHOULDER + 34;
        const throughRoadClearance = ROAD_W + 2;
        const sideStreetWidth = (crossStreetWidth - throughRoadClearance) / 2;

        for (const side of [-1, 1]) {
          const crossStreet = new THREE.Mesh(new THREE.BoxGeometry(sideStreetWidth, 0.018, 16), sideRoadMat);
          crossStreet.position.set(side * (throughRoadClearance / 2 + sideStreetWidth / 2), 0.012, 0);
          crossStreet.receiveShadow = true;
          grp.add(crossStreet);
        }

        for (const z of [-9.2, 9.2]) {
          for (let stripe = -4; stripe <= 4; stripe += 1) {
            const walkStripe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.035, 5.4), crosswalkMat);
            walkStripe.position.set(stripe * 1.3, 0.045, z);
            grp.add(walkStripe);
          }
          const stopLine = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W - 2.2, 0.035, 0.34), crosswalkMat);
          stopLine.position.set(0, 0.047, z * 0.72);
          grp.add(stopLine);
        }

        for (const side of [-1, 1]) {
          const signal = this._createTrafficLight(i);
          signal.position.set(side * (ROAD_W / 2 + 4.4), 0, -8);
          signal.rotation.y = side > 0 ? Math.PI : 0;
          grp.add(signal);
        }
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

  _createTrafficLight(seed) {
    const grp = new THREE.Group();

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), poleMat);
    pole.position.y = 2.3;
    pole.castShadow = true;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.12), poleMat);
    arm.position.set(-0.95, 4.45, 0);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.08, 0.28), signalCase);
    box.position.set(-2.05, 4.2, 0);
    box.castShadow = true;

    const active = seed % 3;
    const lights = [
      [0.29, active === 0 ? signalRed : signalCase],
      [0.0, active === 1 ? signalAmber : signalCase],
      [-0.29, active === 2 ? signalGreen : signalCase],
    ];
    for (const [y, mat] of lights) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat);
      lamp.position.set(-2.05, 4.2 + y, -0.16);
      grp.add(lamp);
    }

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.34, 0.05), crosswalkMat);
    sign.position.set(0.42, 3.0, 0);
    grp.add(pole, arm, box, sign);
    return grp;
  }

  _createLaneArrow(direction = 1) {
    const grp = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 2.2), laneDash);
    shaft.position.z = -0.35;

    const headA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 1.25), laneDash);
    const headB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 1.25), laneDash);
    headA.position.set(-0.36, 0, 0.84);
    headB.position.set(0.36, 0, 0.84);
    headA.rotation.y = -0.62;
    headB.rotation.y = 0.62;

    grp.add(shaft, headA, headB);
    if (direction < 0) grp.rotation.y = Math.PI;
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
    for (let i = 0; i < 72; i++) {
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
    this._updateLoopedObjects(carZ, this.mountains, 5800, 1000, 420, 460);
    this._updateLoopedObjects(carZ, this.scenery,   3200,  620,  15, 42);
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
