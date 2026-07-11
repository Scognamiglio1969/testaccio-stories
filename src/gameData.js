export const MAX_DAY = 8;

export const strings = {
  it: {
    play: "Entra nel quartiere",
    continue: "Continua",
    landing: "Landing",
    newGame: "Nuova partita",
    save: "Salva",
    dashboard: "Dossier",
    close: "Chiudi",
    day: "Giorno",
    score: "Punteggio",
    talk: "Parla",
    recruit: "Coinvolgi",
    trade: "Scambia",
    secret: "Indaga",
    next: "Avanza",
    crisis: "Crisi",
    map: "Mappa",
    people: "Persone",
    journal: "Diario",
    inventory: "Inventario",
    ranks: "Classifica",
    districts: "Quartieri",
    settings: "Lingua",
    final: "Finale",
    feedback: "Lascia un segnale",
    login: "Firma il registro",
    namePlaceholder: "Nome giocatore",
    saved: "Salvataggio scritto nei registri del rione.",
    emptyJournal: "Il quartiere aspetta la tua prima scelta.",
    gameOver: "La stagione si chiude stanotte."
  },
  en: {
    play: "Enter the district",
    continue: "Continue",
    landing: "Landing",
    newGame: "New game",
    save: "Save",
    dashboard: "Dossier",
    close: "Close",
    day: "Day",
    score: "Score",
    talk: "Talk",
    recruit: "Rally",
    trade: "Trade",
    secret: "Probe",
    next: "Advance",
    crisis: "Crisis",
    map: "Map",
    people: "People",
    journal: "Journal",
    inventory: "Inventory",
    ranks: "Leaderboard",
    districts: "Districts",
    settings: "Language",
    final: "Ending",
    feedback: "Leave a signal",
    login: "Sign the register",
    namePlaceholder: "Player name",
    saved: "Save written into the district records.",
    emptyJournal: "The district is waiting for your first choice.",
    gameOver: "The season closes tonight."
  }
};

export const resources = {
  food: 48,
  money: 38,
  health: 56,
  stability: 44,
  intel: 24,
  defense: 30,
  trust: 42
};

