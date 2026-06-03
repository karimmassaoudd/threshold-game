import * as THREE from "three";
import "./styles.css";

const canvas = document.querySelector("#game");
const fpsLabel = document.querySelector("#fps");
const qualityLabel = document.querySelector("#quality");
const cameraModeLabel = document.querySelector("#cameraMode");
const speedLabel = document.querySelector("#speed");
const rpmBar = document.querySelector("#rpm");
const gearLabel = document.querySelector("#gear");
const nitroLabel = document.querySelector("#nitro");
const lapLabel = document.querySelector("#lap");
const timeLabel = document.querySelector("#time");
const damageLabel = document.querySelector("#damage");
const prompt = document.querySelector("#prompt");
const garage = document.querySelector("#garage");
const garageToggle = document.querySelector("#garageToggle");
const qualitySelect = document.querySelector("#qualitySelect");
const weatherSelect = document.querySelector("#weatherSelect");
const cameraSelect = document.querySelector("#cameraSelect");
const paintSelect = document.querySelector("#paintSelect");
const trafficSelect = document.querySelector("#trafficSelect");
const assistToggle = document.querySelector("#assistToggle");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1800);
const clock = new THREE.Clock();

const config = {
  quality: "ultra",
  weather: "clear",
  camera: "chase",
  paint: "cyan",
  traffic: "normal",
  assist: true,
};

const state = {
  speed: 0,
  steer: 0,
  lateral: 0,
  progress: 0,
  yaw: 0,
  lap: 1,
  lapDistance: 5200,
  raceTime: 0,
  nitro: 100,
  damage: 0,
  airborne: 0,
  cameraShake: 0,
  started: false,
};

const input = new Set();
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();
let lastFpsTime = performance.now();
let fpsFrames = 0;

function roadCenter(z) {
  return (
    Math.sin(z * 0.0014) * 24 +
    Math.sin(z * 0.0041 + 1.7) * 7 +
    Math.sin(z * 0.00043 + 4.0) * 42
  );
}

function roadSlope(z) {
  return 0.018 * Math.sin(z * 0.0021) + 0.012 * Math.sin(z * 0.006);
}

function roadHeight(z) {
  return Math.sin(z * 0.002) * 3 + Math.sin(z * 0.0007) * 10;
}

function roadTangent(z) {
  const dz = 4;
  const a = new THREE.Vector3(roadCenter(z - dz), roadHeight(z - dz), z - dz);
  const b = new THREE.Vector3(roadCenter(z + dz), roadHeight(z + dz), z + dz);
  return b.sub(a).normalize();
}

function roadNormal(z) {
  const tangent = roadTangent(z);
  const side = new THREE.Vector3(1, 0, -tangent.x / Math.max(0.001, tangent.z)).normalize();
  return side;
}

function roadPoint(z, lateral = 0) {
  const side = roadNormal(z);
  return new THREE.Vector3(roadCenter(z), roadHeight(z), z).addScaledVector(side, lateral);
}

const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(-80, 110, 50);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x8ddfff, 0x172025, 1.9));

const world = new THREE.Group();
scene.add(world);

const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x20312b, roughness: 0.95 });
const terrain = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 1, 1), terrainMaterial);
terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -7;
terrain.receiveShadow = true;
world.add(terrain);

const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4650, roughness: 0.9 });
const mountains = [];
for (let i = 0; i < 42; i += 1) {
  const peak = new THREE.Mesh(
    new THREE.ConeGeometry(28 + seeded(i + 400) * 54, 70 + seeded(i + 500) * 130, 5),
    mountainMaterial,
  );
  peak.castShadow = true;
  peak.receiveShadow = true;
  world.add(peak);
  mountains.push({ peak, seed: i + 3000, lane: seeded(i + 510) > 0.5 ? 1 : -1 });
}

const paintMaterials = {
  cyan: new THREE.MeshPhysicalMaterial({
    color: 0x10d9ff,
    metalness: 0.72,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xff2438,
    metalness: 0.65,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
  }),
  black: new THREE.MeshPhysicalMaterial({
    color: 0x050608,
    metalness: 0.9,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  }),
  white: new THREE.MeshPhysicalMaterial({
    color: 0xf1f4ee,
    metalness: 0.45,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  }),
};

