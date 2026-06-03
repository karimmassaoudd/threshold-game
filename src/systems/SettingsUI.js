import { CAR_PRESETS } from "../config.js";

export class SettingsUI {
  constructor(settings, garage, callbacks) {
    this.settings  = settings;
    this.garage    = garage;
    this.callbacks = callbacks;
    this._bindTabs();
    this._bindSettings();
    this._bindGarage();
    this._bindMeta();
  }

  // ── Tab switching ─────────────────────────────────────────────────────────
  _bindTabs() {
    const tabs  = document.querySelectorAll(".tab");
    const panes = document.querySelectorAll(".tab-pane");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t)  => t.classList.remove("active"));
        panes.forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        const target = document.getElementById(`tab-${tab.dataset.tab}`);
        if (target) target.classList.add("active");
      });
    });
  }

  // ── Helper: bind a settings key to a DOM element ─────────────────────────
  _bind(selector, key, cb = this.callbacks.onSettings, numeric = false) {
    const node = document.querySelector(selector);
    if (!node) return node;
    // Set initial value
    if (node.type === "checkbox") node.checked = !!this.settings[key];
    else node.value = this.settings[key];

    const handler = () => {
      let val;
      if (node.type === "checkbox")    val = node.checked;
      else if (node.type === "range")  val = Number(node.value);
      else if (numeric)                val = Number(node.value);
      else                             val = node.value;
      this.settings[key] = val;
      cb();
    };
    node.addEventListener("change", handler);
    if (node.type === "range") node.addEventListener("input", handler);
    return node;
  }

  // ── Graphics & sound settings ─────────────────────────────────────────────
  _bindSettings() {
    this._bind("#qualitySelect",      "graphics");
    this._bind("#weatherSelect",      "weather");
    this._bind("#assistToggle",       "stabilityAssist");
    this._bind("#shadowsToggle",      "shadows");
    this._bind("#postToggle",         "postProcessing");
    this._bind("#trafficSelect",      "traffic");
    this._bind("#soundVolume",        "soundVolume");
    this._bind("#musicVolume",        "musicVolume");
    this._bind("#cameraSensitivity",  "cameraSensitivity");
    this._bind("#cameraSelect",       "cameraMode");
  }

  // ── Garage / customization ────────────────────────────────────────────────
  _bindGarage() {
    // Car selector — populate options first
    const carSelect = document.querySelector("#carSelect");
    if (carSelect) {
      carSelect.innerHTML = CAR_PRESETS
        .map((car) => `<option value="${car.id}">${car.name}</option>`)
        .join("");
      carSelect.addEventListener("change", () => {
        this.garage.selectCar(carSelect.value);
        this.callbacks.onGarage();
      });
    }

    // Paint colour
    const paintSel = document.querySelector("#paintSelect");
    if (paintSel) {
      paintSel.addEventListener("change", () => {
        this.garage.customization.paint = paintSel.value;
        this.callbacks.onGarage();
      });
    }

    // Paint finish
    const finishSel = document.querySelector("#paintFinishSelect");
    if (finishSel) {
      finishSel.value = this.garage.customization.paintFinish ?? "metallic";
      finishSel.addEventListener("change", () => {
        this.garage.customization.paintFinish = finishSel.value;
        this.callbacks.onGarage();
      });
    }

    // Wheels
    const wheelSel = document.querySelector("#wheelSelect");
    if (wheelSel) {
      wheelSel.addEventListener("change", () => {
        this.garage.customization.wheels = wheelSel.value;
        this.callbacks.onGarage();
      });
    }

    // Body kit
    const bodySel = document.querySelector("#bodyKitSelect");
    if (bodySel) {
      bodySel.addEventListener("change", () => {
        this.garage.customization.bodyKit = bodySel.value;
        this.callbacks.onGarage();
      });
    }

    // Spoiler toggle
    const spoilerToggle = document.querySelector("#spoilerToggle");
    if (spoilerToggle) {
      spoilerToggle.checked = this.garage.customization.spoiler;
      spoilerToggle.addEventListener("change", () => {
        this.garage.customization.spoiler = spoilerToggle.checked;
        this.callbacks.onGarage();
      });
    }

    // Range sliders for tint / upgrades
    for (const [sel, key] of [
      ["#tintRange",     "windowTint"],
      ["#engineUpgrade", "engineUpgrade"],
      ["#gripUpgrade",   "gripUpgrade"],
    ]) {
      const node = document.querySelector(sel);
      if (!node) continue;
      node.value = this.garage.customization[key];
      const handler = () => {
        this.garage.customization[key] = Number(node.value);
        this.callbacks.onGarage();
      };
      node.addEventListener("input",  handler);
      node.addEventListener("change", handler);
    }
  }

  // ── Garage open/close, reset ──────────────────────────────────────────────
  _bindMeta() {
    const panel  = document.querySelector("#garage");
    const toggle = document.querySelector("#garageToggle");
    if (panel && toggle) {
      toggle.addEventListener("click", () => {
        const closed = panel.classList.toggle("closed");
        toggle.textContent = closed ? "Show" : "Hide";
      });
    }

    const resetBtn = document.querySelector("#resetButton");
    if (resetBtn) resetBtn.addEventListener("click", () => this.callbacks.onReset());
  }

  // Called externally to open/close via G key
  toggleGarage() {
    const panel  = document.querySelector("#garage");
    const toggle = document.querySelector("#garageToggle");
    if (!panel) return;
    const closed = panel.classList.toggle("closed");
    if (toggle) toggle.textContent = closed ? "Show" : "Hide";
  }
}
