export const WORLD_VERSION = 5;

export const sceneProfiles = {
  piazza: { focalPoint: [0.5, 0.54], crop: 1.02, brightness: 0.98, characterScale: 1, ambience: "fountain", entry: "west", exit: "gate" },
  vicoli: { focalPoint: [0.48, 0.55], crop: 1.04, brightness: 0.9, characterScale: 1.04, ambience: "laundry", entry: "west", exit: "arch" },
  ponte: { focalPoint: [0.56, 0.48], crop: 1, brightness: 1.02, characterScale: 0.94, ambience: "river", entry: "west", exit: "east" },
  lupa: { focalPoint: [0.49, 0.53], crop: 1.03, brightness: 0.93, characterScale: 1.01, ambience: "neon", entry: "west", exit: "gate" },
  monte: { focalPoint: [0.52, 0.46], crop: 1, brightness: 1.04, characterScale: 0.92, ambience: "dust", entry: "west", exit: "east" },
  piazzatestaccio: { focalPoint: [0.51, 0.52], crop: 1.01, brightness: 1, characterScale: 0.98, ambience: "fountain-windows", entry: "west", exit: "east" },
  palazzo: { focalPoint: [0.55, 0.49], crop: 1.02, brightness: 0.96, characterScale: 0.96, ambience: "windows-laundry", entry: "door", exit: "stairs" },
  mercato: { focalPoint: [0.52, 0.5], crop: 1.03, brightness: 0.94, characterScale: 1.02, ambience: "market-lights", entry: "west", exit: "gate" },
  mattatoio: { focalPoint: [0.53, 0.48], crop: 1, brightness: 0.9, characterScale: 0.98, ambience: "headlights", entry: "west", exit: "gate" },
  sottoponte: { focalPoint: [0.51, 0.54], crop: 1.02, brightness: 0.88, characterScale: 1.03, ambience: "river-fire", entry: "west", exit: "east" }
};

export const sceneTransitionContract = {
  maxInputLockMs: 2200,
  exitBudgetMs: 760,
  preloadGraceMs: 100,
  crossfadeMs: 1180,
  accepts: ["scene-object", "destination-name"]
};

export const characterAssets = {
  marta: "./assets/characters/teo-v2-alpha.png",
  nando: "./assets/characters/edo-v2-alpha.png",
  leila: "./assets/characters/jack-v2-alpha.png",
  ruggero: "./assets/characters/marta-cargo-alpha.png",
  ilaria: "./assets/characters/miranda-cargo-alpha.png",
  nina: "./assets/characters/nina-alpha.png"
};

export const factionAssets = {
  trastevere: "./assets/factions/trastevere-group-alpha.png",
  centro: "./assets/factions/centro-group-alpha.png",
  trullo: "./assets/factions/trullo-group-alpha.png",
  romaest: "./assets/factions/romaest-group-alpha.png",
  romanord: "./assets/factions/romanord-group-alpha.png"
};

export const characterProfiles = {
  marta: { footCrop: 0 },
  nando: { footCrop: 0 },
  leila: { footCrop: 0 },
  ruggero: { footCrop: 0 },
  ilaria: { footCrop: 0 },
  nina: { footCrop: 0 }
};

export const factionVisuals = {
  trastevere: { color: "#d7a45e", accent: "#f3d8a1", posture: "open" },
  centro: { color: "#b65fd9", accent: "#e6b8f1", posture: "measured" },
  trullo: { color: "#d95d50", accent: "#ffc0a8", posture: "tight" },
  romaest: { color: "#cf3f37", accent: "#ffb099", posture: "march" },
  romanord: { color: "#6fb8c4", accent: "#c7f0ed", posture: "loose" }
};

const makeGraph = (points, edges, anchors) => ({
  nodes: Object.fromEntries(Object.entries(points).map(([id, point]) => [id, { id, x: point[0], y: point[1] }])),
  edges,
  anchors
});