export const scenes = [
  {
    id: "piazza",
    image: "./assets/testaccio-map.png",
    name: { it: "Piazza dei Cocci", en: "Shards Square" },
    phase: { it: "Piazza centrale: tutti sentono tutto, anche quando fingono di no.", en: "Central square: everyone hears everything, even when they pretend not to." },
    lore: { it: "Sotto l'asfalto: cocci, cantine, promesse non mantenute.", en: "Under the asphalt: shards, cellars, broken promises." },
    player: [47, 54],
    positions: {
      marta: [36, 58],
      nando: [58, 46],
      leila: [49, 70],
      ruggero: [25, 35],
      ilaria: [67, 64]
    }
  },
  {
    id: "vicoli",
    image: "./assets/scene-vicoli.png",
    name: { it: "Vicoli del Mattatoio", en: "Slaughterhouse Alleys" },
    phase: { it: "Vicoli stretti: le voci rimbalzano sui muri prima delle persone.", en: "Tight alleys: rumors hit the walls before people do." },
    lore: { it: "Odore di bar chiusi, panni umidi, passi dietro le persiane.", en: "Closed bars, damp laundry, footsteps behind shutters." },
    player: [44, 58],
    positions: {
      marta: [31, 48],
      nando: [58, 63],
      leila: [42, 72],
      ruggero: [22, 30],
      ilaria: [72, 45]
    }
  },
  {
    id: "ponte",
    image: "./assets/scene-ponte.png",
    name: { it: "Ponte Testaccio", en: "Testaccio Bridge" },
    phase: { it: "Ponte Testaccio: dall'altra sponda arrivano fari, cori e richieste.", en: "Testaccio Bridge: headlights, chants, and demands arrive from the far bank." },
    lore: { it: "Il confine del rione non e una linea: e una decisione.", en: "The district border is not a line: it is a decision." },
    player: [48, 55],
    positions: {
      marta: [35, 61],
      nando: [63, 50],
      leila: [44, 38],
      ruggero: [25, 67],
      ilaria: [72, 62]
    }
  },
  {
    id: "lupa",
    image: "./assets/scene-lupa.png",
    name: { it: "Il Muro della Lupa", en: "The She-Wolf Wall" },
    phase: { it: "Muro della Lupa: qualcuno ha dipinto protezione, qualcun altro minaccia.", en: "She-Wolf Wall: someone painted protection, someone else reads threat." },
    lore: { it: "La lupa guarda il cortile. Di notte sembra scegliere da che parte stare.", en: "The she-wolf watches the courtyard. At night she seems to choose a side." },
    player: [46, 62],
    positions: {
      marta: [28, 58],
      nando: [57, 70],
      leila: [42, 42],
      ruggero: [70, 37],
      ilaria: [66, 57]
    }
  },
  {
    id: "monte",
    image: "./assets/scene-monte-cocci.png",
    name: { it: "Monte dei Cocci", en: "Shard Hill" },
    phase: { it: "Monte dei Cocci: ogni frammento sembra una prova lasciata da qualcuno.", en: "Shard Hill: every fragment feels like evidence left by someone." },
    lore: { it: "Una collina costruita di anfore rotte, con una croce in cima e troppi sussurri sotto.", en: "A hill built from broken amphorae, with a cross on top and too many whispers beneath." },
    player: [50, 58],
    positions: {
      marta: [34, 62],
      nando: [62, 58],
      leila: [48, 38],
      ruggero: [28, 45],
      ilaria: [70, 40]
    }
  },
  {
    id: "piazzatestaccio",
    image: "./assets/scene-piazza-testaccio.png",
    name: { it: "Piazza Testaccio", en: "Testaccio Square" },
    phase: { it: "Piazza Testaccio: la fontana sente promesse, bugie e tregue fragili.", en: "Testaccio Square: the fountain hears promises, lies, and fragile truces." },
    lore: { it: "La fontana e il centro del respiro pubblico: chi parla qui non resta segreto a lungo.", en: "The fountain is the center of public breath: what is said here does not stay secret long." },
    player: [50, 56],
    positions: {
      marta: [30, 54],
      nando: [63, 49],
      leila: [46, 70],
      ruggero: [35, 36],
      ilaria: [69, 66]
    }
  },
  {
    id: "palazzo",
    image: "./assets/scene-palazzo.png",
    name: { it: "Il Palazzo", en: "The Rooftop" },
    phase: { it: "Il Palazzo: dal terrazzo si vede Roma intera, ma anche chi sta salendo le scale.", en: "The Rooftop: from here you see all Rome, and also who is climbing the stairs." },
    lore: { it: "Antenne, panni stesi, vasi spaccati: il rione visto dall'alto sembra piu fragile.", en: "Antennas, laundry, cracked pots: from above the district looks more fragile." },
    player: [48, 58],
    positions: {
      marta: [28, 60],
      nando: [66, 63],
      leila: [52, 42],
      ruggero: [36, 36],
      ilaria: [71, 44]
    }
  },
  {
    id: "mercato",
    image: "./assets/scene-mercato.png",
    name: { it: "Mercato Chiuso", en: "Closed Market" },
    phase: { it: "Mercato Testaccio dopo la chiusura: cassette vuote, neon accesi, accordi sottovoce.", en: "Testaccio Market after closing: empty crates, live neon, whispered deals." },
    lore: { it: "Qui il cibo diventa potere, e il potere passa di mano prima dell'alba.", en: "Here food becomes power, and power changes hands before dawn." },
    player: [48, 58],
    positions: {
      marta: [32, 46],
      nando: [60, 62],
      leila: [44, 72],
      ruggero: [25, 66],
      ilaria: [70, 44]
    }
  },
  {
    id: "mattatoio",
    image: "./assets/scene-mattatoio.png",
    name: { it: "Mattatoio Notturno", en: "Night Slaughterhouse" },
    phase: { it: "Mattatoio Notturno: cultura, ferro, memoria del lavoro e corridoi che non finiscono.", en: "Night Slaughterhouse: culture, iron, labor memory, and corridors that do not end." },
    lore: { it: "Il vecchio lavoro non e sparito: ha cambiato stanza, luci e linguaggio.", en: "The old labor did not vanish: it changed rooms, lights, and language." },
    player: [47, 56],
    positions: {
      marta: [31, 57],
      nando: [66, 58],
      leila: [50, 39],
      ruggero: [26, 38],
      ilaria: [72, 70]
    }
  },
  {
    id: "sottoponte",
    image: "./assets/scene-sotto-ponte.png",
    name: { it: "Sotto il Ponte", en: "Under the Bridge" },
    phase: { it: "Sotto il Ponte: il fiume porta via le parole, ma lascia i segni sui muri.", en: "Under the Bridge: the river carries words away, but leaves marks on walls." },
    lore: { it: "Scale umide, archi, acqua scura: il confine vero non e sopra, e sotto.", en: "Wet stairs, arches, dark water: the real border is not above, but below." },
    player: [51, 58],
    positions: {
      marta: [35, 62],
      nando: [67, 51],
      leila: [48, 39],
      ruggero: [25, 55],
      ilaria: [72, 68]
    }
  }
];