const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x171b1e, roughness: 0.78, metalness: 0.05 });
const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x20272a, roughness: 0.86 });
const laneMaterial = new THREE.MeshBasicMaterial({ color: 0xdff9ff });
const neonMaterial = new THREE.MeshBasicMaterial({ color: 0x45ecff });
const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0x65757b, metalness: 0.32, roughness: 0.38 });
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0b1720,
  metalness: 0.05,
  roughness: 0.05,
  transmission: 0.35,
  transparent: true,
  opacity: 0.72,
});
const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.7 });
const brakeMaterial = new THREE.MeshBasicMaterial({ color: 0xff1748 });
const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xcffcff });

function makeCar() {
  const car = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.48, 4.35), paintMaterials[config.paint]);
  body.position.y = 0.56;
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.32, 1.35), paintMaterials[config.paint]);
  nose.position.set(0, 0.48, -1.8);
  nose.castShadow = true;
  car.add(nose);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.55, 1.48), glassMaterial);
  cabin.position.set(0, 0.98, -0.1);
  cabin.castShadow = true;
  car.add(cabin);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.09, 0.28), paintMaterials[config.paint]);
  wing.position.set(0, 1.0, 1.92);
  wing.castShadow = true;
  car.add(wing);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.08, 0.42), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.35 }));
  splitter.position.set(0, 0.31, -2.24);
  car.add(splitter);

  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.36, 28);
  for (const x of [-1.16, 1.16]) {
    for (const z of [-1.46, 1.42]) {
      const wheel = new THREE.Mesh(wheelGeo, tireMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.33, z);
      wheel.castShadow = true;
      wheels.push(wheel);
      car.add(wheel);
    }
  }

  const lights = [
    [-0.62, 0.53, -2.23, headlightMaterial],
    [0.62, 0.53, -2.23, headlightMaterial],
    [-0.7, 0.54, 2.19, brakeMaterial],
    [0.7, 0.54, 2.19, brakeMaterial],
  ];
  for (const [x, y, z, mat] of lights) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.06), mat);
    light.position.set(x, y, z);
    car.add(light);
  }

  const leftHead = new THREE.SpotLight(0xbffaff, 11, 95, 0.42, 0.65, 1.2);
  leftHead.position.set(-0.55, 0.55, -2.35);
  leftHead.target.position.set(-0.8, 0, -34);
  car.add(leftHead, leftHead.target);

  const rightHead = leftHead.clone();
  rightHead.position.x = 0.55;
  rightHead.target = leftHead.target.clone();
  rightHead.target.position.set(0.8, 0, -34);
  car.add(rightHead, rightHead.target);

  car.userData.wheels = wheels;
  car.userData.paintMeshes = [body, nose, wing];
  return car;
}

const car = makeCar();
scene.add(car);

const roadSegments = [];
const roadGeo = new THREE.PlaneGeometry(18, 64, 1, 1);
roadGeo.rotateX(-Math.PI / 2);
const shoulderGeo = new THREE.PlaneGeometry(32, 64, 1, 1);
shoulderGeo.rotateX(-Math.PI / 2);
for (let i = 0; i < 42; i += 1) {
  const group = new THREE.Group();
  const shoulder = new THREE.Mesh(shoulderGeo, shoulderMaterial);
  shoulder.position.y = -0.035;
  shoulder.receiveShadow = true;
  group.add(shoulder);

  const road = new THREE.Mesh(roadGeo, roadMaterial);
  road.receiveShadow = true;
  group.add(road);

  const midLine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 12), laneMaterial);
  midLine.position.y = 0.025;
  group.add(midLine);

  for (const x of [-9.4, 9.4]) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.72, 55), barrierMaterial);
    barrier.position.set(x, 0.36, 0);
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    group.add(barrier);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 50), neonMaterial);
    strip.position.set(x * 0.98, 0.88, 0);
    group.add(strip);
  }

  world.add(group);
  roadSegments.push(group);
}

const scenery = new THREE.Group();
world.add(scenery);

const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x182329, metalness: 0.15, roughness: 0.56 });
const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x4beeff });
const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x0d3525, roughness: 0.8 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3c2b1d, roughness: 0.85 });
const sceneryItems = [];

