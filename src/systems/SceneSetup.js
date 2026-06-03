import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { QUALITY } from "../config.js";

export class SceneSetup {
  constructor(canvas, settings) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7fc8ff);
    this.scene.fog = new THREE.FogExp2(0xa8ddff, 0.0012);
    this.camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 2200);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.sun = new THREE.DirectionalLight(0xffffff, 3.2);
    this.sun.castShadow = true;
    this.sun.shadow.camera.left = -130;
    this.sun.shadow.camera.right = 130;
    this.sun.shadow.camera.top = 130;
    this.sun.shadow.camera.bottom = -130;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 360;
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    this.scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0x9ee9ff, 0x17211f, 1.8);
    this.scene.add(this.hemi);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.55, 0.18);
    this.afterimage = new AfterimagePass();
    this.afterimage.uniforms.damp.value = 0.94;
    this.output = new OutputPass();
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.afterimage);
    this.composer.addPass(this.output);
    this.rain = this.createRain();
    this.scene.add(this.rain);
    this.resize();
    this.applySettings(settings);
  }

  createRain() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1200 * 3);
    for (let i = 0; i < positions.length / 3; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = Math.random() * 70;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geometry, new THREE.PointsMaterial({
      color: 0xbdefff,
      size: 0.085,
      transparent: true,
      opacity: 0,
    }));
  }

  applySettings(settings) {
    const quality = QUALITY[settings.graphics];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    this.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    this.renderer.shadowMap.enabled = settings.shadows;
    this.bloom.strength = settings.postProcessing ? quality.bloom : 0;
    this.afterimage.enabled = settings.postProcessing;
    this.scene.fog.density = quality.fog;

    const weather = {
      Clear: [0x7fc8ff, 0xa8ddff, 3.2, 1.8, 0],
      Rain: [0x263a46, 0x2d4857, 1.55, 1.2, 0.55],
      Storm: [0x111920, 0x15222b, 0.9, 0.85, 0.95],
      Sunset: [0xff9f6b, 0xf0a16d, 2.7, 1.55, 0],
    }[settings.weather];
    this.scene.background.setHex(weather[0]);
    this.scene.fog.color.setHex(weather[1]);
    this.sun.intensity = weather[2];
    this.hemi.intensity = weather[3];
    this.rain.material.opacity = weather[4];
    this.resize();
  }

  update(dt, car) {
    this.sunTarget.position.copy(car.position);
    this.sun.position.copy(car.position).add(new THREE.Vector3(-95, 130, 72));
    this.afterimage.uniforms.damp.value = car.turboActive ? 0.82 : 0.94;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, car.turboActive ? 76 : 64, 1 - Math.pow(0.0005, dt));
    this.camera.updateProjectionMatrix();

    if (this.rain.material.opacity > 0.01) {
      const data = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < data.length / 3; i += 1) {
        data[i * 3 + 1] -= 76 * dt;
        data[i * 3 + 2] += car.speed * dt * 2.8;
        if (data[i * 3 + 1] < -3) {
          data[i * 3] = car.position.x + (Math.random() - 0.5) * 130;
          data[i * 3 + 1] = 65;
          data[i * 3 + 2] = car.position.z + (Math.random() - 0.5) * 180;
        }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.composer.render();
  }
}
