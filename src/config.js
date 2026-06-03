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
  graphics: "240 FPS",
  soundVolume: 0.75,
  musicVolume: 0.35,
  cameraSensitivity: 0.65,
  controlScheme: "WASD",
  shadows: false,
  postProcessing: false,
  weather: "Clear",
  cameraMode: "Chase",
  traffic: "Off",
  stabilityAssist: true,
};

export const QUALITY = {
  Ultra: { dpr: 1.35, shadowSize: 1536, bloom: 0.38, fog: 0.0005 },
  Balanced: { dpr: 0.95, shadowSize: 768, bloom: 0.24, fog: 0.00058 },
  "240 FPS": { dpr: 0.32, shadowSize: 128, bloom: 0.0, fog: 0.00062 },
};
