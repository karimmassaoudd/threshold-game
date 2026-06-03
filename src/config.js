export const CAR_PRESETS = [
  {
    id: "comet",
    name: "Comet RS",
    modelUrl: null,
    color: "#10d9ff",
    mass: 1220,
    power: 11800,
    brake: 58,
    grip: 1.08,
    steering: 1.1,
    maxSpeed: 240,
  },
  {
    id: "vortex",
    name: "Vortex GT",
    modelUrl: null,
    color: "#ff2438",
    mass: 1380,
    power: 13200,
    brake: 62,
    grip: 0.98,
    steering: 0.98,
    maxSpeed: 252,
  },
  {
    id: "titan",
    name: "Titan XR",
    modelUrl: null,
    color: "#f1f4ee",
    mass: 1560,
    power: 14500,
    brake: 66,
    grip: 0.92,
    steering: 0.86,
    maxSpeed: 235,
  },
];

export const DEFAULT_SETTINGS = {
  graphics: "Ultra",
  soundVolume: 0.75,
  musicVolume: 0.35,
  cameraSensitivity: 0.65,
  controlScheme: "WASD",
  shadows: true,
  postProcessing: true,
  weather: "Clear",
  cameraMode: "Chase",
  traffic: "Normal",
  stabilityAssist: true,
};

export const QUALITY = {
  Ultra: { dpr: 1.75, shadowSize: 2048, bloom: 0.85, fog: 0.0012 },
  Balanced: { dpr: 1.2, shadowSize: 1024, bloom: 0.55, fog: 0.0014 },
  "240 FPS": { dpr: 0.85, shadowSize: 512, bloom: 0.25, fog: 0.0017 },
};
