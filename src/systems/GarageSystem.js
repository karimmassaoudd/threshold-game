import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CAR_PRESETS } from "../config.js";

export class GarageSystem {
  constructor() {
    this.loader = new GLTFLoader();
    this.cars   = CAR_PRESETS;
    this.selectedCar = structuredClone(this.cars[0]);
    this.customization = {
      paint:        this.selectedCar.color,
      paintFinish:  "metallic",   // metallic | matte | chrome | pearl
      wheels:       "Sport",
      spoiler:      true,
      bodyKit:      "Track",
      windowTint:   0.65,
      engineUpgrade: 1,
      gripUpgrade:   1,
    };
  }

  selectCar(id) {
    const car = this.cars.find((c) => c.id === id);
    if (!car) return;
    this.selectedCar = structuredClone(car);
    this.customization.paint = car.color;
  }

  async createSelectedCarModel() {
    if (this.selectedCar.modelUrl) {
      try {
        const gltf  = await this.loader.loadAsync(this.selectedCar.modelUrl);
        const model = gltf.scene;
        model.traverse((child) => {
          if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        return this.applyCustomization(model);
      } catch {
        return this.applyCustomization(this._buildProceduralCar());
      }
    }
    return this.applyCustomization(this._buildProceduralCar());
  }

  applyCustomization(model) {
    const color = new THREE.Color(this.customization.paint);

    // Paint finish variants
    let paintMat;
    const finish = this.customization.paintFinish;
    if (finish === "chrome") {
      paintMat = new THREE.MeshPhysicalMaterial({
        color, metalness: 1.0, roughness: 0.02, reflectivity: 1,
        clearcoat: 1, clearcoatRoughness: 0.01,
      });
    } else if (finish === "matte") {
      paintMat = new THREE.MeshPhysicalMaterial({
        color, metalness: 0.05, roughness: 0.75,
        clearcoat: 0, sheen: 0.3,
      });
    } else if (finish === "pearl") {
      paintMat = new THREE.MeshPhysicalMaterial({
        color, metalness: 0.35, roughness: 0.22,
        clearcoat: 1, clearcoatRoughness: 0.04,
        iridescence: 0.6, iridescenceIOR: 1.8,
      });
    } else {
      // metallic (default)
      paintMat = new THREE.MeshPhysicalMaterial({
        color, metalness: 0.78, roughness: 0.16,
        clearcoat: 1, clearcoatRoughness: 0.07,
      });
    }

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x081018).lerp(new THREE.Color(0x7feeff), 1 - this.customization.windowTint),
      metalness: 0.04, roughness: 0.04,
      transparent: true, opacity: 0.48 + this.customization.windowTint * 0.38,
      transmission: 0.12,
    });

    model.traverse((child) => {
      if (!child.isMesh) return;
      if (child.userData.paint) child.material = paintMat;
      if (child.userData.glass) child.material = glassMat;
      child.castShadow    = true;
      child.receiveShadow = true;
    });

