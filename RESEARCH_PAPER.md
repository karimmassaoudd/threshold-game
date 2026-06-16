# Research Paper: Good and Bad Practices in Browser 3D Racing Game Development

**Project name:** APEX DRIVE  
**Research question:** Which good practices should I use and which bad practices should I avoid when building a 3D racing game in the browser with Three.js?

## 1. Introduction

APEX DRIVE is a 3D street racing game made with Three.js. I made this project for my Personal Project X because I wanted to learn how 3D development works inside the browser. The project is not only a normal website, because it also has a 3D scene, a car, a road, traffic, cameras, lighting, animation, audio, physics, UI and a game loop.

The idea first came from YouTube, where I saw that it is possible to make interactive 3D projects in the browser. After that I had a more challenging idea in my mind, which was to make a small racing game myself. Maikel's workshops also helped me because that is where I got introduced to Three.js and learned the basic idea of using scenes, cameras, lights and objects.

I wanted to understand what Three.js is, how browser 3D works, and how a game can keep updating every frame. I also wanted to learn how physics can be used, how camera movement affects the player experience, how UI can be placed over a 3D canvas, and how audio makes a game feel more complete.

The project can be found on GitHub here: [https://github.com/karimmassaoudd/threshold-game](https://github.com/karimmassaoudd/threshold-game)  
The live version can be played here: [https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/)

## 2. Research Method CMD

For this research I used desk research and prototyping.

For desk research, I looked at the Three.js documentation to understand the main parts of Three.js, like scenes, cameras, lights, materials, geometries and rendering. I also used Discover Three.js because it explains the basics in a more beginner-friendly way. For the game loop, I researched `requestAnimationFrame` on MDN, because browser games need a function that updates and renders the scene smoothly. For audio, I used MDN Web Audio API to understand how sound can be generated and controlled in the browser.

I also researched cannon-es because I wanted to understand how physics could be used in the project. For the development setup, I used Vite because it gives a simple and fast way to run a modern JavaScript project during development. Besides documentation, I used a YouTube video for inspiration, Maikel's workshops for the first introduction to Three.js, and AI support to help me understand problems and possible solutions.

For prototyping, I tested features step by step inside my own project. I did not try to build the full game at once. First I worked on the basic Three.js setup, then the car, then the road, then the camera, then the HUD, then settings, traffic and audio. This helped me see what worked and what needed to be changed.

## 3. Findings: Good Practices

### Use a clear Three.js scene setup

A good Three.js project needs a clear setup with a scene, camera, renderer, lights and resize handling. If this setup is unclear, the whole project becomes hard to maintain. In a browser 3D game, the scene is the world, the camera is what the player sees, and the renderer draws everything on the canvas.

For APEX DRIVE, this means the basic scene setup should stay separate from the car logic, road logic and UI logic. This makes it easier to change lighting, fog, weather or post-processing without breaking the driving code.

### Use a proper game loop

A browser game needs a proper game loop. The game loop updates the car, physics, camera, traffic, road, audio and HUD every frame. `requestAnimationFrame` is useful for this because it runs animations in sync with the browser.

In APEX DRIVE, the game loop is important because the car position, speed, camera and HUD all need to update continuously. Without a good loop, the game would feel laggy or inconsistent.

### Split the project into separate files and systems

One of the most important good practices is splitting the project into separate files. A racing game has many parts, so putting everything in one file would quickly become confusing.

A better practice is to create separate systems. For example, one file can handle the car, one can handle the road, one can handle the camera, and one can handle the HUD. This makes the code easier to understand, test and improve later.

### Keep camera, audio, physics, HUD, road, traffic and settings separate

In a 3D racing game, every system has a different responsibility. The camera should only focus on camera behavior. The audio system should only control sounds. The HUD should only update the information on the screen. The physics system should only handle physics-related behavior.

Keeping these systems separate makes the project cleaner. It also helps when something goes wrong, because it is easier to know where to look.

### Test performance

Browser 3D games can become slow if there are too many effects, objects, lights or shadows. Good performance is important because a racing game needs to feel smooth.

This means effects like bloom, shadows, rain particles, traffic and post-processing should be tested. It is also useful to have graphics settings, so the player can lower quality if the game is too heavy.

### Use documentation and examples

Documentation and examples are important because Three.js has many features. The Three.js documentation helped me understand the available objects and systems. Discover Three.js helped me understand the concepts in a simpler way.

Using documentation is better than guessing, because it helps avoid mistakes and makes it easier to understand why something works.

### Validate AI-generated code before using it

AI can be useful, but it should not be trusted blindly. AI can explain errors, suggest code and help with structure, but the code still needs to be tested and understood.

For APEX DRIVE, this means AI was used as support, but I still had to test the result, change it, and make sure it worked inside my own project.

## 4. Findings: Bad Practices

### Putting all code in one big file

A bad practice is putting all code into one huge file. This may work in the beginning, but it becomes difficult when the project grows. In a racing game, there is too much logic for one file, like car movement, camera movement, audio, settings, traffic and UI.

If everything is in one file, it becomes hard to find bugs and hard to add new features.

### Blindly copying AI code

Another bad practice is copying AI-generated code without understanding it. AI can sometimes create code that looks correct but does not fit the project. It can also use wrong assumptions or make the code too complicated.

AI should be used as a learning tool, not as a replacement for thinking and testing.

### Adding too many effects without testing performance

Effects can make a game look better, but too many effects can make it slow. Bloom, shadows, particles, post-processing and many 3D objects can all cost performance.

In a racing game, performance is very important because the player needs smooth movement. If the frame rate drops too much, the driving experience becomes worse.

### Making camera movement confusing

The camera is very important in a racing game. If the camera moves too much, shakes too much, or points in the wrong direction, the player can feel confused. A bad camera can make even a good driving system feel bad.

Camera modes should be tested from the player's perspective, not only from the code perspective.

### Using physics when simple logic is enough

Physics can be useful, but it can also make a project more complicated. Not every movement needs a full physics simulation. Sometimes simple math and collision logic is enough.

Using physics everywhere can make the game harder to control and harder to debug. It is better to use physics only where it actually helps.

### Not documenting the project

Not documenting the project is also a bad practice. If there is no README or explanation, it becomes harder for someone else to understand the project. It also becomes harder for myself later, because I might forget why I made certain choices.

Documentation helps explain what the project is, how it works, how to run it, and what I learned.

## 5. Applying the Research to APEX DRIVE

| Research finding | What I did | Why it helped |
| --- | --- | --- |
| Split the project into separate systems | I split the code into systems like `CarController`, `RoadSystem`, `CameraRig`, `AudioManager`, `HUD`, `PhysicsWorld`, `GarageSystem`, `SettingsUI` and `TrafficSystem`. | This made the project easier to understand because every file has its own responsibility. |
| Use a proper game loop | I used one main loop that updates the car, road, traffic, camera, audio, physics and HUD every frame. | This made the game feel alive because all systems update continuously while driving. |
| Keep the camera clear for the player | I added different camera modes like Chase, Cockpit, Hood, Cinematic and Free. | This improved the player experience because the player can choose how they want to view the game. |
| Test performance and give options | I added settings for graphics, weather, sound, traffic and stability assist. | This helped because the game can be adjusted instead of forcing every effect to be active all the time. |
| Use audio to improve the game feel | I added engine sound, turbo sound, tire screech, crash sound and background music. | This made the game feel more complete and more like a real racing game. |
| Use AI carefully | I used AI to understand errors and improve code, but I tested and changed the code myself. | This helped me learn instead of only copying, and it made the final code fit my own project better. |
| Document the project | I created a README with project information, controls, features, installation and links. | This made the project easier to understand for teachers, classmates and anyone checking the GitHub repository. |

## 6. What I Learned

During this project I learned how Three.js works and how a 3D scene can be created inside the browser. I learned that a Three.js project needs a scene, camera, renderer, lights, objects and materials, but also that a game needs more than only visuals.

I also learned how a browser game loop works. The game loop is important because it updates the car, camera, road, traffic, HUD and audio every frame. Without a good game loop, the game does not feel smooth.

Another important thing I learned is that project structure matters a lot. At first it can be tempting to put everything in one file, but for a bigger project this becomes confusing. Splitting the project into systems made it easier to work on one part at a time.

I also learned why testing is needed. A feature can look good in code but still feel bad when playing. For example, camera movement, speed, traffic and effects need to be tested in the actual game.

Finally, I learned that AI can be helpful, but it should be used carefully. AI helped me understand errors and ideas, but I still needed to test the code, change it, and understand what it does.

## 7. Conclusion

The answer to the research question is that the most important good practices for building a 3D racing game in the browser with Three.js are using a clear scene setup, a proper game loop, separate systems, documentation and performance testing.

For APEX DRIVE, splitting the project into separate files helped the most. Systems like `CarController`, `RoadSystem`, `CameraRig`, `AudioManager`, `HUD`, `PhysicsWorld`, `GarageSystem`, `SettingsUI` and `TrafficSystem` made the project easier to understand and improve.

The bad practices I should avoid are putting everything in one big file, blindly copying AI code, adding too many effects without testing, making confusing camera movement, using physics when simple logic is enough, and not documenting the project.

In the end, this research helped me understand that a browser 3D racing game is not only about making something look good. It also needs structure, testing, clear responsibilities, good performance and careful use of tools like AI.

## 8. References

- Three.js documentation: [https://threejs.org/docs/](https://threejs.org/docs/)
- Discover Three.js: [https://discoverthreejs.com/](https://discoverthreejs.com/)
- MDN requestAnimationFrame: [https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- MDN Web Audio API: [https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- cannon-es: [https://pmndrs.github.io/cannon-es/docs/](https://pmndrs.github.io/cannon-es/docs/)
- Vite: [https://vite.dev/](https://vite.dev/)
- GitHub: [https://github.com/karimmassaoudd/threshold-game](https://github.com/karimmassaoudd/threshold-game)
- Live version: [https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/)
