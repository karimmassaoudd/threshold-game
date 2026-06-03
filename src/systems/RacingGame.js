import * as THREE from "three";
import { DEFAULT_SETTINGS } from "../config.js";
import { SceneSetup } from "./SceneSetup.js";
import { PhysicsWorld } from "./PhysicsWorld.js";
import { RoadSystem } from "./RoadSystem.js";
import { GarageSystem } from "./GarageSystem.js";
import { CarController } from "./CarController.js";
import { CameraRig } from "./CameraRig.js";
import { TrafficSystem } from "./TrafficSystem.js";
import { AudioManager } from "./AudioManager.js";
import { HUD } from "./HUD.js";
import { SettingsUI } from "./SettingsUI.js";

export class RacingGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.clock = new THREE.Clock();
    this.input = new Set();
    this.sceneSetup = new SceneSetup(canvas, this.settings);
    this.physics = new PhysicsWorld();
    this.road = new RoadSystem(this.sceneSetup.scene, this.physics);
    this.garage = new GarageSystem(this.sceneSetup.scene);
    this.audio = new AudioManager(this.settings);
    this.hud = new HUD(this.settings);
    this.cameraRig = new CameraRig(this.sceneSetup.camera, canvas, this.settings);
    this.traffic = new TrafficSystem(this.sceneSetup.scene, this.physics, this.road);
    this.car = null;
    this.running = false;
    this.lastFps = performance.now();
    this.frames = 0;

    this.settingsUI = new SettingsUI(this.settings, this.garage, {
      onSettings: () => this.applySettings(),
      onGarage: () => this.swapCar(),
      onReset: () => this.reset(),
    });

    this.bindEvents();
  }

  async start() {
    const model = await this.garage.createSelectedCarModel();
    this.car = new CarController(model, this.garage.selectedCar, this.physics);
    this.sceneSetup.scene.add(this.car.group);
    this.road.update(0);
    this.traffic.reset(0);
    this.applySettings();
    this.running = true;
    requestAnimationFrame((t) => this.frame(t));
  }

  bindEvents() {
    window.addEventListener("resize", () => this.sceneSetup.resize());
    document.addEventListener("keydown", (event) => {
      this.input.add(event.code);
      if (event.code === "KeyR") this.reset();
      if (event.code === "KeyC") this.cameraRig.nextMode();
      if (event.code === "KeyM") this.audio.toggleMute();
      if (event.code === "Escape") this.cameraRig.releasePointer();
    });
    document.addEventListener("keyup", (event) => this.input.delete(event.code));
    this.canvas.addEventListener("click", () => {
      this.cameraRig.requestPointer();
      this.audio.resume();
      document.body.classList.add("driving");
    });
  }

  async swapCar() {
    const previous = this.car;
    const savedPosition = previous?.position.clone();
    const savedSpeed = previous?.speed ?? 0;
    previous?.dispose();

    const model = await this.garage.createSelectedCarModel();
    this.car = new CarController(model, this.garage.selectedCar, this.physics);
    this.sceneSetup.scene.add(this.car.group);
    if (savedPosition) this.car.setPosition(savedPosition, savedSpeed);
  }

  applySettings() {
    this.sceneSetup.applySettings(this.settings);
    this.cameraRig.applySettings(this.settings);
    this.audio.applySettings(this.settings);
    this.traffic.applySettings(this.settings);
    this.hud.applySettings(this.settings);
  }

  reset() {
    this.physics.reset();
    this.car?.reset();
    this.traffic.reset(0);
    this.audio.playCrash(0.12);
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.physics.step(dt);
    this.car.update(dt, this.input, this.settings, this.road);
    this.road.update(this.car.position.z);
    this.traffic.update(dt, this.car, this.settings);
    this.cameraRig.update(dt, this.car, this.input);
    this.audio.update(this.car, this.input);
    this.sceneSetup.update(dt, this.car, this.settings);
    this.hud.update(this.car, this.road, this.traffic);

    this.frames += 1;
    if (now - this.lastFps > 500) {
      this.hud.setFPS(Math.round((this.frames * 1000) / (now - this.lastFps)));
      this.frames = 0;
      this.lastFps = now;
    }

    this.sceneSetup.render();
    requestAnimationFrame((t) => this.frame(t));
  }
}