    model.userData.stats = {
      ...this.selectedCar,
      power: this.selectedCar.power * this.customization.engineUpgrade,
      grip:  this.selectedCar.grip  * this.customization.gripUpgrade,
    };
    return model;
  }

  _buildProceduralCar() {
    const grp = new THREE.Group();

    // ── Materials ─────────────────────────────────────────────────────────────
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0.78, roughness: 0.16,
      clearcoat: 1, clearcoatRoughness: 0.07,
    });
    paintMat.userData = { isPaint: true };

    const tireMat  = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.75 });
    const rimMat   = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.85, roughness: 0.12 });
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0xff1144 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xd8f8ff });
    const carbon   = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.6 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.04 });
    const underNeon = new THREE.MeshBasicMaterial({ color: 0x00ccff });

    // ── Body ─────────────────────────────────────────────────────────────────
    // All body parts are tagged with userData.paint = true so applyCustomization works

    // Main body slab
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.58, 5.9), paintMat);
    body.position.y = 0.62;
    body.userData.paint = true;

    // Front hood (angled nose taper)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 1.6), paintMat);
    hood.position.set(0, 0.88, -2.55);
    hood.rotation.x = -0.06;
    hood.userData.paint = true;

    // Rear deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 0.95), paintMat);
    deck.position.set(0, 0.88, 2.55);
    deck.userData.paint = true;

    // Cabin / greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.68, 1.95), paintMat);
    cabin.position.set(0, 1.3, 0.18);
    cabin.userData.glass = true;

    // A-pillar taper (visual only)
    const roofPanel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.95), paintMat);
    roofPanel.position.set(0, 1.64, 0.18);
    roofPanel.userData.paint = true;

    // Front splitter
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.09, 0.52), carbon);
    splitter.position.set(0, 0.33, -3.25);

    // Rear diffuser
    const diffuser = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.22, 0.48), carbon);
    diffuser.position.set(0, 0.36, 3.26);

    grp.add(body, hood, deck, cabin, roofPanel, splitter, diffuser);

    // ── Side skirts ──────────────────────────────────────────────────────────
    if (this.customization.bodyKit !== "Street") {
      for (const side of [-1, 1]) {
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 5.4), carbon);
        skirt.position.set(side * 1.52, 0.34, 0.0);
        grp.add(skirt);
      }
    }

    // ── Time Attack canards ───────────────────────────────────────────────────
    if (this.customization.bodyKit === "Time Attack") {
      const cGeo = new THREE.BoxGeometry(0.72, 0.06, 0.28);
      for (const side of [-1, 1]) {
        const c = new THREE.Mesh(cGeo, carbon);
        c.position.set(side * 1.55, 0.55, -2.9);
        c.rotation.y = side > 0 ? -0.4 : 0.4;
        grp.add(c);
      }
    }

    // ── Spoiler ───────────────────────────────────────────────────────────────
    if (this.customization.spoiler) {
      // Wing blade
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.11, 0.34), paintMat);
      wing.position.set(0, 1.52, 2.88);
      wing.userData.paint = true;
      // Wing end plates
      for (const side of [-1, 1]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.42), carbon);
        plate.position.set(side * 1.48, 1.42, 2.88);
        grp.add(plate);
      }
      // Mounts
      for (const side of [-1, 1]) {
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.52, 0.1), carbon);
        mount.position.set(side * 0.9, 1.2, 2.88);
        grp.add(mount);
      }
      grp.add(wing);
    }

    // ── Undercar neon glow strip ─────────────────────────────────────────────
    const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.04, 5.0), underNeon);
    neonStrip.position.set(0, 0.14, 0);
    grp.add(neonStrip);

    // ── Wheels ────────────────────────────────────────────────────────────────
    const isDeepDish = this.customization.wheels === "Deep Dish";
    const tyreR  = 0.52;
    const tyreW  = isDeepDish ? 0.46 : 0.40;
    const rimR   = tyreR * 0.68;

    const tyreGeo = new THREE.CylinderGeometry(tyreR, tyreR, tyreW, 32);
    const rimGeo  = isDeepDish
      ? new THREE.CylinderGeometry(rimR, rimR * 0.85, tyreW - 0.08, 16)
      : new THREE.CylinderGeometry(rimR, rimR, tyreW - 0.06, 16);

    const wheels = [];
    const wheelPositions = [
      [-1.52, 0.52, -2.05, true ],
      [ 1.52, 0.52, -2.05, true ],
      [-1.52, 0.52,  1.92, false],
      [ 1.52, 0.52,  1.92, false],
    ];

    for (const [x, y, z, isFront] of wheelPositions) {
      const wGrp = new THREE.Group();
      wGrp.position.set(x, y, z);

      const tyre = new THREE.Mesh(tyreGeo, tireMat);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;

      // Brake caliper
      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.22, 0.48),
        new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.4 })
      );
      caliper.position.set(x > 0 ? -0.28 : 0.28, 0, 0);

      wGrp.add(tyre, rim, caliper);
      wGrp.userData.isFront = isFront;
      wheels.push(wGrp);
      grp.add(wGrp);
    }
    grp.userData.wheels = wheels;

    // ── Lights ────────────────────────────────────────────────────────────────
    // Headlights
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.07), lightMat);
      lens.position.set(side * 0.88, 0.78, -3.28);
      grp.add(lens);

      // DRL strip
      const drl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      drl.position.set(side * 0.88, 0.68, -3.28);
      grp.add(drl);
    }

    // Tail lights
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.07), brakeMat);
      tail.position.set(side * 0.88, 0.72, 3.28);
      grp.add(tail);
    }

    // Chrome exhaust tips
    for (const side of [-0.55, 0.55]) {
      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.32, 12),
        chromeMat
      );
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(side, 0.38, 3.32);
      grp.add(exhaust);
    }

    // Headlight beam (SpotLight)
    const headSpot = new THREE.SpotLight(0xe8f4ff, 22, 120, 0.38, 0.55, 1.0);
    headSpot.position.set(0, 0.8, -3.3);
    headSpot.target.position.set(0, -1, -40);
    headSpot.castShadow = false;
    grp.add(headSpot, headSpot.target);

    // Rear brake glow
    const brakeGlow = new THREE.PointLight(0xff1100, 6, 8, 2);
    brakeGlow.position.set(0, 0.72, 3.4);
    grp.add(brakeGlow);

    return grp;
  }
}
