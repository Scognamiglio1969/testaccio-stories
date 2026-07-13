import assert from "node:assert/strict";
import { factions, npcs } from "../src/gameData.js";
import { characterAssets, characterProfiles, sceneGraphs, sceneProfiles, sceneTransitionContract } from "../src/worldData.js";
import {
  createWorldState,
  evolveWorldForAction,
  evolveWorldForCraft,
  findPath,
  hydrateWorldState,
  moveWorldToScene,
  projectToTerrain,
  prepareWorldCrisis,
  resolveWorldCrisis,
  validateWorldState
} from "../src/worldState.js";

const world = createWorldState(npcs, "piazza");
assert.equal(Object.keys(world.agents).length, 6);
assert.ok(validateWorldState(world, npcs));

Object.entries(sceneGraphs).forEach(([sceneId, graph]) => {
  const nodes = Object.keys(graph.nodes);
  assert.ok(nodes.length >= 10, `${sceneId} needs a complete route graph`);
  const route = findPath(sceneId, nodes[0], nodes.at(-1));
  assert.ok(route.length > 0, `${sceneId} graph must be connected`);
  Object.values(graph.anchors).forEach((nodeId) => assert.ok(graph.nodes[nodeId], `${sceneId} anchor ${nodeId} must exist`));
  const profile = sceneProfiles[sceneId];
  assert.ok(profile, `${sceneId} needs a cinematic profile`);
  assert.equal(profile.focalPoint.length, 2);
  assert.ok(profile.crop >= 1 && profile.crop <= 1.08);
  assert.ok(profile.brightness >= 0.8 && profile.brightness <= 1.15);
  assert.ok(profile.characterScale > 0.85 && profile.characterScale < 1.15);
  assert.ok(graph.nodes[profile.entry] && graph.nodes[profile.exit]);
  assert.ok(profile.ambience);
});
assert.equal(new Set(Object.values(sceneProfiles).map((profile) => profile.ambience)).size, 10);
assert.equal(Object.keys(characterProfiles).length, 6);
assert.ok(Object.values(characterProfiles).every((profile) => profile.footCrop >= 0));
assert.match(characterAssets.ruggero, /marta-cargo-alpha\.png$/);
assert.match(characterAssets.ilaria, /miranda-cargo-alpha\.png$/);
assert.match(characterAssets.nina, /nina-alpha\.png$/);
assert.ok(sceneTransitionContract.exitBudgetMs + sceneTransitionContract.preloadGraceMs + sceneTransitionContract.crossfadeMs <= sceneTransitionContract.maxInputLockMs);
assert.deepEqual(sceneTransitionContract.accepts, ["scene-object", "destination-name"]);
const grounded = projectToTerrain("ponte", 0.48, 0.2);
assert.ok(Number.isFinite(grounded.x) && Number.isFinite(grounded.y));

const moved = moveWorldToScene(world, "ponte", "marta", npcs);
const onBridge = Object.values(moved.agents).filter((agent) => agent.sceneId === "ponte");
assert.equal(new Set(Object.values(world.agents).map((agent) => agent.sceneId)).size, 6);
assert.equal(onBridge.length, 2);
assert.equal(Object.values(moved.agents).filter((agent) => agent.sceneId === "piazza").length, 0);

const recruited = evolveWorldForAction(moved, "recruit", "marta", npcs, "ponte", 2);
assert.equal(Object.values(recruited.agents).filter((agent) => agent.sceneId === "ponte").length, 2);
assert.ok(recruited.groups.some((group) => group.type === "rallying" && group.members.length === 2));
assert.equal(recruited.lastSequence.members.length, 2);

const soloBase = createWorldState(npcs, "piazza");
Object.values(soloBase.agents).forEach((agent, index) => { if (index) agent.sceneId = "vicoli"; });
const solo = evolveWorldForAction(soloBase, "talk", "marta", npcs, "piazza", 1);
assert.equal(solo.lastSequence.partnerId, null);
assert.deepEqual(solo.lastSequence.members, ["marta"]);

["talk", "trade", "secret"].forEach((action) => {
  const evolved = evolveWorldForAction(recruited, action, "marta", npcs, "ponte", 2);
  assert.equal(evolved.lastSequence.action, action);
  assert.ok(evolved.groups.some((group) => group.type === ({ talk: "talking", trade: "trading", secret: "investigating" })[action]));
});

const crafted = evolveWorldForCraft(recruited, "radio", "leila", npcs, "ponte", 2);
assert.ok(crafted.props.some((prop) => prop.type === "radio" && prop.sceneId === "ponte"));

const crisis = prepareWorldCrisis(crafted, factions[2], npcs, "ponte", 2);
assert.equal(crisis.factionPresence[0].factionId, "trullo");
assert.ok(crisis.factionPresence[0].members >= 2);

const resolved = resolveWorldCrisis(crisis, "defend", npcs, "ponte", 2);
assert.ok(resolved.props.some((prop) => prop.type === "barricade"));
assert.equal(resolved.factionPresence[0].stance, "retreating");

["defend", "negotiate", "ambush", "triage", "ration", "blame", "listen", "order", "reveal", "descend", "ritual", "deny"].forEach((optionId) => {
  const aftermath = resolveWorldCrisis(crisis, optionId, npcs, "ponte", 2);
  assert.equal(aftermath.lastSequence.optionId, optionId);
  assert.ok(aftermath.props.length > crisis.props.length);
});

const migrated = hydrateWorldState(undefined, npcs, "piazza");
assert.ok(validateWorldState(migrated, npcs));

console.log("Dynamic world systems test passed.");
