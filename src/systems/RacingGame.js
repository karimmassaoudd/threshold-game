import * as THREE from "three";
import { DEFAULT_SETTINGS } from "../config.js";
import { SceneSetup }    from "./SceneSetup.js";
import { PhysicsWorld }  from "./PhysicsWorld.js";
import { RoadSystem }    from "./RoadSystem.js";
import { GarageSystem }  from "./GarageSystem.js";
import { CarController } from "./CarController.js";
import { CameraRig }     from "./CameraRig.js";
import { TrafficSystem } from "./TrafficSystem.js";
import { AudioManager }  from "./AudioManager.js";
import { HUD }           from "./HUD.js";
import { SettingsUI }    from "./SettingsUI.js";
import { ArcadeEffectsSystem } from "./ArcadeEffectsSystem.js";

export class RacingGame {
  constructor(canvas) {
    this.canvas   = canvas;
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.clock    = new THREE.Clock();
    this.input    = new Set();
    this.running  = false;

    // Systems
    this.sceneSetup = new SceneSetup(canvas, this.settings);
    this.physics    = new PhysicsWorld();
    this.road       = new RoadSystem(this.sceneSetup.scene, this.physics);
    this.garage     = new GarageSystem();
    this.audio      = new AudioManager(this.settings);
    this.hud        = new HUD(this.settings);
    this.cameraRig  = new CameraRig(this.sceneSetup.camera, canvas, this.settings);
    this.traffic    = new TrafficSystem(this.sceneSetup.scene, this.physics, this.road);
    this.arcade     = new ArcadeEffectsSystem(this.sceneSetup.scene, this.audio, this.hud);
    this.car        = null;

    // FPS counter
    this._lastFpsTime = performance.now();
    this._frames = 0;

    // Settings UI (needs garage + callbacks)
    this.settingsUI = new SettingsUI(this.settings, this.garage, {
      onSettings: () => this.applySettings(),
      onGarage:   () => this.swapCar(),
      onReset:    () => this.reset(),
    });

    this._bindEvents();
    window.__apexDrive = this;
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async start() {
    const model = await this.garage.createSelectedCarModel();
    this.car = new CarController(model, this.garage.selectedCar, this.physics);
    this.sceneSetup.scene.add(this.car.group);

    // Warm up road & traffic
    this.road.update(0);
    this.traffic.reset(0);
    this.applySettings();
    this.running = true;
    requestAnimationFrame((t) => this._frame(t));
  }

  // ── Events ────────────────────────────────────────────────────────────────
  _bindEvents() {
    window.addEventListener("resize", () => this.sceneSetup.resize());

    document.addEventListener("keydown", (e) => {
      this.input.add(e.code);

      if (e.code === "KeyR") this.reset();

      if (e.code === "KeyC") {
        this.cameraRig.nextMode();
        this.hud.applySettings(this.settings);
      }

      if (e.code === "KeyG") {
        this.settingsUI.toggleGarage();
      }

      if (e.code === "KeyM") {
        this.audio.toggleMute();
      }
    });

    document.addEventListener("keyup", (e) => this.input.delete(e.code));

    // Click anywhere to start (prompt overlays the canvas, so listen on document)
    const startOnce = () => {
      this.audio.resume();
      document.body.classList.add("driving");
      const prompt = document.getElementById("prompt");
      if (prompt) prompt.classList.add("hidden");
    };
    document.addEventListener("click", startOnce, { once: false });
    this.canvas.addEventListener("click", startOnce);
  }

  // ── Car swap (garage change) ───────────────────────────────────────────────
  async swapCar() {
    const prev = this.car;
    const savedPos   = prev?.position.clone();
    const savedSpeed = prev?.speed ?? 0;
    prev?.dispose();

    const model = await this.garage.createSelectedCarModel();
    this.car = new CarController(model, this.garage.selectedCar, this.physics);
    this.sceneSetup.scene.add(this.car.group);
    if (savedPos) this.car.setPosition(savedPos, savedSpeed);
  }

  // ── Settings broadcast ────────────────────────────────────────────────────
  applySettings() {
    this.sceneSetup.applySettings(this.settings);
    this.cameraRig.applySettings(this.settings);
    this.audio.applySettings(this.settings);
    this.traffic.applySettings(this.settings);
    this.hud.applySettings(this.settings);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  reset() {
    this.physics.reset();
    this.car?.reset();
    this.traffic.reset(0);
    this.arcade.reset();
    this.audio.playCrash(0.08);
  }

  // ── Main game loop ────────────────────────────────────────────────────────
  _frame(now) {
    if (!this.running) return;

    const dt = Math.min(this.clock.getDelta(), 1 / 30);

    // Update all systems
    this.physics.step(dt);
    this.car.update(dt, this.input, this.settings);
    this.road.update(this.car.position.z);
    this.arcade.update(dt, this.car);
    this.traffic.update(dt, this.car, this.settings);
    this.cameraRig.update(dt, this.car, this.input);
    this.audio.update(this.car, this.input);
    this.sceneSetup.update(dt, this.car, this.settings);
    this.hud.update(this.car);

    // Play crash sound on wall hit
    if (this.car._wallHit && !this._prevWallHit) {
      const impact = Math.abs(this.car.speed) / 20;
      this.audio.playCrash(Math.min(1, impact));
    }
    this._prevWallHit = this.car._wallHit;

    // FPS counter
    this._frames++;
    if (now - this._lastFpsTime > 500) {
      const measuredFps = Math.round((this._frames * 1000) / (now - this._lastFpsTime));
      this.hud.setFPS(measuredFps);
      if (this.settings.graphics === "240 FPS" && measuredFps < 235) {
        this.sceneSetup.reducePerformanceCost();
      }
      this._frames      = 0;
      this._lastFpsTime = now;
    }

    this.sceneSetup.render();
    requestAnimationFrame((t) => this._frame(t));
  }
}
