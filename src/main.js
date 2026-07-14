import { badges, scenes, simpleActions, strings } from "./gameData.js";
import { activityLabels, characterAssets, factionAssets } from "./worldData.js";
import { WorldRuntime } from "./worldRuntime.js";
import { ACTOR_CATEGORIES, generateActorDialogue, getActor, getActorsForScene } from "./storyActors.js";
import {
  advanceDay,
  canCraft,
  changeScene,
  craft,
  createGame,
  finishGame,
  getActiveFaction,
  getFactionActionEffects,
  getActionForecast,
  getLeaderboard,
  getScene,
  getSceneObjective,
  loadGame,
  makeDialogue,
  npcAction,
  resetGame,
  respondToFaction,
  resolveCrisis,
  saveGame,
  selectNpc,
  startCharacterTurn,
  ensureCharacterTurn,
  advanceCharacterTurn,
  applyStoryChoice,
  performSimpleAction,
  previewSimpleAction
} from "./engine.js";

const app = document.querySelector("#app");
let state = loadGame() || createGame();
if (state.phase === "game") state = ensureCharacterTurn(state, Date.now());
let audioEnabled = localStorage.getItem("ts-audio") !== "off";
let weatherAudioEnabled = localStorage.getItem("ts-weather-audio") !== "off";
let worldRuntime = null;
let interactionBusy = false;
let beatTimer = null;
let sceneBeat = null;
let highlightedFactionSequence = null;
let factionHighlightTimer = null;
let pendingHighRiskAction = null;
let simpleClock = null;
let actionCategory = "social";
let actorDialogue = null;

app.addEventListener("click", (event) => {
  const close = event.target.closest("[data-action='dismiss-world-beat']");
  if (!close) return;
  event.preventDefault();
  event.stopPropagation();
  sceneBeat = null;
  close.closest("[data-world-beat]")?.setAttribute("hidden", "");
});

app.addEventListener("pointerover", (event) => {
  const button = event.target.closest("button");
  if (!button || button.contains(event.relatedTarget)) return;
  sound.hover();
});

