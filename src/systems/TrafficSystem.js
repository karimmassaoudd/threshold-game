import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent, seeded } from "../utils/roadMath.js";

const trafficMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.25, metalness: 0.45 }),
  new THREE.MeshStandardMaterial({ color: 0xff3159, roughness: 0.28, metalness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0x2f6dff, roughness: 0.24, metalness: 0.55 }),
  new THREE.MeshStandardMaterial({ color: 0xe7edf2, roughness: 0.2, metalness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: 0.3, metalness: 0.35 }),
];
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x14222a,
  roughness: 0.04,
  metalness: 0.05,
  transparent: true,
  opacity: 0.72,
});
const tireMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.82 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.18, metalness: 0.8 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.45, metalness: 0.45 });
const headlightMat = new THREE.MeshBasicMaterial({ color: 0xeaf8ff });
const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff1836 });
const LEFT_SIDE_LANES = [-8.2, -3.6];
const RIGHT_SIDE_LANES = [3.6, 8.2];

export class TrafficSystem {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.cars = [];
    for (let i = 0; i < 28; i += 1) {
      const mesh = this._createTrafficCar(i);
      scene.add(mesh);
      const body = new CANNON.Body({ mass: 0, material: physics.materials.barrier });
      body.addShape(new CANNON.Box(new CANNON.Vec3(1.05, 0.45, 2.15)));
      physics.addBody(body);
      const useLeftSide = i % 4 !== 3;
      const lane = useLeftSide
        ? LEFT_SIDE_LANES[i % LEFT_SIDE_LANES.length]
        : RIGHT_SIDE_LANES[i % RIGHT_SIDE_LANES.length];
      this.cars.push({
        mesh,
        body,
        lane,
        direction: useLeftSide ? -1 : 1,
        offset: 55 + i * 75 + seeded(i + 44) * 45,
        speed: 20 + seeded(i) * 26,
        weave: seeded(i + 300) * Math.PI * 2,
      });
    }
  }

  _createTrafficCar(i) {
    const grp = new THREE.Group();
    const wheels = [];
    const paint = trafficMaterials[i % trafficMaterials.length];
    const type = i % 5;
    const isSuv = type === 2 || type === 4;
    const length = isSuv ? 4.55 : 4.25;
    const width = isSuv ? 2.08 : 1.92;
    const bodyH = isSuv ? 0.82 : 0.68;
    const cabinH = isSuv ? 0.72 : 0.58;

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, bodyH, length), paint);
    body.position.y = 0.56;
    body.castShadow = true;
    body.receiveShadow = true;

    const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.18, length * 0.32), paint);
    hood.position.set(0, 0.96, -length * 0.28);
    hood.rotation.x = -0.04;
    hood.castShadow = true;

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.74, cabinH, length * 0.38), glassMat);
    cabin.position.set(0, 1.22, isSuv ? -0.02 : 0.08);
    cabin.castShadow = true;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.1, length * 0.34), paint);
    roof.position.set(0, 1.22 + cabinH / 2, isSuv ? -0.02 : 0.08);
    roof.castShadow = true;

    const splitter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.08, 0.24), trimMat);
    splitter.position.set(0, 0.28, -length / 2 - 0.04);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.18, 0.18), trimMat);
    bumper.position.set(0, 0.46, length / 2 + 0.02);

    grp.add(body, hood, cabin, roof, splitter, bumper);

    for (const side of [-1, 1]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.18), trimMat);
      mirror.position.set(side * (width / 2 + 0.13), 1.18, -0.78);
      grp.add(mirror);

      const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, length * 0.7), trimMat);
      sideTrim.position.set(side * (width / 2 + 0.02), 0.82, 0.02);
      grp.add(sideTrim);

      for (const z of [-length * 0.32, length * 0.32]) {
        const wheel = this._createTrafficWheel();
        wheel.position.set(side * (width / 2 + 0.02), 0.42, z);
        wheels.push(wheel);
        grp.add(wheel);
      }

      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.045), headlightMat);
      headlight.position.set(side * width * 0.25, 0.72, -length / 2 - 0.035);
      grp.add(headlight);

      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.045), taillightMat);
      taillight.position.set(side * width * 0.25, 0.72, length / 2 + 0.035);
      grp.add(taillight);
    }

    if (type === 1 || type === 3) {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.08, 0.2), trimMat);
      spoiler.position.set(0, 1.08, length / 2 - 0.12);
      grp.add(spoiler);
    }

    grp.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    grp.userData.wheels = wheels;
    return grp;
  }

  _createTrafficWheel() {
    const grp = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 20), tireMat);
    tire.rotation.z = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    grp.add(tire, rim);
    return grp;
  }

  applySettings(settings) {
    this.density = settings.traffic === "Off" ? 0 : settings.traffic === "Heavy" ? 28 : 18;
  }

  reset() {
    for (let i = 0; i < this.cars.length; i += 1) {
      this.cars[i].offset = 55 + i * 75 + seeded(i) * 65;
    }
  }

  update(dt, player, settings) {
    this.applySettings(settings);
    for (let i = 0; i < this.cars.length; i += 1) {
      const item = this.cars[i];
      item.mesh.visible = i < this.density;
      if (!item.mesh.visible) {
        item.body.position.set(0, -1000, 0);
        continue;
      }
      item.offset += item.direction * item.speed * dt;
      if (item.direction > 0 && item.offset > 2500) item.offset = -180 - seeded(i) * 220;
      if (item.direction < 0 && item.offset < -260) item.offset = 2400 + seeded(i) * 500;
      const z = player.position.z + item.offset;
      const p = roadPoint(z, item.lane + Math.sin(z * 0.018 + item.weave) * 0.22);
      const tangent = roadTangent(z);
      item.mesh.position.copy(p);
      item.mesh.position.y += 0.5;
      item.mesh.rotation.y = Math.atan2(tangent.x, tangent.z) + (item.direction > 0 ? Math.PI : 0);
      for (const wheel of item.mesh.userData.wheels ?? []) {
        wheel.rotation.x -= item.speed * dt * 0.8;
      }
      item.body.position.set(item.mesh.position.x, item.mesh.position.y, item.mesh.position.z);
      item.body.quaternion.setFromEuler(0, item.mesh.rotation.y, 0);

      if (item.mesh.position.distanceTo(player.position) < 3.1 && Math.abs(item.offset) < 8) {
        player.speed *= 0.82;
        player.damage = Math.min(100, player.damage + 0.75);
        player.cameraShake = Math.max(player.cameraShake, 0.8);
      }
    }
  }
}