export const metrics = {
  survivors: 5,
  secrets: 0,
  wealth: 38,
  chaos: 28,
  morality: 50,
  courage: 36,
  challenge: 34
};

export const factions = [
  {
    id: "trastevere",
    name: "Trastevere",
    archetype: { it: "fratelli/nemici", en: "siblings/enemies" },
    description: {
      it: "Ti assomigliano troppo: possono coprirti le spalle o colpirti dove fa piu male.",
      en: "Too much like you: they can cover your back or hit where it hurts."
    },
    relation: 8,
    pressure: 38,
    color: "#d7a45e"
  },
  {
    id: "centro",
    name: "Centro Storico",
    archetype: { it: "i radical", en: "the radicals" },
    description: {
      it: "Parlano di principi, assemblee e purezza. Aiutano solo se la storia sembra giusta.",
      en: "They speak in principles, assemblies, and purity. They help only if the story feels right."
    },
    relation: -4,
    pressure: 44,
    color: "#b65fd9"
  },
  {
    id: "trullo",
    name: "Trullo",
    archetype: { it: "le bande", en: "the crews" },
    description: {
      it: "Rapidi, pratici, territoriali. Rispetto e paura viaggiano insieme.",
      en: "Fast, practical, territorial. Respect and fear travel together."
    },
    relation: -18,
    pressure: 62,
    color: "#d95d50"
  },
  {
    id: "romaest",
    name: "Roma Est",
    archetype: { it: "i rossi", en: "the reds" },
    description: {
      it: "Reti, collettivi, rabbia organizzata. Possono portare piazza o incendio.",
      en: "Networks, collectives, organized anger. They can bring a crowd or a fire."
    },
    relation: 2,
    pressure: 50,
    color: "#cf3f37"
  },
  {
    id: "romanord",
    name: "Roma Nord",
    archetype: { it: "fighetti", en: "posh kids" },
    description: {
      it: "Soldi, accessi, sorrisi puliti. Ti comprano prima di dichiararsi nemici.",
      en: "Money, access, clean smiles. They buy you before calling themselves enemies."
    },
    relation: -10,
    pressure: 36,
    color: "#6fb8c4"
  }
];

