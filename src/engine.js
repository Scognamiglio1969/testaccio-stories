import { MAX_DAY, badges, crises, factions, leaderboardSeed, metrics, npcs, resources, scenes, simpleActions } from "./gameData.js";
import {
  createWorldState,
  evolveWorldForAction,
  evolveWorldForCraft,
  evolveWorldForDay,
  hydrateWorldState,
  moveWorldToScene,
  prepareWorldCrisis,
  resolveWorldCrisis
} from "./worldState.js";

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const copy = (value) => JSON.parse(JSON.stringify(value));

const ACTION_FACTION_BASE = {
  talk: {
    trastevere: [4, -2],
    centro: [2, -1]
  },
  recruit: {
    trullo: [-4, 4],
    romaest: [-2, 2]
  },
  trade: {
    romanord: [5, -2],
    trastevere: [2, -1]
  },
  secretSuccess: {
    centro: [4, 1],
    romaest: [3, -1]
  },
  secretFail: {
    centro: [-3, 3],
    trullo: [-2, 2]
  }
};

const CRAFT_COSTS = {
  barricate: { money: 5, intel: 2, defense: 9 },
  kit: { money: 6, health: 8, trust: 2 },
  radio: { money: 8, intel: 10, trust: 5 }
};

const ACTION_COSTS = {
  talk: {},
  recruit: { food: 3 },
  trade: { money: 5 },
  secret: { intel: 6 }
};

const ACTION_LABELS = {
  talk: { it: "parlare", en: "talk" },
  recruit: { it: "coinvolgere", en: "rally" },
  trade: { it: "scambiare", en: "trade" },
  secret: { it: "indagare", en: "probe" }
};

const freshTurn = (previous = {}) => ({
  max: 4,
  spent: 0,
  usedByNpc: {},
  sceneProgress: previous.sceneProgress || {},
  lastResult: null
});

export function createGame(language = "it", player = "Ospite") {
  return {
    language,
    player,
    day: 1,
    phase: "menu",
    introSeen: false,
    activeNpc: "marta",
    activePanel: "closed",
    sceneId: "piazza",
    movement: 0,
    turn: freshTurn(),
    resources: copy(resources),
    metrics: copy(metrics),
    factions: copy(factions),
    factionEvents: [],
    npcs: copy(npcs),
    world: createWorldState(npcs, "piazza"),
    inventory: { barricate: 0, kit: 1, radio: 0 },
    journal: [],
    gossip: [],
    lastNotice: "",
    crisisIndex: 0,
    pendingCrisis: null,
    finished: false,
    score: 0,
    ending: null,
    badges: [],
    feedback: "",
    pulseScore: 0,
    pendingSimpleAction: null,
    lastSimpleResult: null,
    actionSequence: 0,
    gameLost: false,
    weather: { type: "rain", intensity: 0.62, sequence: 0 }
  };
}