const sound = {
  context: null,
  master: null,
  ambient: [],
  weatherNodes: [],
  weatherType: null,
  thunderTimer: null,
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
  noise(duration = 0.22, gain = 0.035, frequency = 900, filterType = "bandpass") {
    if (!audioEnabled || !this.ensure()) return;
    const now = this.context.currentTime;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * 0.55;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(amp).connect(this.master);
    source.start(now);
  },
  loopingNoise(gain, frequency, filterType = "bandpass") {
    if (!audioEnabled || !this.ensure()) return [];
    const duration = 2;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const amp = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === "bandpass" ? 0.55 : 0.3;
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(this.master);
    source.start();
    return [source, filter, amp];
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
    this.stopWeather();
    this.ambient.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    this.ambient = [];
  },
  stopWeather() {
    window.clearInterval(this.thunderTimer);
    this.thunderTimer = null;
    this.weatherNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    this.weatherNodes = [];
    this.weatherType = null;
  },
  syncAtmosphere(type = "rain") {
    if (!audioEnabled || !this.ensure()) return;
    this.startAmbient();
    if (!weatherAudioEnabled) {
      this.stopWeather();
      return;
    }
    if (this.weatherType === type && this.weatherNodes.length) return;
    this.stopWeather();
    this.weatherType = type;
    if (type === "rain") {
      this.weatherNodes.push(...this.loopingNoise(0.032, 1750, "bandpass"));
    } else if (type === "fog") {
      this.weatherNodes.push(...this.loopingNoise(0.012, 460, "lowpass"));
      const hum = this.context.createOscillator();
      const amp = this.context.createGain();
      hum.type = "sine";
      hum.frequency.value = 69;
      amp.gain.value = 0.009;
      hum.connect(amp).connect(this.master);
      hum.start();
      this.weatherNodes.push(hum, amp);
    } else if (type === "storm") {
      this.weatherNodes.push(...this.loopingNoise(0.052, 1550, "bandpass"));
      this.weatherNodes.push(...this.loopingNoise(0.038, 360, "lowpass"));
      this.thunderTimer = window.setInterval(() => this.thunder(), 8500);
    }
  },
  ui(kind = "click") {
    const frequencies = { click: 540, tab: 460, panel: 620, close: 360 };
    this.tone(frequencies[kind] || 540, 0.075, "triangle", 0.038, kind === "close" ? 0.72 : 1.22);
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
  result(polarity) {
    if (polarity === "positive") {
      this.tone(440, 0.16, "triangle", 0.06, 1.5);
      window.setTimeout(() => this.tone(660, 0.18, "triangle", 0.052, 1.18), 90);
    } else if (polarity === "negative") {
      this.tone(190, 0.28, "sawtooth", 0.065, 0.55);
      this.noise(0.2, 0.025, 520, "lowpass");
    } else {
      this.tone(360, 0.14, "sine", 0.045, 1);
    }
  },
  thunder() {
    this.tone(58, 1.15, "sawtooth", 0.075, 0.48);
    this.noise(1.05, 0.075, 190, "lowpass");
  },
  weatherEvent(type) {
    if (!weatherAudioEnabled) return;
    this.syncAtmosphere(type);
    if (type === "storm") this.thunder();
    else if (type === "rain") this.noise(0.4, 0.028, 1800, "bandpass");
    else this.tone(110, 0.7, "sine", 0.025, 0.72);
  },
  crisis() {
    this.tone(92, 0.45, "sawtooth", 0.07, 0.72);
    this.noise(0.34, 0.045);
  }
};

if (audioEnabled) {
  window.addEventListener("pointerdown", () => sound.syncAtmosphere(state.weather?.type), { once: true });
}

function t(key) {
  return strings[state.language][key] || key;
}

function label(value) {
  return typeof value === "object" ? value[state.language] : value;
}

function activityLabel(value) {
  return activityLabels[value]?.[state.language] || value || (state.language === "it" ? "nel rione" : "in the district");
}

function setState(next) {
  const previousWeather = state.weather?.type;
  const previousResult = state.lastSimpleResult?.at;
  const previousScene = state.sceneId;
  const previousNpc = state.activeNpc;
  worldRuntime?.destroy();
  worldRuntime = null;
  state = next.phase === "game" ? ensureCharacterTurn(next, Date.now()) : next;
  if (state.sceneId !== previousScene || state.activeNpc !== previousNpc) actorDialogue = null;
  render();
  if (state.weather?.type !== previousWeather) sound.weatherEvent(state.weather.type);
  if (state.lastSimpleResult?.at && state.lastSimpleResult.at !== previousResult) sound.result(state.lastSimpleResult.polarity);
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
  const objective = safeSceneObjective();
  const turn = turnState();
  const weak = Object.entries(state.resources).sort((a, b) => a[1] - b[1])[0];
  const weakName = resourceName(weak[0]);

  if (state.phase === "crisis" && state.pendingCrisis) {
    return {
      title: state.language === "it" ? "La voce del rione" : "The district voice",
      body: state.pendingCrisis.text[state.language],
      ask: state.language === "it" ? "Scegli una risposta tattica: salverai fiducia, ordine o qualcuno in particolare?" : "Choose a tactical response: will you save trust, order, or someone specific?"
    };
  }

  const incidentTitle = localized(objective.title ?? objective.incident, nextThreat());
  const body = state.language === "it"
    ? `${scene.name.it}: ${incidentTitle}`
    : `${scene.name.en}: ${incidentTitle}`;
  const favoredAction = objective.favoredAction || "talk";
  const action = actionMeta(favoredAction);
  const progress = Number(objective.progress || 0);
  const target = Number(objective.target || 8);
  const actionName = state.language === "it" ? action.it : action.en;
  const ask = state.language === "it"
    ? `Ordine: ${npc?.name || "il gruppo"}. Azione consigliata: ${actionName}. Incidente ${progress}/${target}, ${turn.remaining} mosse.`
    : `Order: ${npc?.name || "the group"}. Recommended action: ${actionName}. Incident ${progress}/${target}, ${turn.remaining} moves.`;

  return {
    title: state.language === "it" ? "La voce del rione" : "The district voice",
    body,
    ask
  };
}

function actionMeta(action) {
  const data = {
    talk: {
      icon: '"',
      it: "Ascolta",
      en: "Listen",
      itHelp: "+info, +fiducia. Le voci iniziano a circolare.",
      enHelp: "+intel, +trust. Rumors start moving."
    },
    recruit: {
      icon: "+",
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

function safeSceneObjective() {
  try {
    return getSceneObjective(state) || {};
  } catch {
    return {};
  }
}

function safeActionForecast(action, npcId = state.activeNpc) {
  try {
    return getActionForecast(state, action, npcId) || {};
  } catch {
    return {};
  }
}

function turnState() {
  const max = Math.max(1, Number(state.turn?.max) || 4);
  const spent = Math.max(0, Number(state.turn?.spent) || 0);
  return {
    max,
    spent,
    remaining: Math.max(0, max - spent),
    progress: Number(state.turn?.sceneProgress) || 0,
    usedByNpc: state.turn?.usedByNpc || {},
    lastResult: state.turn?.lastResult || state.lastNotice || ""
  };
}

function localized(value, fallback = "") {
  if (value && typeof value === "object" && !Array.isArray(value)) return value[state.language] ?? value.it ?? value.en ?? fallback;
  return value ?? fallback;
}

function forecastRisk(forecast, action) {
  const raw = localized(forecast.risk ?? forecast.riskLabel, action === "secret" ? "alto" : "contenuto");
  return String(raw).toLowerCase();
}

function isHighRisk(forecast, action) {
  const risk = forecastRisk(forecast, action);
  return forecast.highRisk === true || Number(forecast.risk) >= 70 || /alto|high|critico|critical/.test(risk);
}

function render() {
  window.clearInterval(simpleClock);
  worldRuntime?.destroy();
  worldRuntime = null;
  app.innerHTML = `
    <main class="shell ${state.phase}">
      ${renderTopbar()}
      ${state.phase === "menu" ? renderMenu() : ""}
      ${state.phase === "landing" ? renderLanding() : ""}
      ${state.phase === "intro" ? renderIntro() : ""}
      ${state.phase === "game" ? renderGame() : ""}
      ${state.phase === "crisis" ? renderCrisis() : ""}
      ${state.phase === "end" ? renderEnd() : ""}
    </main>
  `;
  bindEvents();
  mountWorld();
  if (audioEnabled && sound.context) sound.syncAtmosphere(state.weather?.type);
  startSimpleClock();
  scheduleFactionHighlightClear();
}

function scheduleFactionHighlightClear() {
  window.clearTimeout(factionHighlightTimer);
  if (!highlightedFactionSequence) return;
  factionHighlightTimer = window.setTimeout(() => {
    highlightedFactionSequence = null;
    document.querySelectorAll(".faction-pills .shifted").forEach((button) => {
      button.classList.remove("shifted", "shift-alert", "shift-positive");
    });
  }, 2600);
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
        <button class="chip weather-audio-toggle ${weatherAudioEnabled ? "on" : ""}" data-action="weather-audio" role="switch" aria-checked="${weatherAudioEnabled}">${state.language === "it" ? "Meteo" : "Weather"} ${weatherAudioEnabled ? "on" : "off"}</button>
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
          Un rione contemporaneo resiste a pressioni, voci e invasioni. Sei ragazzi cambiano il suo destino.
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

function renderIntro() {
  const step = Math.max(0, Math.min(2, Number(state.introStep) || 0));
  const chapters = [
    {
      eyebrow: "La storia",
      title: "Testaccio rischia di spezzarsi.",
      body: "Trastevere, Centro Storico, Trullo, Roma Est e Roma Nord entrano nel rione con patti, pressioni e sfide. Teo, Edo, Jack, Marta, Miranda e Nina devono rispondere.",
      points: ["Ogni luogo crea opportunita diverse.", "Un solo quartiere rivale entra in scena.", "Una scelta puo salvare o indebolire Testaccio."]
    },
    {
      eyebrow: "Come si gioca",
      title: "Un personaggio. Due minuti. Una conseguenza.",
      body: "Hai due minuti con ogni personaggio. Puoi compiere piu azioni: ciascuna avviene subito, cambia il punteggio e produce una reazione visibile; allo scadere entra il personaggio successivo.",
      points: ["Cinque azioni alla volta, divise in quattro gruppi.", "Ogni azione si usa una volta per turno.", "Esito e punteggio compaiono immediatamente."]
    },
    {
      eyebrow: "Il tuo obiettivo",
      title: "Non lasciare che l'indicatore crolli.",
      body: "Esiste un solo punteggio: negativo, neutro o positivo. Le azioni adatte al personaggio e al luogo hanno piu possibilita di riuscire; quelle rischiose possono cambiare tutto.",
      points: ["Tre esiti negativi cumulativi fanno perdere.", "Un esito positivo riporta il rione verso l'equilibrio.", "Il risultato e sempre mostrato in una sola frase."]
    }
  ];
  const chapter = chapters[step];
  return `
    <section class="intro-screen">
      <img src="./assets/key-art.png" alt="Testaccio di notte" class="intro-art">
      <div class="intro-shade"></div>
      <article class="intro-content">
        <div class="intro-progress" aria-label="Passaggio ${step + 1} di 3">${chapters.map((_, index) => `<i class="${index <= step ? "active" : ""}"></i>`).join("")}</div>
        <p class="kicker">${chapter.eyebrow} · ${step + 1}/3</p>
        <h1>${chapter.title}</h1>
        <p class="intro-body">${chapter.body}</p>
        <ul>${chapter.points.map((point) => `<li>${point}</li>`).join("")}</ul>
        <div class="intro-actions">
          ${step > 0 ? `<button class="secondary" data-action="intro-back">Indietro</button>` : `<span></span>`}
          <button class="primary" data-action="${step === 2 ? "begin-game" : "intro-next"}">${step === 2 ? "Entra nel rione" : "Continua"}</button>
        </div>
      </article>
    </section>
  `;
}

function renderGame() {
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  const scene = getScene(state);
  const faction = activeSimpleFaction();
  const turn = state.characterTurn;
  const result = state.lastSimpleResult;
  return `
    <section class="simple-game ${state.gameLost ? "game-lost" : ""}">
      <div class="simple-layout">
        <section class="simple-stage" aria-label="${scene.name[state.language]}">
          <div class="world-mount" data-world-mount></div>
          <div class="world-loading" data-world-loading><i></i><span>${state.language === "it" ? "Il rione si sveglia" : "The district wakes"}</span></div>
          <header class="simple-hud">
            <div class="place-title"><small>${state.language === "it" ? "LUOGO" : "PLACE"}<em class="weather-badge ${state.weather?.type || "rain"}">${weatherLabel()}</em></small><strong>${scene.name[state.language]}</strong></div>
            ${renderPulseScore()}
            <div class="turn-clock running"><small>${state.language === "it" ? `TEMPO DI ${npc.name}` : `${npc.name.toUpperCase()}'S TIME`}</small><strong data-simple-clock>${formatSimpleTime((turn?.endsAt || Date.now()) - Date.now())}</strong></div>
          </header>
          ${renderStageSceneArrows()}
          <nav class="info-tabs" aria-label="Informazioni">
            <button data-simple-panel="people" title="Personaggi" aria-label="Personaggi">P</button>
            <button data-simple-panel="districts" title="Quartieri" aria-label="Quartieri">Q</button>
            <button data-simple-panel="place" title="Luogo" aria-label="Luogo">L</button>
          </nav>
          ${renderStoryCast(scene)}
          ${renderActorDialogue()}
          ${renderSimpleInfo(scene, faction)}
          ${result ? `<div class="simple-result ${result.polarity}" data-simple-result><b>${result.delta > 0 ? "+1" : result.delta < 0 ? "-1" : "0"}</b><span><small>${state.language === "it" ? "RISULTATO DELL'AZIONE" : "ACTION RESULT"}</small>${result.text[state.language]}</span><button data-action="dismiss-simple-result" aria-label="Chiudi">×</button></div>` : ""}
          ${state.gameLost ? `<div class="loss-screen"><small>TESTACCIO CEDE</small><h1>${state.language === "it" ? "Il rione si e spezzato." : "The district has broken."}</h1><button class="primary" data-action="new">${state.language === "it" ? "Ricomincia" : "Restart"}</button></div>` : ""}
          ${renderSimpleActions(npc, turn)}
        </section>
        ${renderSimpleCharacter(npc, turn, faction)}
      </div>
    </section>
  `;
}

function activeSimpleFaction() {
  const presence = (state.world?.factionPresence || []).find((item) => item.sceneId === state.sceneId && item.stance !== "retreating");
  return state.factions.find((item) => item.id === presence?.factionId) || state.factions[state.actionSequence % state.factions.length];
}

function weatherLabel() {
  const labels = {
    rain: { it: "PIOGGIA", en: "RAIN" },
    fog: { it: "NEBBIA", en: "FOG" },
    storm: { it: "TEMPORALE", en: "STORM" }
  };
  return labels[state.weather?.type || "rain"][state.language];
}

function renderPulseScore() {
  const polarity = state.pulseScore > 0 ? "positive" : state.pulseScore < 0 ? "negative" : "neutral";
  const names = state.language === "it" ? { negative: "NEGATIVO", neutral: "NEUTRO", positive: "POSITIVO" } : { negative: "NEGATIVE", neutral: "NEUTRAL", positive: "POSITIVE" };
  const value = state.pulseScore > 0 ? `+${state.pulseScore}` : String(state.pulseScore);
  return `<div class="pulse-score ${polarity}" aria-label="${names[polarity]} ${value}"><i></i><i></i><i></i><strong>${names[polarity]} · ${value}</strong></div>`;
}

function renderSimpleCharacter(npc, turn, faction) {
  const moves = turn?.usedActions?.length || 0;
  return `
    <aside class="hero-character" style="--npc-color:${npc.color}">
      <div class="hero-character-name"><small>${state.language === "it" ? "ORA TOCCA A" : "NOW PLAYING"}</small><h2>${npc.name}</h2><b>${npc.trait} · ${moves} ${state.language === "it" ? "mosse" : "moves"}</b></div>
      <img src="${characterAssets[npc.id]}" alt="${npc.name}" draggable="false">
      <footer><span>${npc.specialties.slice(0, 2).map((item) => item[state.language]).join(" · ")}</span><small>${faction.name} ${state.language === "it" ? "e in zona" : "is nearby"}</small></footer>
    </aside>`;
}

function renderSimpleActions(npc, turn) {
  const categories = {
    social: state.language === "it" ? "Sociale" : "Social",
    street: state.language === "it" ? "Strada" : "Street",
    intel: state.language === "it" ? "Indagine" : "Intel",
    field: state.language === "it" ? "Operativa" : "Field"
  };
  const actions = simpleActions.filter((item) => item.category === actionCategory);
  const previews = actions.map((action) => previewSimpleAction(state, action.id));
  const recommended = previews[0];
  return `
    <section class="simple-actions" aria-label="20 azioni di ${npc.name}">
      <div class="action-categories">${Object.entries(categories).map(([id, name]) => `<button class="${id === actionCategory ? "active" : ""}" data-action-category="${id}">${name}</button>`).join("")}</div>
      <div class="action-explanation" data-action-explanation>${renderActionExplanation(recommended)}</div>
      <div class="action-five">${actions.map((action, index) => {
        const used = turn?.usedActions?.includes(action.id);
        return `<button class="${used ? "used" : ""}" data-simple-action="${action.id}" data-action-preview="${action.id}" ${used || interactionBusy ? "disabled" : ""}><small>${used ? "✓" : String(index + 1).padStart(2, "0")}</small><b>${action.label[state.language]}</b><em>${used ? (state.language === "it" ? "gia eseguita in questo turno" : "already used this turn") : action.outcome.positive[state.language]}</em></button>`;
      }).join("")}</div>
    </section>`;
}

function renderStageSceneArrows() {
  const currentIndex = Math.max(0, scenes.findIndex((scene) => scene.id === state.sceneId));
  const previous = scenes[(currentIndex - 1 + scenes.length) % scenes.length];
  const next = scenes[(currentIndex + 1) % scenes.length];
  return `
    <button class="stage-zone-arrow previous" data-scene="${previous.id}" aria-label="${state.language === "it" ? `Vai a ${previous.name.it}` : `Go to ${previous.name.en}`}" title="${previous.name[state.language]}">‹</button>
    <button class="stage-zone-arrow next" data-scene="${next.id}" aria-label="${state.language === "it" ? `Vai a ${next.name.it}` : `Go to ${next.name.en}`}" title="${next.name[state.language]}">›</button>`;
}

function renderStoryCast(scene) {
  const roles = [
    [ACTOR_CATEGORIES.QUEST_GIVER, state.language === "it" ? "Missione" : "Quest", "!"],
    [ACTOR_CATEGORIES.COMPANION, state.language === "it" ? "Compagno" : "Companion", "+"],
    [ACTOR_CATEGORIES.ANTAGONIST, state.language === "it" ? "Antagonista" : "Antagonist", "×"],
    [ACTOR_CATEGORIES.BACKGROUND, state.language === "it" ? "Quartiere" : "Local", "·"]
  ];
  const buttons = roles.map(([category, role, glyph]) => {
    const actor = getActorsForScene(scene.id, category)[0];
    if (!actor) return "";
    const active = actorDialogue?.actor?.id === actor.id;
    return `<button class="${active ? "active" : ""}" data-story-actor="${actor.id}" title="${role}: ${actor.name}"><i>${glyph}</i><span><small>${role}</small><b>${actor.name}</b></span></button>`;
  }).join("");
  return `<section class="story-cast" aria-label="${state.language === "it" ? "Personaggi della zona" : "Local cast"}">${buttons}</section>`;
}

function renderActorDialogue() {
  if (!actorDialogue) return "";
  const { actor, response, loading } = actorDialogue;
  const role = {
    [ACTOR_CATEGORIES.QUEST_GIVER]: state.language === "it" ? "FORNITORE DI MISSIONE" : "QUEST GIVER",
    [ACTOR_CATEGORIES.COMPANION]: state.language === "it" ? "COMPAGNO" : "COMPANION",
    [ACTOR_CATEGORIES.ANTAGONIST]: state.language === "it" ? "ANTAGONISTA" : "ANTAGONIST",
    [ACTOR_CATEGORIES.BACKGROUND]: state.language === "it" ? "VOCE DEL QUARTIERE" : "LOCAL VOICE"
  }[actor.category];
  return `<section class="actor-dialogue ${actor.category}" data-actor-dialogue>
    <header><span><small>${role}</small><b>${actor.name}</b></span><button data-action="close-actor-dialogue" aria-label="Chiudi">×</button></header>
    ${loading ? `<p class="dialogue-thinking">${state.language === "it" ? "Sta osservando la situazione..." : "Reading the situation..."}</p>` : `
      <p>${response.line}</p>
      <div>${response.choices.map((choice, index) => `<button data-dialogue-choice="${index}"><b>${choice}</b></button>`).join("")}</div>
    `}
  </section>`;
}

async function runStoryActor(actorId, playerChoice = null) {
  const actor = getActor(actorId);
  if (!actor || interactionBusy) return;
  actorDialogue = { actor, loading: true, response: null };
  render();
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  const faction = activeSimpleFaction();
  const mode = actor.category === ACTOR_CATEGORIES.ANTAGONIST ? "conflict" : actor.category === ACTOR_CATEGORIES.QUEST_GIVER ? "missions" : actor.category === ACTOR_CATEGORIES.BACKGROUND ? "worldbuilding" : "emotion";
  const response = await generateActorDialogue({
    mode,
    language: state.language,
    sceneId: state.sceneId,
    activeNpc: actor.id,
    playerNpc: { id: npc.id, name: npc.name, trait: npc.trait },
    faction: { id: faction.id, name: faction.name, relation: faction.relation, pressure: faction.pressure },
    weather: state.weather,
    score: state.pulseScore,
    actionSequence: state.actionSequence,
    recentActions: state.lastSimpleResult ? [state.lastSimpleResult] : [],
    memory: state.actorMemories?.[actor.id] || [],
    activeMission: state.activeMission,
    playerProfile: state.playerProfile,
    playerChoice
  });
  actorDialogue = { actor, loading: false, response };
  render();
}

function chooseActorDialogue(index) {
  if (!actorDialogue?.response) return;
  const choice = actorDialogue.response.choices[index];
  if (!choice) return;
  const actor = actorDialogue.actor;
  const response = actorDialogue.response;
  state = applyStoryChoice(state, actor, response, choice, index, Date.now());
  sound.ui("tab");
  runStoryActor(actor.id, choice);
}

function renderActionExplanation(preview) {
  if (!preview) return "";
  const action = preview.action;
  const goal = action.outcome.positive[state.language];
  return `<span class="preview-sign">?</span><p><b>${action.label[state.language]}: ${goal}.</b><small>${preview.reason[state.language]} ${state.language === "it" ? "L'esito si scopre dopo la scelta." : "The outcome is revealed after the choice."}</small></p>`;
}

function renderSimpleInfo(scene, faction) {
  if (state.activePanel === "closed") return "";
  let content = "";
  if (state.activePanel === "people") {
    content = `<div class="simple-roster">${state.npcs.map((npc) => `<button disabled class="${npc.id === state.activeNpc ? "active" : ""}" aria-label="${npc.name}"><img src="${characterAssets[npc.id]}" alt=""><b>${npc.name}</b></button>`).join("")}</div>`;
  } else if (state.activePanel === "districts") {
    content = `<div class="simple-faction"><img src="${factionAssets[faction.id]}" alt="${faction.name}"><div><small>${faction.archetype[state.language]}</small><h3>${faction.name}</h3><p>${faction.look[state.language]}</p></div></div>`;
  } else {
    content = `<div class="simple-place"><small>${scene.anchor[state.language]}</small><h3>${scene.name[state.language]}</h3><p>${scene.rule[state.language]}</p><b>${scene.incident[state.language]}</b></div>`;
  }
  return `<aside class="simple-info"><button class="simple-info-close" data-simple-panel="closed" aria-label="Chiudi">x</button>${content}</aside>`;
}

function formatSimpleTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function startSimpleClock() {
  if (state.phase !== "game" || !state.characterTurn || state.gameLost) return;
  const tick = () => {
    if (!state.characterTurn || state.gameLost) {
      window.clearInterval(simpleClock);
      simpleClock = null;
      return;
    }
    const remaining = state.characterTurn.endsAt - Date.now();
    const target = document.querySelector("[data-simple-clock]");
    if (target) target.textContent = formatSimpleTime(remaining);
    target?.closest(".turn-clock")?.classList.toggle("urgent", remaining <= 20000);
    if (remaining <= 0) {
      window.clearInterval(simpleClock);
      simpleClock = null;
      const next = advanceCharacterTurn(state, Date.now(), true);
      if (next !== state) setState(next);
    }
  };
  tick();
  simpleClock = window.setInterval(tick, 250);
}

function nextMoveCopy(npc, objective) {
  const encounter = (state.world?.factionPresence || []).find((presence) => presence.sceneId === state.sceneId && presence.stance !== "retreating" && presence.responsePending);
  if (encounter) return state.language === "it" ? `${encounter.name} aspetta una risposta di ${npc.name}.` : `${encounter.name} is waiting for ${npc.name}'s answer.`;
  const meta = actionMeta(objective.favoredAction || "talk");
  const action = state.language === "it" ? meta.it : meta.en;
  return state.language === "it" ? `Scegli ${npc.name}, poi usa ${action}.` : `Choose ${npc.name}, then use ${action}.`;
}

function renderWorldBeat() {
  if (!sceneBeat) return `<div class="world-beat" data-world-beat hidden></div>`;
  return `
    <section class="world-beat" data-world-beat style="--beat-color:${sceneBeat.color}">
      <div><b>${sceneBeat.text}</b>${sceneBeat.detail ? `<small>${sceneBeat.detail}</small>` : ""}</div>
      <button class="world-beat-close" data-action="dismiss-world-beat" aria-label="Chiudi messaggio" title="Chiudi">×</button>
    </section>
  `;
}

function renderStatusRibbon() {
  const turn = turnState();
  const critical = Object.entries(state.resources).sort((a, b) => a[1] - b[1])[0];
  return `
    <section class="status-ribbon" aria-label="Stato della notte">
      <div class="night-marker"><small>Campagna</small><strong>NOTTE ${state.day} DI 8</strong></div>
      <div class="campaign-goal"><small>Obiettivo</small><b>${state.language === "it" ? "Salva Testaccio fino all'alba 8" : "Save Testaccio until dawn 8"}</b></div>
      <div class="action-ticks" aria-label="${turn.remaining} azioni rimaste"><small>Mosse</small><span>${Array.from({ length: turn.max }, (_, index) => `<i class="${index < turn.spent ? "spent" : ""}"></i>`).join("")}</span><b>${turn.remaining}</b></div>
      <div class="critical-resource ${critical[1] < 28 ? "danger-zone" : ""}"><small>Risorsa più fragile</small><b>${resourceName(critical[0])} ${critical[1]}</b></div>
    </section>
  `;
}

function renderCommandRail(npc) {
  const isDossier = state.activePanel !== "closed";
  const here = Object.values(state.world?.agents || {}).filter((agent) => agent.sceneId === state.sceneId).length;
  const elsewhere = Math.max(0, state.npcs.length - here);
  return `
    <aside class="command-rail" aria-label="Comandi">
      <div class="rail-toolbar">
        <div><b>${isDossier ? "Dossier" : "Comando"}</b>${!isDossier ? `<small>${here} qui · ${elsewhere} altrove</small>` : ""}</div>
        <button class="secondary dossier-toggle" data-action="dashboard">${isDossier ? "Torna ai comandi" : "Trova personaggi"}</button>
      </div>
      ${isDossier ? renderDashboard() : renderCommandContent(npc)}
    </aside>
  `;
}

function renderCommandContent(npc) {
  const scene = getScene(state);
  const objective = safeSceneObjective();
  const turn = turnState();
  const title = localized(objective.title ?? objective.incident, nextThreat());
  const stakes = localized(objective.stakes ?? objective.rule ?? objective.description, missionText());
  const target = Math.max(1, Number(objective.target ?? objective.max ?? 100));
  const progress = Math.max(0, Math.min(target, Number(objective.progress ?? turn.progress)));
  const outcome = localized(turn.lastResult?.text, state.lastNotice);
  const outcomeProgress = turn.lastResult?.progress
    ? `${state.language === "it" ? "Progresso missione" : "Mission progress"}: ${turn.lastResult.progress.from} → ${turn.lastResult.progress.to}`
    : "";
  const favoredAction = objective.favoredAction || "talk";
  const favoredMeta = actionMeta(favoredAction);
  const favoredName = state.language === "it" ? favoredMeta.it : favoredMeta.en;
  const remaining = Math.max(0, target - progress);
  const encounter = (state.world?.factionPresence || []).find((presence) => presence.sceneId === state.sceneId && presence.stance !== "retreating");
  const encounterAction = encounter?.message || "Il gruppo aspetta una risposta.";
  return `
    <section class="turn-brief">
      <span>OBIETTIVO DI ZONA</span><b>${title}</b><small>${remaining} punti mancanti · ${turn.remaining} mosse</small>
    </section>
    ${encounter ? `<section class="district-encounter active-encounter"><small>${encounter.name} · MESSAGGIO IN ARRIVO</small><b>${encounter.stance === "hostile" ? "Il gruppo chiude la strada" : "Il gruppo chiede un confronto"}</b><p>“${encounterAction}”</p>${encounter.responsePending ? `<span class="response-question">Come risponde ${npc.name}?</span><div class="encounter-responses"><button data-rival-response="negotiate" data-faction-id="${encounter.factionId}"><b>Negozia</b><small>fiducia, rischio basso</small></button><button data-rival-response="stand" data-faction-id="${encounter.factionId}"><b>Tieni il punto</b><small>coraggio, rischio medio</small></button><button data-rival-response="refuse" data-faction-id="${encounter.factionId}"><b>Rifiuta</b><small>difesa, rischio alto</small></button></div>` : `<em>Risposta data</em>`}</section>` : ""}
    <section class="selected-character" style="--npc-color:${npc.color}">
      <div class="selected-character-copy">
        <small>Personaggio selezionato</small>
        <h2>${npc.name}</h2>
        <p>${npc.trait}</p><small class="character-order">${encounter ? "Deve rispondere al gruppo" : `Azione consigliata: ${favoredName}`}</small>
        <dl>
          <div><dt>Fiducia</dt><dd>${npc.trust}</dd></div>
          <div><dt>Coraggio</dt><dd>${npc.courage}</dd></div>
          <div><dt>Paura</dt><dd>${npc.fear}</dd></div>
        </dl>
      </div>
      <img class="selected-character-fullbody" src="${characterAssets[npc.id]}" alt="${npc.name}, personaggio selezionato" draggable="false">
    </section>
    ${renderRadialActions(npc)}
    ${outcome ? `<section class="action-outcome" data-action-outcome><small>Esito dell'ultima azione</small><p>${outcome}</p>${outcomeProgress ? `<b>${outcomeProgress}</b>` : ""}</section>` : ""}
    <section class="forecast-panel" data-forecast-panel>${renderForecast(favoredAction, npc.id, true)}</section>
    <div class="inline-confirm" data-inline-confirm hidden></div>
    <div class="rail-footer"><button class="primary close-night" data-action="advance">Chiudi la notte <small>-4 cibo · pressione sui vitali</small></button></div>
  `;
}

function renderForecast(action, npcId, idle = false) {
  const forecast = safeActionForecast(action, npcId);
  const meta = actionMeta(action);
  const npc = state.npcs.find((item) => item.id === npcId);
  const name = state.language === "it" ? meta.it : meta.en;
  const changes = forecast.values || forecast.changes || forecast.effects || {};
  const entries = Array.isArray(changes) ? changes.map((value) => [value.stat, value]) : Object.entries(changes);
  const rows = entries.slice(0, 4).map(([key, value]) => {
    const current = value?.from ?? value?.current ?? state.resources[key] ?? npc?.[key];
    const predicted = value?.to ?? value?.predicted ?? value?.next ?? (typeof value === "number" && Number.isFinite(current) ? current + value : value);
    return `<span><em>${resourceName(key)}</em><b>${current ?? "-"} → ${predicted ?? "-"}</b></span>`;
  }).join("");
  const cost = forecast.costSlots ? `${forecast.costSlots} azione` : localized(forecast.cost, meta.itHelp);
  const progress = forecast.progress && typeof forecast.progress === "object" ? `${forecast.progress.from} → ${forecast.progress.to} (+${forecast.progress.delta})` : localized(forecast.progress, "+ previsto");
  return `
    <div class="forecast-head"><small>${idle ? "Passa su un'azione" : "Previsione azione"}</small><h3>${name}</h3><strong class="risk-${isHighRisk(forecast, action) ? "high" : "normal"}">Rischio ${forecastRisk(forecast, action)}</strong></div>
    <div class="forecast-facts"><span><em>Costo</em><b>${cost}</b></span><span><em>Progresso</em><b>${progress}</b></span></div>
    ${rows ? `<div class="forecast-values">${rows}</div>` : ""}
  `;
}

function renderNarrator(compact = false) {
  const copy = narratorCopy();
  if (compact) {
    const scene = getScene(state);
    const objective = safeSceneObjective();
    return `
      <section class="narrator-bar compact" aria-label="Trama corrente">
        <span><small>Ora</small><b>${scene.name[state.language]}</b></span>
        <p data-narrator-body><strong>${localized(objective.incident, copy.body)}</strong>${localized(scene.front, copy.ask)}</p>
        <span class="story-rule"><small>Regola del luogo</small><b>${localized(scene.rule)}</b></span>
        <b data-narrator-ask hidden>${copy.ask}</b>
      </section>
    `;
  }
  return `
    <section class="narrator-bar">
      <p data-narrator-body>${copy.body}</p>
      <b data-narrator-ask>${copy.ask}</b>
    </section>
  `;
}

function renderWorldInspector() {
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  return `
    <aside class="world-inspector" data-world-inspector hidden>
      <span class="portrait hero ${npc.id}" style="--tone:${npc.color}" aria-hidden="true"></span>
      <div>
        <b>${npc.name}</b>
        <small>${label(npc.role)}</small>
        <em>${state.language === "it" ? npc.trait : npc.trait}</em>
        <strong>trust ${npc.trust} · fear ${npc.fear} · courage ${npc.courage}</strong>
      </div>
    </aside>
  `;
}

function renderSceneButtons() {
  const currentIndex = Math.max(0, scenes.findIndex((scene) => scene.id === state.sceneId));
  const previous = scenes[(currentIndex - 1 + scenes.length) % scenes.length];
  const next = scenes[(currentIndex + 1) % scenes.length];
  const previousLabel = state.language === "it" ? `Zona precedente: ${previous.name.it}` : `Previous area: ${previous.name.en}`;
  const nextLabel = state.language === "it" ? `Zona successiva: ${next.name.it}` : `Next area: ${next.name.en}`;
  return `
    <button class="scene-step" data-scene="${previous.id}" aria-label="${previousLabel}" title="${previousLabel}" ${interactionBusy ? "disabled" : ""}>&lt;</button>
    <select data-scene-select aria-label="${state.language === "it" ? "Zona di Testaccio" : "Testaccio area"}" ${interactionBusy ? "disabled" : ""}>
      ${scenes.map((scene) => `<option value="${scene.id}" ${scene.id === state.sceneId ? "selected" : ""}>${scene.name[state.language]}</option>`).join("")}
    </select>
    <button class="scene-step" data-scene="${next.id}" aria-label="${nextLabel}" title="${nextLabel}" ${interactionBusy ? "disabled" : ""}>&gt;</button>
  `;
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

function renderRadialActions(npc) {
  const title = state.language === "it" ? `Azioni di ${npc.name}` : `${npc.name}'s actions`;
  return `
    <div class="action-toolbar" data-action-toolbar aria-label="${title}" style="--npc-color:${npc.color}">
      ${["talk", "recruit", "trade", "secret"].map(renderRadialAction).join("")}
    </div>
  `;
}

function renderRadialAction(action) {
  const meta = actionMeta(action);
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  const name = state.language === "it" ? meta.it : meta.en;
  const help = state.language === "it" ? meta.itHelp : meta.enHelp;
  const impact = factionImpactText(npc, action);
  return `
    <button
      class="action-button action-${action}"
      data-npc-action="${action}"
      data-preview-title="${name}"
      data-preview-help="${help}"
      data-preview-factions="${impact}"
      data-high-risk="${isHighRisk(safeActionForecast(action, npc.id), action)}"
      aria-label="${name}. ${help} ${impact}"
      title="${help} ${impact}"
      ${interactionBusy ? "disabled" : ""}
    >
      <span class="action-glyph" aria-hidden="true">${meta.icon}</span>
      <span class="action-copy"><b class="action-label">${name}</b><small>${help}</small></span>
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
  const latest = highlightedFactionSequence
    ? state.factionEvents?.find((event) => event.sequence === highlightedFactionSequence)
    : null;
  const recentEvents = latest
    ? state.factionEvents.filter((event) => event.sequence === latest.sequence)
    : [];
  return `
    <section class="faction-strip">
      <div class="faction-alert" style="--faction:${active.color}">
        <b>${active.name}</b>
        <span>${active.archetype[state.language]}</span>
        <small>${state.language === "it" ? "pressione" : "pressure"} ${active.pressure}</small>
      </div>
      <div class="faction-pills">
        ${state.factions.map((faction) => {
          const change = recentEvents.find((event) => event.id === faction.id);
          const changeClass = !change ? "" : change.pressureDelta > 0 || change.relationDelta < 0 ? "shifted shift-alert" : "shifted shift-positive";
          const changeTitle = !change ? "" : `${faction.name}: rel ${change.relationDelta > 0 ? "+" : ""}${change.relationDelta}, press ${change.pressureDelta > 0 ? "+" : ""}${change.pressureDelta}`;
          return `
          <button class="${faction.id === active.id ? "active" : ""} ${changeClass}" style="--faction:${faction.color}" data-panel="districts" ${changeTitle ? `title="${changeTitle}"` : ""}>
            <b>${faction.name}</b>
            <span>${relationLabel(faction.relation)} ${faction.relation > 0 ? "+" : ""}${faction.relation}</span>
          </button>
        `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderDashboard() {
  const allowed = ["people", "districts", "journal", "inventory"];
  if (!allowed.includes(state.activePanel)) state.activePanel = "people";
  return `
    <section class="dashboard">
      <nav class="tabs" aria-label="Sezioni dossier">
        ${[["people", "Persone"], ["districts", "Quartieri"], ["journal", "Cronaca"], ["inventory", "Scorte"]].map(([tab, text]) => `
          <button class="${state.activePanel === tab ? "active" : ""}" data-panel="${tab}">${text}</button>
        `).join("")}
      </nav>
      <div class="panel">${renderPanel()}</div>
    </section>
  `;
}

function renderPanel() {
  if (state.activePanel === "closed") return "";
  if (state.activePanel === "people") {
    return state.npcs.map((npc) => {
      const agent = state.world?.agents?.[npc.id];
      const location = scenes.find((scene) => scene.id === agent?.sceneId)?.name[state.language] || getScene(state).name[state.language];
      return `
      <button class="npc-card ${npc.id === state.activeNpc ? "active" : ""}" data-roster-npc="${npc.id}">
        <span class="portrait small ${npc.id}" style="--tone:${npc.color}" aria-hidden="true"></span>
        <div>
          <b>${npc.name}</b>
          <p>${label(npc.role)}</p>
          <small>trust ${npc.trust} / fear ${npc.fear} / courage ${npc.courage}</small>
          <small>${location} · ${agent?.activity ? activityLabel(agent.activity) : label(npc.routine)}</small>
        </div>
      </button>
    `;
    }).join("");
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
        ${Object.entries(state.inventory).map(([key, value]) => `<button data-craft="${key}" ${interactionBusy ? "disabled" : ""}><b>${key}</b><span>${value}</span></button>`).join("")}
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
      ${renderNarrator()}
      <div class="crisis-world">
        <div class="world-mount" data-world-mount></div>
        <div class="world-loading" data-world-loading><i></i><span>${state.language === "it" ? "Il confine si avvicina" : "The border approaches"}</span></div>
        <div class="world-beat" data-world-beat hidden></div>
        ${renderWorldInspector()}
      </div>
      <div class="crisis-card">
        <p class="kicker">${t("crisis")} / ${t("day")} ${state.day}</p>
        <h1>${crisis.title[state.language]}</h1>
        <p>${crisis.text[state.language]}</p>
        <div class="tactical-grid">
          ${crisis.options.map((option) => `
            <button data-crisis="${option.id}" ${interactionBusy ? "disabled" : ""}>
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

function setInteractionBusy(next) {
  interactionBusy = next;
  if (next) hideRadialPreview();
  document.querySelector(".shell")?.classList.toggle("is-directing", next);
  document.querySelectorAll("[data-npc-action], [data-simple-action], [data-crisis], [data-craft], [data-scene], [data-scene-select], [data-action='advance']")
    .forEach((control) => { control.disabled = next; });
}

function hideRadialPreview() {
  const preview = document.querySelector("[data-radial-preview]");
  if (preview) preview.hidden = true;
}

function showRadialPreview(button) {
  const preview = document.querySelector("[data-forecast-panel]");
  if (!preview || interactionBusy) return;
  preview.innerHTML = renderForecast(button.dataset.npcAction, state.activeNpc);
}

function bindRadialPreview() {
  document.querySelectorAll("[data-npc-action]").forEach((button) => {
    button.addEventListener("pointerenter", () => showRadialPreview(button));
    button.addEventListener("pointerleave", () => {});
    button.addEventListener("focus", () => showRadialPreview(button));
    button.addEventListener("blur", () => {});
  });
}

function setNarratorBeat({ text, detail = "", color = "#d9b45f" }) {
  const body = document.querySelector("[data-narrator-body]");
  const ask = document.querySelector("[data-narrator-ask]");
  const beat = document.querySelector("[data-world-beat]");
  if (body) body.textContent = text;
  if (ask && detail) ask.textContent = detail;
  sceneBeat = { text, detail, color };
  if (!beat) return;
  beat.hidden = false;
  beat.style.setProperty("--beat-color", color);
  beat.innerHTML = `<div><b>${text}</b>${detail ? `<small>${detail}</small>` : ""}</div><button class="world-beat-close" data-action="dismiss-world-beat" aria-label="Chiudi messaggio" title="Chiudi">×</button>`;
  beat.querySelector("[data-action='dismiss-world-beat']")?.addEventListener("click", () => {
    sceneBeat = null;
    beat.setAttribute("hidden", "");
  });
}

function updateWorldInspector(id) {
  const inspector = document.querySelector("[data-world-inspector]");
  if (!inspector) return;
  const npc = state.npcs.find((item) => item.id === id);
  if (!npc) {
    inspector.hidden = true;
    return;
  }
  const agent = state.world?.agents?.[id];
  inspector.hidden = false;
  inspector.innerHTML = `
    <span class="portrait hero ${npc.id}" style="--tone:${npc.color}" aria-hidden="true"></span>
    <div>
      <b>${npc.name}</b>
      <small>${label(npc.role)}</small>
      <em>${npc.trait} · ${activityLabel(agent?.activity)}</em>
      <strong>trust ${npc.trust} · fear ${npc.fear} · courage ${npc.courage}</strong>
    </div>
  `;
}

function mountWorld() {
  const mount = document.querySelector("[data-world-mount]");
  if (!mount || !["game", "crisis"].includes(state.phase)) return;
  const scene = getScene(state);
  worldRuntime = new WorldRuntime({
    mount,
    state,
    scene,
    mode: state.phase,
    onSelect: (id) => {
      if (interactionBusy || state.phase !== "game" || id === state.activeNpc) return;
      worldRuntime?.snapshot();
      sound.ui();
      setState(selectNpc(state, id));
    },
    onHover: (id) => {
      if (!interactionBusy) updateWorldInspector(id);
    },
    onBeat: setNarratorBeat,
    onImpact: ({ type }) => {
      if (type === "crisis") sound.crisis();
      else sound.ui();
    },
    onSnapshot: (world) => {
      state.world = world;
      saveGame(state);
    },
    onReady: () => {
      document.querySelector("[data-world-loading]")?.classList.add("loaded");
      mount.classList.add("ready");
    }
  });
  worldRuntime.start().catch(() => {
    const loading = document.querySelector("[data-world-loading]");
    if (loading) loading.textContent = state.language === "it" ? "La scena non riesce a caricarsi." : "The scene could not load.";
  });
}

async function runNpcCommand(action) {
  if (interactionBusy || !worldRuntime) return;
  const npc = state.npcs.find((item) => item.id === state.activeNpc);
  const meta = actionMeta(action);
  const success = action !== "secret" || npc.trust + state.resources.intel + npc.courage > 112;
  const actionLabel = state.language === "it" ? meta.it : meta.en;
  const factionInfluence = factionImpactText(npc, action);
  const impactText = factionInfluence ? `${actionLabel}: ${factionInfluence}` : actionLabel;
  setInteractionBusy(true);
  sound.action(action);
  try {
    await worldRuntime.playNpcAction(action, { language: state.language, impactText, success });
    const next = npcAction(state, action);
    highlightedFactionSequence = next.factionEvents?.[0]?.sequence || null;
    interactionBusy = false;
    setState(next);
  } catch {
    setInteractionBusy(false);
  }
}

async function runSimpleCommand(actionId) {
  if (interactionBusy || state.gameLost) return;
  if (!state.characterTurn || Date.now() >= state.characterTurn.endsAt) {
    setState(advanceCharacterTurn(state, Date.now(), true));
    return;
  }
  const action = simpleActions.find((item) => item.id === actionId);
  if (!action || state.characterTurn.usedActions?.includes(actionId)) return;
  const preview = previewSimpleAction(state, actionId);
  const sign = preview.delta > 0 ? "+1" : preview.delta < 0 ? "-1" : "0";
  setInteractionBusy(true);
  sound.action(action.kind);
  try {
    await worldRuntime?.playSimpleAction(action.id, { label: action.label[state.language], polarity: preview.polarity, score: sign });
  } finally {
    interactionBusy = false;
  }
  setState(performSimpleAction(state, actionId, Date.now()));
}

async function runFactionResponse(response, factionId) {
  if (interactionBusy || !worldRuntime) return;
  const presence = state.world?.factionPresence?.find((item) => item.factionId === factionId && item.sceneId === state.sceneId);
  if (!presence) return;
  setInteractionBusy(true);
  sound.action(response === "negotiate" ? "talk" : "recruit");
  try {
    await worldRuntime.playFactionResponse(response, presence, { language: state.language });
    interactionBusy = false;
    setState(respondToFaction(state, factionId, response));
  } catch {
    setInteractionBusy(false);
  }
}

async function runCraftCommand(item) {
  if (interactionBusy || !worldRuntime) return;
  if (!canCraft(state, item)) {
    setState(craft(state, item));
    return;
  }
  setInteractionBusy(true);
  sound.ui();
  try {
    await worldRuntime.playCraft(item, { language: state.language });
    const next = craft(state, item);
    interactionBusy = false;
    setState(next);
  } catch {
    setInteractionBusy(false);
  }
}

async function runCrisisCommand(optionId) {
  if (interactionBusy || !worldRuntime) return;
  const option = state.pendingCrisis?.options.find((item) => item.id === optionId);
  setInteractionBusy(true);
  sound.crisis();
  try {
    await worldRuntime.playCrisis(optionId, { language: state.language, label: option?.[state.language] || optionId });
    const next = resolveCrisis(state, optionId);
    interactionBusy = false;
    setState(next);
  } catch {
    setInteractionBusy(false);
  }
}

async function runSceneChange(sceneId) {
  if (interactionBusy || !worldRuntime || sceneId === state.sceneId) return;
  const target = scenes.find((scene) => scene.id === sceneId);
  if (!target) return;
  setInteractionBusy(true);
  sound.scene();
  try {
    await worldRuntime.playSceneTransition(target, state.language);
    const next = changeScene(state, sceneId);
    interactionBusy = false;
    setState(next);
  } catch {
    setInteractionBusy(false);
  }
}

async function runAdvance() {
  if (interactionBusy) return;
  if (!worldRuntime) {
    setState(advanceDay(state));
    return;
  }
  setInteractionBusy(true);
  if (state.day % 2 === 0) sound.crisis();
  else sound.scene();
  try {
    const next = advanceDay(state);
    interactionBusy = false;
    setState(next);
  } catch {
    setInteractionBusy(false);
  }
}

function bindEvents() {
  bindRadialPreview();
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
  document.querySelectorAll("[data-simple-action]").forEach((button) => {
    button.addEventListener("click", () => runSimpleCommand(button.dataset.simpleAction));
  });
  document.querySelectorAll("[data-story-actor]").forEach((button) => {
    button.addEventListener("click", () => runStoryActor(button.dataset.storyActor));
  });
  document.querySelectorAll("[data-dialogue-choice]").forEach((button) => {
    button.addEventListener("click", () => chooseActorDialogue(Number(button.dataset.dialogueChoice)));
  });
  document.querySelectorAll("[data-action-preview]").forEach((button) => {
    const showPreview = () => {
      const target = document.querySelector("[data-action-explanation]");
      const preview = previewSimpleAction(state, button.dataset.actionPreview);
      if (target && preview) target.innerHTML = renderActionExplanation(preview);
    };
    button.addEventListener("pointerenter", showPreview);
    button.addEventListener("focus", showPreview);
  });
  document.querySelectorAll("[data-action-category]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.ui("tab");
      actionCategory = button.dataset.actionCategory;
      render();
    });
  });
  document.querySelectorAll("[data-simple-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      sound.ui("panel");
      state.activePanel = button.dataset.simplePanel;
      saveGame(state);
      render();
    });
  });
  document.querySelectorAll("[data-npc-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.npcAction;
      if (button.dataset.highRisk === "true" && pendingHighRiskAction !== action) {
        pendingHighRiskAction = action;
        const confirm = document.querySelector("[data-inline-confirm]");
        if (confirm) {
          confirm.hidden = false;
          confirm.innerHTML = `<p><b>Rischio alto.</b> Questa scelta puo peggiorare fiducia e pressione sociale.</p><div><button class="secondary" data-cancel-risk>Annulla</button><button class="danger" data-confirm-risk="${action}">Conferma ${button.dataset.previewTitle}</button></div>`;
          confirm.querySelector("[data-cancel-risk]")?.addEventListener("click", () => { pendingHighRiskAction = null; confirm.hidden = true; });
          confirm.querySelector("[data-confirm-risk]")?.addEventListener("click", () => { pendingHighRiskAction = null; runNpcCommand(action); });
        }
        return;
      }
      pendingHighRiskAction = null;
      runNpcCommand(action);
    });
  });
  document.querySelectorAll("[data-rival-response]").forEach((button) => {
    button.addEventListener("click", () => runFactionResponse(button.dataset.rivalResponse, button.dataset.factionId));
  });
  document.querySelectorAll("[data-crisis]").forEach((button) => {
    button.addEventListener("click", () => runCrisisCommand(button.dataset.crisis));
  });
  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      worldRuntime?.snapshot();
      state.activePanel = button.dataset.panel;
      saveGame(state);
      render();
    });
  });
  document.querySelectorAll("[data-roster-npc]").forEach((button) => {
    button.addEventListener("click", () => {
      if (interactionBusy) return;
      worldRuntime?.snapshot();
      sound.ui();
      setState(selectNpc(state, button.dataset.rosterNpc));
    });
  });
  document.querySelectorAll("[data-craft]").forEach((button) => {
    button.addEventListener("click", () => runCraftCommand(button.dataset.craft));
  });
  document.querySelectorAll("[data-scene]").forEach((button) => {
    button.addEventListener("click", () => runSceneChange(button.dataset.scene));
  });
  document.querySelector("[data-scene-select]")?.addEventListener("change", (event) => {
    runSceneChange(event.currentTarget.value);
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
  if (action !== "advance") worldRuntime?.snapshot();
  if (!["audio", "weather-audio"].includes(action)) sound.ui();
  if (action === "audio") {
    audioEnabled = !audioEnabled;
    localStorage.setItem("ts-audio", audioEnabled ? "on" : "off");
    if (audioEnabled) {
      sound.syncAtmosphere(state.weather?.type);
      sound.scene();
    } else {
      sound.stopAmbient();
    }
    render();
  }
  if (action === "weather-audio") {
    weatherAudioEnabled = !weatherAudioEnabled;
    localStorage.setItem("ts-weather-audio", weatherAudioEnabled ? "on" : "off");
    if (weatherAudioEnabled && audioEnabled) sound.syncAtmosphere(state.weather?.type);
    else sound.stopWeather();
    render();
  }
  if (action === "menu") setState({ ...state, phase: "menu" });
  if (action === "landing") setState({ ...state, phase: "landing" });
  if (action === "dismiss-world-beat") {
    sceneBeat = null;
    document.querySelector("[data-world-beat]")?.setAttribute("hidden", "");
  }
  if (action === "dismiss-simple-result") {
    state.lastSimpleResult = null;
    saveGame(state);
    render();
  }
  if (action === "close-actor-dialogue") {
    actorDialogue = null;
    render();
  }
  if (action === "play") setState({ ...state, phase: state.finished ? "menu" : "game" });
  if (action === "intro-next") setState({ ...state, introStep: Math.min(2, (Number(state.introStep) || 0) + 1) });
  if (action === "intro-back") setState({ ...state, introStep: Math.max(0, (Number(state.introStep) || 0) - 1) });
  if (action === "begin-game") {
    const next = { ...state, phase: "game", introStep: 2, introSeen: true };
    setState(startCharacterTurn(next, Date.now()));
  }
  if (action === "continue") setState(loadGame() || state);
  if (action === "dashboard") setState({ ...state, activePanel: state.activePanel === "closed" ? "people" : "closed" });
  if (action === "close-dashboard") setState({ ...state, activePanel: "closed" });
  if (action === "toggle-lang") {
    state.language = state.language === "it" ? "en" : "it";
    saveGame(state);
    render();
  }
  if (action === "advance") {
    runAdvance();
  }
  if (action === "finish") {
    sound.crisis();
    setState(finishGame(state));
  }
  if (action === "new") setState(resetGame(state.language, state.player || "Ospite"));
}

render();