function seeded(i) {
  return Math.sin(i * 917.23) * 0.5 + 0.5;
}

for (let i = 0; i < 90; i += 1) {
  const building = new THREE.Group();
  const h = 8 + seeded(i) * 46;
  const w = 7 + seeded(i + 10) * 16;
  const d = 7 + seeded(i + 20) * 18;
  const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMaterial);
  tower.castShadow = true;
  tower.receiveShadow = true;
  tower.position.y = h / 2;
  building.add(tower);
  for (let k = 0; k < 5; k += 1) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.18, 0.05), windowMaterial);
    win.position.set(0, 3 + k * h / 6, -d / 2 - 0.03);
    building.add(win);
  }
  scenery.add(building);
  sceneryItems.push({ object: building, type: "building", lane: seeded(i + 30) > 0.5 ? 1 : -1, seed: i });
}

for (let i = 0; i < 80; i += 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.6, 8), trunkMaterial);
  trunk.position.y = 1.3;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.2, 9), treeMaterial);
  crown.position.y = 4.2;
  tree.add(trunk, crown);
  scenery.add(tree);
  sceneryItems.push({ object: tree, type: "tree", lane: seeded(i + 130) > 0.5 ? 1 : -1, seed: i + 1000 });
}

const trafficCars = [];
const trafficMaterial = [
  new THREE.MeshStandardMaterial({ color: 0xffc400, roughness: 0.28, metalness: 0.4 }),
  new THREE.MeshStandardMaterial({ color: 0xff3159, roughness: 0.3, metalness: 0.45 }),
  new THREE.MeshStandardMaterial({ color: 0x2f6dff, roughness: 0.28, metalness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0xe7edf2, roughness: 0.22, metalness: 0.35 }),
];

for (let i = 0; i < 18; i += 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 4.1), trafficMaterial[i % trafficMaterial.length]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  trafficCars.push({ mesh, lane: [-5.2, -1.8, 1.8, 5.2][i % 4], offset: 170 + i * 190 + seeded(i) * 80, speed: 28 + seeded(i + 5) * 32 });
}

const rain = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({ color: 0xbdefff, size: 0.08, transparent: true, opacity: 0.0 }),
);
const rainPositions = new Float32Array(900 * 3);
for (let i = 0; i < 900; i += 1) {
  rainPositions[i * 3] = (seeded(i) - 0.5) * 130;
  rainPositions[i * 3 + 1] = seeded(i + 600) * 60;
  rainPositions[i * 3 + 2] = (seeded(i + 1200) - 0.5) * 220;
}
rain.geometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
scene.add(rain);

function applyQuality() {
  const maxDpr = window.devicePixelRatio || 1;
  const profile = {
    ultra: { dpr: Math.min(2, maxDpr), shadows: 2048, antialias: true, label: "4K ULTRA" },
    balanced: { dpr: Math.min(1.25, maxDpr), shadows: 1024, antialias: true, label: "BALANCED" },
    fps: { dpr: Math.min(0.85, maxDpr), shadows: 512, antialias: false, label: "240 FPS" },
  }[config.quality];
  renderer.setPixelRatio(profile.dpr);
  sun.shadow.mapSize.set(profile.shadows, profile.shadows);
  qualityLabel.textContent = profile.label;
  resize();
}

function applyWeather() {
  const presets = {
    clear: { bg: 0x7fc8ff, fog: 0xa8ddff, density: 0.00075, sun: 3.3, hemi: 1.9, rain: 0 },
    rain: { bg: 0x263a46, fog: 0x2d4857, density: 0.0032, sun: 1.6, hemi: 1.25, rain: 0.55 },
    storm: { bg: 0x111920, fog: 0x15222b, density: 0.0052, sun: 0.9, hemi: 0.9, rain: 0.95 },
    sunset: { bg: 0xff9f6b, fog: 0xf0a16d, density: 0.00125, sun: 2.8, hemi: 1.55, rain: 0 },
  }[config.weather];
  scene.background = new THREE.Color(presets.bg);
  scene.fog = new THREE.FogExp2(presets.fog, presets.density);
  sun.intensity = presets.sun;
  scene.children.find((child) => child.isHemisphereLight).intensity = presets.hemi;
  rain.material.opacity = presets.rain;
  renderer.toneMappingExposure = config.weather === "storm" ? 0.9 : 1.05;
}

