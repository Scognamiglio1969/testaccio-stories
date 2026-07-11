import { badges, scenes, strings } from "./gameData.js";
import {
  advanceDay,
  changeScene,
  craft,
  createGame,
  finishGame,
  getActiveFaction,
  getFactionActionEffects,
  getLeaderboard,
  getScene,
  loadGame,
  makeDialogue,
  npcAction,
  resetGame,
  resolveCrisis,
  saveGame,
  selectNpc
} from "./engine.js";

const app = document.querySelector("#app");
let state = loadGame() || createGame();
let audioEnabled = localStorage.getItem("ts-audio") === "on";

const sound = {
  context: null,
  master: null,
  ambient: [],
  ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") this.context.resume();
    return true;
  },
  tone(freq, duration = 0.12, type = "sine", gain = 0.08, bend = 1) {
    if (!audioEnabled || !this.ensure()) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const amp = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * bend), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.018);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  },
  noise(duration = 0.22, gain = 0.035) {
    if (!audioEnabled || !this.ensure()) return;
    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.55;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(amp).connect(this.master);
    source.start(now);
  },
  startAmbient() {
    if (!audioEnabled || !this.ensure() || this.ambient.length) return;
    [55, 82.5].forEach((freq, index) => {
      const osc = this.context.createOscillator();
      const amp = this.context.createGain();
      osc.type = index ? "triangle" : "sine";
      osc.frequency.value = freq;
      amp.gain.value = index ? 0.018 : 0.026;
      osc.connect(amp).connect(this.master);
      osc.start();
      this.ambient.push(osc, amp);
    });
  },
  stopAmbient() {
    this.ambient.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    this.ambient = [];
  },
  ui() {
    this.tone(540, 0.08, "triangle", 0.045, 1.25);
  },
  hover() {
    this.tone(720, 0.055, "sine", 0.024, 1.08);
  },
  scene() {
    this.tone(180, 0.18, "sawtooth", 0.04, 0.62);
    this.tone(360, 0.22, "triangle", 0.035, 1.4);
  },
  action(action) {
    const tones = { talk: 420, recruit: 220, trade: 520, secret: 145 };
    this.tone(tones[action] || 330, 0.16, action === "secret" ? "sawtooth" : "triangle", 0.06, action === "secret" ? 0.5 : 1.2);
    if (action === "secret") this.noise(0.18, 0.028);
  },
  crisis() {
    this.tone(92, 0.45, "sawtooth", 0.07, 0.72);
    this.noise(0.34, 0.045);
  }
};

if (audioEnabled) {
  window.addEventListener("pointerdown", () => sound.startAmbient(), { once: true });
}

function t(key) {
  return strings[state.language][key] || key;
}

function label(value) {
  return typeof value === "object" ? value[state.language] : value;
}

function setState(next) {
  state = next;
  render();
}

function resourceIcon(key) {
  return {
    food: "F",
    money: "$",
    health: "+",
    stability: "=",
    intel: "?",
    defense: "^",
    trust: "%"
  }[key];
}

function metricName(key) {
  const names = {
    survivors: ["sopravvissuti", "survivors"],
    secrets: ["segreti", "secrets"],
    wealth: ["ricchezza", "wealth"],
    chaos: ["caos", "chaos"],
    morality: ["moralita", "morality"],
    courage: ["coraggio", "courage"],
    challenge: ["sfida", "challenge"]
  };
  return names[key]?.[state.language === "it" ? 0 : 1] || key;
}

function resourceName(key) {
  const names = {
    food: ["cibo", "food"],
    money: ["denaro", "money"],
    health: ["salute", "health"],
    stability: ["stabilita", "stability"],
    intel: ["info", "intel"],
    defense: ["difesa", "defense"],
    trust: ["fiducia", "trust"]
  };
  return names[key]?.[state.language === "it" ? 0 : 1] || key;
}