export const npcs = [
  {
    id: "marta",
    name: "Teo",
    role: { it: "Teen osservatore, memoria del gruppo", en: "Teen observer, group memory" },
    x: 36,
    y: 58,
    color: "#d95d50",
    trait: "attento",
    routine: { it: "Gira tra bar chiusi, cortili e fermate, annotando chi mente.", en: "Moves between closed bars, courtyards, and stops, noting who lies." },
    secret: { it: "Ha registrato una notte al Ponte Testaccio che nessuno vuole riascoltare.", en: "Recorded a night at Testaccio Bridge nobody wants to hear again." },
    evolution: { it: "Puo diventare la coscienza del gruppo o vendere una verita per salvarsi.", en: "Can become the group's conscience or sell a truth to survive." },
    leverage: {
      talk: { trastevere: [3, -1], centro: [1, 0] },
      secret: { centro: [2, 1], romaest: [1, 0] }
    },
    trust: 52,
    fear: 32,
    courage: 40,
    morality: 58,
    relation: { nando: 12, leila: 8, ruggero: 15, ilaria: 18 },
    memory: []
  },
  {
    id: "nando",
    name: "Edo",
    role: { it: "Teen atletico, difesa impulsiva", en: "Athletic teen, impulsive defense" },
    x: 58,
    y: 46,
    color: "#b24f32",
    trait: "reattivo",
    routine: { it: "Taglia per i vicoli, controlla il ponte, sfida chi alza la voce.", en: "Cuts through alleys, watches the bridge, challenges loud threats." },
    secret: { it: "Conosce due ragazzi del quartiere rivale e non lo ha detto agli altri.", en: "Knows two kids from the rival district and never told the others." },
    evolution: { it: "Puo proteggere il gruppo o trasformare la paura in dominio.", en: "Can protect the group or turn fear into control." },
    leverage: {
      recruit: { trullo: [-3, 4], romaest: [-1, 1] },
      talk: { trastevere: [2, -1] }
    },
    trust: 44,
    fear: 44,
    courage: 68,
    morality: 42,
    relation: { marta: 12, leila: -6, ruggero: 6, ilaria: 10 },
    memory: []
  },
  {
    id: "leila",
    name: "Jack",
    role: { it: "Teen outsider, rete e radio", en: "Outsider teen, network and radio" },
    x: 49,
    y: 70,
    color: "#69b77f",
    trait: "spigoloso",
    routine: { it: "Sale sui muretti, intercetta chat vocali, prova a far parlare le radio.", en: "Climbs low walls, catches voice chats, tries to wake the radios." },
    secret: { it: "Ha trovato un accesso sotto i cocci usando una mappa rubata.", en: "Found a route under the shards with a stolen map." },
    evolution: { it: "Puo collegare i ragazzi del rione o accendere la rivolta.", en: "Can connect the district kids or ignite the revolt." },
    leverage: {
      talk: { centro: [2, -1], romaest: [2, -1] },
      secret: { romaest: [4, -2], romanord: [-1, 1] }
    },
    trust: 46,
    fear: 38,
    courage: 54,
    morality: 64,
    relation: { marta: 8, nando: -6, ruggero: 4, ilaria: 8 },
    memory: []
  },
  {
    id: "ruggero",
    name: "Marta",
    role: { it: "Teen organizzatrice, assemblee e muri", en: "Teen organizer, assemblies and walls" },
    x: 25,
    y: 35,
    color: "#d7b35e",
    trait: "determinata",
    routine: { it: "Convoca ragazzi al Muro della Lupa e tiene insieme chi litiga.", en: "Calls kids to the She-Wolf Wall and keeps arguments from breaking open." },
    secret: { it: "Sa chi ha dipinto la lupa e perche e comparsa proprio ora.", en: "Knows who painted the she-wolf and why it appeared now." },
    evolution: { it: "Puo guidare una comunita o diventare il volto di una fazione.", en: "Can lead a community or become the face of a faction." },
    leverage: {
      talk: { centro: [3, -1], romaest: [1, -1] },
      recruit: { romaest: [4, -3], trullo: [-1, 2] }
    },
    trust: 38,
    fear: 50,
    courage: 28,
    morality: 48,
    relation: { marta: 15, nando: 6, leila: 4, ilaria: 2 },
    memory: []
  },
  {
    id: "ilaria",
    name: "Miranda",
    role: { it: "Teen silenziosa, cura e segreti", en: "Quiet teen, care and secrets" },
    x: 67,
    y: 64,
    color: "#6fb8c4",
    trait: "impenetrabile",
    routine: { it: "Porta kit nello zaino, disegna la lupa, sparisce nei cortili.", en: "Carries kits in her backpack, sketches the she-wolf, disappears into courtyards." },
    secret: { it: "Ha visto chi ha lasciato i primi segni sotto il ponte.", en: "Saw who left the first marks under the bridge." },
    evolution: { it: "Puo salvare il gruppo o scegliere il silenzio quando serve parlare.", en: "Can save the group or choose silence when speech is needed." },
    leverage: {
      trade: { romanord: [3, -2], trastevere: [1, -1] },
      secret: { trullo: [2, -1], centro: [-1, 1] }
    },
    trust: 50,
    fear: 30,
    courage: 46,
    morality: 72,
    relation: { marta: 18, nando: 10, leila: 8, ruggero: 2 },
    memory: []
  }
];

