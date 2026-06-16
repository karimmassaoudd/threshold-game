# APEX DRIVE: Competitive Analysis of Browser Racing Games

## Reasoning and CMD Method

I made this research to compare **APEX DRIVE** with similar racing games, browser games, arcade racing games and Three.js examples. My goal was to understand what makes a racing game feel good and what I should avoid in my own project.

For this research, I used the CMD method **Competitive Analysis**. This means I looked at existing products and examples, compared their strengths and weaknesses, and then decided what ideas could be useful for APEX DRIVE.

APEX DRIVE is a 3D street racing game made with Three.js. The project can be found on GitHub here: [https://github.com/karimmassaoudd/threshold-game](https://github.com/karimmassaoudd/threshold-game), and the live version can be played here: [https://apex.karimmassaoud.cv/](https://apex.karimmassaoud.cv/).

## Available Product / Example Analysis

| Example | What they do well | What they miss | What I can use |
| --- | --- | --- | --- |
| Three.js racing examples | Good 3D scenes, camera movement and browser rendering | Usually simple gameplay | Scene setup, camera ideas and road rendering |
| Browser car games | Easy to start and simple controls | Often limited graphics and weak customization | Simple controls and quick gameplay |
| Arcade racing games | Strong speed feeling, HUD, garage and effects | Too complex for my project size | HUD, garage, turbo and speed feeling |
| Three.js demos | Good lighting, objects, effects and animation | Not complete games | Lighting, weather and post-processing ideas |

## Competitive Analysis

### Three.js Racing Examples

Three.js racing examples helped me understand how racing projects can work inside the browser. These examples are useful because they show how a 3D road, camera and moving object can be rendered in real time.

The strongest part of these examples is usually the technical side. They often have a clear Three.js scene, a camera that follows the player, and a road or environment that gives the feeling of movement. This helped me understand that the camera is one of the most important parts of a racing game.

The weaker part is that many examples stay simple. They are good for learning, but they often do not have deeper gameplay features like a garage, traffic, damage, weather settings or a detailed HUD.

What I learned:

- Use a clear 3D scene setup.
- Keep the camera smooth.
- Make the road and environment readable for the player.
- Do not only focus on visuals, because gameplay also matters.

### Browser Car Games

Browser car games are usually simple and easy to play. This is a good thing because the player can quickly understand what to do. Most of them use basic controls, and the player can start driving almost immediately.

This inspired me to keep the controls for APEX DRIVE simple. The player can use `WASD` or the arrow keys to drive, `Shift` for turbo and `Space` for handbrake. These controls are common, so the player does not need a long explanation before starting.

The weak point of many browser car games is that they can feel basic. Some have limited graphics, simple environments, no real customization and not many settings. For APEX DRIVE, I wanted to keep the game easy to start, but still add more depth with camera modes, garage customization, traffic, weather and audio.

What I learned:

- Controls should be easy to understand.
- The game should start quickly.
- The player should not need a long explanation.
- Simple controls can still work together with more advanced features.

### Arcade Racing Games

Arcade racing games gave me inspiration for the feeling of speed, HUD, turbo, camera movement and garage customization. These games are much bigger than my project, but they helped me understand what makes a racing game feel exciting.

One important thing I noticed is that speed feedback matters a lot. The player should not only see the car moving, but also feel that the car is going faster. This can be done with a speedometer, engine sound, camera field of view, turbo effects and visual speed lines.

Another important part is the HUD. Arcade racing games usually show speed, gear, lap, time and boost information. I used this idea in APEX DRIVE by adding speed, RPM, gear, turbo, lap, time, damage and route progress.

Garage customization was also useful inspiration. Even simple customization can make the game feel more personal. In APEX DRIVE, the player can change the car, paint colour, paint finish, wheels, body kit, spoiler, window tint, engine upgrade and grip upgrade.

What I learned:

- Speed feedback is important.
- HUD information helps the player understand the game.
- Customization makes the game more fun.
- Camera modes can change the experience.
- Effects should support the gameplay and not distract from driving.

### Three.js Demos

Three.js demos helped me understand visual ideas like lighting, shadows, fog, particles and post-processing. These examples are not always complete games, but they are very useful for learning how to make a 3D scene look better.

From these demos I learned that lighting changes the whole mood of a scene. Clear weather, rain, storm and sunset can all make the same road feel different. I used this idea in APEX DRIVE by adding weather settings that change the background, fog, lighting and rain particles.

I also learned that effects should be used carefully. Bloom, shadows, rain and post-processing can make the game look better, but too many effects can hurt performance. Because of this, I added graphics settings so the player can choose between different quality options.

What I learned:

- Lighting changes the mood of the game.
- Weather effects make the world feel more alive.
- Post-processing can improve the look of the game.
- Too many effects can hurt performance.
- Visual effects should be tested while playing, not only while coding.

## Applying the Analysis to APEX DRIVE

| Competitive insight | How I applied it in APEX DRIVE | Why it helped |
| --- | --- | --- |
| Browser games should be easy to start | I used familiar controls like `WASD`, arrow keys, `Shift`, `Space`, `C`, `G`, `M` and `R`. | The player can understand the game quickly without needing a long tutorial. |
| Racing games need strong speed feedback | I added speedometer, RPM, turbo percentage, camera FOV change and speed line effects. | This makes driving feel faster and more exciting. |
| Camera movement is important | I added multiple camera modes: Chase, Cockpit, Hood, Cinematic and Free. | The player can choose the camera style they prefer. |
| HUD information helps the player | I added speed, gear, turbo, lap, time, damage and route progress. | The player can easily understand what is happening during the race. |
| Customization makes racing games more personal | I added a garage with car presets, paint, wheels, body kit, spoiler, tint, engine and grip upgrades. | The player can change the car and make it feel more personal. |
| Visual effects can improve the mood | I added weather settings like Clear, Rain, Storm and Sunset. | The same game world can feel different depending on the selected weather. |
| Performance needs to be tested | I added graphics settings and options for shadows and post-processing. | The player can lower effects if the game runs too slowly. |
| Bigger projects need structure | I split the code into systems like `CarController`, `RoadSystem`, `CameraRig`, `AudioManager`, `HUD`, `PhysicsWorld`, `GarageSystem`, `SettingsUI` and `TrafficSystem`. | This made the code easier to understand and improve. |

## Conclusion

This competitive analysis helped me see what APEX DRIVE needed to improve. I learned that a good browser racing game should have simple controls, a clear camera, strong speed feeling, useful HUD information, customization and stable performance.

The most useful ideas for my own project were:

- Simple driving controls
- Multiple camera modes
- HUD with speed, gear, turbo, damage and lap information
- Garage customization
- Weather and graphics settings
- Clear project structure
- Audio feedback for engine, turbo, drifting and crashes

Things I wanted to avoid:

- Confusing controls
- Bad camera movement
- Too many effects without performance testing
- Weak documentation
- Putting all code in one file
- Adding features that make the game harder to understand

In the end, this analysis helped me make better choices for APEX DRIVE. I did not want to copy one specific game. Instead, I looked at different examples and used the parts that made sense for my own project size and learning goals.
