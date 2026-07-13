import { WORLD_VERSION, crisisPresentation, npcRoutineAnchor, sceneGraphs } from "./worldData.js";

const copy = (value) => JSON.parse(JSON.stringify(value));
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));

function graphFor(sceneId) {
  return sceneGraphs[sceneId] || sceneGraphs.piazza;
}

export function nearestNode(sceneId, x, y) {
  const graph = graphFor(sceneId);
  return Object.values(graph.nodes).reduce((best, node) => {
    const distance = Math.hypot(node.x - x, node.y - y);
    return !best || distance < best.distance ? { id: node.id, distance } : best;
  }, null)?.id;
}

export function projectToTerrain(sceneId, x, y) {
  const graph = graphFor(sceneId);
  return graph.edges.reduce((best, [fromId, toId]) => {
    const from = graph.nodes[fromId];
    const to = graph.nodes[toId];
    if (!from || !to) return best;
    const vx = to.x - from.x;
    const vy = to.y - from.y;
    const lengthSquared = vx * vx + vy * vy || 1;
    const amount = clamp(((x - from.x) * vx + (y - from.y) * vy) / lengthSquared);
    const point = { x: from.x + vx * amount, y: from.y + vy * amount };
    const distance = Math.hypot(x - point.x, y - point.y);
    return !best || distance < best.distance ? { ...point, distance } : best;
  }, null) || { x: clamp(x), y: clamp(y), distance: 0 };
}

export function findPath(sceneId, startId, endId) {
  const graph = graphFor(sceneId);
  if (!graph.nodes[startId] || !graph.nodes[endId]) return [];
  if (startId === endId) return [copy(graph.nodes[endId])];

  const neighbors = {};
  graph.edges.forEach(([left, right]) => {
    neighbors[left] = [...(neighbors[left] || []), right];
    neighbors[right] = [...(neighbors[right] || []), left];
  });

  const queue = [[startId]];
  const visited = new Set([startId]);
  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    for (const next of neighbors[current] || []) {
      if (visited.has(next)) continue;
      const candidate = [...path, next];
      if (next === endId) return candidate.slice(1).map((id) => copy(graph.nodes[id]));
      visited.add(next);
      queue.push(candidate);
    }
  }
  return [copy(graph.nodes[endId])];
}

function relationTarget(npc, npcList, sceneId, world) {
  const visible = npcList.filter((candidate) => candidate.id !== npc.id && world.agents[candidate.id]?.sceneId === sceneId);
  return visible.sort((left, right) => (npc.relation?.[right.id] || 0) - (npc.relation?.[left.id] || 0))[0] || null;
}

function spawnNodeIds(sceneId) {
  const graph = graphFor(sceneId);
  const preferred = ["bar", "fountain", "market", "gate", "clinic", "court", "landing", "bench", "base", "cafe", "table", "crates", "yard", "fire"];
  const available = preferred.filter((id) => graph.nodes[id]);
  return available.length >= 5 ? available : Object.keys(graph.nodes);
}

const initialNpcScenes = ["piazza", "vicoli", "ponte", "lupa", "monte", "piazzatestaccio"];

function newAgent(npc, index, sceneId) {
  const graph = graphFor(sceneId);
  const nodeIds = spawnNodeIds(sceneId);
  const node = graph.nodes[nodeIds[index % nodeIds.length]] || Object.values(graph.nodes)[index];
  return {
    id: npc.id,
    sceneId,
    x: node.x,
    y: node.y,
    destination: { x: node.x, y: node.y, nodeId: node.id },
    direction: index % 2 ? -1 : 1,
    activity: "arriving",
    groupId: null,
    objective: npc.routine?.it || "Osserva il rione",
    route: [],
    emotion: npc.fear > 55 ? "afraid" : npc.courage > 60 ? "brave" : "steady",
    action: null,
    pace: 0.048 + index * 0.004,
    speed: 0,
    stepPhase: index * 1.7,
    lastUpdate: 0
  };
}

export function createWorldState(npcList, sceneId = "piazza") {
  return {
    version: WORLD_VERSION,
    clock: 0,
    cycle: 0,
    sceneId,
    agents: Object.fromEntries(npcList.map((npc, index) => {
      const homeScene = initialNpcScenes[index % initialNpcScenes.length] || sceneId;
      return [npc.id, newAgent(npc, index, homeScene)];
    })),
    groups: [],
    props: [],
    factionPresence: [],
    lastSequence: null
  };
}