export const sceneGraphs = {
  piazza: makeGraph(
    {
      west: [0.12, 0.58], bar: [0.25, 0.53], fountain: [0.48, 0.58], market: [0.5, 0.4], clinic: [0.67, 0.45],
      wall: [0.66, 0.58], gate: [0.84, 0.68], north: [0.52, 0.33], cellar: [0.37, 0.66], south: [0.52, 0.74]
    },
    [["west", "bar"], ["bar", "fountain"], ["bar", "cellar"], ["cellar", "south"], ["south", "fountain"], ["fountain", "market"], ["fountain", "wall"], ["market", "north"], ["market", "clinic"], ["clinic", "gate"], ["wall", "gate"]],
    { talk: "bar", gather: "fountain", trade: "market", defend: "gate", secret: "cellar", care: "clinic", scout: "north", exit: "gate" }
  ),
  vicoli: makeGraph(
    {
      west: [0.3, 0.66], corner: [0.4, 0.59], laundry: [0.5, 0.4], junction: [0.54, 0.54], bar: [0.42, 0.48],
      stairs: [0.68, 0.55], arch: [0.66, 0.27], drain: [0.53, 0.72], cellar: [0.36, 0.56], north: [0.58, 0.22]
    },
    [["west", "corner"], ["corner", "laundry"], ["corner", "cellar"], ["laundry", "junction"], ["cellar", "junction"], ["junction", "bar"], ["junction", "drain"], ["bar", "stairs"], ["bar", "arch"], ["stairs", "north"], ["drain", "arch"]],
    { talk: "bar", gather: "junction", trade: "corner", defend: "arch", secret: "cellar", care: "laundry", scout: "stairs", exit: "arch" }
  ),
  ponte: makeGraph(
    {
      west: [0.1, 0.86], stairs: [0.22, 0.78], landing: [0.34, 0.7], bridge: [0.51, 0.57], lamp: [0.63, 0.49],
      east: [0.84, 0.33], river: [0.47, 0.64], lookout: [0.42, 0.64], barricade: [0.7, 0.43], south: [0.3, 0.8]
    },
    [["west", "stairs"], ["stairs", "landing"], ["stairs", "south"], ["landing", "bridge"], ["landing", "river"], ["landing", "lookout"], ["bridge", "lamp"], ["bridge", "barricade"], ["lamp", "east"], ["barricade", "east"], ["river", "south"]],
    { talk: "landing", gather: "bridge", trade: "stairs", defend: "barricade", secret: "lookout", care: "south", scout: "lookout", exit: "east" }
  ),
  lupa: makeGraph(
    {
      west: [0.06, 0.48], court: [0.28, 0.55], mural: [0.44, 0.59], bench: [0.53, 0.61], gate: [0.86, 0.61],
      stairs: [0.71, 0.48], alley: [0.19, 0.46], drain: [0.43, 0.7], roof: [0.62, 0.47], south: [0.68, 0.69]
    },
    [["west", "court"], ["court", "alley"], ["court", "bench"], ["court", "drain"], ["alley", "mural"], ["mural", "stairs"], ["mural", "roof"], ["bench", "gate"], ["bench", "south"], ["stairs", "gate"], ["drain", "south"]],
    { talk: "bench", gather: "mural", trade: "court", defend: "gate", secret: "drain", care: "south", scout: "stairs", exit: "gate" }
  ),
  monte: makeGraph(
    {
      west: [0.08, 0.75], base: [0.19, 0.66], bend: [0.31, 0.59], ridge: [0.48, 0.48], cross: [0.5, 0.24],
      east: [0.83, 0.57], cave: [0.4, 0.57], terrace: [0.68, 0.51], path: [0.62, 0.37], south: [0.65, 0.68]
    },
    [["west", "base"], ["base", "bend"], ["base", "cave"], ["bend", "ridge"], ["ridge", "cross"], ["ridge", "terrace"], ["terrace", "path"], ["path", "cross"], ["terrace", "east"], ["terrace", "south"], ["cave", "south"]],
    { talk: "base", gather: "ridge", trade: "terrace", defend: "east", secret: "cave", care: "south", scout: "cross", exit: "east" }
  ),
  piazzatestaccio: makeGraph(
    {
      west: [0.1, 0.63], cafe: [0.24, 0.55], fountain: [0.51, 0.63], kiosk: [0.66, 0.55], east: [0.86, 0.63],
      arcade: [0.31, 0.43], north: [0.55, 0.35], steps: [0.7, 0.68], drain: [0.43, 0.73], south: [0.56, 0.82]
    },
    [["west", "cafe"], ["cafe", "fountain"], ["cafe", "arcade"], ["arcade", "north"], ["north", "fountain"], ["fountain", "kiosk"], ["fountain", "drain"], ["kiosk", "east"], ["kiosk", "steps"], ["steps", "east"], ["steps", "south"], ["drain", "south"]],
    { talk: "cafe", gather: "fountain", trade: "kiosk", defend: "east", secret: "drain", care: "steps", scout: "north", exit: "east" }
  ),
  palazzo: makeGraph(
    {
      door: [0.28, 0.53], laundry: [0.49, 0.42], table: [0.72, 0.51], antenna: [0.35, 0.4], ledge: [0.73, 0.61],
      stairs: [0.78, 0.68], tank: [0.3, 0.46], hatch: [0.52, 0.68], lookout: [0.56, 0.49], south: [0.58, 0.73]
    },
    [["door", "laundry"], ["laundry", "table"], ["laundry", "tank"], ["tank", "antenna"], ["table", "antenna"], ["table", "hatch"], ["antenna", "lookout"], ["antenna", "ledge"], ["ledge", "stairs"], ["hatch", "south"], ["south", "stairs"]],
    { talk: "table", gather: "antenna", trade: "laundry", defend: "stairs", secret: "hatch", care: "south", scout: "lookout", exit: "stairs" }
  ),
  mercato: makeGraph(
    {
      west: [0.18, 0.58], crates: [0.27, 0.55], aisle: [0.38, 0.5], stall: [0.53, 0.48], office: [0.69, 0.42],
      gate: [0.82, 0.54], freezer: [0.35, 0.67], loading: [0.68, 0.64], roof: [0.53, 0.31], south: [0.52, 0.72]
    },
    [["west", "crates"], ["crates", "aisle"], ["crates", "freezer"], ["aisle", "stall"], ["aisle", "roof"], ["stall", "office"], ["stall", "loading"], ["office", "gate"], ["loading", "gate"], ["freezer", "south"], ["south", "loading"]],
    { talk: "aisle", gather: "stall", trade: "crates", defend: "gate", secret: "freezer", care: "office", scout: "roof", exit: "gate" }
  ),
  mattatoio: makeGraph(
    {
      west: [0.12, 0.58], yard: [0.25, 0.55], rails: [0.4, 0.48], hall: [0.55, 0.4], gallery: [0.68, 0.3],
      gate: [0.82, 0.48], tunnel: [0.35, 0.66], workshop: [0.67, 0.6], tower: [0.49, 0.29], south: [0.52, 0.72]
    },
    [["west", "yard"], ["yard", "rails"], ["yard", "tunnel"], ["rails", "hall"], ["rails", "tower"], ["hall", "gallery"], ["hall", "workshop"], ["gallery", "gate"], ["workshop", "gate"], ["tunnel", "south"], ["south", "workshop"]],
    { talk: "yard", gather: "hall", trade: "workshop", defend: "gate", secret: "tunnel", care: "south", scout: "tower", exit: "gate" }
  ),
  sottoponte: makeGraph(
    {
      west: [0.28, 0.82], arch: [0.39, 0.72], landing: [0.5, 0.63], fire: [0.63, 0.55], stairs: [0.65, 0.68],
      east: [0.85, 0.55], river: [0.45, 0.76], tunnel: [0.58, 0.42], lookout: [0.47, 0.52], south: [0.6, 0.82]
    },
    [["west", "arch"], ["arch", "landing"], ["arch", "tunnel"], ["landing", "fire"], ["landing", "lookout"], ["fire", "stairs"], ["fire", "river"], ["stairs", "east"], ["river", "south"], ["south", "east"], ["tunnel", "river"]],
    { talk: "fire", gather: "landing", trade: "arch", defend: "east", secret: "tunnel", care: "south", scout: "lookout", exit: "east" }
  )
};