function missionText() {
  if (state.language === "en") {
    return "Survive until night 8. Keep health, stability, trust and defense alive before the rival districts break the square.";
  }
  return "Resisti fino alla notte 8. Tieni vive salute, stabilita, fiducia e difesa prima che i quartieri rivali spezzino la piazza.";
}

function nextThreat() {
  const scene = getScene(state);
  if (state.day % 2 === 0) return state.language === "it" ? `Crisi a ${scene.name.it}: scegli cosa proteggere.` : `Crisis at ${scene.name.en}: choose what to protect.`;
  return scene.phase[state.language];
}

function narratorCopy() {
  const scene = getScene(state);
  const faction = getActiveFaction(state);
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  const weak = Object.entries(state.resources).sort((a, b) => a[1] - b[1])[0];
  const weakName = resourceName(weak[0]);

  if (state.phase === "crisis" && state.pendingCrisis) {
    return {
      title: state.language === "it" ? "La voce del rione" : "The district voice",
      body: state.pendingCrisis.text[state.language],
      ask: state.language === "it" ? "Scegli una risposta tattica: salverai fiducia, ordine o qualcuno in particolare?" : "Choose a tactical response: will you save trust, order, or someone specific?"
    };
  }

  const body = state.language === "it"
    ? `${scene.name.it}. ${scene.lore.it} ${faction.name} osserva il rione: ${faction.archetype.it}, pressione ${faction.pressure}. ${npc?.name || "Qualcuno"} aspetta una scelta.`
    : `${scene.name.en}. ${scene.lore.en} ${faction.name} is watching the district: ${faction.archetype.en}, pressure ${faction.pressure}. ${npc?.name || "Someone"} is waiting for a choice.`;
  const ask = state.language === "it"
    ? `Obiettivo: resisti ${Math.max(0, 9 - state.day)} notti. Risorsa fragile: ${weakName} ${weak[1]}.`
    : `Goal: survive ${Math.max(0, 9 - state.day)} nights. Fragile resource: ${weakName} ${weak[1]}.`;

  return {
    title: state.language === "it" ? "La voce del rione" : "The district voice",
    body,
    ask
  };
}

function actionMeta(action) {
  const data = {
    talk: {
      icon: "!",
      it: "Ascolta",
      en: "Listen",
      itHelp: "+info, +fiducia. Le voci iniziano a circolare.",
      enHelp: "+intel, +trust. Rumors start moving."
    },
    recruit: {
      icon: "^",
      it: "Raduna",
      en: "Rally",
      itHelp: "+difesa, +coraggio, -cibo.",
      enHelp: "+defense, +courage, -food."
    },
    trade: {
      icon: "$",
      it: "Scambia",
      en: "Trade",
      itHelp: "+cibo, +relazione, -denaro.",
      enHelp: "+food, +relationship, -money."
    },
    secret: {
      icon: "?",
      it: "Scava",
      en: "Probe",
      itHelp: "Rischioso: puo sbloccare segreti o creare sospetto.",
      enHelp: "Risky: may reveal secrets or create suspicion."
    }
  };
  return data[action];
}

function factionName(id) {
  return state.factions.find((faction) => faction.id === id)?.name || id;
}

function factionImpactText(npc, action) {
  const success = action !== "secret" || npc.trust + state.resources.intel + npc.courage > 112;
  const effects = getFactionActionEffects(npc, action, success);
  if (!effects.length) return "";
  return effects
    .map((effect) => {
      const relation = effect.relation ? `rel ${effect.relation > 0 ? "+" : ""}${effect.relation}` : "";
      const pressure = effect.pressure ? `press ${effect.pressure > 0 ? "+" : ""}${effect.pressure}` : "";
      return `${factionName(effect.id)} ${[relation, pressure].filter(Boolean).join(" / ")}`;
    })
    .join(" · ");
}

function render() {
  app.innerHTML = `
    <main class="shell ${state.phase}">
      ${renderTopbar()}
      ${state.phase === "menu" ? renderMenu() : ""}
      ${state.phase === "landing" ? renderLanding() : ""}
      ${state.phase === "game" ? renderGame() : ""}
      ${state.phase === "crisis" ? renderCrisis() : ""}
      ${state.phase === "end" ? renderEnd() : ""}
    </main>
  `;
  bindEvents();
}