export function hydrateWorldState(savedWorld, npcList, sceneId = "piazza") {
  const base = createWorldState(npcList, sceneId);
  if (!savedWorld || typeof savedWorld !== "object") return base;
  const migrateDistributedCast = Number(savedWorld.version || 0) < WORLD_VERSION;

  const next = {
    ...base,
    ...copy(savedWorld),
    version: WORLD_VERSION,
    sceneId: savedWorld.sceneId || sceneId,
    groups: Array.isArray(savedWorld.groups) ? copy(savedWorld.groups) : [],
    props: Array.isArray(savedWorld.props) ? copy(savedWorld.props) : [],
    factionPresence: Array.isArray(savedWorld.factionPresence) ? copy(savedWorld.factionPresence) : []
  };

  next.agents = Object.fromEntries(npcList.map((npc, index) => {
    const fallback = newAgent(npc, index, initialNpcScenes[index % initialNpcScenes.length] || next.sceneId);
    const current = savedWorld.agents?.[npc.id] || {};
    const scene = migrateDistributedCast ? fallback.sceneId : (sceneGraphs[current.sceneId] ? current.sceneId : fallback.sceneId);
    const x = clamp(current.x ?? fallback.x);
    const y = clamp(current.y ?? fallback.y);
    const grounded = projectToTerrain(scene, x, y);
    const destination = current.destination ? projectToTerrain(scene, current.destination.x, current.destination.y) : grounded;
    return [npc.id, {
      ...fallback,
      ...current,
      sceneId: scene,
      x: grounded.x,
      y: grounded.y,
      destination: { ...destination, nodeId: current.destination?.nodeId },
      route: Array.isArray(current.route) ? current.route.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)).map((point) => ({ ...point, ...projectToTerrain(scene, point.x, point.y) })) : []
    }];
  }));
  return next;
}

export function setAgentDestination(world, agentId, anchorName, sceneId = world.sceneId, offset = [0, 0]) {
  const agent = world.agents[agentId];
  const graph = graphFor(sceneId);
  if (!agent) return world;
  const nodeId = graph.anchors[anchorName] || anchorName;
  const node = graph.nodes[nodeId] || Object.values(graph.nodes)[0];
  const start = nearestNode(sceneId, agent.x, agent.y);
  agent.sceneId = sceneId;
  const groundedDestination = projectToTerrain(sceneId, clamp(node.x + offset[0], 0.04, 0.96), clamp(node.y + offset[1], 0.2, 0.92));
  agent.destination = {
    x: groundedDestination.x,
    y: groundedDestination.y,
    nodeId
  };
  agent.route = findPath(sceneId, start, nodeId);
  if (agent.route.length) {
    const last = agent.route.at(-1);
    last.x = agent.destination.x;
    last.y = agent.destination.y;
  } else {
    agent.route = [{ ...agent.destination, id: nodeId }];
  }
  return world;
}

function placeFormation(world, ids, sceneId, anchor, groupId, activity, objective) {
  const columns = Math.max(2, Math.ceil(Math.sqrt(ids.length)));
  ids.forEach((id, index) => {
    const agent = world.agents[id];
    if (!agent) return;
    if (agent.sceneId !== sceneId) {
      const entry = graphFor(sceneId).nodes.west || Object.values(graphFor(sceneId).nodes)[0];
      agent.x = entry.x - index * 0.012;
      agent.y = entry.y + (index % 2) * 0.022;
    }
    const column = index % columns;
    const row = Math.floor(index / columns);
    const offset = [(column - (columns - 1) / 2) * 0.045, (row - 0.35) * 0.04];
    setAgentDestination(world, id, anchor, sceneId, offset);
    agent.groupId = groupId;
    agent.activity = activity;
    agent.objective = objective;
    agent.action = activity;
  });
  world.groups = [
    ...world.groups.filter((group) => group.id !== groupId && !ids.some((id) => group.members.includes(id))),
    { id: groupId, type: activity, sceneId, members: ids, anchor, formedAt: world.clock }
  ].slice(-6);
}

export function moveWorldToScene(savedWorld, sceneId, activeId, npcList) {
  const world = hydrateWorldState(savedWorld, npcList, sceneId);
  world.sceneId = sceneId;
  world.cycle += 1;
  const activeNpc = npcList.find((npc) => npc.id === activeId) || npcList[0];
  const travelers = [activeNpc.id];
  travelers.forEach((id) => {
    const entry = graphFor(sceneId).nodes.west || Object.values(graphFor(sceneId).nodes)[0];
    const agent = world.agents[id];
    agent.sceneId = sceneId;
    agent.x = clamp(Math.max(0.12, entry.x), 0.12, 0.96);
    agent.y = clamp(entry.y, 0.2, 0.92);
    agent.pace = 0.12;
    agent.activity = "travelling";
    agent.objective = "Raggiunge il gruppo";
    setAgentDestination(world, id, npcRoutineAnchor[id] || "gather", sceneId);
  });
  world.lastSequence = { type: "travel", sceneId, members: travelers, at: world.clock };
  return world;
}

