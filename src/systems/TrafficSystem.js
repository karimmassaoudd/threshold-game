import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent, seeded } from "../utils/roadMath.js";

const trafficMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.28, metalness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0xff3159, roughness: 0.3, metalness: 0.45 }),
  new THREE.MeshStandardMaterial({ color: 0x2f6dff, roughness: 0.28, metalness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xe7edf2, roughness: 0.22, metalness: 0.35 }),
];

export class TrafficSystem {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.cars = [];
    for (let i = 0; i < 12; i += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 4.1), trafficMaterials[i % trafficMaterials.length]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      const body = new CANNON.Body({ mass: 0, material: physics.materials.barrier });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.95, 0.36, 2.05)));
      physics.addBody(body);
      this.cars.push({ mesh, body, lane: [-5.2, -1.8, 1.8, 5.2][i % 4], offset: 180 + i * 170, speed: 26 + seeded(i) * 32 });
    }
  }

  applySettings(settings) {
    this.density = settings.traffic === "Off" ? 0 : settings.traffic === "Heavy" ? 12 : 7;
  }

  reset() {
    for (let i = 0; i < this.cars.length; i += 1) this.cars[i].offset = 180 + i * 170 + seeded(i) * 90;
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
      item.offset -= item.speed * dt;
      if (item.offset < -100) item.offset += 2500 + seeded(i) * 500;
      const z = player.position.z + item.offset;
      const p = roadPoint(z, item.lane + Math.sin(z * 0.02 + i) * 0.35);
      const tangent = roadTangent(z);
      item.mesh.position.copy(p);
      item.mesh.position.y += 0.48;
      item.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);
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