function renderTopbar() {
  return `
    <header class="topbar">
      <button class="brand" data-action="menu" aria-label="Testaccio Stories">
        <span class="brand-mark">TS</span>
        <span><b>Testaccio</b><small>Stories</small></span>
      </button>
      <div class="top-actions">
        <button class="chip audio-toggle ${audioEnabled ? "on" : ""}" data-action="audio">${audioEnabled ? "Suono" : "Muto"}</button>
        <button class="chip" data-action="landing">${t("landing")}</button>
        <button class="icon-button" data-action="toggle-lang">${state.language.toUpperCase()}</button>
      </div>
    </header>
  `;
}

function renderMenu() {
  const hasSave = Boolean(loadGame());
  return `
    <section class="menu-screen">
      <img src="./assets/key-art.png" class="hero-art" alt="" />
      <div class="hero-vignette"></div>
      <div class="hero-copy">
        <p class="kicker">Social horror isometrico per laptop</p>
        <h1>Testaccio Stories</h1>
        <p>
          Un rione contemporaneo resiste a fame, voci, paura e invasioni. Cinque persone ricordano ogni scelta.
        </p>
        <form class="login-card" data-form="login">
          <label>${t("login")}</label>
          <input name="player" maxlength="20" placeholder="${t("namePlaceholder")}" value="${state.player || ""}" />
          <div class="button-row">
            <button class="primary" type="submit">${t("play")}</button>
            ${hasSave ? `<button class="secondary" type="button" data-action="continue">${t("continue")}</button>` : ""}
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderLanding() {
  return `
    <section class="landing-screen">
      <div class="landing-hero">
        <img src="./assets/key-art.png" alt="" />
        <div>
          <p class="kicker">Laptop-first, community-ready</p>
          <h1>Salva il rione prima che si spezzi.</h1>
          <p>
            Parla, scambia, difendi, indaga. Ogni NPC conserva memoria, diffonde voci e cambia posizione sociale.
          </p>
          <div class="button-row">
            <button class="primary" data-action="play">${t("play")}</button>
            <button class="secondary" data-action="dashboard">${t("dashboard")}</button>
          </div>
        </div>
      </div>
      <div class="feature-grid">
        <article><b>NPC vivi</b><span>fiducia, paura, routine, relazioni, segreti.</span></article>
        <article><b>Crisi tattiche</b><span>negozia, difendi, tendi trappole, cura.</span></article>
        <article><b>Finali multipli</b><span>salvezza, controllo, collasso sociale.</span></article>
        <article><b>Pubblicabile</b><span>static hosting gratuito, adapter backend pronto.</span></article>
      </div>
      <form class="signal" data-form="feedback">
        <label>${t("feedback")}</label>
        <input name="feedback" placeholder="email, Discord o nota" value="${state.feedback || ""}" />
        <button class="secondary" type="submit">OK</button>
      </form>
    </section>
  `;
}

function renderGame() {
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  const scene = getScene(state);
  return `
    <section class="game-screen">
      ${renderNarrator()}
      ${renderMission()}
      ${renderResources()}
      ${renderFactionStrip()}
      <section class="map-stage" aria-label="${t("map")}">
        <img class="district-art" src="${scene.image}" alt="" />
        <div class="map-skyline"></div>
        <div class="threat-ribbon">${nextThreat()}</div>
        <div class="scene-switcher">${renderSceneButtons()}</div>
        <div class="lore-ribbon">${scene.lore[state.language]}</div>
        ${renderCharacterFocus(npc)}
        <div class="district-grid">
          ${renderBuildings()}
          <button class="player-token walker" style="left:${scene.player[0]}%;top:${scene.player[1]}%;--delay:80ms" aria-label="player"></button>
          ${state.npcs.map(renderNpcToken).join("")}
        </div>
        <div class="street-label">${scene.name[state.language]}</div>
      </section>
      <section class="bottom-sheet">
        <div class="sheet-handle"></div>
        <div class="npc-header">
          <span class="portrait ${npc.id}" style="--tone:${npc.color}" aria-hidden="true"></span>
          <div>
            <h2>${npc.name}</h2>
            <p>${label(npc.role)}</p>
          </div>
          <button class="icon-button" data-action="dashboard" aria-label="${t("dashboard")}">+</button>
        </div>
        ${renderNpcVitals(npc)}
        <p class="dialogue">${makeDialogue(state, npc)}</p>
        <div class="choice-grid">
          ${["talk", "recruit", "trade", "secret"].map(renderActionButton).join("")}
        </div>
        <div class="button-row">
          <button class="secondary" data-action="save">${t("save")}</button>
          <button class="primary" data-action="advance">${state.day % 2 === 0 ? t("crisis") : t("next")}</button>
        </div>
        ${state.lastNotice ? `<p class="notice">${state.lastNotice}</p>` : ""}
      </section>
      ${renderDashboard()}
    </section>
  `;
}

function renderNarrator() {
  const copy = narratorCopy();
  return `
    <section class="narrator-bar">
      <span>${copy.title}</span>
      <p>${copy.body}</p>
      <b>${copy.ask}</b>
    </section>
  `;
}

function renderCharacterFocus(npc) {
  return `
    <aside class="character-focus">
      <span class="portrait hero ${npc.id}" style="--tone:${npc.color}" aria-hidden="true"></span>
      <div>
        <b>${npc.name}</b>
        <small>${label(npc.role)}</small>
        <em>${state.language === "it" ? npc.trait : npc.trait}</em>
        <strong>${leverageSummary(npc)}</strong>
      </div>
    </aside>
  `;
}

function leverageSummary(npc) {
  const ids = [...new Set(Object.values(npc.leverage || {}).flatMap((entry) => Object.keys(entry)))];
  if (!ids.length) return "";
  const names = ids.map(factionName).join(", ");
  return state.language === "it" ? `Leve: ${names}` : `Levers: ${names}`;
}

function renderSceneButtons() {
  return scenes.map((scene) => `
    <button class="${scene.id === state.sceneId ? "active" : ""}" data-scene="${scene.id}">
      ${scene.name[state.language]}
    </button>
  `).join("");
}

function renderMission() {
  return `
    <section class="mission-card">
      <div>
        <p class="kicker">${t("day")} ${state.day}/8 · ${state.player} · ${t("score")} ${previewScore()}</p>
        <h1>${state.language === "it" ? "Salva la piazza" : "Save the square"}</h1>
        <p>${missionText()}</p>
      </div>
      <div class="countdown">
        <span>${Math.max(0, 9 - state.day)}</span>
        <small>${state.language === "it" ? "notti" : "nights"}</small>
      </div>
    </section>
  `;
}

function renderNpcVitals(npc) {
  return `
    <div class="npc-vitals">
      ${[
        ["trust", npc.trust],
        ["fear", npc.fear],
        ["courage", npc.courage]
      ].map(([key, value]) => `
        <span><b>${key}</b><i style="--value:${value}%"></i><em>${value}</em></span>
      `).join("")}
    </div>
  `;
}

function renderActionButton(action) {
  const meta = actionMeta(action);
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  return `
    <button class="action-card" data-npc-action="${action}">
      <span class="action-icon">${meta.icon}</span>
      <b>${state.language === "it" ? meta.it : meta.en}</b>
      <small>${state.language === "it" ? meta.itHelp : meta.enHelp}</small>
      <em>${factionImpactText(npc, action)}</em>
    </button>
  `;
}

function renderResources() {
  return `
    <div class="resources">
      ${Object.entries(state.resources)
        .map(([key, value]) => `
          <div class="resource ${value < 28 ? "danger-zone" : ""}">
            <i>${resourceIcon(key)}</i>
            <span>${resourceName(key)}</span>
            <b>${value}</b>
            <em style="--value:${value}%"></em>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function relationLabel(value) {
  if (value >= 35) return state.language === "it" ? "alleati" : "allies";
  if (value >= 8) return state.language === "it" ? "aperti" : "open";
  if (value > -15) return state.language === "it" ? "tesi" : "tense";
  if (value > -40) return state.language === "it" ? "ostili" : "hostile";
  return state.language === "it" ? "nemici" : "enemies";
}

function renderFactionStrip() {
  const active = getActiveFaction(state);
  return `
    <section class="faction-strip">
      <div class="faction-alert" style="--faction:${active.color}">
        <b>${active.name}</b>
        <span>${active.archetype[state.language]}</span>
        <small>${state.language === "it" ? "pressione" : "pressure"} ${active.pressure}</small>
      </div>
      <div class="faction-pills">
        ${state.factions.map((faction) => `
          <button class="${faction.id === active.id ? "active" : ""}" style="--faction:${faction.color}" data-panel="districts">
            <b>${faction.name}</b>
            <span>${relationLabel(faction.relation)} ${faction.relation > 0 ? "+" : ""}${faction.relation}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderBuildings() {
  const buildings = [
    ["bar", 24, 55], ["mercato", 56, 35], ["clinica", 68, 62], ["cantina", 24, 30],
    ["muro", 45, 72], ["confine", 77, 42], ["cortile", 42, 45], ["cocci", 17, 68]
  ];
  return buildings.map(([name, x, y], index) => `<span class="building b${index}" style="left:${x}%;top:${y}%">${name}</span>`).join("");
}

function renderNpcToken(npc) {
  const scene = getScene(state);
  const position = scene.positions[npc.id] || [npc.x, npc.y];
  const delay = (state.npcs.findIndex((item) => item.id === npc.id) + 1) * 95;
  return `
    <button class="npc-token walker ${state.activeNpc === npc.id ? "selected" : ""} ${npc.fear > 55 ? "afraid" : ""}" data-npc="${npc.id}" style="left:${position[0]}%;top:${position[1]}%;--tone:${npc.color};--delay:${delay}ms" aria-label="${npc.name}">
      <span class="token-face ${npc.id}"></span>
      <small>${npc.name}</small>
      <span class="hover-card">
        <span class="portrait small ${npc.id}" aria-hidden="true"></span>
        <b>${npc.name}</b>
        <em>${label(npc.role)}</em>
        <i>trust ${npc.trust} · fear ${npc.fear} · courage ${npc.courage}</i>
      </span>
    </button>
  `;
}

function renderDashboard() {
  return `
    <aside class="dashboard ${state.activePanel === "closed" ? "closed" : ""}">
      <div class="dash-head">
        <b>${t("dashboard")}</b>
        <button class="icon-button" data-action="close-dashboard">x</button>
      </div>
      <nav class="tabs">
        ${["map", "people", "districts", "journal", "inventory", "ranks", "settings"].map((tab) => `
          <button class="${state.activePanel === tab ? "active" : ""}" data-panel="${tab}">${t(tab)}</button>
        `).join("")}
      </nav>
      <div class="panel">${renderPanel()}</div>
    </aside>
  `;
}

function renderPanel() {
  if (state.activePanel === "closed") return "";
  if (state.activePanel === "people") {
    return state.npcs.map((npc) => `
      <article class="npc-card">
        <span class="portrait small ${npc.id}" style="--tone:${npc.color}" aria-hidden="true"></span>
        <div>
          <b>${npc.name}</b>
          <p>${label(npc.role)}</p>
          <small>trust ${npc.trust} / fear ${npc.fear} / courage ${npc.courage}</small>
          <small>${label(npc.routine)}</small>
        </div>
      </article>
    `).join("");
  }
  if (state.activePanel === "districts") {
    return `
      <div class="system-note">
        <b>${state.language === "it" ? "Regola sociale" : "Social rule"}</b>
        <span>${state.language === "it" ? "I personaggi non muovono tutti gli stessi quartieri: scegli chi parla, con chi tratta e chi espone un segreto." : "Characters do not move the same districts: choose who speaks, trades, or exposes a secret."}</span>
      </div>
      ${state.factions.map((faction) => `
        <article class="faction-card" style="--faction:${faction.color}">
          <div>
            <b>${faction.name}</b>
            <span>${faction.archetype[state.language]}</span>
          </div>
          <p>${faction.description[state.language]}</p>
          <div class="faction-bars">
            <label>${state.language === "it" ? "relazione" : "relation"} <i>${faction.relation}</i></label>
            <em class="relation" style="--value:${Math.max(0, faction.relation + 50)}%"></em>
            <label>${state.language === "it" ? "pressione" : "pressure"} <i>${faction.pressure}</i></label>
            <em class="pressure" style="--value:${faction.pressure}%"></em>
          </div>
        </article>
      `).join("")}
      <h3>${state.language === "it" ? "Ultimi movimenti" : "Recent movements"}</h3>
      ${(state.factionEvents || []).map((event) => `
        <p class="faction-event">
          <b>${event.name}</b>
          <span>${event.npc || "Rione"} · ${event.action || "crisi"}</span>
          <i>rel ${event.relationDelta > 0 ? "+" : ""}${event.relationDelta} / press ${event.pressureDelta > 0 ? "+" : ""}${event.pressureDelta}</i>
        </p>
      `).join("") || `<p class="log">${state.language === "it" ? "Ancora nessun movimento registrato." : "No movements recorded yet."}</p>`}
    `;
  }
  if (state.activePanel === "journal") {
    const journal = state.journal.length ? state.journal : [{ day: state.day, it: t("emptyJournal"), en: t("emptyJournal") }];
    return `
      ${journal.slice(0, 8).map((item) => `<p class="log"><b>${t("day")} ${item.day}</b>${item[state.language]}</p>`).join("")}
      <h3>Gossip</h3>
      ${state.gossip.map((item) => `<p class="log">${item[state.language]}</p>`).join("") || "<p class='log'>Silenzio sospetto.</p>"}
    `;
  }
  if (state.activePanel === "inventory") {
    return `
      <div class="craft-grid">
        ${Object.entries(state.inventory).map(([key, value]) => `<button data-craft="${key}"><b>${key}</b><span>${value}</span></button>`).join("")}
      </div>
      <p class="hint">Barricate aumentano difesa, kit migliorano salute, radio amplificano fiducia e informazioni.</p>
      ${Object.entries(state.metrics).map(([key, value]) => `<p class="meter"><span>${metricName(key)}</span><b>${value}</b></p>`).join("")}
    `;
  }
  if (state.activePanel === "ranks") {
    return `
      ${getLeaderboard(state).map((row, index) => `<p class="rank"><b>#${index + 1} ${row.name}</b><span>${row.score}</span><small>${row.ending}</small></p>`).join("")}
      <h3>Badge</h3>
      <div class="badges">${badges.map((badge) => `<span class="${state.badges.includes(badge.id) ? "won" : ""}">${badge[state.language]}</span>`).join("")}</div>
    `;
  }
  if (state.activePanel === "settings") {
    return `
      <button class="secondary wide" data-action="toggle-lang">${state.language === "it" ? "English" : "Italiano"}</button>
      <button class="secondary wide" data-action="finish">${t("gameOver")}</button>
      <button class="danger wide" data-action="new">${t("newGame")}</button>
    `;
  }
  return `<p class="hint">Passa sui personaggi per leggerli meglio. Clicca per portarli nel pannello azioni.</p>`;
}

function renderCrisis() {
  const crisis = state.pendingCrisis;
  return `
    <section class="crisis-screen">
      <div class="crisis-card">
        <p class="kicker">${t("crisis")} / ${t("day")} ${state.day}</p>
        <h1>${crisis.title[state.language]}</h1>
        <p>${crisis.text[state.language]}</p>
        <div class="tactical-grid">
          ${crisis.options.map((option) => `
            <button data-crisis="${option.id}">
              <b>${option[state.language]}</b>
              <small>${effectPreview(option.effects)}</small>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderEnd() {
  const endingTitle = state.ending?.[state.language] || "";
  const endingText = state.language === "it" ? state.ending?.textIt : state.ending?.textEn;
  return `
    <section class="end-screen">
      <img src="./assets/key-art.png" alt="" />
      <div class="end-card">
        <p class="kicker">${t("final")}</p>
        <h1>${endingTitle}</h1>
        <p>${endingText}</p>
        <div class="score-ring"><span>${state.score}</span><small>${t("score")}</small></div>
        <div class="badges">${badges.map((badge) => `<span class="${state.badges.includes(badge.id) ? "won" : ""}">${badge[state.language]}</span>`).join("")}</div>
        <div class="button-row">
          <button class="primary" data-action="new">${t("newGame")}</button>
          <button class="secondary" data-action="landing">${t("landing")}</button>
        </div>
      </div>
    </section>
  `;
}

function previewScore() {
  return Math.round(state.resources.trust * 12 + state.resources.stability * 12 + state.metrics.survivors * 400);
}

function effectPreview(effects) {
  return Object.entries(effects).map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`).join(" / ");
}

function bindEvents() {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
  document.querySelectorAll("[data-npc]").forEach((button) => {
    button.addEventListener("mouseenter", () => sound.hover());
    button.addEventListener("focus", () => sound.hover());
    button.addEventListener("click", () => {
      sound.ui();
      setState(selectNpc(state, button.dataset.npc));
    });
  });
  document.querySelectorAll("[data-npc-action]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.action(button.dataset.npcAction);
      setState(npcAction(state, button.dataset.npcAction));
    });
  });
  document.querySelectorAll("[data-crisis]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.crisis();
      setState(resolveCrisis(state, button.dataset.crisis));
    });
  });
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePanel = button.dataset.panel;
      saveGame(state);
      render();
    });
  });
  document.querySelectorAll("[data-craft]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.ui();
      setState(craft(state, button.dataset.craft));
    });
  });
  document.querySelectorAll("[data-scene]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.scene();
      setState(changeScene(state, button.dataset.scene));
    });
  });
  document.querySelector('[data-form="login"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState(resetGame(state.language, form.get("player")?.toString().trim() || "Ospite"));
  });
  document.querySelector('[data-form="feedback"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.feedback = form.get("feedback")?.toString() || "";
    localStorage.setItem("mdq-feedback", state.feedback);
    saveGame(state);
    render();
  });
}

