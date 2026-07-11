import assert from "node:assert/strict";
import {
  advanceDay,
  calculateScore,
  createGame,
  finishGame,
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
state = npcAction(state, "talk");
assert.equal(state.npcs.length, 5);
assert.ok(state.gossip.length >= 1);
assert.ok(state.resources.intel > 24);

state.day = 2;
state = advanceDay(state);
assert.equal(state.phase, "crisis");
assert.ok(state.pendingCrisis);

state = resolveCrisis(state, state.pendingCrisis.options[0].id);
assert.equal(state.phase, "game");
assert.ok(state.day >= 3);

const score = calculateScore(state);
assert.ok(score > 0);

state.day = 9;
state = finishGame(state);
assert.equal(state.phase, "end");
assert.ok(["salvation", "order", "collapse"].includes(state.ending.id));

console.log("Game systems smoke test passed.");
