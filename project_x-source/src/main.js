import "./styles.css";
import { RacingGame } from "./systems/RacingGame.js";

const game = new RacingGame(document.querySelector("#game"));
game.start();