export const actionPresentation = {
  talk: {
    anchor: "talk",
    color: "#79d58a",
    beats: {
      it: ["Si cercano nel vicolo", "Le parole cambiano peso", "La voce passa di mano"],
      en: ["They meet in the alley", "Words change weight", "The rumor changes hands"]
    }
  },
  recruit: {
    anchor: "gather",
    color: "#d9b45f",
    beats: {
      it: ["Parte il richiamo", "Il gruppo converge", "Il presidio prende forma"],
      en: ["The call goes out", "The group converges", "The watch takes shape"]
    }
  },
  trade: {
    anchor: "trade",
    color: "#74c7cb",
    beats: {
      it: ["La merce arriva", "Si misura il favore", "Lo scambio e chiuso"],
      en: ["The goods arrive", "The favor is weighed", "The trade is sealed"]
    }
  },
  secret: {
    anchor: "secret",
    color: "#d85b4b",
    beats: {
      it: ["Si lascia la strada", "Una traccia emerge", "Qualcuno ora sa troppo"],
      en: ["They leave the street", "A trace emerges", "Someone now knows too much"]
    }
  }
};

export const simpleActionPresentation = {
  listen: { anchor: "talk", effect: "speech", activity: "talking", color: "#79d58a" },
  negotiate: { anchor: "trade", effect: "handoff", activity: "exchanging supplies", color: "#74c7cb" },
  question: { anchor: "talk", effect: "scan", activity: "investigating", color: "#d9b45f" },
  reassure: { anchor: "care", effect: "shield", activity: "talking", color: "#79d58a" },
  provoke: { anchor: "defend", effect: "standoff", activity: "facing the delegation", color: "#d85b4b" },
  patrol: { anchor: "scout", effect: "trail", activity: "watching the border", color: "#d9b45f" },
  protect: { anchor: "defend", effect: "shield", activity: "holding the line", color: "#79d58a" },
  challenge: { anchor: "defend", effect: "standoff", activity: "facing the delegation", color: "#d85b4b" },
  chase: { anchor: "exit", effect: "trail", activity: "moving with purpose", color: "#f08a55" },
  block: { anchor: "defend", effect: "barrier", activity: "taking position", color: "#d9b45f" },
  photograph: { anchor: "scout", effect: "camera", activity: "investigating", color: "#f2eadf" },
  follow: { anchor: "scout", effect: "trail", activity: "investigating", color: "#74c7cb" },
  search: { anchor: "secret", effect: "scan", activity: "searching", color: "#d9b45f" },
  infiltrate: { anchor: "secret", effect: "smoke", activity: "moving with purpose", color: "#9b8ac4" },
  expose: { anchor: "gather", effect: "burst", activity: "talking", color: "#d85b4b" },
  trade: { anchor: "trade", effect: "handoff", activity: "exchanging supplies", color: "#74c7cb" },
  repair: { anchor: "care", effect: "sparks", activity: "crafting", color: "#d9b45f" },
  deliver: { anchor: "trade", effect: "handoff", activity: "carrying materials", color: "#79d58a" },
  gather: { anchor: "gather", effect: "rally", activity: "rallying", color: "#d9b45f" },
  sabotage: { anchor: "secret", effect: "sparks", activity: "investigating", color: "#d85b4b" }
};

