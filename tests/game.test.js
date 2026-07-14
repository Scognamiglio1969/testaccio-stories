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
  resolveCrisis,
  startCharacterTurn,
  performSimpleAction,
  advanceCharacterTurn,
  applyStoryChoice,
  SIMPLE_TURN_DURATION,
  previewSimpleAction
} from "../src/engine.js";
import { simpleActions } from "../src/gameData.js";

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
assert.equal(state.npcs.length, 6);
assert.ok(state.npcs.some((npc) => npc.id === "nina" && npc.name === "Nina"));
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
assert.equal(Object.keys(migrated.world.agents).length, 6);
assert.deepEqual(migrated.turn, { max: 4, spent: 0, usedByNpc: {}, sceneProgress: {}, lastResult: null });

assert.equal(simpleActions.length, 20);
assert.equal(createGame("it", "Weather").weather.type, "rain");
const previews = simpleActions.map((action) => previewSimpleAction(createGame("it", "Preview"), action.id));
assert.ok(previews.every((preview) => preview && [-1, 0, 1].includes(preview.delta)));
assert.ok(previews.every((preview) => preview.reason.it && preview.reason.en));
const simpleStart = 1000;
let focus = createGame("it", "Focus");
focus.phase = "game";
const expectedFocusResult = previewSimpleAction(focus, "listen");
focus = startCharacterTurn(focus, simpleStart);
assert.equal(focus.characterTurn.endsAt, simpleStart + SIMPLE_TURN_DURATION);
focus = performSimpleAction(focus, "listen", simpleStart + 1000);
assert.ok(["negative", "neutral", "positive"].includes(focus.lastSimpleResult.polarity));
assert.equal(focus.lastSimpleResult.polarity, expectedFocusResult.polarity);
assert.equal(focus.lastSimpleResult.delta, expectedFocusResult.delta);
assert.equal(focus.activeNpc, "marta");
assert.equal(focus.characterTurn.endsAt, simpleStart + SIMPLE_TURN_DURATION);
assert.deepEqual(focus.characterTurn.usedActions, ["listen"]);
assert.equal(performSimpleAction(focus, "listen", simpleStart + 2000), focus);
assert.equal(advanceCharacterTurn(focus, simpleStart + 3000), focus);
focus = advanceCharacterTurn(focus, simpleStart + SIMPLE_TURN_DURATION, true);
assert.equal(focus.activeNpc, "nando");
assert.equal(focus.weather.type, "fog");
assert.equal(Object.keys(focus.lastSimpleResult.text).length, 2);

let idleTurn = createGame("it", "Idle");
idleTurn.phase = "game";
idleTurn = startCharacterTurn(idleTurn, simpleStart);
idleTurn = advanceCharacterTurn(idleTurn, simpleStart + SIMPLE_TURN_DURATION, true);
assert.equal(idleTurn.lastSimpleResult.actionId, "timeout");
assert.equal(idleTurn.lastSimpleResult.delta, -1);
assert.equal(idleTurn.pulseScore, -1);
assert.equal(idleTurn.activeNpc, "nando");

const ninaPhoto = previewSimpleAction(createGame("it", "Tactics"), "photograph", "nina", "lupa");
const edoPhoto = previewSimpleAction(createGame("it", "Tactics"), "photograph", "nando", "ponte");
assert.ok(ninaPhoto.performance > edoPhoto.performance);

let adaptive = createGame("it", "Adaptive");
adaptive.phase = "game";
adaptive = startCharacterTurn(adaptive, 5000);
for (const [index, action] of ["listen", "negotiate", "question", "reassure"].entries()) {
  adaptive = performSimpleAction(adaptive, action, 5100 + index);
}
assert.equal(adaptive.playerProfile.totalActions, 4);
assert.ok([-1, 0, 1].includes(adaptive.playerProfile.difficulty));

const questActor = { id: "adriana", category: "quest-giver" };
const questDialogue = { line: "Serve una mano.", emotion: "urgent", choices: ["Accetto", "Dimmi altro", "No"], mission: { id: "mission-test", objective: "Trova il registro" } };
adaptive = applyStoryChoice(adaptive, questActor, questDialogue, "Accetto", 0, 6000);
assert.equal(adaptive.activeMission.id, "mission-test");
assert.equal(adaptive.actorMemories.adriana.length, 1);

const companionActor = { id: "jack", category: "companion" };
adaptive = applyStoryChoice(adaptive, companionActor, questDialogue, "Accetto", 0, 6001);
assert.equal(adaptive.activeCompanion, "jack");

console.log("Game systems smoke test passed.");
