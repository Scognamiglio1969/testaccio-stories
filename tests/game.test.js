import assert from "node:assert/strict";
import {
  advanceDay,
  calculateScore,
  craft,
  createGame,
  finishGame,
  getActionForecast,
  getSceneObjective,
  loadGame,
  npcAction,
  resolveCrisis
} from "../src/engine.js";

global.localStorage = {
  data: new Map(),
  getItem(key) {
    return this.data.get(key) || null;
  },
  setItem(key, value) {
    this.data.set(key, value);
  }
};

let state = createGame("it", "Test");
state.phase = "game";
const openingScene = state.sceneId;
const openingForecast = getActionForecast(state, "talk");
assert.equal(openingForecast.allowed, true);
assert.equal(openingForecast.costSlots, 1);
assert.ok(openingForecast.potency > 0);
assert.ok(openingForecast.effects.every((effect) => ["from", "to", "delta"].every((key) => key in effect)));
assert.ok(openingForecast.social.it && openingForecast.physical.en && openingForecast.witness.name);
state = npcAction(state, "talk");
assert.equal(state.npcs.length, 5);
assert.ok(state.gossip.length >= 1);
assert.ok(state.resources.intel > 24);
assert.ok(state.world);
assert.equal(state.world.sceneId, state.sceneId);
assert.equal(state.sceneId, openingScene);
assert.equal(state.turn.spent, 1);
assert.equal(getSceneObjective(state).progress, openingForecast.progress.to);
assert.equal(state.turn.lastResult.action, "talk");
const talkFactionEvents = state.factionEvents.filter((event) => event.action === "talk");
assert.equal(talkFactionEvents.length, 2);
assert.equal(new Set(talkFactionEvents.map((event) => event.sequence)).size, 1);

let economy = createGame("en", "Economy");
economy.phase = "game";
economy.resources.food = 2;
const deniedRecruit = getActionForecast(economy, "recruit");
assert.equal(deniedRecruit.allowed, false);
economy = npcAction(economy, "recruit");
assert.equal(economy.resources.food, 2);
assert.equal(economy.turn.spent, 0);
economy.resources.food = 3;
economy = npcAction(economy, "recruit");
assert.equal(economy.resources.food, 0);
assert.equal(economy.turn.spent, 1);

for (const [action, resource, required] of [["trade", "money", 5], ["secret", "intel", 6]]) {
  let costState = createGame("it", `Cost-${action}`);
  costState.phase = "game";
  costState.resources[resource] = required - 1;
  assert.equal(getActionForecast(costState, action).allowed, false);
  costState = npcAction(costState, action);
  assert.equal(costState.resources[resource], required - 1);
  assert.equal(costState.turn.spent, 0);
  costState.resources[resource] = required;
  costState = npcAction(costState, action);
  assert.equal(costState.resources[resource], 0);
  assert.equal(costState.turn.spent, 1);
}

let antiSpam = createGame("it", "AntiSpam");
antiSpam.phase = "game";
antiSpam = npcAction(antiSpam, "talk");
antiSpam = npcAction(antiSpam, "talk");
const beforeBlocked = antiSpam.resources.intel;
antiSpam = npcAction(antiSpam, "talk");
assert.equal(antiSpam.turn.usedByNpc.marta, 2);
assert.equal(antiSpam.turn.spent, 2);
assert.equal(antiSpam.resources.intel, beforeBlocked);
assert.equal(antiSpam.turn.lastResult.allowed, false);

let slots = createGame("it", "Slots");
slots.phase = "game";
for (const npcId of ["marta", "nando", "leila", "ruggero"]) {
  slots.activeNpc = npcId;
  slots = npcAction(slots, "talk");
}
slots.activeNpc = "ilaria";
assert.equal(getActionForecast(slots, "talk").allowed, false);
const slotsIntel = slots.resources.intel;
slots = npcAction(slots, "talk");
assert.equal(slots.turn.spent, 4);
assert.equal(slots.resources.intel, slotsIntel);

state = craft(state, "radio");
assert.ok(state.world.props.some((prop) => prop.type === "radio"));

state.day = 2;
const crisisScene = state.sceneId;
state = advanceDay(state);
assert.equal(state.phase, "crisis");
assert.ok(state.pendingCrisis);
assert.equal(state.sceneId, crisisScene);
assert.ok(state.world.factionPresence.length > 0);

state = resolveCrisis(state, state.pendingCrisis.options[0].id);
assert.equal(state.phase, "game");
assert.ok(state.day >= 3);
assert.equal(state.turn.spent, 0);
assert.deepEqual(state.turn.usedByNpc, {});

let quietNight = createGame("it", "Reset");
quietNight.phase = "game";
quietNight = npcAction(quietNight, "talk");
quietNight = advanceDay(quietNight);
assert.equal(quietNight.day, 2);
assert.equal(quietNight.turn.spent, 0);
assert.equal(quietNight.turn.sceneProgress.piazza > 0, true);

const score = calculateScore(state);
assert.ok(score > 0);

state.day = 9;
state = finishGame(state);
assert.equal(state.phase, "end");
assert.ok(["salvation", "order", "collapse"].includes(state.ending.id));

const legacy = createGame("it", "Legacy");
delete legacy.world;
delete legacy.turn;
localStorage.setItem("mdq-save", JSON.stringify(legacy));
const migrated = loadGame();
assert.equal(Object.keys(migrated.world.agents).length, 5);
assert.deepEqual(migrated.turn, { max: 4, spent: 0, usedByNpc: {}, sceneProgress: {}, lastResult: null });

console.log("Game systems smoke test passed.");