export function loadGame() {
  try {
    const raw = localStorage.getItem("mdq-save");
    return raw ? hydrateSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function hydrateSave(saved) {
  const next = { ...saved };
  next.pulseScore = Math.max(-3, Math.min(3, Number(saved.pulseScore) || 0));
  next.pendingSimpleAction = saved.pendingSimpleAction || null;
  next.lastSimpleResult = saved.lastSimpleResult || null;
  next.actionSequence = Number(saved.actionSequence) || 0;
  next.gameLost = saved.gameLost === true;
  next.weather = saved.weather || { type: "rain", intensity: 0.62, sequence: 0 };
  next.introSeen = saved.introSeen === true;
  next.sceneId = next.sceneId || "piazza";
  next.movement = Number(next.movement) || 0;
  const savedTurn = saved.turn || {};
  next.turn = {
    max: 4,
    spent: clamp(Number(savedTurn.spent) || 0, 0, 4),
    usedByNpc: { ...(savedTurn.usedByNpc || {}) },
    sceneProgress: { ...(savedTurn.sceneProgress || {}) },
    lastResult: savedTurn.lastResult || null
  };
  next.factions = factions.map((base) => {
    const current = saved.factions?.find((faction) => faction.id === base.id) || {};
    return {
      ...base,
      relation: current.relation ?? base.relation,
      pressure: current.pressure ?? base.pressure
    };
  });
  next.factionEvents = saved.factionEvents || [];
  next.npcs = npcs.map((base) => {
    const current = saved.npcs?.find((npc) => npc.id === base.id) || {};
    return {
      ...base,
      trust: current.trust ?? base.trust,
      fear: current.fear ?? base.fear,
      courage: current.courage ?? base.courage,
      morality: current.morality ?? base.morality,
      relation: current.relation ?? base.relation,
      memory: current.memory ?? base.memory,
      aptitudes: { ...base.aptitudes, ...(current.aptitudes || {}) },
      specialties: current.specialties ?? base.specialties,
      leverage: base.leverage
    };
  });
  next.world = hydrateWorldState(saved.world, next.npcs, next.sceneId);
  if (!next.introSeen && next.phase === "game") {
    next.phase = "intro";
    next.introStep = 0;
  }
  const activeScene = next.world.agents?.[next.activeNpc]?.sceneId;
  if (activeScene && scenes.some((scene) => scene.id === activeScene)) {
    next.sceneId = activeScene;
    next.world.sceneId = activeScene;
  }
  return next;
}

export const SIMPLE_ACTION_DURATION = 120000;
export const WEATHER_TYPES = ["rain", "fog", "storm"];

export function weatherForSequence(sequence = 0) {
  const type = WEATHER_TYPES[Math.abs(Number(sequence) || 0) % WEATHER_TYPES.length];
  return {
    type,
    intensity: type === "storm" ? 1 : type === "rain" ? 0.68 : 0.76,
    sequence: Number(sequence) || 0
  };
}

export function previewSimpleAction(state, actionId, npcId = state.activeNpc, sceneId = state.sceneId) {
  const action = simpleActions.find((item) => item.id === actionId);
  const npc = state.npcs.find((item) => item.id === npcId);
  const scene = scenes.find((item) => item.id === sceneId) || scenes[0];
  if (!action || !npc) return null;
  const aptitude = Number(npc.aptitudes?.[action.kind]) || 0;
  const placeBonus = scene.favoredAction === action.kind ? 2 : 0;
  const risk = Number(action.risk) || 0;
  const variation = ((state.actionSequence + action.id.length + npc.id.length + scene.id.length) % 5) - 2;
  const performance = aptitude + placeBonus + variation - risk;
  const polarity = performance >= 6 ? "positive" : performance >= 3 ? "neutral" : "negative";
  const delta = polarity === "positive" ? 1 : polarity === "negative" ? -1 : 0;
  const reason = placeBonus
    ? { it: `${scene.name.it} favorisce questa mossa.`, en: `${scene.name.en} favors this move.` }
    : aptitude >= 4
      ? { it: `${npc.name} e particolarmente adatto.`, en: `${npc.name} is especially suited.` }
      : risk
        ? { it: "Mossa rischiosa per questo personaggio.", en: "A risky move for this character." }
        : { it: "Mossa possibile, ma senza vantaggi.", en: "Possible, but without an advantage." };
  return { action, npc, scene, aptitude, placeBonus, risk, performance, polarity, delta, reason };
}

export function startSimpleAction(state, actionId, now = Date.now()) {
  if (state.pendingSimpleAction || state.gameLost) return state;
  const action = simpleActions.find((item) => item.id === actionId);
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  if (!action || !npc) return state;
  const next = copy(state);
  next.pendingSimpleAction = {
    id: action.id,
    npcId: npc.id,
    startedAt: now,
    endsAt: now + SIMPLE_ACTION_DURATION
  };
  next.lastSimpleResult = null;
  next.world = evolveWorldForAction(next.world, action.kind, npc.id, next.npcs, next.sceneId, next.day);
  saveGame(next);
  return next;
}

export function finishSimpleAction(state, now = Date.now()) {
  const pending = state.pendingSimpleAction;
  if (!pending || now < pending.endsAt) return state;
  const action = simpleActions.find((item) => item.id === pending.id);
  const npc = state.npcs.find((item) => item.id === pending.npcId);
  if (!action || !npc) return state;
  const next = copy(state);
  const preview = previewSimpleAction(next, action.id, npc.id, next.sceneId);
  const { polarity, delta } = preview;
  next.pulseScore = Math.max(-3, Math.min(3, next.pulseScore + delta));
  next.gameLost = next.pulseScore <= -3;
  next.lastSimpleResult = {
    polarity,
    delta,
    text: {
      it: `${npc.name}: ${action.outcome[polarity].it}.`,
      en: `${npc.name}: ${action.outcome[polarity].en}.`
    },
    at: now
  };
  next.pendingSimpleAction = null;
  next.actionSequence += 1;
  next.weather = weatherForSequence(next.actionSequence);
  if (!next.gameLost) {
    const currentIndex = next.npcs.findIndex((item) => item.id === npc.id);
    const nextNpc = next.npcs[(currentIndex + 1) % next.npcs.length];
    next.activeNpc = nextNpc.id;
    const nextScene = next.world?.agents?.[nextNpc.id]?.sceneId;
    if (nextScene && scenes.some((item) => item.id === nextScene)) {
      next.sceneId = nextScene;
      next.world.sceneId = nextScene;
    }
  }
  saveGame(next);
  return next;
}

export function saveGame(state) {
  localStorage.setItem("mdq-save", JSON.stringify(state));
}

export function resetGame(language, player) {
  const state = createGame(language, player);
  state.phase = "intro";
  state.journal.push(entry(state, "La piazza ti riconosce. Nessuno sa ancora se fidarsi."));
  return state;
}

function entry(state, it, en = it) {
  return { day: state.day, it, en, at: Date.now() };
}

export function selectNpc(state, id) {
  const next = copy(state);
  const targetScene = next.world?.agents?.[id]?.sceneId;
  next.activeNpc = id;
  next.phase = "game";
  next.activePanel = "closed";
  if (targetScene && scenes.some((scene) => scene.id === targetScene)) {
    next.sceneId = targetScene;
    next.world.sceneId = targetScene;
  }
  saveGame(next);
  return next;
}

export function getScene(state) {
  return scenes.find((scene) => scene.id === state.sceneId) || scenes[0];
}

export function getSceneObjective(state) {
  const scene = getScene(state);
  const progress = clamp(state.turn?.sceneProgress?.[scene.id] || 0, 0, 8);
  return {
    sceneId: scene.id,
    rule: scene.rule,
    incident: scene.incident,
    front: scene.front,
    anchor: scene.anchor,
    favoredAction: scene.favoredAction,
    target: 8,
    progress,
    remaining: Math.max(0, 8 - progress),
    completed: progress >= 8,
    text: {
      it: progress >= 8 ? `Incidente risolto presso ${scene.anchor.it}.` : `${scene.front.it} Progresso ${progress}/8.`,
      en: progress >= 8 ? `Incident resolved at ${scene.anchor.en}.` : `${scene.front.en} Progress ${progress}/8.`
    }
  };
}

function forecastEffect(scope, stat, from, delta, max = 100) {
  const to = clamp(from + delta, 0, max);
  return { scope, stat, from, to, delta: to - from };
}

export function getActionForecast(state, action, npcId = state.activeNpc) {
  const npc = state.npcs?.find((person) => person.id === npcId);
  const scene = getScene(state);
  const objective = getSceneObjective(state);
  const aptitude = npc?.aptitudes?.[action] || 0;
  const favored = scene.favoredAction === action;
  const potency = Math.min(5, aptitude + (favored ? 1 : 0));
  const risk = Math.max(1, 6 - aptitude + (action === "secret" ? 1 : 0) - (favored ? 1 : 0));
  const progressDelta = potency >= 5 ? 3 : potency >= 3 ? 2 : 1;
  const costs = ACTION_COSTS[action];
  const costMissing = costs && Object.entries(costs).find(([key, value]) => (state.resources?.[key] || 0) < value);
  const spent = state.turn?.spent || 0;
  const npcUses = state.turn?.usedByNpc?.[npcId] || 0;
  let reason = null;
  if (!npc || !costs) reason = { it: "Azione o persona non valida.", en: "Invalid action or person." };
  else if (state.finished || state.phase !== "game") reason = { it: "Non puoi agire in questa fase.", en: "You cannot act in this phase." };
  else if (spent >= (state.turn?.max || 4)) reason = { it: "Hai esaurito le azioni della notte.", en: "You have no actions left tonight." };
  else if (npcUses >= 2) reason = { it: `${npc.name} ha gia guidato due azioni stanotte.`, en: `${npc.name} has already led two actions tonight.` };
  else if (costMissing) reason = { it: `Servono almeno ${costMissing[1]} ${costMissing[0]}.`, en: `You need at least ${costMissing[1]} ${costMissing[0]}.` };

  const effects = [];
  if (npc && costs) {
    Object.entries(costs).forEach(([key, value]) => effects.push(forecastEffect("resources", key, state.resources[key], -value)));
    if (action === "talk") {
      effects.push(forecastEffect("npc", "trust", npc.trust, 2 + Math.ceil(potency / 2)));
      effects.push(forecastEffect("resources", "intel", state.resources.intel, 1 + Math.ceil(potency / 2)));
    } else if (action === "recruit") {
      effects.push(forecastEffect("resources", "defense", state.resources.defense, 2 + potency));
      effects.push(forecastEffect("metrics", "courage", state.metrics.courage, 1 + potency));
    } else if (action === "trade") {
      effects.push(forecastEffect("resources", "food", state.resources.food, 3 + potency));
      effects.push(forecastEffect("metrics", "wealth", state.metrics.wealth, -2));
    } else if (action === "secret") {
      const success = npc.trust + state.resources.intel + potency * 8 >= 112;
      effects.push(forecastEffect("npc", "trust", npc.trust, success ? 3 + potency : -Math.max(3, 7 - potency)));
      if (success) effects.push(forecastEffect("metrics", "secrets", state.metrics.secrets, 1, 10));
    }
  }
  const witnesses = state.npcs?.filter((person) => person.id !== npcId) || [];
  const witness = witnesses.length ? witnesses[(state.day + spent + scene.id.length) % witnesses.length] : null;
  return {
    allowed: !reason,
    reason,
    action,
    npcId,
    costSlots: 1,
    potency,
    risk,
    progress: { from: objective.progress, to: Math.min(objective.target, objective.progress + progressDelta), delta: Math.min(progressDelta, objective.remaining) },
    effects,
    social: { tone: risk >= 4 ? "tense" : "constructive", it: favored ? "Il luogo amplifica questa azione." : "L'azione sfida la regola del luogo.", en: favored ? "The place amplifies this action." : "The action pushes against the local rule." },
    witness: witness ? { npcId: witness.id, name: witness.name, it: `${witness.name} assiste e ricordera la scelta.`, en: `${witness.name} witnesses the choice and will remember it.` } : null,
    physical: { anchor: scene.anchor, it: `L'azione lascia un segno presso ${scene.anchor.it}.`, en: `The action leaves a mark at ${scene.anchor.en}.` },
    text: {
      it: reason?.it || `${npc.name} puo ${ACTION_LABELS[action].it}: efficacia ${potency}, rischio ${risk}.`,
      en: reason?.en || `${npc.name} can ${ACTION_LABELS[action].en}: potency ${potency}, risk ${risk}.`
    }
  };
}

export function getActiveFaction(state) {
  const list = state.factions?.length ? state.factions : factions;
  const index = ((state.crisisIndex || 0) + (state.day || 1) - 1) % list.length;
  return list[index];
}

export function getFactionActionEffects(npc, action, success = true) {
  const key = action === "secret" ? (success ? "secretSuccess" : "secretFail") : action;
  const totals = copy(ACTION_FACTION_BASE[key] || {});
  const leverage = npc?.leverage?.[action] || {};
  Object.entries(leverage).forEach(([id, values]) => {
    const current = totals[id] || [0, 0];
    totals[id] = [current[0] + values[0], current[1] + values[1]];
  });
  return Object.entries(totals)
    .filter(([, values]) => values[0] || values[1])
    .map(([id, values]) => ({ id, relation: values[0], pressure: values[1] }));
}

export function changeScene(state, sceneId) {
  const next = copy(state);
  next.sceneId = scenes.some((scene) => scene.id === sceneId) ? sceneId : "piazza";
  next.movement = (Number(next.movement) || 0) + 1;
  next.world = moveWorldToScene(next.world, next.sceneId, next.activeNpc, next.npcs);
  next.lastNotice = next.language === "it" ? `Ti sposti verso ${getScene(next).name.it}.` : `You move toward ${getScene(next).name.en}.`;
  saveGame(next);
  return next;
}

function rotateScene(state, step = 1) {
  const index = scenes.findIndex((scene) => scene.id === state.sceneId);
  const nextIndex = (Math.max(0, index) + step) % scenes.length;
  state.sceneId = scenes[nextIndex].id;
  state.movement = (Number(state.movement) || 0) + 1;
  state.world = moveWorldToScene(state.world, state.sceneId, state.activeNpc, state.npcs);
}

export function makeDialogue(state, npc) {
  const lang = state.language;
  const trustLine = npc.trust > 62
    ? { it: "si avvicina senza abbassare la voce", en: "steps closer without lowering their voice" }
    : npc.trust < 34
      ? { it: "parla come se il muro stesse ascoltando", en: "speaks like the wall is listening" }
      : { it: "misura ogni parola", en: "measures every word" };
  const fearLine = npc.fear > 55
    ? { it: "La paura gli sporca le mani.", en: "Fear stains their hands." }
    : { it: "Tiene ancora il centro.", en: "They still hold their center." };
  const memory = npc.memory.at(-1);
  const memoryLine = memory
    ? { it: `Ricorda: "${memory.it}".`, en: `Remembers: "${memory.en}".` }
    : { it: "Non hai ancora lasciato un segno diretto.", en: "You have not left a direct mark yet." };
  return `${npc.name} ${trustLine[lang]}. ${fearLine[lang]} ${memoryLine[lang]}`;
}

export function npcAction(state, action) {
  const next = copy(state);
  const npc = next.npcs.find((person) => person.id === next.activeNpc);
  if (!npc) return state;
  const forecast = getActionForecast(next, action, npc.id);
  if (!forecast.allowed) {
    next.lastNotice = forecast.text[next.language];
    next.turn.lastResult = { ...forecast, at: Date.now() };
    saveGame(next);
    return next;
  }

  forecast.effects.forEach((effect) => {
    const owner = effect.scope === "npc" ? npc : next[effect.scope];
    owner[effect.stat] = effect.to;
  });
  const secretSuccess = action !== "secret" || forecast.effects.some((effect) => effect.stat === "secrets" && effect.delta > 0);
  if (action === "talk") addGossip(next, npc, "soft");
  if (action === "secret" && !secretSuccess) {
    npc.fear = clamp(npc.fear + 5);
    addGossip(next, npc, "distorted");
  }
  if (action === "secret" && secretSuccess) {
    next.journal.unshift(entry(next, `${npc.name} rivela: ${npc.secret.it}`, `${npc.name} reveals: ${npc.secret.en}`));
  }
  const memories = {
    talk: ["Hai ascoltato senza chiedere prove.", "You listened without demanding proof."],
    recruit: ["Hai chiesto di proteggere il luogo.", "You asked them to protect this place."],
    trade: ["Avete scambiato favori, non solo merci.", "You traded favors, not only goods."],
    secret: ["Hai scavato sotto la versione ufficiale.", "You dug beneath the official story."]
  };
  remember(next, npc, ...memories[action]);
  const witness = next.npcs.find((person) => person.id === forecast.witness?.npcId);
  if (witness) {
    witness.memory.push({ day: next.day, it: `Testimone: ${npc.name} ha scelto di ${ACTION_LABELS[action].it}.`, en: `Witness: ${npc.name} chose to ${ACTION_LABELS[action].en}.` });
    witness.memory = witness.memory.slice(-4);
  }
  next.turn.spent += forecast.costSlots;
  next.turn.usedByNpc[npc.id] = (next.turn.usedByNpc[npc.id] || 0) + 1;
  next.turn.sceneProgress[next.sceneId] = forecast.progress.to;
  next.turn.lastResult = { ...forecast, success: secretSuccess, at: Date.now() };
  applyFactionEffects(next, npc, action, secretSuccess);

  driftRelations(next, npc.id);
  next.world = evolveWorldForAction(next.world, action, npc.id, next.npcs, next.sceneId, next.day);
  next.lastNotice = next.language === "it"
    ? `${npc.name}: ${ACTION_LABELS[action].it}. Incidente ${forecast.progress.to}/8.`
    : `${npc.name}: ${ACTION_LABELS[action].en}. Incident ${forecast.progress.to}/8.`;
  next.badges = unlockedBadges(next);
  saveGame(next);
  return next;
}

export function respondToFaction(state, factionId, response) {
  const next = copy(state);
  if ((next.turn?.spent || 0) >= (next.turn?.max || 4)) {
    next.lastNotice = next.language === "it" ? "Non restano mosse per rispondere." : "No moves remain to answer.";
    return next;
  }
  const faction = next.factions.find((item) => item.id === factionId);
  const npc = next.npcs.find((item) => item.id === next.activeNpc);
  const presence = next.world?.factionPresence?.find((item) => item.factionId === factionId && item.sceneId === next.sceneId);
  if (!faction || !npc || !presence) return next;
  const effects = {
    negotiate: { relation: 6, pressure: -4, trust: 3, defense: 0 },
    stand: { relation: -2, pressure: -6, trust: 1, defense: 4 },
    refuse: { relation: -6, pressure: 5, trust: -2, defense: 0 }
  }[response] || { relation: 0, pressure: 0, trust: 0, defense: 0 };
  faction.relation = clamp(faction.relation + effects.relation, -100, 100);
  faction.pressure = clamp(faction.pressure + effects.pressure, 0, 100);
  next.resources.trust = clamp(next.resources.trust + effects.trust);
  next.resources.defense = clamp(next.resources.defense + effects.defense);
  npc.courage = clamp(npc.courage + (response === "stand" ? 3 : response === "refuse" ? 1 : 0));
  next.turn.spent += 1;
  presence.responsePending = false;
  presence.stance = response === "negotiate" ? "allied" : "retreating";
  next.world.props = [...(next.world.props || []), { type: "faction-cooldown", factionId, expiresCycle: (next.world.cycle || 0) + 3 }].slice(-14);
  const copyText = {
    negotiate: [`${npc.name} tratta con ${faction.name}: la pressione cala, il rapporto migliora.`, `${npc.name} negotiates with ${faction.name}: pressure falls and relations improve.`],
    stand: [`${npc.name} tiene il confine: ${faction.name} arretra, ma ricorderà la sfida.`, `${npc.name} holds the border: ${faction.name} retreats but will remember the challenge.`],
    refuse: [`${npc.name} rifiuta la richiesta: ${faction.name} se ne va promettendo conseguenze.`, `${npc.name} rejects the demand: ${faction.name} leaves promising consequences.`]
  }[response];
  next.turn.lastResult = { text: { it: copyText[0], en: copyText[1] }, at: Date.now() };
  next.lastNotice = copyText[next.language === "it" ? 0 : 1];
  next.journal.unshift(entry(next, copyText[0], copyText[1]));
  saveGame(next);
  return next;
}

function applyFactionEffects(state, npc, action, success) {
  const sequence = `${state.day}-${npc.id}-${action}-${state.factionEvents?.length || 0}`;
  getFactionActionEffects(npc, action, success).forEach((effect) => {
    shiftFaction(state, effect.id, effect.relation, effect.pressure, {
      npc: npc.name,
      action,
      success,
      sequence
    });
  });
}

function shiftFaction(state, id, relationDelta, pressureDelta, meta = {}) {
  const faction = state.factions?.find((item) => item.id === id);
  if (!faction) return;
  faction.relation = clamp(faction.relation + relationDelta, -100, 100);
  faction.pressure = clamp(faction.pressure + pressureDelta, 0, 100);
  if (relationDelta || pressureDelta) {
    state.factionEvents = [
      {
        day: state.day,
        id,
        name: faction.name,
        relationDelta,
        pressureDelta,
        ...meta
      },
      ...(state.factionEvents || [])
    ].slice(0, 8);
  }
}

function remember(state, npc, it, en) {
  const item = { day: state.day, it, en };
  npc.memory.push(item);
  npc.memory = npc.memory.slice(-4);
  state.journal.unshift(entry(state, `${npc.name}: ${it}`, `${npc.name}: ${en}`));
}

function addGossip(state, npc, tone) {
  const targets = state.npcs.filter((person) => person.id !== npc.id);
  const target = targets[(state.day + npc.name.length + state.gossip.length) % targets.length];
  const item = {
    day: state.day,
    from: npc.name,
    to: target.name,
    tone,
    it: tone === "distorted"
      ? `${npc.name} distorce una voce su di te davanti a ${target.name}.`
      : `${npc.name} affida una voce cauta a ${target.name}.`,
    en: tone === "distorted"
      ? `${npc.name} twists a rumor about you in front of ${target.name}.`
      : `${npc.name} passes a cautious rumor to ${target.name}.`
  };
  state.gossip.unshift(item);
  state.gossip = state.gossip.slice(0, 8);
  target.trust = clamp(target.trust + (tone === "distorted" ? -4 : 2));
  state.resources.trust = clamp(state.resources.trust + (tone === "distorted" ? -3 : 2));
  state.metrics.chaos = clamp(state.metrics.chaos + (tone === "distorted" ? 4 : -1));
}

function driftRelations(state, sourceId) {
  const source = state.npcs.find((npc) => npc.id === sourceId);
  Object.keys(source.relation).forEach((id) => {
    source.relation[id] = clamp(source.relation[id] + (source.trust > 55 ? 1 : -1), -50, 50);
  });
}

export function craft(state, item) {
  const next = copy(state);
  const cost = CRAFT_COSTS[item];
  if (!canCraft(next, item)) {
    next.lastNotice = next.language === "it" ? "Non hai abbastanza denaro." : "Not enough money.";
    return next;
  }
  next.resources.money = clamp(next.resources.money - cost.money);
  Object.entries(cost).forEach(([key, value]) => {
    if (key !== "money") next.resources[key] = clamp(next.resources[key] + value);
  });
  next.inventory[item] += 1;
  next.world = evolveWorldForCraft(next.world, item, next.activeNpc, next.npcs, next.sceneId, next.day);
  next.journal.unshift(entry(next, `Creato: ${item}.`, `Crafted: ${item}.`));
  next.badges = unlockedBadges(next);
  saveGame(next);
  return next;
}

export function canCraft(state, item) {
  const cost = CRAFT_COSTS[item];
  return Boolean(cost && state.resources.money >= cost.money);
}

export function advanceDay(state) {
  const next = copy(state);
  if (next.finished) return next;

  if (next.day % 2 === 0) {
    next.pendingCrisis = copy(crises[next.crisisIndex % crises.length]);
    const faction = getActiveFaction(next);
    next.world = prepareWorldCrisis(next.world, faction, next.npcs, next.sceneId, next.day);
    next.pendingCrisis.factionId = faction.id;
    next.pendingCrisis.title.it = `${next.pendingCrisis.title.it}: ${faction.name}`;
    next.pendingCrisis.title.en = `${next.pendingCrisis.title.en}: ${faction.name}`;
    next.pendingCrisis.text.it = `${faction.name} (${faction.archetype.it}) spinge sul confine. ${next.pendingCrisis.text.it}`;
    next.pendingCrisis.text.en = `${faction.name} (${faction.archetype.en}) pushes at the border. ${next.pendingCrisis.text.en}`;
    next.crisisIndex += 1;
    next.phase = "crisis";
    next.lastNotice = next.pendingCrisis.title[next.language];
    saveGame(next);
    return next;
  }

  dailyPressure(next);
  rotateScene(next, 1);
  next.day += 1;
  next.turn = freshTurn(next.turn);
  next.world = evolveWorldForDay(next.world, next.npcs, next.sceneId, next.day);
  if (next.day > MAX_DAY) return finishGame(next);
  next.lastNotice = next.language === "it" ? "Il quartiere passa una notte inquieta." : "The district passes an uneasy night.";
  saveGame(next);
  return next;
}

export function resolveCrisis(state, optionId) {
  const next = copy(state);
  const option = next.pendingCrisis?.options.find((item) => item.id === optionId);
  if (!option) return state;
  applyEffects(next, option.effects);
  if (next.pendingCrisis?.factionId) {
    const relation = option.id === "negotiate" || option.id === "listen" || option.id === "ritual" ? 8 : -6;
    const pressure = option.id === "defend" || option.id === "ambush" || option.id === "order" ? -6 : -3;
    shiftFaction(next, next.pendingCrisis.factionId, relation, pressure);
  }
  next.world = resolveWorldCrisis(next.world, optionId, next.npcs, next.sceneId, next.day);
  next.journal.unshift(entry(next, `${next.pendingCrisis.title.it}: ${option.it}`, `${next.pendingCrisis.title.en}: ${option.en}`));
  spreadCrisisMemory(next, option);
  next.pendingCrisis = null;
  dailyPressure(next);
  next.day += 1;
  next.turn = freshTurn(next.turn);
  next.world = evolveWorldForDay(next.world, next.npcs, next.sceneId, next.day);
  next.phase = "game";
  next.badges = unlockedBadges(next);
  if (next.day > MAX_DAY) return finishGame(next);
  saveGame(next);
  return next;
}

function applyEffects(state, effects) {
  Object.entries(effects).forEach(([key, value]) => {
    if (key in state.resources) state.resources[key] = clamp(state.resources[key] + value);
    if (key in state.metrics) state.metrics[key] = clamp(state.metrics[key] + value, 0, key === "secrets" ? 10 : 100);
  });
}

function spreadCrisisMemory(state, option) {
  state.npcs.forEach((npc, index) => {
    const brave = option.effects.courage || option.effects.defense || 0;
    npc.fear = clamp(npc.fear + state.metrics.chaos / 30 - brave / 5);
    npc.trust = clamp(npc.trust + (option.effects.trust || 0) / 4 - Math.max(0, state.metrics.chaos - 60) / 20);
    npc.memory.push({ day: state.day, it: `Crisi: ${option.it}`, en: `Crisis: ${option.en}` });
    npc.memory = npc.memory.slice(-4);
    if (index === state.day % state.npcs.length) addGossip(state, npc, state.metrics.chaos > 55 ? "distorted" : "soft");
  });
}

function dailyPressure(state) {
  state.resources.food = clamp(state.resources.food - 4);
  state.resources.health = clamp(state.resources.health - (state.resources.food < 25 ? 6 : 2));
  state.resources.stability = clamp(state.resources.stability - (state.metrics.chaos > 55 ? 5 : 2) + (state.resources.defense > 55 ? 2 : 0));
  state.metrics.chaos = clamp(state.metrics.chaos + (state.resources.trust < 35 ? 5 : 1));
  state.metrics.survivors = state.resources.health < 18 ? Math.max(0, state.metrics.survivors - 1) : state.metrics.survivors;
}

export function calculateScore(state) {
  const score =
    state.metrics.survivors * 850 +
    state.resources.trust * 18 +
    state.resources.stability * 18 +
    state.metrics.secrets * 320 +
    state.metrics.wealth * 8 +
    (100 - state.metrics.chaos) * 14 +
    state.metrics.morality * 12 +
    state.metrics.courage * 11 +
    state.metrics.challenge * 15;
  return Math.max(0, Math.round(score));
}

export function getEnding(state) {
  if (state.metrics.survivors <= 1 || state.resources.stability < 24 || state.metrics.chaos > 78) {
    return {
      id: "collapse",
      it: "Collasso sociale",
      en: "Social Collapse",
      textIt: "Il quartiere non cade in una notte: si svuota una promessa alla volta. I rivali entrano senza correre.",
      textEn: "The district does not fall in one night: it empties one promise at a time. Rivals enter without rushing."
    };
  }
  if (state.resources.stability >= 64 && state.resources.trust < 50) {
    return {
      id: "order",
      it: "Controllo autoritario",
      en: "Authoritarian Control",
      textIt: "Le serrande restano abbassate e la piazza resiste, ma nessuno parla piu senza guardarsi alle spalle.",
      textEn: "Shutters stay down and the square survives, but no one speaks without checking behind them."
    };
  }
  return {
    id: "salvation",
    it: "Salvezza comunitaria",
    en: "Community Salvation",
    textIt: "Il quartiere resta ferito, ma intero. Le voci tornano a essere legami invece che armi.",
    textEn: "The district remains wounded, but whole. Rumors become bonds again instead of weapons."
  };
}

export function finishGame(state) {
  const next = copy(state);
  next.finished = true;
  next.phase = "end";
  next.score = calculateScore(next);
  next.ending = getEnding(next);
  next.badges = unlockedBadges(next);
  persistLeaderboard(next);
  saveGame(next);
  return next;
}

export function unlockedBadges(state) {
  return badges.filter((badge) => badge.test(state)).map((badge) => badge.id);
}

export function getLeaderboard(state) {
  const local = JSON.parse(localStorage.getItem("mdq-leaderboard") || "[]");
  return [...leaderboardSeed, ...local].sort((a, b) => b.score - a.score).slice(0, 10);
}

function persistLeaderboard(state) {
  const ending = state.ending?.it || "In corso";
  const local = JSON.parse(localStorage.getItem("mdq-leaderboard") || "[]");
  local.push({ name: state.player || "Ospite", score: state.score, ending });
  localStorage.setItem("mdq-leaderboard", JSON.stringify(local.slice(-20)));
}

export function backendAdapterSpec() {
  return {
    auth: "replace local player register with Supabase Auth magic link",
    saves: "sync mdq-save JSON to player_saves.user_id/current_state",
    leaderboard: "insert final scores into leaderboard(score, ending, created_at)",
    multiplayer: "promote crisis seeds into server-authored seasonal events"
  };
}
