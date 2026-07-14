import assert from "node:assert/strict";
import {
  ACTOR_CATEGORIES,
  SCENE_ACTORS,
  STORY_ACTORS,
  createLocalActorDialogue,
  generateActorDialogue,
  generateMission,
  getActorsForScene,
  missionSeed,
  normalizeActorDialogue
} from "../src/storyActors.js";

const sceneIds = ["piazza", "vicoli", "ponte", "lupa", "monte", "piazzatestaccio", "palazzo", "mercato", "mattatoio", "sottoponte"];
assert.deepEqual(new Set(STORY_ACTORS.map((actor) => actor.category)), new Set(Object.values(ACTOR_CATEGORIES)));
assert.deepEqual(Object.keys(SCENE_ACTORS), sceneIds);
sceneIds.forEach((sceneId) => {
  assert.ok(SCENE_ACTORS[sceneId].length >= 4, `${sceneId} must have named actors`);
  assert.ok(getActorsForScene(sceneId).every((actor) => actor.scenes.includes(sceneId)));
  assert.deepEqual(
    new Set(getActorsForScene(sceneId).map((actor) => actor.category)),
    new Set(Object.values(ACTOR_CATEGORIES)),
    `${sceneId} must include all actor categories`
  );
});
assert.ok(getActorsForScene("piazza", ACTOR_CATEGORIES.QUEST_GIVER).some((actor) => actor.name === "Adriana la Portinaia"));

const context = {
  sceneId: "mercato",
  activeNpc: "amina",
  faction: { id: "romanord", name: "Roma Nord" },
  weather: { type: "rain", intensity: 0.7 },
  actionSequence: ["listen", "trade", "follow"]
};
const mission = generateMission(context);
assert.deepEqual(generateMission(context), mission);
assert.equal(mission.sceneId, "mercato");
assert.equal(mission.giver, "Amina del Banco 27");

for (const [field, value] of [
  ["sceneId", "ponte"],
  ["activeNpc", "teo"],
  ["faction", "trullo"],
  ["weather", "fog"],
  ["actionSequence", ["listen", "trade", "search"]]
]) {
  const changed = { ...context, [field]: value };
  assert.notDeepEqual(missionSeed(changed), missionSeed(context), `${field} must affect the deterministic seed`);
  assert.notEqual(generateMission(changed).id, mission.id, `${field} must affect the mission id`);
}

const fallback = createLocalActorDialogue(context);
assert.equal(typeof fallback.line, "string");
assert.equal(fallback.choices.length, 3);
assert.equal(fallback.mission.id, mission.id);

const normalized = normalizeActorDialogue({ line: "  Ci vediamo al banco. ", choices: ["Uno"] }, context);
assert.equal(normalized.line, "Ci vediamo al banco.");
assert.equal(normalized.choices.length, 3);
assert.ok(normalized.emotion);

let called = false;
const local = await generateActorDialogue(context, {
  storage: { getItem: () => null },
  fetch: async () => { called = true; }
});
assert.equal(called, false);
assert.deepEqual(local, fallback);

let request;
const remote = await generateActorDialogue(context, {
  storage: { getItem: (key) => key === "ts-ai-endpoint" ? "https://dialogue.example/generate" : null },
  fetch: async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      async json() {
        return { line: "Il banco chiude tra cinque minuti.", choices: ["Corri", "Tratta", "Osserva"], emotion: "urgent", mission: { reward: "una chiave" } };
      }
    };
  }
});
assert.equal(request.url, "https://dialogue.example/generate");
assert.equal(request.options.method, "POST");
assert.equal(request.options.headers["Content-Type"], "application/json");
assert.deepEqual(JSON.parse(request.options.body).context.mission, mission);
assert.equal(JSON.parse(request.options.body).mode, "narrative");
assert.deepEqual(remote.choices, ["Corri", "Tratta", "Osserva"]);
assert.equal(remote.mission.reward, "una chiave");

const networkFallback = await generateActorDialogue(context, {
  storage: { getItem: () => "https://dialogue.example/generate" },
  fetch: async () => { throw new Error("offline"); }
});
assert.deepEqual(networkFallback, fallback);

console.log("Story actors and dialogue test passed.");
