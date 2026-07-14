export const ACTOR_CATEGORIES = Object.freeze({
  QUEST_GIVER: "quest-giver",
  COMPANION: "companion",
  ANTAGONIST: "antagonist-boss",
  BACKGROUND: "background"
});

const actor = (id, name, category, scenes, faction, voice) => Object.freeze({
  id,
  name,
  category,
  scenes: Object.freeze(scenes),
  faction,
  voice
});

export const STORY_ACTORS = Object.freeze([
  actor("adriana", "Adriana la Portinaia", ACTOR_CATEGORIES.QUEST_GIVER, ["piazza", "vicoli", "lupa"], "testaccio", "pratica"),
  actor("sor-cesare", "Sor Cesare", ACTOR_CATEGORIES.QUEST_GIVER, ["ponte", "monte"], "testaccio", "guardinga"),
  actor("amina", "Amina del Banco 27", ACTOR_CATEGORIES.QUEST_GIVER, ["piazzatestaccio", "mercato"], "testaccio", "diretta"),
  actor("padre-livio", "Padre Livio", ACTOR_CATEGORIES.QUEST_GIVER, ["palazzo", "mattatoio", "sottoponte"], "testaccio", "misurata"),
  actor("teo", "Teo", ACTOR_CATEGORIES.COMPANION, ["piazza", "ponte", "piazzatestaccio"], "testaccio", "attenta"),
  actor("edo", "Edo", ACTOR_CATEGORIES.COMPANION, ["vicoli", "monte", "mattatoio"], "testaccio", "impulsiva"),
  actor("jack", "Jack", ACTOR_CATEGORIES.COMPANION, ["lupa", "palazzo", "sottoponte"], "testaccio", "spigolosa"),
  actor("miranda", "Miranda", ACTOR_CATEGORIES.COMPANION, ["mercato", "piazzatestaccio", "sottoponte"], "testaccio", "calma"),
  actor("il-curatore", "Il Curatore", ACTOR_CATEGORIES.ANTAGONIST, ["piazza", "lupa", "palazzo"], "centro", "fredda"),
  actor("bastianaccio", "Bastianaccio", ACTOR_CATEGORIES.ANTAGONIST, ["vicoli", "ponte", "sottoponte"], "trullo", "minacciosa"),
  actor("la-contessa", "La Contessa", ACTOR_CATEGORIES.ANTAGONIST, ["monte", "piazzatestaccio", "mercato", "mattatoio"], "romanord", "affabile"),
  actor("gino-er-fabbro", "Gino er Fabbro", ACTOR_CATEGORIES.BACKGROUND, ["piazza", "monte", "mattatoio"], "testaccio", "ruvida"),
  actor("le-gemelle", "Le Gemelle del Terzo Piano", ACTOR_CATEGORIES.BACKGROUND, ["vicoli", "lupa", "palazzo"], "testaccio", "curiosa"),
  actor("samir", "Samir delle Consegne", ACTOR_CATEGORIES.BACKGROUND, ["ponte", "mercato", "sottoponte"], "trastevere", "svelta"),
  actor("lidia", "Lidia della Fontana", ACTOR_CATEGORIES.BACKGROUND, ["piazzatestaccio"], "romaest", "ironica")
]);

export const SCENE_ACTORS = Object.freeze(Object.fromEntries([
  "piazza", "vicoli", "ponte", "lupa", "monte", "piazzatestaccio", "palazzo", "mercato", "mattatoio", "sottoponte"
].map((sceneId) => [sceneId, Object.freeze(STORY_ACTORS.filter((item) => item.scenes.includes(sceneId)).map((item) => item.id))])));

const OBJECTIVES = [
  "recupera il registro scomparso",
  "porta una prova al contatto giusto",
  "metti in sicurezza il passaggio",
  "scopri chi ha tradito l'accordo",
  "intercetta la consegna prima dell'alba",
  "convoca i testimoni senza farti seguire"
];
const COMPLICATIONS = [
  "senza allertare le ronde",
  "prima che il tempo cancelli le tracce",
  "lasciando una via d'uscita alla fazione rivale",
  "senza spendere la fiducia del quartiere",
  "mentre qualcuno osserva da una finestra",
  "prima che la voce arrivi al ponte"
];
const REWARDS = ["fiducia", "intel", "stabilita", "risorse", "un favore", "accesso sicuro"];
const EMOTIONS = ["determined", "wary", "urgent", "hopeful", "defiant", "calm"];

const stableValue = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${stableValue(value[key])}`).join(",")}}`;
  }
  return String(value ?? "");
};

