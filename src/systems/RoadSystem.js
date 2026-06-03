import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent, roadCenter, seeded } from "../utils/roadMath.js";

const roadMat = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.8, metalness: 0.03 });
const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x20282a, roughness: 0.88 });
const barrierMat = new THREE.MeshStandardMaterial({ color: 0x61747b, roughness: 0.42, metalness: 0.25 });
const laneMat = new THREE.MeshBasicMaterial({ color: 0xe7fbff });
const neonMat = new THREE.MeshBasicMaterial({ color: 0x43eaff });
const terrainMat = new THREE.MeshStandardMaterial({ color: 0x20312b, roughness: 0.96 });
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x2d4650, roughness: 0.92 });
const buildingMat = new THREE.MeshStandardMaterial({ color: 0x172127, roughness: 0.55, metalness: 0.18 });
const windowMat = new THREE.MeshBasicMaterial({ color: 0x49eaff });
const treeMat = new THREE.MeshStandardMaterial({ color: 0x0d3525, roughness: 0.86 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3c2b1d, roughness: 0.85 });

export class RoadSystem {
  constructor(scene, physics) {
    this.physics = physics;
    this.segmentLength = 72;
    this.roadWidth = 18;
    this.distance = 0;
    this.root = new THREE.Group();
    this.segments = [];
    this.scenery = [];
    this.mountains = [];
    scene.add(this.root);
    this.createTerrain();
    this.createSegments();
    this.createEnvironment();
  }

  createTerrain() {
    this.terrain = new THREE.Mesh(new THREE.PlaneGeometry(2200, 2200), terrainMat);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.position.y = -7;
    this.terrain.receiveShadow = true;
    this.root.add(this.terrain);
  }

  createSegments() {
    const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.segmentLength, 1, 1);
    roadGeo.rotateX(-Math.PI / 2);
    const shoulderGeo = new THREE.PlaneGeometry(this.roadWidth + 18, this.segmentLength, 1, 1);
    shoulderGeo.rotateX(-Math.PI / 2);

    for (let i = 0; i < 54; i += 1) {
      const group = new THREE.Group();
      const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulder.position.y = -0.04;
      shoulder.receiveShadow = true;
      group.add(shoulder);

      const road = new THREE.Mesh(roadGeo, roadMat);
      road.receiveShadow = true;
      group.add(road);

      for (let j = -1; j <= 1; j += 1) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 16), laneMat);
        line.position.set(j * 3, 0.03, 0);
        group.add(line);
      }

      for (const x of [-10, 10]) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.75, this.segmentLength - 5), barrierMat);
        barrier.position.set(x, 0.38, 0);
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        group.add(barrier);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, this.segmentLength - 10), neonMat);
        neon.position.set(x * 0.99, 0.88, 0);
        group.add(neon);
      }

      this.root.add(group);
      this.segments.push(group);
    }

    this.leftBarrier = new CANNON.Body({ mass: 0, material: this.physics.materials.barrier });
    this.rightBarrier = new CANNON.Body({ mass: 0, material: this.physics.materials.barrier });
    this.leftBarrier.addShape(new CANNON.Box(new CANNON.Vec3(0.3, 1.2, 900)));
    this.rightBarrier.addShape(new CANNON.Box(new CANNON.Vec3(0.3, 1.2, 900)));
    this.physics.addBody(this.leftBarrier);
    this.physics.addBody(this.rightBarrier);
  }

  createEnvironment() {
    for (let i = 0; i < 52; i += 1) {
      const peak = new THREE.Mesh(new THREE.ConeGeometry(35 + seeded(i) * 70, 85 + seeded(i + 1) * 155, 5), mountainMat);
      peak.castShadow = true;
      peak.receiveShadow = true;
      this.root.add(peak);
      this.mountains.push({ object: peak, seed: i + 3000, lane: seeded(i + 99) > 0.5 ? 1 : -1, mountain: true });
    }

    for (let i = 0; i < 120; i += 1) {
      const item = seeded(i) > 0.45 ? this.createBuilding(i) : this.createTree();
      this.root.add(item.object);
      this.scenery.push({ ...item, seed: i + 1000, lane: seeded(i + 120) > 0.5 ? 1 : -1 });
    }
  }

  createBuilding(i) {
    const group = new THREE.Group();
    const h = 9 + seeded(i + 7) * 48;
    const w = 7 + seeded(i + 8) * 17;
    const d = 7 + seeded(i + 9) * 18;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
    tower.position.y = h / 2;
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);
    for (let k = 0; k < 5; k += 1) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.18, 0.04), windowMat);
      win.position.set(0, 3 + k * h / 6, -d / 2 - 0.03);
      group.add(win);
    }
    return { object: group, type: "building" };
  }

  createTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.36, 2.6, 8), trunkMat);
    trunk.position.y = 1.3;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.2, 9), treeMat);
    crown.position.y = 4.2;
    group.add(trunk, crown);
    return { object: group, type: "tree" };
  }

  update(carZ) {
    this.distance = carZ;
    this.terrain.position.set(roadCenter(carZ), -7, carZ);
    const base = Math.floor((carZ - 650) / this.segmentLength) * this.segmentLength;
    for (let i = 0; i < this.segments.length; i += 1) {
      const z = base + i * this.segmentLength;
      const p = roadPoint(z, 0);
      this.segments[i].position.copy(p);
      this.segments[i].rotation.y = Math.atan2(roadTangent(z).x, roadTangent(z).z);
    }

    const yaw = Math.atan2(roadTangent(carZ).x, roadTangent(carZ).z);
    for (const [body, lateral] of [[this.leftBarrier, -10.2], [this.rightBarrier, 10.2]]) {
      const p = roadPoint(carZ + 220, lateral);
      body.position.set(p.x, p.y + 0.7, p.z);
      body.quaternion.setFromEuler(0, yaw, 0);
    }

    this.updateLoopedObjects(carZ, this.mountains, 5600, 1000, 210, 330);
    this.updateLoopedObjects(carZ, this.scenery, 4200, 720, 36, 92);
  }

  updateLoopedObjects(carZ, objects, loop, behind, minSide, extraSide) {
    for (const item of objects) {
      const raw = carZ - behind + ((item.seed * 79) % loop);
      const z = carZ - behind + ((((raw - carZ + behind) % loop) + loop) % loop);
      const side = item.lane * (minSide + seeded(item.seed + 80) * extraSide);
      item.object.position.copy(roadPoint(z, side));
      item.object.rotation.y = seeded(item.seed) * Math.PI;
      if (item.type === "building") item.object.position.y -= 0.1;
      if (item.mountain) item.object.position.y -= 12;
    }
  }
}