function handleAction(action) {
  if (action !== "audio") sound.ui();
  if (action === "audio") {
    audioEnabled = !audioEnabled;
    localStorage.setItem("ts-audio", audioEnabled ? "on" : "off");
    if (audioEnabled) {
      sound.startAmbient();
      sound.scene();
    } else {
      sound.stopAmbient();
    }
    render();
  }
  if (action === "menu") setState({ ...state, phase: "menu" });
  if (action === "landing") setState({ ...state, phase: "landing" });
  if (action === "play") setState({ ...state, phase: state.finished ? "menu" : "game" });
  if (action === "continue") setState(loadGame() || state);
  if (action === "dashboard") setState({ ...state, activePanel: state.activePanel === "closed" ? "people" : state.activePanel });
  if (action === "close-dashboard") setState({ ...state, activePanel: "closed" });
  if (action === "toggle-lang") {
    state.language = state.language === "it" ? "en" : "it";
    saveGame(state);
    render();
  }
  if (action === "save") {
    state.lastNotice = t("saved");
    saveGame(state);
    render();
  }
  if (action === "advance") {
    if (state.day % 2 === 0) sound.crisis();
    else sound.scene();
    setState(advanceDay(state));
  }
  if (action === "finish") {
    sound.crisis();
    setState(finishGame(state));
  }
  if (action === "new") setState(resetGame(state.language, state.player || "Ospite"));
}

render();