export function evolveWorldForAction(savedWorld, action, activeId, npcList, sceneId, day = 1) {
  const world = hydrateWorldState(savedWorld, npcList, sceneId);
  world.sceneId = sceneId;
  world.cycle += 1;
  const activeNpc = npcList.find((npc) => npc.id === activeId) || npcList[0];
  const partner = relationTarget(activeNpc, npcList, sceneId, world);
  const groupId = `${action}-${day}-${world.cycle}`;

  if (action === "recruit") {
    const ids = npcList.map((npc) => npc.id).filter((id) => world.agents[id]?.sceneId === sceneId);
    placeFormation(world, ids, sceneId, "gather", groupId, "rallying", "Proteggere il rione insieme");
    world.props.push({ id: `signal-${day}-${world.cycle}`, type: "signal", sceneId, anchor: "gather", state: "active", createdDay: day });
  } else {
    const ids = [...new Set([activeId, partner?.id].filter(Boolean))];
    const activity = { talk: "talking", trade: "trading", secret: "investigating" }[action] || action;
    const objective = {
      talk: "Far circolare una voce verificata",
      trade: "Scambiare merci e favori",
      secret: "Seguire una traccia nascosta"
    }[action] || "Agire nel rione";
    placeFormation(world, ids, sceneId, action === "talk" ? "talk" : action, groupId, activity, objective);
    if (action === "trade") world.props.push({ id: `supplies-${day}-${world.cycle}`, type: "supplies", sceneId, anchor: "trade", state: "stored", createdDay: day });
    if (action === "secret") world.props.push({ id: `clue-${day}-${world.cycle}`, type: "clue", sceneId, anchor: "secret", state: "found", createdDay: day });
  }

  world.props = world.props.slice(-14);
  world.lastSequence = { type: "npc-action", action, activeId, partnerId: partner?.id || null, members: action === "recruit" ? npcList.map((npc) => npc.id).filter((id) => world.agents[id]?.sceneId === sceneId) : [activeId, partner?.id].filter(Boolean), sceneId, at: world.clock };
  return world;
}

export function evolveWorldForCraft(savedWorld, item, activeId, npcList, sceneId, day = 1) {
  const world = hydrateWorldState(savedWorld, npcList, sceneId);
  const anchor = item === "barricate" ? "defend" : item === "kit" ? "care" : "scout";
  const active = world.agents[activeId] || Object.values(world.agents)[0];
  setAgentDestination(world, active.id, anchor, sceneId);
  active.activity = "crafting";
  active.action = item;
  active.objective = `Preparare ${item}`;
  world.props.push({ id: `${item}-${day}-${world.cycle + 1}`, type: item, sceneId, anchor, state: "ready", createdDay: day });
  world.props = world.props.slice(-14);
  world.cycle += 1;
  world.lastSequence = { type: "craft", item, activeId: active.id, sceneId, at: world.clock };
  return world;
}

export function prepareWorldCrisis(savedWorld, faction, npcList, sceneId, day = 1) {
  const world = hydrateWorldState(savedWorld, npcList, sceneId);
  world.sceneId = sceneId;
  const relation = Number(faction?.relation) || 0;
  const pressure = Number(faction?.pressure) || 0;
  const stance = relation >= 35 ? "allied" : relation >= 8 ? "open" : relation > -15 ? "watching" : "hostile";
  world.factionPresence = [{
    id: `faction-${faction?.id || "unknown"}-${day}`,
    factionId: faction?.id || "trullo",
    name: faction?.name || "Quartiere rivale",
    sceneId,
    relation,
    pressure,
    stance,
    progress: 0,
    members: Math.max(2, Math.min(5, 2 + Math.round(pressure / 28)))
  }];
  world.lastSequence = { type: "crisis-arrival", factionId: faction?.id, sceneId, at: world.clock };
  return world;
}

export function resolveWorldCrisis(savedWorld, optionId, npcList, sceneId, day = 1) {
  const world = hydrateWorldState(savedWorld, npcList, sceneId);
  const presentation = crisisPresentation[optionId] || { mode: "aftermath", color: "#d9b45f" };
  world.factionPresence = world.factionPresence.map((presence) => ({
    ...presence,
    stance: ["negotiate", "listen", "ritual"].includes(optionId) ? "allied" : "retreating",
    progress: 1
  }));
  world.props.push({
    id: `crisis-${optionId}-${day}-${world.cycle + 1}`,
    type: presentation.mode,
    sceneId,
    anchor: ["ambush", "defend", "order"].includes(optionId) ? "defend" : optionId === "descend" ? "secret" : "gather",
    state: "aftermath",
    color: presentation.color,
    createdDay: day
  });
  world.props = world.props.slice(-14);
  world.cycle += 1;
  world.lastSequence = { type: "crisis", optionId, sceneId, at: world.clock };
  return world;
}

export function evolveWorldForDay(savedWorld, npcList, sceneId, day) {
  const world = hydrateWorldState(savedWorld, npcList, sceneId);
  Object.values(world.agents).forEach((agent) => {
    const npc = npcList.find((item) => item.id === agent.id);
    agent.emotion = npc?.fear > 55 ? "afraid" : npc?.courage > 60 ? "brave" : "steady";
    agent.action = null;
    if (agent.activity !== "travelling") agent.activity = "observing";
  });
  world.factionPresence = world.factionPresence.filter((presence) => presence.stance !== "retreating");
  world.clock += 1;
  world.lastSequence = { type: "night", day, sceneId, at: world.clock };
  return world;
}

export function validateWorldState(world, npcList) {
  if (!world || world.version !== WORLD_VERSION) return false;
  return npcList.every((npc) => {
    const agent = world.agents?.[npc.id];
    return agent && sceneGraphs[agent.sceneId] && Number.isFinite(agent.x) && Number.isFinite(agent.y);
  });
}
