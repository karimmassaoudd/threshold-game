export class HUD {
  constructor(settings) {
    this.nodes = {
      fps:      document.querySelector("#fps"),
      quality:  document.querySelector("#quality"),
      camera:   document.querySelector("#cameraMode"),
      speed:    document.querySelector("#speed"),
      rpm:      document.querySelector("#rpm"),
      rpmValue: document.querySelector("#rpmValue"),
      gear:     document.querySelector("#gear"),
      nitro:    document.querySelector("#nitro"),
      score:    document.querySelector("#score"),
      combo:    document.querySelector("#combo"),
      toast:    document.querySelector("#arcadeToast"),
      lap:      document.querySelector("#lap"),
      time:     document.querySelector("#time"),
      damage:   document.querySelector("#damage"),
      progress: document.querySelector("#progressFill"),
    };
    this._hudEl     = document.querySelector(".hud");
    this._damageFlashTimer = 0;
    this._prevDamage = 0;
    this._toastTimer = null;
    this.applySettings(settings);
  }

  applySettings(settings) {
    if (this.nodes.quality) this.nodes.quality.textContent = settings.graphics.toUpperCase();
    if (this.nodes.camera)  this.nodes.camera.textContent  = settings.cameraMode.toUpperCase();
  }

  setFPS(fps) {
    if (this.nodes.fps) this.nodes.fps.textContent = `${fps} FPS`;
  }

  setArcade(score, combo, message = null) {
    if (this.nodes.score) this.nodes.score.textContent = String(score).padStart(6, "0");
    if (this.nodes.combo) {
      this.nodes.combo.textContent = `x${combo}`;
      this.nodes.combo.classList.toggle("hot", combo > 1);
    }
    if (message && this.nodes.toast) {
      this.nodes.toast.textContent = message;
      this.nodes.toast.classList.remove("show");
      void this.nodes.toast.offsetWidth;
      this.nodes.toast.classList.add("show");
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => this.nodes.toast?.classList.remove("show"), 850);
    }
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = (seconds - m * 60).toFixed(2).padStart(5, "0");
    return `${String(m).padStart(2, "0")}:${s}`;
  }

  update(car) {
    const kmh = Math.max(0, Math.round(car.speed * 3.6));

    // Speed
    if (this.nodes.speed) this.nodes.speed.textContent = String(kmh).padStart(3, "0");

    // RPM bar
    if (this.nodes.rpm) this.nodes.rpm.style.width = `${Math.round(car.rpm * 100)}%`;
    if (this.nodes.rpmValue) {
      const rpmValue = Math.round((900 + car.rpm * 7800) / 100) * 100;
      this.nodes.rpmValue.textContent = String(rpmValue).padStart(4, "0");
      this.nodes.rpmValue.classList.toggle("redline", car.rpm > 0.86);
    }

    // Gear
    if (this.nodes.gear) {
      this.nodes.gear.textContent = car.gear === 0 ? "N" : car.gear < 0 ? "R" : String(car.gear);
    }

    // Turbo badge
    if (this.nodes.nitro) {
      const pct = Math.round(car.turbo);
      this.nodes.nitro.textContent = `TURBO ${pct}%`;
      this.nodes.nitro.style.color  = car.turboActive ? "#ffcc00" : pct < 20 ? "#ff4444" : "";
    }

    // Lap
    if (this.nodes.lap) this.nodes.lap.textContent = `${car.lap}/3`;

    // Time
    if (this.nodes.time) this.nodes.time.textContent = this._formatTime(car.raceTime);

    // Damage — flash HUD red on new damage
    if (this.nodes.damage) {
      const d = Math.round(car.damage);
      this.nodes.damage.textContent = `${d}%`;
      this.nodes.damage.style.color = d > 60 ? "#ff3333" : d > 30 ? "#ff9900" : "";

      if (car.damage > this._prevDamage + 3 && this._hudEl) {
        this._hudEl.classList.remove("damage-flash");
        void this._hudEl.offsetWidth; // reflow to restart animation
        this._hudEl.classList.add("damage-flash");
        setTimeout(() => this._hudEl?.classList.remove("damage-flash"), 400);
      }
      this._prevDamage = car.damage;
    }

    // Route progress
    if (this.nodes.progress) {
      const pct = Math.min(100, ((Math.abs(car.progress) % 5200) / 5200) * 100);
      this.nodes.progress.style.width = `${pct.toFixed(1)}%`;
    }

    // Turbo body class for speedo glow
    document.body.classList.toggle("turbo-active", !!car.turboActive);
  }
}