export const crisisPresentation = {
  defend: { mode: "barricade", color: "#d9b45f" },
  negotiate: { mode: "parley", color: "#74c7cb" },
  ambush: { mode: "ambush", color: "#d85b4b" },
  triage: { mode: "triage", color: "#79d58a" },
  ration: { mode: "ration", color: "#d9b45f" },
  blame: { mode: "accuse", color: "#d85b4b" },
  listen: { mode: "assembly", color: "#79d58a" },
  order: { mode: "cordon", color: "#d9b45f" },
  reveal: { mode: "reveal", color: "#b65fd9" },
  descend: { mode: "descent", color: "#74c7cb" },
  ritual: { mode: "ritual", color: "#d9b45f" },
  deny: { mode: "deny", color: "#9a9d97" }
};

export const npcRoutineAnchor = {
  marta: "talk",
  nando: "defend",
  leila: "scout",
  ruggero: "gather",
  ilaria: "care",
  nina: "scout"
};

export const activityLabels = {
  arriving: { it: "sta arrivando", en: "arriving" },
  observing: { it: "osserva il rione", en: "watching the district" },
  travelling: { it: "attraversa il rione", en: "crossing the district" },
  rallying: { it: "raduna il gruppo", en: "rallying the group" },
  talking: { it: "scambia parole", en: "talking" },
  trading: { it: "scambia risorse", en: "trading" },
  investigating: { it: "segue una traccia", en: "investigating" },
  crafting: { it: "prepara materiali", en: "crafting" },
  "moving with purpose": { it: "si muove con uno scopo", en: "moving with purpose" },
  "holding the line": { it: "tiene il presidio", en: "holding the line" },
  "exchanging supplies": { it: "passa le scorte", en: "exchanging supplies" },
  searching: { it: "cerca indizi", en: "searching" },
  "carrying materials": { it: "trasporta materiali", en: "carrying materials" },
  "taking position": { it: "prende posizione", en: "taking position" },
  "facing the delegation": { it: "affronta la delegazione", en: "facing the delegation" },
  "leaving the scene": { it: "raggiunge l'uscita", en: "leaving the scene" },
  "looking for news": { it: "cerca notizie", en: "looking for news" },
  "watching the border": { it: "sorveglia il confine", en: "watching the border" },
  "checking supplies": { it: "controlla le scorte", en: "checking supplies" },
  "crossing the district": { it: "percorre le strade", en: "crossing the district" },
  "exchanging news": { it: "scambia notizie", en: "exchanging news" }
};
