import * as THREE from "three";
import * as CANNON from "cannon-es";
import { roadPoint, roadTangent, roadCenter, seeded } from "../utils/roadMath.js";

// ── Materials ─────────────────────────────────────────────────────────────────
const roadMat      = new THREE.MeshStandardMaterial({ color: 0x202327, roughness: 0.9, metalness: 0.02 });
const shoulderMat  = new THREE.MeshStandardMaterial({ color: 0x42464a, roughness: 0.92 });
const sidewalkMat  = new THREE.MeshStandardMaterial({ color: 0x6b6f72, roughness: 0.95 });
const curbMat      = new THREE.MeshStandardMaterial({ color: 0xd6d1c7, roughness: 0.78 });
const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffd629 });
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
const lampGlowMat  = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.72 });
const lightPoolMat = new THREE.MeshBasicMaterial({
  color: 0xffe7a0,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const cafeMat      = new THREE.MeshStandardMaterial({ color: 0x334a57, roughness: 0.72, metalness: 0.08 });
const restaurantMat = new THREE.MeshStandardMaterial({ color: 0x4d3234, roughness: 0.76, metalness: 0.06 });
const hotelMat     = new THREE.MeshStandardMaterial({ color: 0x263848, roughness: 0.64, metalness: 0.16 });
const shopMat      = new THREE.MeshStandardMaterial({ color: 0x3f4248, roughness: 0.72, metalness: 0.08 });
const awningRed    = new THREE.MeshBasicMaterial({ color: 0xc62834 });
const awningCream  = new THREE.MeshBasicMaterial({ color: 0xf4e7c8 });

// Shared geometries (reused across all segments)
const SEG_LEN  = 64;
const SEG_OVERLAP = 8;
const SEG_VIS_LEN = SEG_LEN + SEG_OVERLAP;
const SEG_COUNT = 24;
const RIBBON_STEPS = SEG_COUNT * 4;
const ROAD_W   = 22; // wider road
const SHOULDER = ROAD_W + 26;

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
    this.highwayLightPools = [];
    scene.add(this.root);
    this._createTerrain();
    this._createRoadRibbon();
    this._createSegments();
    this._createPhysicsBarriers();
    this._createEnvironment();
    this.applySettings({ weather: "Clear" });
    this._updateRoadRibbon(-this.segmentLength * 2);
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
  _createRoadRibbon() {
    this.ribbonStrips = [
      { mesh: this._createRibbonMesh(shoulderMat), center: 0, width: SHOULDER, y: -0.055 },
      { mesh: this._createRibbonMesh(roadMat), center: 0, width: ROAD_W, y: 0.006 },
    ];

    for (const side of [-1, 1]) {
      this.ribbonStrips.push(
        { mesh: this._createRibbonMesh(sidewalkMat), center: side * (ROAD_W / 2 + 3.5), width: 6.3, y: 0.075 },
        { mesh: this._createRibbonMesh(curbMat), center: side * (ROAD_W / 2 + 0.18), width: 0.36, y: 0.17 },
        { mesh: this._createRibbonMesh(laneDash), center: side * (ROAD_W / 2 - 0.55), width: 0.42, y: 0.035 }
      );
    }

    for (const center of [-0.28, 0.28]) {
      this.ribbonStrips.push({ mesh: this._createRibbonMesh(yellowLineMat), center, width: 0.12, y: 0.04 });
    }

    for (const strip of this.ribbonStrips) {
      this.root.add(strip.mesh);
    }
  }

  _createRibbonMesh(material) {
    const positions = new Float32Array((RIBBON_STEPS + 1) * 2 * 3);
    const indices = [];

    for (let i = 0; i < RIBBON_STEPS; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  _updateRoadRibbon(startZ) {
    for (const strip of this.ribbonStrips) {
      this._writeRibbonGeometry(strip.mesh.geometry, startZ, strip.center, strip.width, strip.y);
    }
  }

  _writeRibbonGeometry(geometry, startZ, centerLateral, width, yOffset) {
    const positions = geometry.attributes.position.array;
    const halfWidth = width / 2;
    const totalLength = SEG_COUNT * this.segmentLength;

    for (let i = 0; i <= RIBBON_STEPS; i++) {
      const z = startZ + (i / RIBBON_STEPS) * totalLength;
      const left = roadPoint(z, centerLateral - halfWidth);
      const right = roadPoint(z, centerLateral + halfWidth);
      const offset = i * 6;

      positions[offset] = left.x;
      positions[offset + 1] = left.y + yOffset;
      positions[offset + 2] = left.z;
      positions[offset + 3] = right.x;
      positions[offset + 4] = right.y + yOffset;
      positions[offset + 5] = right.z;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  _createSegments() {
    for (let i = 0; i < SEG_COUNT; i++) {
      const grp = new THREE.Group();

      // Sidewalks and curbs: urban GTA-style street instead of race barriers.
      for (const side of [-1, 1]) {
        const curbX = side * (ROAD_W / 2 + 0.18);
        const walkX = side * (ROAD_W / 2 + 3.5);
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, SEG_VIS_LEN), curbMat);
        curb.position.set(curbX, 0.08, 0);
        curb.receiveShadow = true;

        const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.12, SEG_VIS_LEN), sidewalkMat);
        sidewalk.position.set(walkX, 0.015, 0);
        sidewalk.receiveShadow = true;

        const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.018, SEG_VIS_LEN), laneDash);
        gutter.position.set(side * (ROAD_W / 2 - 0.55), 0.031, 0);
        grp.add(sidewalk, curb, gutter);
      }

      // Dashed centre line (yellow)
      for (const x of [-0.28, 0.28]) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.026, SEG_VIS_LEN), yellowLineMat);
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

      // Highway lighting repeats down both sides; only some lamps cast real point light.
      for (const z of [-22, 18]) {
        for (const side of [-1, 1]) {
          const withLight = i % 4 === 0 && z === -22;
          const lampGrp = this._createStreetLamp(side, withLight);
          lampGrp.position.set(side * (ROAD_W / 2 + 4.15), 0, z);
          grp.add(lampGrp);
          this.streetLamps.push(lampGrp);

          const pool = this._createLightPool();
          pool.position.set(side * (ROAD_W / 2 - 2.2), 0.058, z + 1.8);
          pool.scale.x = 1.25;
          grp.add(pool);
          this.highwayLightPools.push(pool);
        }
      }

      this.root.add(grp);
      this.segments.push(grp);
    }
  }

  _createStreetLamp(side = 1, withLight = false) {
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
    arm.position.set(-side * 1.25, 7.5, 0);

    // Lamp head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.22, 0.45),
      lampMat
    );
    head.position.set(-side * 2.5, 7.35, 0);

    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), lampGlowMat);
    glow.position.copy(head.position);

    grp.add(pole, arm, head, glow);

    if (withLight) {
      const light = new THREE.PointLight(0xffe7a0, 1.35, 34, 2.2);
      light.position.copy(head.position);
      light.castShadow = false;
      light.userData.baseIntensity = 1.35;
      grp.add(light);
    }

    return grp;
  }

  _createLightPool() {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4.8, 24), lightPoolMat);
    pool.rotation.x = -Math.PI / 2;
    return pool;
  }

  applySettings(settings) {
    const night = settings.weather === "Night";
    for (const lamp of this.streetLamps) {
      lamp.visible = night;
      lamp.traverse((child) => {
        if (!child.isLight) return;
        child.visible = night;
        child.intensity = night ? child.userData.baseIntensity ?? 1.35 : 0;
      });
    }
    for (const pool of this.highwayLightPools) {
      pool.visible = night;
    }
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

    // Trees on both sides, with small spacing variation so the road feels alive.
    for (let i = 0; i < 90; i++) {
      for (const side of [-1, 1]) {
        const item = this._createTree(i + (side > 0 ? 400 : 0));
        this.root.add(item.object);
        this.scenery.push({
          ...item,
          seed: i + 1000 + (side > 0 ? 500 : 0),
          lane: side,
          minSide: 22,
          extraSide: 34,
        });
      }
    }

    // Roadside venues and city buildings on both sides.
    for (let i = 0; i < 84; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const roll = seeded(i + 31);
      const item =
        roll < 0.18 ? this._createCafe(i) :
        roll < 0.36 ? this._createRestaurant(i) :
        roll < 0.52 ? this._createHotel(i) :
        this._createBuilding(i);

      this.root.add(item.object);
      this.scenery.push({
        ...item,
        seed: i + 2400,
        lane: side,
        minSide: item.type === "building" || item.type === "hotel" ? 34 : 28,
        extraSide: item.type === "building" || item.type === "hotel" ? 34 : 22,
      });
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

  _createCafe(i) {
    return this._createVenue(i, {
      label: "CAFE",
      material: cafeMat,
      signColor: "#1aa7b8",
      height: 6 + seeded(i + 11) * 3,
      width: 12 + seeded(i + 12) * 6,
      depth: 9 + seeded(i + 13) * 4,
      patio: true,
    });
  }

  _createRestaurant(i) {
    return this._createVenue(i, {
      label: seeded(i + 4) > 0.5 ? "DINER" : "GRILL",
      material: restaurantMat,
      signColor: "#d94835",
      height: 7 + seeded(i + 21) * 4,
      width: 14 + seeded(i + 22) * 8,
      depth: 10 + seeded(i + 23) * 5,
      patio: true,
    });
  }

  _createHotel(i) {
    const grp = this._createVenue(i, {
      label: "HOTEL",
      material: hotelMat,
      signColor: "#315eb8",
      height: 24 + seeded(i + 31) * 34,
      width: 12 + seeded(i + 32) * 10,
      depth: 11 + seeded(i + 33) * 8,
      patio: false,
    }).object;

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 5), poleMat);
    antenna.position.y = 28 + seeded(i + 31) * 34;
    grp.add(antenna);
    return { object: grp, type: "hotel" };
  }

  _createVenue(i, options) {
    const grp = new THREE.Group();
    const h = options.height;
    const w = options.width;
    const d = options.depth;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), options.material);
    base.position.y = h / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    grp.add(base);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.35, d + 0.8), buildingMat);
    roof.position.y = h + 0.2;
    grp.add(roof);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(w * 0.78, 9), 1.45, 0.12),
      this._createSignMaterial(options.label, options.signColor)
    );
    sign.position.set(0, Math.min(h - 1.1, 4.2), -d / 2 - 0.12);
    grp.add(sign);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 0.08), windowMat);
    door.position.set(0, 1.25, -d / 2 - 0.08);
    grp.add(door);

    for (const side of [-1, 1]) {
      const frontWindow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.24, 1.7, 0.08), windowWarm);
      frontWindow.position.set(side * w * 0.28, 2.1, -d / 2 - 0.09);
      grp.add(frontWindow);
    }

    const stripeCount = 5;
    for (let stripe = 0; stripe < stripeCount; stripe++) {
      const mat = stripe % 2 === 0 ? awningRed : awningCream;
      const awning = new THREE.Mesh(new THREE.BoxGeometry(w / stripeCount, 0.16, 1.15), mat);
      awning.position.set(-w / 2 + (stripe + 0.5) * (w / stripeCount), 3.05, -d / 2 - 0.55);
      awning.rotation.x = -0.16;
      grp.add(awning);
    }

    const rows = Math.max(0, Math.floor((h - 7) / 4));
    for (let row = 0; row < rows; row++) {
      for (const x of [-0.3, 0.3]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 0.75, 0.06), windowMat);
        win.position.set(x * w, 6.2 + row * 4, -d / 2 - 0.08);
        grp.add(win);
      }
    }

    if (options.patio) {
      for (let t = 0; t < 3; t++) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 12), awningCream);
        table.position.set((t - 1) * 1.8, 0.55, -d / 2 - 2.2);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), poleMat);
        pole.position.set((t - 1) * 1.8, 0.42, -d / 2 - 2.2);
        grp.add(table, pole);
      }
    }

    return { object: grp, type: options.label === "HOTEL" ? "hotel" : "venue" };
  }

  _createSignMaterial(label, background) {
    this._signMaterials ??= new Map();
    const key = `${label}:${background}`;
    if (this._signMaterials.has(key)) return this._signMaterials.get(key);

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 0, canvas.width, 14);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = "#fff6d8";
    ctx.font = "bold 44px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 4);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    this._signMaterials.set(key, material);
    return material;
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
    this._updateRoadRibbon(startZ);

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
    this._updateLoopedObjects(carZ, this.scenery,   4200,  620,  15, 42);
  }

  _updateLoopedObjects(carZ, objects, loop, behind, minSide, extraSide) {
    for (const item of objects) {
      const raw = carZ - behind + ((item.seed * 79) % loop);
      const z   = carZ - behind + ((((raw - carZ + behind) % loop) + loop) % loop);
      const sideMin = item.minSide ?? minSide;
      const sideExtra = item.extraSide ?? extraSide;
      const side = item.lane * (sideMin + seeded(item.seed + 80) * sideExtra);
      item.object.position.copy(roadPoint(z, side));
      if (item.type === "building" || item.type === "venue" || item.type === "hotel") {
        const toRoad = roadPoint(z, 0).sub(item.object.position);
        item.object.rotation.y = Math.atan2(-toRoad.x, -toRoad.z);
      } else {
        item.object.rotation.y = seeded(item.seed) * Math.PI;
      }
      if (item.type === "building") item.object.position.y -= 0.2;
      if (item.type === "venue")    item.object.position.y -= 0.1;
      if (item.type === "hotel")    item.object.position.y -= 0.15;
      if (item.mountain)           item.object.position.y -= 14;
    }
  }
}
