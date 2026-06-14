# APEX DRIVE

APEX DRIVE is a 3D street racing game made with Three.js. The project was created as a personal project to learn how 3D scenes, cameras, lighting, animation, physics, UI, audio and game loops work inside the browser.

GitHub repository: [karimmassaoudd/threshold-game](https://github.com/karimmassaoudd/threshold-game)  
Live version: [https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/)

## Introduction

The idea for this project first came from YouTube, where I saw what kind of 3D projects can be made directly in the browser. After seeing that, I had a more challenging idea in my mind: I wanted to make a small racing game myself instead of only creating a simple 3D object.

Maikel's workshops also helped me a lot because that is where I got introduced to Three.js in a practical way. The workshops helped me understand the basic idea of a scene, camera, lights and objects. After that I started learning more about what Three.js is, how it is used, and how I could build a 3D racing game myself with the help of documentation, examples and AI.

The full code is available in this repository: [karimmassaoudd/threshold-game](https://github.com/karimmassaoudd/threshold-game), and the final project can be played here: [https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/).

## Inspiration

These were the main sources of inspiration and learning for the project:

- Maikel's Three.js workshops
- Three.js official website: [https://threejs.org/](https://threejs.org/)
- YouTube inspiration video: [https://www.youtube.com/watch?v=EOemfVmD-1M](https://www.youtube.com/watch?v=EOemfVmD-1M)
- Discover Three.js: [https://discoverthreejs.com/](https://discoverthreejs.com/)

I used these sources to understand what Three.js can do and how 3D projects can be built in a browser. I also used AI during the process to help me understand errors, improve code and learn how to build the project step by step.

## Features

- 3D street racing game built with Three.js
- Procedural road with curves and hills
- Driveable car with acceleration, braking, steering, reverse and drifting
- Turbo system with rechargeable turbo percentage
- Multiple camera modes
- Traffic cars with collision and damage
- Garage system for car customization
- Weather options like Clear, Rain, Storm and Sunset
- HUD with speed, RPM, gear, turbo, lap, time, damage and route progress
- Engine, turbo, tire, crash and music audio
- Graphics settings for quality, shadows and post-processing
- Hosted live version at [https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/)

## Controls

| Key | Action |
| --- | --- |
| `W` / `Arrow Up` | Accelerate |
| `S` / `Arrow Down` | Brake / Reverse |
| `A` / `Arrow Left` | Steer left |
| `D` / `Arrow Right` | Steer right |
| `Shift` | Turbo |
| `Space` | Handbrake |
| `C` | Change camera mode |
| `G` | Open / close garage |
| `M` | Mute audio |
| `R` | Reset race |

## Camera Modes

The game has different camera modes so the player can experience the racing game in different ways:

- Chase
- Cockpit
- Hood
- Cinematic
- Free

The camera can be changed with the `C` key or from the settings panel.

## Garage

The garage lets the player customize the car. The player can change:

- Car preset
- Paint colour
- Paint finish
- Wheels
- Body kit
- Spoiler
- Window tint
- Engine upgrade
- Grip upgrade

Some garage settings are only visual, but others also change how the car drives. For example, the engine upgrade changes the car power and the grip upgrade changes the car handling.

## Settings

The settings panel includes:

- Graphics quality
- Weather
- Shadows
- Post-processing and bloom
- Sound volume
- Music volume
- Camera sensitivity
- Traffic amount
- Stability assist

The weather setting changes the background, fog, light intensity and rain particles.

## Technologies Used

- [Three.js](https://threejs.org/)
- [Vite](https://vitejs.dev/)
- [cannon-es](https://github.com/pmndrs/cannon-es)
- Web Audio API
- HTML
- CSS
- JavaScript

## Project Structure

```text
src/
  main.js
  config.js
  styles.css
  systems/
    AudioManager.js
    CameraRig.js
    CarController.js
    GarageSystem.js
    HUD.js
    PhysicsWorld.js
    RacingGame.js
    RoadSystem.js
    SceneSetup.js
    SettingsUI.js
    TrafficSystem.js
  utils/
    roadMath.js
```

The project is split into separate systems so every file has its own job. For example, `CarController.js` handles the car movement, `RoadSystem.js` handles the road and environment, `CameraRig.js` handles the camera modes, and `HUD.js` updates the information shown on screen.

## Installation

Clone the repository:

```bash
git clone https://github.com/karimmassaoudd/threshold-game.git
```

Go into the project folder:

```bash
cd threshold-game
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

## Live Demo

The project is hosted online and can be played here:

[https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/)

## Conclusion

APEX DRIVE became more than a simple Three.js experiment. It became a full browser racing game with a car, road, camera modes, traffic, garage customization, weather, HUD, audio and settings.

Through this project I learned how to work with Three.js scenes, cameras, lights, procedural objects, car movement, physics, UI, audio and game loops. I also learned that splitting a bigger project into separate files makes the code easier to understand and improve later.