export function hashStorySeed(value) {
  let hash = 2166136261;
  const input = stableValue(value);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getActorsForScene(sceneId, category) {
  return STORY_ACTORS.filter((item) => item.scenes.includes(sceneId) && (!category || item.category === category));
}

export function getActor(actorOrId) {
  if (actorOrId && typeof actorOrId === "object") return actorOrId;
  return STORY_ACTORS.find((item) => item.id === actorOrId || item.name === actorOrId) || null;
}

export function missionSeed(context = {}) {
  return {
    sceneId: context.sceneId || "piazza",
    activeNpc: typeof context.activeNpc === "object" ? context.activeNpc.id || context.activeNpc.name : context.activeNpc || "sconosciuto",
    faction: typeof context.faction === "object" ? context.faction.id || context.faction.name : context.faction || "testaccio",
    weather: typeof context.weather === "object" ? context.weather.type || stableValue(context.weather) : context.weather || "sereno",
    actionSequence: Array.isArray(context.actionSequence) ? context.actionSequence : context.actionSequence ?? 0
  };
}

export function generateMission(context = {}) {
  const seed = missionSeed(context);
  const hash = hashStorySeed(seed);
  const actor = getActor(context.activeNpc);
  const faction = typeof context.faction === "object" ? context.faction.name || context.faction.id : context.faction;
  const weather = typeof context.weather === "object" ? context.weather.type : context.weather;
  return Object.freeze({
    id: `mission-${seed.sceneId}-${hash.toString(36)}`,
    sceneId: seed.sceneId,
    giver: actor?.name || String(seed.activeNpc),
    faction: faction || "Testaccio",
    objective: OBJECTIVES[hash % OBJECTIVES.length],
    complication: COMPLICATIONS[(hash >>> 5) % COMPLICATIONS.length],
    reward: REWARDS[(hash >>> 11) % REWARDS.length],
    weather: weather || "sereno",
    actionSequence: context.actionSequence ?? 0
  });
}

export function createLocalActorDialogue(context = {}) {
  const mission = generateMission(context);
  const actor = getActor(context.activeNpc);
  const name = actor?.name || (typeof context.activeNpc === "object" ? context.activeNpc.name : context.activeNpc) || "Una voce del rione";
  const weather = typeof context.weather === "object" ? context.weather.type : context.weather || "sereno";
  const faction = typeof context.faction === "object" ? context.faction.name || context.faction.id : context.faction || "Testaccio";
  const emotion = EMOTIONS[hashStorySeed(missionSeed(context)) % EMOTIONS.length];
  const previousChoice = typeof context.playerChoice === "string" ? context.playerChoice.trim() : "";
  const memoryCount = Array.isArray(context.memory) ? context.memory.length : 0;
  const responseLead = previousChoice
    ? `${name} pesa la risposta: "${previousChoice}".`
    : memoryCount
      ? `${name} ricorda le ultime ${memoryCount} conversazioni.`
      : `${name} studia chi ha davanti.`;
  return {
    line: `${responseLead} Con questo tempo (${weather}), ${mission.objective} ${mission.complication}: ${faction} non aspettera.`,
    choices: [
      `Accetta e punta su ${mission.reward}`,
      `Chiedi cosa sa ${faction}`,
      "Rifiuta e cerca un'altra strada"
    ],
    emotion,
    mission
  };
}

export function normalizeActorDialogue(payload, context = {}) {
  const fallback = createLocalActorDialogue(context);
  const source = payload && typeof payload === "object" ? payload : {};
  const choices = Array.isArray(source.choices)
    ? source.choices.filter((choice) => typeof choice === "string" && choice.trim()).slice(0, 3)
    : [];
  return {
    line: typeof source.line === "string" && source.line.trim() ? source.line.trim() : fallback.line,
    choices: choices.length === 3 ? choices : fallback.choices,
    emotion: typeof source.emotion === "string" && source.emotion.trim() ? source.emotion.trim() : fallback.emotion,
    mission: source.mission && typeof source.mission === "object" ? { ...fallback.mission, ...source.mission } : fallback.mission
  };
}

function configuredEndpoint(storage) {
  try {
    const endpoint = storage?.getItem?.("ts-ai-endpoint")?.trim();
    return endpoint || null;
  } catch {
    return null;
  }
}

export async function generateActorDialogue(context = {}, dependencies = {}) {
  const storage = dependencies.storage ?? globalThis.localStorage;
  const request = dependencies.fetch ?? globalThis.fetch;
  const endpoint = configuredEndpoint(storage);
  if (!endpoint || typeof request !== "function") return createLocalActorDialogue(context);

  try {
    const response = await request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: context.mode || "narrative",
        language: context.language === "en" ? "English" : "Italian",
        prompt: "Generate one concise in-character NPC line and three meaningfully different player replies. Ground every detail in the supplied game state and memory.",
        context: { ...context, mission: generateMission(context) },
        outputSchema: {
          type: "object",
          additionalProperties: false,
          required: ["line", "choices", "emotion", "mission"],
          properties: {
            line: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
            emotion: { type: "string" },
            mission: { type: "object" }
          }
        }
      })
    });
    if (!response?.ok) throw new Error(`Dialogue endpoint returned ${response?.status || "an error"}`);
    const payload = await response.json();
    return normalizeActorDialogue(payload?.data || payload, context);
  } catch {
    return createLocalActorDialogue(context);
  }
}
