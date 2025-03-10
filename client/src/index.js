import { Application, Sprite, loader } from "pixi.js";
import { bindKey, KEYS } from "./keyboard";

let PlayerTexture;
let AppleTexture;

const app = new Application();
const playerSprites = {};
const appleSprites = [];
let id;
let state;

function renderApples(newState) {
  appleSprites.forEach(appleSprite => {
    app.stage.removeChild(appleSprite);
  });
  appleSprites.length = 0; // emptying appleSprites array

  newState.world.apples.forEach(apple => {
    const appleSprite = new Sprite(AppleTexture);
    appleSprite.x = apple.x;
    appleSprite.y = apple.y;
    appleSprite.width = 25;
    appleSprite.height = 25;
    app.stage.addChild(appleSprite);
    appleSprites.push(appleSprite);
  });
}

/**
 * Renders a player on the screen, including potential new players
 * @param {string} playerId
 * @param {{players: {}, world: {bullets: {}[]}}} newState
 */
function renderPlayer(playerId, newState) {
  const player = newState.players[playerId];
  const { path } = player;

  path.forEach((coords, i) => {
    if (!playerSprites[playerId]) {
      playerSprites[playerId] = {};
    }
    if (!playerSprites[playerId][i]) {
      const newPlayer = new Sprite(PlayerTexture);
      newPlayer.anchor.set(0.5, 0.5);
      app.stage.addChild(newPlayer);
      playerSprites[playerId][i] = newPlayer;
      playerSprites[playerId][i].width = 8;
      playerSprites[playerId][i].height = 8;
    }

    playerSprites[playerId][i].x = coords.x;
    playerSprites[playerId][i].y = coords.y;
    playerSprites[playerId][i].rotation = player.rotation;
  });
}

/**
 * Removes a dead player
 * @param {string} playerId
 */
function removeDeadPlayer(playerId) {
  app.stage.removeChild(playerSprites[playerId]);
  delete playerSprites[playerId];
}

/**
 * Renders the game according to the newState object
 * @param {object} newState
 */
function render(newState) {
  state = state || newState; // handle first state update

  const serverPlayers = Object.keys(newState.players);
  const clientPlayers = Object.keys(state.players);

  const alivePlayers = serverPlayers.filter(x => clientPlayers.includes(x));
  const deadPlayers = clientPlayers.filter(x => !serverPlayers.includes(x));

  deadPlayers.forEach(removeDeadPlayer);
  alivePlayers.forEach(playerId => renderPlayer(playerId, newState));
  renderApples(newState);

  state = newState;
}

/**
 * Handles a message from the server
 * @param {{data: { type: string, value: any}}} message
 * @param {WebSocket} ws
 */
function handleMessage(message, ws) {
  const data = JSON.parse(message.data);
  if (data.type === "id") {
    id = data.value;
    Object.values(KEYS).forEach(key => bindKey(id, key, ws));
  } else if (data.type === "state") {
    render(data.value);
  } else if (data.type === "ping") {
    ws.send(JSON.stringify({ id, type: "pong" }));
  }
}

/**
 * Initiates a connection to the server
 */
function initiateSockets() {
  const url = "127.0.0.1";
  const port = 3000;
  const ws = new WebSocket(`ws://${url}:${port}`);
  ws.onmessage = message => handleMessage(message, ws);
}

/**
 * Sets up background color and size playing field
 */
function setupRenderer() {
  app.renderer.backgroundColor = 0x1e1e1e;
  app.renderer.resize(600, 600);
}

/**
 * Loads assets for player and bullet
 */
function loadAssets() {
  const PLAYER_IMAGE_ASSET = "assets/red_dot.png";
  const APPLE_IMAGE_ASSET = "assets/green_dot.png";

  return new Promise(res => {
    loader.add([PLAYER_IMAGE_ASSET, APPLE_IMAGE_ASSET]).load(() => {
      PlayerTexture = loader.resources[PLAYER_IMAGE_ASSET].texture;
      AppleTexture = loader.resources[APPLE_IMAGE_ASSET].texture;
      res();
    });
  });
}

/**
 * Starts the game
 */
async function main() {
  await loadAssets();
  setupRenderer();
  initiateSockets();
}

document.body.appendChild(app.view);
main();
