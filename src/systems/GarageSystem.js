import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CAR_PRESETS } from "../config.js";

export class GarageSystem {
  constructor() {
    this.loader = new GLTFLoader();
    this.cars = CAR_PRESETS;
    this.selectedCar = structuredClone(this.cars[0]);
    this.customization = {
      paint: this.selectedCar.color,
      wheels: "Sport",
      spoiler: true,
      bodyKit: "Track",
      windowTint: 0.65,
      engineUpgrade: 1,
      gripUpgrade: 1,
    };
  }

  selectCar(id) {
    const car = this.cars.find((item) => item.id === id);
    if (!car) return;
    this.selectedCar = structuredClone(car);
    this.customization.paint = car.color;
  }

  async createSelectedCarModel() {
    if (this.selectedCar.modelUrl) {
      try {
        const gltf = await this.loader.loadAsync(this.selectedCar.modelUrl);
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        return this.applyCustomization(model);
      } catch {
        return this.applyCustomization(this.createProceduralCar());
      }
    }
    return this.applyCustomization(this.createProceduralCar());
  }

  applyCustomization(model) {
    const paint = new THREE.MeshPhysicalMaterial({
      color: this.customization.paint,
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x081018).lerp(new THREE.Color(0x7feeff), 1 - this.customization.windowTint),
      metalness: 0.04,
      roughness: 0.05,
      transparent: true,
      opacity: 0.5 + this.customization.windowTint * 0.35,
    });

    model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.userData.paint) child.material = paint;
      if (child.userData.glass) child.material = glass;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    model.userData.stats = {
      ...this.selectedCar,
      power: this.selectedCar.power * this.customization.engineUpgrade,
      grip: this.selectedCar.grip * this.customization.gripUpgrade,
    };
    return model;
  }

  createProceduralCar() {
    const group = new THREE.Group();
    const paintMarker = { paint: true };
    const glassMarker = { glass: true };
    const paintMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.72 });
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff1748 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xcffcff });
    const carbon = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.35, metalness: 0.5 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.48, 4.35), paintMat);
    body.position.y = 0.56;
    body.userData = paintMarker;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.32, 1.35), paintMat);
    nose.position.set(0, 0.48, -1.8);
    nose.userData = paintMarker;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.55, 1.48), paintMat);
    cabin.position.set(0, 0.98, -0.1);
    cabin.userData = glassMarker;
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.42), carbon);
    splitter.position.set(0, 0.31, -2.24);
    group.add(body, nose, cabin, splitter);

    if (this.customization.spoiler) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.09, 0.28), paintMat);
      wing.position.set(0, 1.0, 1.92);
      wing.userData = paintMarker;
      group.add(wing);
    }

    const wheelGeo = this.customization.wheels === "Deep Dish"
      ? new THREE.CylinderGeometry(0.46, 0.46, 0.38, 32)
      : new THREE.CylinderGeometry(0.42, 0.42, 0.36, 28);
    const wheels = [];
    for (const x of [-1.16, 1.16]) {
      for (const z of [-1.46, 1.42]) {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.33, z);
        wheels.push(wheel);
        group.add(wheel);
      }
    }
    group.userData.wheels = wheels;

    for (const [x, y, z, mat] of [
      [-0.62, 0.53, -2.23, lightMat],
      [0.62, 0.53, -2.23, lightMat],
      [-0.7, 0.54, 2.19, brakeMat],
      [0.7, 0.54, 2.19, brakeMat],
    ]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.06), mat);
      light.position.set(x, y, z);
      group.add(light);
    }

    const head = new THREE.SpotLight(0xbffaff, 10, 95, 0.42, 0.65, 1.2);
    head.position.set(0, 0.62, -2.35);
    head.target.position.set(0, 0, -34);
    group.add(head, head.target);
    return group;
  }
}
