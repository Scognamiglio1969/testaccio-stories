export const WORLD_VERSION = 4;

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
      west: [0.08, 0.72], bar: [0.2, 0.61], fountain: [0.48, 0.61], market: [0.57, 0.39], clinic: [0.68, 0.5],
      wall: [0.66, 0.72], gate: [0.86, 0.65], north: [0.5, 0.25], cellar: [0.34, 0.77], south: [0.49, 0.88]
    },
    [["west", "bar"], ["bar", "fountain"], ["bar", "cellar"], ["cellar", "south"], ["south", "fountain"], ["fountain", "market"], ["fountain", "wall"], ["market", "north"], ["market", "clinic"], ["clinic", "gate"], ["wall", "gate"]],
    { talk: "bar", gather: "fountain", trade: "market", defend: "gate", secret: "cellar", care: "clinic", scout: "north", exit: "gate" }
  ),
  vicoli: makeGraph(
    {
      west: [0.08, 0.76], corner: [0.22, 0.66], laundry: [0.32, 0.43], junction: [0.48, 0.61], bar: [0.58, 0.48],
      stairs: [0.7, 0.38], arch: [0.84, 0.57], drain: [0.62, 0.78], cellar: [0.36, 0.8], north: [0.48, 0.27]
    },
    [["west", "corner"], ["corner", "laundry"], ["corner", "cellar"], ["laundry", "junction"], ["cellar", "junction"], ["junction", "bar"], ["junction", "drain"], ["bar", "stairs"], ["bar", "arch"], ["stairs", "north"], ["drain", "arch"]],
    { talk: "bar", gather: "junction", trade: "corner", defend: "arch", secret: "cellar", care: "laundry", scout: "stairs", exit: "arch" }
  ),
  ponte: makeGraph(
    {
      west: [0.08, 0.77], stairs: [0.23, 0.66], landing: [0.38, 0.61], bridge: [0.55, 0.48], lamp: [0.66, 0.42],
      east: [0.9, 0.35], river: [0.48, 0.66], lookout: [0.36, 0.53], barricade: [0.73, 0.59], south: [0.44, 0.76]
    },
    [["west", "stairs"], ["stairs", "landing"], ["stairs", "south"], ["landing", "bridge"], ["landing", "river"], ["landing", "lookout"], ["bridge", "lamp"], ["bridge", "barricade"], ["lamp", "east"], ["barricade", "east"], ["river", "south"]],
    { talk: "landing", gather: "bridge", trade: "stairs", defend: "barricade", secret: "lookout", care: "south", scout: "lookout", exit: "east" }
  ),
  lupa: makeGraph(
    {
      west: [0.09, 0.73], court: [0.3, 0.64], mural: [0.49, 0.58], bench: [0.58, 0.65], gate: [0.84, 0.63],
      stairs: [0.69, 0.55], alley: [0.25, 0.57], drain: [0.43, 0.76], roof: [0.52, 0.5], south: [0.66, 0.8]
    },
    [["west", "court"], ["court", "alley"], ["court", "bench"], ["court", "drain"], ["alley", "mural"], ["mural", "stairs"], ["mural", "roof"], ["bench", "gate"], ["bench", "south"], ["stairs", "gate"], ["drain", "south"]],
    { talk: "bench", gather: "mural", trade: "court", defend: "gate", secret: "drain", care: "south", scout: "stairs", exit: "gate" }
  ),
  monte: makeGraph(
    {
      west: [0.08, 0.78], base: [0.25, 0.7], bend: [0.38, 0.6], ridge: [0.5, 0.48], cross: [0.53, 0.25],
      east: [0.87, 0.69], cave: [0.4, 0.77], terrace: [0.68, 0.52], path: [0.7, 0.34], south: [0.63, 0.87]
    },
    [["west", "base"], ["base", "bend"], ["base", "cave"], ["bend", "ridge"], ["ridge", "cross"], ["ridge", "terrace"], ["terrace", "path"], ["path", "cross"], ["terrace", "east"], ["terrace", "south"], ["cave", "south"]],
    { talk: "base", gather: "ridge", trade: "terrace", defend: "east", secret: "cave", care: "south", scout: "cross", exit: "east" }
  ),
  piazzatestaccio: makeGraph(
    {
      west: [0.08, 0.72], cafe: [0.23, 0.58], fountain: [0.5, 0.58], kiosk: [0.65, 0.44], east: [0.9, 0.64],
      arcade: [0.3, 0.36], north: [0.51, 0.26], steps: [0.71, 0.7], drain: [0.4, 0.78], south: [0.55, 0.88]
    },
    [["west", "cafe"], ["cafe", "fountain"], ["cafe", "arcade"], ["arcade", "north"], ["north", "fountain"], ["fountain", "kiosk"], ["fountain", "drain"], ["kiosk", "east"], ["kiosk", "steps"], ["steps", "east"], ["steps", "south"], ["drain", "south"]],
    { talk: "cafe", gather: "fountain", trade: "kiosk", defend: "east", secret: "drain", care: "steps", scout: "north", exit: "east" }
  ),
  palazzo: makeGraph(
    {
      door: [0.09, 0.76], laundry: [0.25, 0.64], table: [0.43, 0.61], antenna: [0.57, 0.39], ledge: [0.76, 0.48],
      stairs: [0.85, 0.72], tank: [0.33, 0.38], hatch: [0.53, 0.78], lookout: [0.72, 0.27], south: [0.68, 0.86]
    },
    [["door", "laundry"], ["laundry", "table"], ["laundry", "tank"], ["tank", "antenna"], ["table", "antenna"], ["table", "hatch"], ["antenna", "lookout"], ["antenna", "ledge"], ["ledge", "stairs"], ["hatch", "south"], ["south", "stairs"]],
    { talk: "table", gather: "antenna", trade: "laundry", defend: "stairs", secret: "hatch", care: "south", scout: "lookout", exit: "stairs" }
  ),
  mercato: makeGraph(
    {
      west: [0.08, 0.72], crates: [0.22, 0.66], aisle: [0.39, 0.55], stall: [0.56, 0.46], office: [0.7, 0.36],
      gate: [0.88, 0.62], freezer: [0.37, 0.78], loading: [0.7, 0.72], roof: [0.54, 0.28], south: [0.55, 0.88]
    },
    [["west", "crates"], ["crates", "aisle"], ["crates", "freezer"], ["aisle", "stall"], ["aisle", "roof"], ["stall", "office"], ["stall", "loading"], ["office", "gate"], ["loading", "gate"], ["freezer", "south"], ["south", "loading"]],
    { talk: "aisle", gather: "stall", trade: "crates", defend: "gate", secret: "freezer", care: "office", scout: "roof", exit: "gate" }
  ),
  mattatoio: makeGraph(
    {
      west: [0.08, 0.73], yard: [0.24, 0.63], rails: [0.42, 0.54], hall: [0.57, 0.47], gallery: [0.67, 0.31],
      gate: [0.89, 0.64], tunnel: [0.38, 0.78], workshop: [0.7, 0.71], tower: [0.48, 0.26], south: [0.58, 0.88]
    },
    [["west", "yard"], ["yard", "rails"], ["yard", "tunnel"], ["rails", "hall"], ["rails", "tower"], ["hall", "gallery"], ["hall", "workshop"], ["gallery", "gate"], ["workshop", "gate"], ["tunnel", "south"], ["south", "workshop"]],
    { talk: "yard", gather: "hall", trade: "workshop", defend: "gate", secret: "tunnel", care: "south", scout: "tower", exit: "gate" }
  ),
  sottoponte: makeGraph(
    {
      west: [0.08, 0.72], arch: [0.23, 0.62], landing: [0.4, 0.56], fire: [0.56, 0.62], stairs: [0.7, 0.58],
      east: [0.9, 0.65], river: [0.48, 0.68], tunnel: [0.31, 0.72], lookout: [0.56, 0.54], south: [0.7, 0.76]
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
