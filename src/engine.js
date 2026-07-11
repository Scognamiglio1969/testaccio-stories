import { MAX_DAY, badges, crises, factions, leaderboardSeed, metrics, npcs, resources, scenes } from "./gameData.js";

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

export function createGame(language = "it", player = "Ospite") {
  return {
    language,
    player,
    day: 1,
    phase: "menu",
    activeNpc: "marta",
    activePanel: "closed",
    sceneId: "piazza",
    movement: 0,
    resources: copy(resources),
    metrics: copy(metrics),
    factions: copy(factions),
    factionEvents: [],
    npcs: copy(npcs),
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
    feedback: ""
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
  next.sceneId = next.sceneId || "piazza";
  next.movement = Number(next.movement) || 0;
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
      leverage: base.leverage
    };
  });
  return next;
}

export function saveGame(state) {
  localStorage.setItem("mdq-save", JSON.stringify(state));
}

export function resetGame(language, player) {
  const state = createGame(language, player);
  state.phase = "game";
  state.journal.push(entry(state, "La piazza ti riconosce. Nessuno sa ancora se fidarsi."));
  return state;
}

function entry(state, it, en = it) {
  return { day: state.day, it, en, at: Date.now() };
}

export function selectNpc(state, id) {
  const next = { ...state, activeNpc: id, phase: "game", activePanel: "closed", movement: (Number(state.movement) || 0) + 1 };
  saveGame(next);
  return next;
}

export function getScene(state) {
  return scenes.find((scene) => scene.id === state.sceneId) || scenes[0];
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
  next.lastNotice = next.language === "it" ? `Ti sposti verso ${getScene(next).name.it}.` : `You move toward ${getScene(next).name.en}.`;
  saveGame(next);
  return next;
}

function rotateScene(state, step = 1) {
  const index = scenes.findIndex((scene) => scene.id === state.sceneId);
  const nextIndex = (Math.max(0, index) + step) % scenes.length;
  state.sceneId = scenes[nextIndex].id;
  state.movement = (Number(state.movement) || 0) + 1;
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
  let outcome = "";

  if (action === "talk") {
    npc.trust = clamp(npc.trust + 3);
    npc.fear = clamp(npc.fear - 1);
    next.resources.intel = clamp(next.resources.intel + 3);
    remember(next, npc, "Hai ascoltato senza chiedere prove.", "You listened without demanding proof.");
    addGossip(next, npc, "soft");
    outcome = next.language === "it" ? "+3 info, +fiducia diffusa. Una voce utile attraversa il rione." : "+3 intel, shared trust. A useful rumor crosses the district.";
    applyFactionEffects(next, npc, action, true);
  }

  if (action === "recruit") {
    npc.trust = clamp(npc.trust + 5);
    npc.courage = clamp(npc.courage + 4);
    next.resources.defense = clamp(next.resources.defense + 5);
    next.resources.food = clamp(next.resources.food - 3);
    next.metrics.courage = clamp(next.metrics.courage + 4);
    remember(next, npc, "Hai chiesto di proteggere la piazza.", "You asked them to protect the square.");
    outcome = next.language === "it" ? "+5 difesa, +4 coraggio, -3 cibo. La piazza sembra meno sola." : "+5 defense, +4 courage, -3 food. The square feels less alone.";
    applyFactionEffects(next, npc, action, true);
  }

  if (action === "trade") {
    npc.trust = clamp(npc.trust + 2);
    next.resources.money = clamp(next.resources.money - 5);
    next.resources.food = clamp(next.resources.food + 7);
    next.metrics.wealth = clamp(next.metrics.wealth - 3);
    remember(next, npc, "Avete scambiato favori, non solo merci.", "You traded favors, not only goods.");
    outcome = next.language === "it" ? "+7 cibo, -5 denaro. Hai comprato tempo, non pace." : "+7 food, -5 money. You bought time, not peace.";
    applyFactionEffects(next, npc, action, true);
  }

  if (action === "secret") {
    const found = npc.trust + next.resources.intel + npc.courage > 112;
    next.resources.intel = clamp(next.resources.intel - 6);
    if (found) {
      next.metrics.secrets = clamp(next.metrics.secrets + 1, 0, 10);
      npc.trust = clamp(npc.trust + 7);
      next.journal.unshift(entry(next, `${npc.name} rivela: ${npc.secret.it}`, `${npc.name} reveals: ${npc.secret.en}`));
      outcome = next.language === "it" ? "+1 segreto, +7 fiducia personale. La leggenda ha un nuovo pezzo." : "+1 secret, +7 personal trust. The legend gains a new piece.";
      applyFactionEffects(next, npc, action, true);
    } else {
      npc.trust = clamp(npc.trust - 6);
      npc.fear = clamp(npc.fear + 5);
      addGossip(next, npc, "distorted");
      outcome = next.language === "it" ? "-6 fiducia, +sospetto. Hai scavato troppo presto." : "-6 trust, +suspicion. You dug too early.";
      applyFactionEffects(next, npc, action, false);
    }
    remember(next, npc, "Hai scavato sotto la versione ufficiale.", "You dug beneath the official story.");
  }

  driftRelations(next, npc.id);
  rotateScene(next, action === "secret" ? 2 : 1);
  next.lastNotice = outcome;
  next.badges = unlockedBadges(next);
  saveGame(next);
  return next;
}

function applyFactionEffects(state, npc, action, success) {
  getFactionActionEffects(npc, action, success).forEach((effect) => {
    shiftFaction(state, effect.id, effect.relation, effect.pressure, {
      npc: npc.name,
      action,
      success
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
  const costs = {
    barricate: { money: 5, intel: 2, defense: 9 },
    kit: { money: 6, health: 8, trust: 2 },
    radio: { money: 8, intel: 10, trust: 5 }
  };
  const cost = costs[item];
  if (!cost || next.resources.money < cost.money) {
    next.lastNotice = next.language === "it" ? "Non hai abbastanza denaro." : "Not enough money.";
    return next;
  }
  next.resources.money = clamp(next.resources.money - cost.money);
  Object.entries(cost).forEach(([key, value]) => {
    if (key !== "money") next.resources[key] = clamp(next.resources[key] + value);
  });
  next.inventory[item] += 1;
  next.journal.unshift(entry(next, `Creato: ${item}.`, `Crafted: ${item}.`));
  next.badges = unlockedBadges(next);
  saveGame(next);
  return next;
}

export function advanceDay(state) {
  const next = copy(state);
  if (next.finished) return next;

  if (next.day % 2 === 0) {
    next.sceneId = "ponte";
    next.movement = (Number(next.movement) || 0) + 1;
    next.pendingCrisis = copy(crises[next.crisisIndex % crises.length]);
    const faction = getActiveFaction(next);
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
  next.journal.unshift(entry(next, `${next.pendingCrisis.title.it}: ${option.it}`, `${next.pendingCrisis.title.en}: ${option.en}`));
  spreadCrisisMemory(next, option);
  rotateScene(next, option.id === "ambush" || option.id === "descend" ? 2 : 1);
  next.pendingCrisis = null;
  dailyPressure(next);
  next.day += 1;
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
