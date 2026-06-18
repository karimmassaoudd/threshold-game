import * as THREE from "three";
import { EffectComposer }  from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass }      from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AfterimagePass }  from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { OutputPass }      from "three/examples/jsm/postprocessing/OutputPass.js";
import { QUALITY }         from "../config.js";

export class SceneSetup {
  constructor(canvas, settings) {
    this.canvas = canvas;

    // ── Scene ─────────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd0f0);
    this.scene.fog = new THREE.FogExp2(0xb0ddf7, 0.0010);

    // ── Camera ────────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.18, 2000);
    this._targetFov = 68;

    // ── Renderer ──────────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace    = THREE.SRGBColorSpace;
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled   = true;
    this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;

    // ── Lights ────────────────────────────────────────────────────────────────
    // Main sun — close shadow frustum for crisp shadows near car
    this.sun = new THREE.DirectionalLight(0xffffff, 3.4);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left   = -80;
    this.sun.shadow.camera.right  =  80;
    this.sun.shadow.camera.top    =  80;
    this.sun.shadow.camera.bottom = -80;
    this.sun.shadow.camera.near   =   1;
    this.sun.shadow.camera.far    = 280;
    this.sun.shadow.bias          = -0.001;
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    this.scene.add(this.sun);

    // Hemisphere (sky / ground bounce)
    this.hemi = new THREE.HemisphereLight(0xa8deff, 0x1a2e1e, 1.9);
    this.scene.add(this.hemi);

    // Fill light from front-left for car visibility
    this.fill = new THREE.DirectionalLight(0xffeedd, 0.55);
    this.fill.position.set(-30, 18, -25);
    this.scene.add(this.fill);

    // ── Post-processing ───────────────────────────────────────────────────────
    this.renderPass  = new RenderPass(this.scene, this.camera);
    this.bloom       = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, 0.42, 0.16
    );
    this.afterimage  = new AfterimagePass();
    this.afterimage.uniforms.damp.value = 0.88;
    this.afterimage.enabled = false;
    this.output      = new OutputPass();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.afterimage);
    this.composer.addPass(this.output);

    // ── Rain particles ────────────────────────────────────────────────────────
    this.rain = this._createRain();
    this.scene.add(this.rain);

    // ── Speed line overlay (HTML/CSS) ─────────────────────────────────────────
    this._speedLinesEl = document.getElementById("speedLines");
    this._basePixelRatio = 1;
    this._adaptiveScale = 1;

    this.resize();
    this.applySettings(settings);
  }

  _createRain() {
    const COUNT = 450;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 180;
      pos[i * 3 + 1] = Math.random() * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 240;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xbdefff, size: 0.09, transparent: true, opacity: 0,
    }));
  }

  applySettings(settings) {
    const q = QUALITY[settings.graphics];
    this._adaptiveScale = 1;
    this._basePixelRatio = Math.min(window.devicePixelRatio || 1, q.dpr);
    this.renderer.setPixelRatio(this._basePixelRatio);
    this.sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    this.renderer.shadowMap.enabled = settings.shadows;
    this.bloom.strength = settings.postProcessing ? q.bloom : 0;
    this.scene.fog.density = q.fog;

    // Weather presets: [bgHex, fogHex, sunIntensity, hemiIntensity, rainOpacity, exposure]
    const wx = {
      Clear:  [0x8fd0f0, 0xb0ddf7, 3.4, 1.9, 0,   1.08],
      Rain:   [0x263a46, 0x2d4857, 1.6, 1.2, 0.5,  0.88],
      Storm:  [0x111920, 0x15222b, 0.9, 0.8, 0.92, 0.72],
      Sunset: [0xff8c50, 0xf0904d, 2.9, 1.5, 0,    1.22],
      Night:  [0x07101a, 0x0a1724, 0.45, 0.55, 0,   0.82],
    }[settings.weather] ?? [0x8fd0f0, 0xb0ddf7, 3.4, 1.9, 0, 1.08];

    this.scene.background.setHex(wx[0]);
    this.scene.fog.color.setHex(wx[1]);
    this.sun.intensity           = wx[2];
    this.hemi.intensity          = wx[3];
    this.rain.material.opacity   = wx[4];
    this.renderer.toneMappingExposure = wx[5];

    this.resize();
  }

  reducePerformanceCost() {
    this._adaptiveScale = Math.max(0.45, this._adaptiveScale - 0.08);
    this.renderer.setPixelRatio(this._basePixelRatio * this._adaptiveScale);
    this.resize();
  }

  update(dt, car, settings) {
    const speedKmh = Math.abs(car.speed * 3.6);

    // Sun tracks car tightly for consistent shadows
    this.sunTarget.position.copy(car.position);
    this.sun.position.copy(car.position).add(new THREE.Vector3(-85, 120, 65));

    // Fill light orbits slightly for dynamic feel
    this.fill.position.copy(car.position).add(new THREE.Vector3(-30, 18, -25));

    // Motion blur during turbo
    this.afterimage.enabled = settings.postProcessing && car.turboActive;
    this.afterimage.uniforms.damp.value = 0.90;

    // FOV: widens gently with speed, jumps on turbo
    const targetFov = car.turboActive ? 88 : 62 + Math.min(14, speedKmh * 0.065);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 1 - Math.pow(0.0004, dt));
    this.camera.updateProjectionMatrix();

    // Speed line overlay intensity
    if (this._speedLinesEl) {
      const intensity = car.turboActive ? 1 : 0;
      this._speedLinesEl.style.opacity = intensity.toFixed(3);
    }

    // Rain particle update
    if (this.rain.material.opacity > 0.01) {
      const data = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < data.length / 3; i++) {
        data[i * 3 + 1] -= 88 * dt;
        data[i * 3 + 2] += car.speed * dt * 3.2;
        if (data[i * 3 + 1] < -4) {
          data[i * 3]     = car.position.x + (Math.random() - 0.5) * 160;
          data[i * 3 + 1] = 72;
          data[i * 3 + 2] = car.position.z + (Math.random() - 0.5) * 200;
        }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }

  render() {
    if (this.bloom.strength <= 0 && !this.afterimage.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.composer.render();
  }
}