function applyPaint() {
  for (const mesh of car.userData.paintMeshes) {
    mesh.material = paintMaterials[config.paint];
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

function resetRace() {
  state.speed = 0;
  state.steer = 0;
  state.lateral = 0;
  state.progress = 0;
  state.yaw = 0;
  state.lap = 1;
  state.raceTime = 0;
  state.nitro = 100;
  state.damage = 0;
  state.cameraShake = 0;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}.${secs.toFixed(2).padStart(5, "0")}`;
}

function updateRoad() {
  const base = Math.floor((state.progress - 420) / 64) * 64;
  for (let i = 0; i < roadSegments.length; i += 1) {
    const z = base + i * 64;
    const p = roadPoint(z, 0);
    const tangent = roadTangent(z);
    roadSegments[i].position.copy(p);
    roadSegments[i].rotation.y = Math.atan2(tangent.x, tangent.z);
  }
}

function updateScenery() {
  terrain.position.x = roadCenter(state.progress);
  terrain.position.z = state.progress;

  for (const item of mountains) {
    const loop = 4600;
    const z = state.progress - 800 + ((item.seed * 97) % loop);
    const wrapped = state.progress - 900 + ((((z - state.progress + 900) % loop) + loop) % loop);
    const side = item.lane * (170 + seeded(item.seed + 80) * 300);
    item.peak.position.copy(roadPoint(wrapped, side));
    item.peak.position.y -= 12;
    item.peak.rotation.y = seeded(item.seed) * Math.PI;
  }

  for (let i = 0; i < sceneryItems.length; i += 1) {
    const item = sceneryItems[i];
    const loop = 3600;
    const z = state.progress - 450 + ((item.seed * 73) % loop);
    const wrapped = state.progress - 520 + ((((z - state.progress + 520) % loop) + loop) % loop);
    const side = item.lane * (38 + seeded(item.seed + 20) * 70);
    item.object.position.copy(roadPoint(wrapped, side));
    item.object.rotation.y = Math.sin(item.seed) * 0.25;
    if (item.type === "building") item.object.position.y -= 0.05;
  }
}

function updateTraffic(dt) {
  const density = config.traffic === "off" ? 0 : config.traffic === "heavy" ? 18 : 10;
  for (let i = 0; i < trafficCars.length; i += 1) {
    const item = trafficCars[i];
    item.offset -= item.speed * dt;
    if (item.offset < -80) item.offset += 2200 + seeded(i) * 400;
    const active = i < density;
    item.mesh.visible = active;
    if (!active) continue;

    const z = state.progress + item.offset;
    const p = roadPoint(z, item.lane + Math.sin(z * 0.02 + i) * 0.35);
    const tangent = roadTangent(z);
    item.mesh.position.copy(p);
    item.mesh.position.y += 0.48;
    item.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);

    const carP = roadPoint(state.progress, state.lateral);
    const dist = item.mesh.position.distanceTo(carP);
    if (dist < 3.0 && Math.abs(item.offset) < 7) {
      state.speed *= 0.86;
      state.damage = Math.min(100, state.damage + (3.0 - dist) * 2.2);
      state.cameraShake = 0.7;
    }
  }
}

function updatePhysics(dt) {
  const throttle = input.has("KeyW") || input.has("ArrowUp");
  const brake = input.has("KeyS") || input.has("ArrowDown");
  const left = input.has("KeyA") || input.has("ArrowLeft");
  const rightKey = input.has("KeyD") || input.has("ArrowRight");
  const handbrake = input.has("Space");
  const nitro = input.has("ShiftLeft") || input.has("ShiftRight");

  const maxSpeed = 92 - state.damage * 0.18;
  const accel = nitro && state.nitro > 0 ? 48 : 30;
  if (throttle) state.speed += accel * dt;
  else state.speed -= 9 * dt;
  if (brake) state.speed -= 42 * dt;
  state.speed -= state.speed * (handbrake ? 0.72 : 0.18) * dt;
  state.speed = THREE.MathUtils.clamp(state.speed, -18, maxSpeed);

  if (nitro && throttle && state.nitro > 0) {
    state.speed += 26 * dt;
    state.nitro = Math.max(0, state.nitro - 28 * dt);
    state.cameraShake = Math.max(state.cameraShake, 0.18);
  } else {
    state.nitro = Math.min(100, state.nitro + 8 * dt);
  }

  const steerTarget = (left ? 1 : 0) - (rightKey ? 1 : 0);
  state.steer = THREE.MathUtils.lerp(state.steer, steerTarget, 1 - Math.pow(0.0003, dt));
  const steerPower = (handbrake ? 0.12 : 0.07) * Math.min(1.6, Math.abs(state.speed) / 35);
  state.lateral += state.steer * state.speed * steerPower * dt;

  if (config.assist) state.lateral *= 1 - Math.min(0.9, dt * 0.75);
  const roadLimit = 7.2;
  if (Math.abs(state.lateral) > roadLimit) {
    state.lateral = THREE.MathUtils.clamp(state.lateral, -roadLimit, roadLimit);
    state.speed *= 0.985;
    state.damage = Math.min(100, state.damage + 7 * dt);
    state.cameraShake = Math.max(state.cameraShake, 0.14);
  }

  state.progress += state.speed * 10.8 * dt;
  if (state.progress >= state.lap * state.lapDistance) {
    state.lap += 1;
    state.nitro = 100;
    if (state.lap > 3) {
      state.lap = 3;
      state.progress = state.lapDistance * 3;
      state.speed *= 0.985;
    }
  }
  if (state.started && state.lap <= 3) state.raceTime += dt;
}

function updateCar(dt) {
  const p = roadPoint(state.progress, state.lateral);
  const tangent = roadTangent(state.progress);
  const curveYaw = Math.atan2(tangent.x, tangent.z);
  const driftYaw = -state.steer * Math.min(0.45, Math.abs(state.speed) / 140) * (input.has("Space") ? 1.8 : 1);
  state.yaw = THREE.MathUtils.lerp(state.yaw, curveYaw + driftYaw, 1 - Math.pow(0.001, dt));
  car.position.copy(p);
  car.position.y += 0.36 + Math.sin(performance.now() * 0.014) * 0.018 * Math.min(1, Math.abs(state.speed) / 60);
  car.rotation.set(roadSlope(state.progress), state.yaw, -state.steer * 0.11);

  for (const wheel of car.userData.wheels) {
    wheel.rotation.x -= state.speed * dt * 3.1;
    if (wheel.position.z < 0) wheel.rotation.y = state.steer * 0.38;
  }
}

function updateCamera(dt) {
  const mode = config.camera;
  cameraModeLabel.textContent = mode.toUpperCase();
  const forward = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw));
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  const shake = state.cameraShake * (Math.random() - 0.5);

  if (mode === "hood") {
    cameraDesired.copy(car.position).addScaledVector(forward, -1.6).add(new THREE.Vector3(0, 1.05 + shake, 0));
    cameraTarget.copy(car.position).addScaledVector(forward, -55).add(new THREE.Vector3(0, 1.0, 0));
  } else if (mode === "cinematic") {
    const orbit = performance.now() * 0.00028;
    cameraDesired.copy(car.position)
      .addScaledVector(forward, 9 + Math.sin(orbit) * 3)
      .addScaledVector(side, Math.sin(orbit * 1.7) * 8)
      .add(new THREE.Vector3(0, 4.7 + Math.cos(orbit) * 1.4 + shake, 0));
    cameraTarget.copy(car.position).addScaledVector(forward, -18).add(new THREE.Vector3(0, 1.2, 0));
  } else {
    cameraDesired.copy(car.position)
      .addScaledVector(forward, 10 + Math.min(7, state.speed * 0.06))
      .add(new THREE.Vector3(0, 4.2 + Math.min(2.5, state.speed * 0.018) + shake, 0));
    cameraTarget.copy(car.position).addScaledVector(forward, -28).add(new THREE.Vector3(0, 1.2, 0));
  }

  camera.position.lerp(cameraDesired, 1 - Math.pow(0.00001, dt));
  camera.lookAt(cameraTarget);
  state.cameraShake = Math.max(0, state.cameraShake - dt * 2.4);
}

function updateRain(dt) {
  if (rain.material.opacity <= 0.01) return;
  const pos = rain.geometry.attributes.position.array;
  for (let i = 0; i < pos.length / 3; i += 1) {
    pos[i * 3 + 1] -= 72 * dt;
    pos[i * 3 + 2] += state.speed * dt * 4.0;
    if (pos[i * 3 + 1] < -2) {
      pos[i * 3 + 1] = 52 + seeded(i) * 16;
      pos[i * 3] = car.position.x + (seeded(i + 33) - 0.5) * 110;
      pos[i * 3 + 2] = car.position.z + (seeded(i + 55) - 0.5) * 160;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}

function updateHud(now) {
  const kmh = Math.max(0, Math.round(state.speed * 3.6));
  speedLabel.textContent = String(kmh).padStart(3, "0");
  rpmBar.style.width = `${THREE.MathUtils.clamp((kmh % 120) / 1.2, 12, 100)}%`;
  gearLabel.textContent = state.speed < 2 ? "N" : String(Math.min(7, Math.max(1, Math.floor(kmh / 48) + 1)));
  nitroLabel.textContent = `NITRO ${Math.round(state.nitro)}%`;
  lapLabel.textContent = `${state.lap}/3`;
  timeLabel.textContent = formatTime(state.raceTime);
  damageLabel.textContent = `${Math.round(state.damage)}%`;

  fpsFrames += 1;
  if (now - lastFpsTime > 500) {
    fpsLabel.textContent = `${Math.round((fpsFrames * 1000) / (now - lastFpsTime))} FPS`;
    fpsFrames = 0;
    lastFpsTime = now;
  }
}

function frame(now) {
  const dt = Math.min(clock.getDelta(), 0.04);
  updatePhysics(dt);
  updateRoad();
  updateScenery();
  updateTraffic(dt);
  updateCar(dt);
  updateCamera(dt);
  updateRain(dt);
  updateHud(now);

  sun.target.position.copy(car.position);
  sun.position.copy(car.position).add(new THREE.Vector3(-90, 120, 70));
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function cycleCamera() {
  const modes = ["chase", "hood", "cinematic"];
  config.camera = modes[(modes.indexOf(config.camera) + 1) % modes.length];
  cameraSelect.value = config.camera;
}

function bindOptions() {
  qualitySelect.addEventListener("change", () => {
    config.quality = qualitySelect.value;
    applyQuality();
  });
  weatherSelect.addEventListener("change", () => {
    config.weather = weatherSelect.value;
    applyWeather();
  });
  cameraSelect.addEventListener("change", () => {
    config.camera = cameraSelect.value;
  });
  paintSelect.addEventListener("change", () => {
    config.paint = paintSelect.value;
    applyPaint();
  });
  trafficSelect.addEventListener("change", () => {
    config.traffic = trafficSelect.value;
  });
  assistToggle.addEventListener("change", () => {
    config.assist = assistToggle.checked;
  });
  garageToggle.addEventListener("click", () => {
    garage.classList.toggle("closed");
    garageToggle.textContent = garage.classList.contains("closed") ? "Show" : "Hide";
  });
}

document.addEventListener("keydown", (event) => {
  input.add(event.code);
  if (event.code === "KeyR") resetRace();
  if (event.code === "KeyC") cycleCamera();
  if (event.code === "KeyG") garageToggle.click();
});

document.addEventListener("keyup", (event) => input.delete(event.code));

canvas.addEventListener("click", () => {
  state.started = true;
  document.body.classList.add("driving");
  canvas.requestPointerLock?.();
});

document.addEventListener("pointerlockchange", () => {
  prompt.textContent = document.pointerLockElement === canvas
    ? "Drive clean. Nitro through straights, handbrake the bends."
    : "Click to drive. WASD or arrows. Space handbrake. Shift nitro. C camera. G garage. R reset.";
});

window.addEventListener("resize", resize);

bindOptions();
applyQuality();
applyWeather();
applyPaint();
resetRace();
updateRoad();
updateScenery();
updateTraffic(0);
updateCar(0.016);
updateCamera(0.016);
requestAnimationFrame(frame);