export const crises = [
  {
    id: "raid",
    title: { it: "La ronda del quartiere rivale", en: "The rival district patrol" },
    text: { it: "Arrivano caschi, motorini e sorrisi falsi. Cercano cibo e nomi.", en: "Helmets, scooters, false smiles. They want food and names." },
    options: [
      { id: "defend", it: "Difendere la piazza", en: "Defend the square", effects: { defense: -8, stability: 8, trust: 6, chaos: -4, courage: 8, challenge: 8 } },
      { id: "negotiate", it: "Negoziare uno scambio", en: "Negotiate a trade", effects: { food: -8, intel: 6, stability: 4, morality: 4, challenge: 5 } },
      { id: "ambush", it: "Tendere una trappola", en: "Set a trap", effects: { intel: -6, defense: 10, trust: -4, chaos: 6, courage: 10, challenge: 10 } }
    ]
  },
  {
    id: "fever",
    title: { it: "Febbre nei cortili", en: "Fever in the courtyards" },
    text: { it: "Le scale odorano di disinfettante. Qualcuno accusa Miranda di nascondere i kit.", en: "Stairs smell of disinfectant. Someone says Miranda is hiding kits." },
    options: [
      { id: "triage", it: "Aprire un triage comune", en: "Open a shared triage", effects: { health: 10, money: -6, trust: 8, chaos: -5, morality: 8 } },
      { id: "ration", it: "Razionare i medicinali", en: "Ration medicine", effects: { health: 4, stability: 6, trust: -6, morality: -7, challenge: 6 } },
      { id: "blame", it: "Cercare un colpevole", en: "Find someone to blame", effects: { stability: -4, trust: -8, chaos: 10, intel: 8, morality: -9 } }
    ]
  },
  {
    id: "assembly",
    title: { it: "Assemblea sotto i poster strappati", en: "Assembly under torn posters" },
    text: { it: "Marta chiama tutti in piazza. Edo teme che sia l'inizio di una resa dei conti.", en: "Marta calls everyone to the square. Edo fears a reckoning." },
    options: [
      { id: "listen", it: "Far parlare tutti", en: "Let everyone speak", effects: { trust: 9, stability: -3, intel: 5, chaos: 2, morality: 7 } },
      { id: "order", it: "Imporre un comitato", en: "Impose a committee", effects: { stability: 10, trust: -7, defense: 5, chaos: -4, morality: -5 } },
      { id: "reveal", it: "Rivelare un segreto", en: "Reveal a secret", effects: { intel: -5, trust: 4, stability: -6, secrets: 1, courage: 7, challenge: 9 } }
    ]
  },
  {
    id: "shards",
    title: { it: "I cocci cantano sotto l'asfalto", en: "The shards sing under asphalt" },
    text: { it: "Di notte il quartiere sente un rumore antico. I rivali lo usano come propaganda.", en: "At night the district hears an ancient sound. Rivals turn it into propaganda." },
    options: [
      { id: "descend", it: "Scendere nelle cantine", en: "Go into the cellars", effects: { intel: 10, secrets: 1, courage: 8, health: -4, challenge: 10 } },
      { id: "ritual", it: "Inventare un rito comune", en: "Invent a shared rite", effects: { trust: 10, stability: 5, morality: 3, chaos: -3, money: -4 } },
      { id: "deny", it: "Negare tutto pubblicamente", en: "Publicly deny everything", effects: { stability: 6, trust: -8, intel: -5, chaos: 5, morality: -4 } }
    ]
  }
];

export const badges = [
  { id: "keeper", it: "Custode del Rione", en: "District Keeper", test: (s) => s.resources.trust >= 60 && s.resources.stability >= 55 },
  { id: "rumor", it: "Lingua Lunga", en: "Long Tongue", test: (s) => s.gossip.length >= 5 },
  { id: "nobody", it: "Nessuno Resta Indietro", en: "No One Left Behind", test: (s) => s.metrics.survivors === 5 && s.resources.health >= 45 },
  { id: "order", it: "Il Prezzo dell'Ordine", en: "The Price of Order", test: (s) => s.resources.stability >= 70 && s.resources.trust < 45 },
  { id: "shards", it: "Sotto i Cocci", en: "Under the Shards", test: (s) => s.metrics.secrets >= 2 },
  { id: "alive", it: "Tradito ma Vivo", en: "Betrayed but Alive", test: (s) => s.gossip.some((g) => g.tone === "distorted") && s.metrics.survivors > 0 }
];

export const leaderboardSeed = [
  { name: "Le scale B", score: 7420, ending: "Salvezza comunitaria" },
  { name: "Radio Cortile", score: 6810, ending: "Controllo autoritario" },
  { name: "Sotto i Cocci", score: 6330, ending: "Salvezza comunitaria" }
];
