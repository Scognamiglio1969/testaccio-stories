import { actionPresentation, activityLabels, characterAssets, characterProfiles, crisisPresentation, factionVisuals, npcRoutineAnchor, sceneGraphs, sceneProfiles, sceneTransitionContract } from "./worldData.js";
import { hydrateWorldState, setAgentDestination } from "./worldState.js";
import { scenes } from "./gameData.js";

const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const copy = (value) => JSON.parse(JSON.stringify(value));
const sharedImageCache = new Map();

function npcReaction(npc, action, language = "it") {
  const lines = {
    marta: {
      talk: ["Teo lascia parlare tutti, poi ricompone i pezzi.", "Teo lets everyone speak, then puts the pieces together."],
      recruit: ["Teo chiama i nomi uno per uno: nessuno resta fuori.", "Teo calls each name: nobody is left out."],
      trade: ["Teo controlla il patto due volte prima di annuire.", "Teo checks the deal twice before nodding."],
      secret: ["Teo segue la voce fino a dove smette di sembrare una voce.", "Teo follows the rumor until it stops sounding like one."]
    },
    nando: {
      talk: ["Edo ascolta in silenzio, ma non abbassa la guardia.", "Edo listens in silence, without dropping his guard."],
      recruit: ["Edo trasforma l’angolo in un presidio.", "Edo turns the corner into a watch post."],
      trade: ["Edo pesa le scorte come se fossero promesse.", "Edo weighs supplies like promises."],
      secret: ["Edo controlla prima le uscite, poi l’indizio.", "Edo checks the exits before the clue."]
    },
    leila: {
      talk: ["Jack raccoglie dettagli che gli altri avrebbero ignorato.", "Jack gathers details others would have missed."],
      recruit: ["Jack fa passare il messaggio senza usare una sola sirena.", "Jack spreads the word without a single siren."],
      trade: ["Jack trova un passaggio che non costa denaro.", "Jack finds a route that costs no money."],
      secret: ["Jack registra il segno prima che qualcuno lo cancelli.", "Jack records the mark before someone erases it."]
    },
    ruggero: {
      talk: ["Marta sposta la conversazione dove può fare male meno.", "Marta moves the conversation where it can hurt less."],
      recruit: ["Marta dà a ciascuno un compito concreto.", "Marta gives everyone a concrete task."],
      trade: ["Marta ottiene margine senza vendere il gruppo.", "Marta gains room without selling out the group."],
      secret: ["Marta riconosce la menzogna dal silenzio intorno.", "Marta recognizes the lie from the silence around it."]
    },
    ilaria: {
      talk: ["Miranda ricorda una frase sentita troppo tempo fa.", "Miranda remembers a sentence heard too long ago."],
      recruit: ["Miranda fa sentire la squadra più grande di quanto sia.", "Miranda makes the team feel bigger than it is."],
      trade: ["Miranda trova il prezzo nascosto dietro quello scritto.", "Miranda finds the hidden price behind the written one."],
      secret: ["Miranda collega il segno a una storia che nessuno voleva riaprire.", "Miranda links the mark to a story nobody wanted reopened."]
    }
  };
  return lines[npc?.id]?.[action]?.[language === "it" ? 0 : 1] || "";
}

function factionMessage(factionId, language = "it") {
  const messages = {
    trastevere: ["Trastevere chiede un patto: passaggio libero in cambio di sostegno alla prossima crisi.", "Trastevere asks for a pact: free passage in exchange for support in the next crisis."],
    centro: ["Il Centro Storico vuole una dichiarazione pubblica e pretende che Testaccio scelga da che parte stare.", "The Historic Centre wants a public statement and demands that Testaccio choose a side."],
    trullo: ["Il Trullo pretende scorte per lasciare tranquillo il confine questa notte.", "Trullo demands supplies to leave the border alone tonight."],
    romaest: ["Roma Est propone un presidio comune, ma vuole guidarlo.", "Roma Est proposes a joint watch, but wants to lead it."],
    romanord: ["Roma Nord offre denaro in cambio dell'accesso alle informazioni del rione.", "Roma Nord offers money in exchange for access to district intelligence."]
  };
  return messages[factionId]?.[language === "it" ? 0 : 1] || "";
}

function localizeActivity(value, language) {
  return activityLabels[value]?.[language] || value || (language === "it" ? "nel rione" : "in the district");
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((part) => `${part}${part}`).join("") : value;
  const number = Number.parseInt(full, 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

function roundedRect(context, x, y, width, height, radius = 8) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

export class WorldRuntime {
  constructor({ mount, state, scene, mode = "game", onSelect, onHover, onBeat, onImpact, onSnapshot, onReady }) {
    this.mount = mount;
    this.state = state;
    this.scene = scene;
    this.mode = mode;
    this.onSelect = onSelect;
    this.onHover = onHover;
    this.onBeat = onBeat;
    this.onImpact = onImpact;
    this.onSnapshot = onSnapshot;
    this.onReady = onReady;
    this.world = hydrateWorldState(state.world, state.npcs, state.sceneId);
    this.activeId = state.activeNpc;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "world-canvas";
    this.canvas.setAttribute("aria-label", `${scene.name[state.language]} - quartiere vivo`);
    this.canvas.tabIndex = 0;
    this.context = this.canvas.getContext("2d", { alpha: false });
    this.mount.replaceChildren(this.canvas);
    this.actionWheel = this.mount.parentElement?.querySelector("[data-radial-actions]") || null;
    this.lastWheelPosition = "";
    this.images = new Map();
    this.tintCache = new Map();
    this.effects = [];
    this.transientProps = [];
    this.hoveredId = null;
    this.wheelHovered = false;
    this.wheelVisibleUntil = 0;
    this.busy = false;
    this.destroyed = false;
    this.fade = 0;
    this.transition = null;
    this.sequenceId = 0;
    this.lastFrame = 0;
    this.nextRoutineAt = 0;
    this.lastSnapshotAt = 0;
    this.routineCycle = Number(this.world.cycle) || 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.actionWheelEnterHandler = () => {
      this.wheelHovered = true;
      this.wheelVisibleUntil = 0;
    };
    this.actionWheelLeaveHandler = () => {
      this.wheelHovered = false;
      this.wheelVisibleUntil = 0;
    };
    this.actionWheel?.addEventListener("pointerenter", this.actionWheelEnterHandler);
    this.actionWheel?.addEventListener("pointerleave", this.actionWheelLeaveHandler);
    this.bindInput();
  }

  async start() {
    this.resize();
    const backgroundPromise = this.loadImage(`scene:${this.scene.id}`, this.scene.image);
    const characterPromises = Object.entries(characterAssets).map(([id, source]) => this.loadImage(`character:${id}`, source));
    await Promise.allSettled([backgroundPromise, ...characterPromises]);
    if (this.destroyed) return;
    this.refreshAmbientFactionPresence();
    this.nextRoutineAt = performance.now() + 900;
    this.onReady?.();
    this.frameHandle = requestAnimationFrame((time) => this.frame(time));
  }

  destroy() {
    this.destroyed = true;
    this.sequenceId += 1;
    this.busy = false;
    cancelAnimationFrame(this.frameHandle);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);
    this.canvas.removeEventListener("pointerleave", this.pointerLeaveHandler);
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandler);
    this.actionWheel?.removeEventListener("pointerenter", this.actionWheelEnterHandler);
    this.actionWheel?.removeEventListener("pointerleave", this.actionWheelLeaveHandler);
  }

  loadImage(key, source) {
    const cached = sharedImageCache.get(source);
    if (cached?.image) {
      this.images.set(key, cached.image);
      return Promise.resolve(cached.image);
    }
    if (cached?.promise) {
      return cached.promise.then((image) => {
        this.images.set(key, image);
        return image;
      });
    }
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        sharedImageCache.set(source, { image });
        resolve(image);
      };
      image.onerror = () => {
        sharedImageCache.delete(source);
        reject(new Error(`Unable to load ${source}`));
      };
      image.src = source;
    });
    sharedImageCache.set(source, { promise });
    return promise.then((image) => {
      this.images.set(key, image);
      return image;
    });
  }

  resize() {
    const rect = this.mount.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  bindInput() {
    this.pointerMoveHandler = (event) => {
      if (this.busy) return;
      const point = this.pointerPoint(event);
      const agent = this.agentAt(point.x, point.y);
      const nextId = agent?.id || null;
      const previousId = this.hoveredId;
      this.canvas.style.cursor = nextId ? "pointer" : "default";
      if (!nextId && previousId === this.activeId) this.wheelVisibleUntil = performance.now() + 420;
      if (nextId && nextId !== this.activeId) this.wheelVisibleUntil = 0;
      if (nextId !== this.hoveredId) {
        this.hoveredId = nextId;
        this.onHover?.(nextId, point);
      } else if (nextId) {
        this.onHover?.(nextId, point);
      }
    };
    this.pointerLeaveHandler = () => {
      if (this.hoveredId === this.activeId) this.wheelVisibleUntil = performance.now() + 420;
      this.hoveredId = null;
      this.onHover?.(null);
    };
    this.pointerDownHandler = (event) => {
      if (this.busy) return;
      const point = this.pointerPoint(event);
      const agent = this.agentAt(point.x, point.y);
      if (agent) this.onSelect?.(agent.id);
    };
    this.canvas.addEventListener("pointermove", this.pointerMoveHandler);
    this.canvas.addEventListener("pointerleave", this.pointerLeaveHandler);
    this.canvas.addEventListener("pointerdown", this.pointerDownHandler);
  }

  pointerPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  clearHover() {
    this.hoveredId = null;
    this.canvas.style.cursor = "default";
    this.onHover?.(null);
  }

  visibleAgents() {
    return Object.values(this.world.agents).filter((agent) => agent.sceneId === this.scene.id);
  }

  agentMetrics(agent) {
    const baseY = agent.y * this.height;
    const image = this.images.get(`character:${agent.id}`);
    const height = (88 + agent.y * 58) * (sceneProfiles[this.scene.id]?.characterScale || 1) * (this.mode === "crisis" ? 0.88 : 1);
    const sourceHeight = image ? image.height - (characterProfiles[agent.id]?.footCrop || 0) : 1;
    const ratio = image ? image.width / sourceHeight : 0.62;
    return { x: agent.x * this.width, y: baseY, height, width: height * ratio };
  }

  agentAt(x, y) {
    return this.visibleAgents()
      .sort((left, right) => right.y - left.y)
      .find((agent) => {
        const metrics = this.agentMetrics(agent);
        return x >= metrics.x - metrics.width * 0.38 && x <= metrics.x + metrics.width * 0.38 && y >= metrics.y - metrics.height * 0.92 && y <= metrics.y + 8;
      });
  }

  frame(time) {
    if (this.destroyed) return;
    const delta = Math.min(0.05, Math.max(0.001, (time - (this.lastFrame || time)) / 1000));
    this.lastFrame = time;
    this.update(delta, time);
    this.draw(time);
    this.frameHandle = requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  update(delta, time) {
    this.world.clock = Number(this.world.clock || 0) + delta;
    this.visibleAgents().forEach((agent) => this.updateAgent(agent, delta));
    this.constrainAgentsToTerrain();
    this.effects = this.effects.filter((effect) => time - effect.startedAt < effect.duration);
    if (!this.busy && this.mode === "game" && time >= this.nextRoutineAt) {
      this.scheduleRoutine(time);
    }
    if (!this.busy && time - this.lastSnapshotAt > 5000) this.snapshot(time);
  }

  updateAgent(agent, delta) {
    if (!this.busy && agent.id === this.hoveredId) {
      agent.speed = 0;
      agent.moving = false;
      return;
    }
    const target = agent.route?.[0] || agent.destination;
    if (!target) {
      agent.speed = Math.max(0, (Number(agent.speed) || 0) - delta * 0.18);
      agent.moving = false;
      return;
    }
    const dx = target.x - agent.x;
    const dy = target.y - agent.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance < 0.006) {
      agent.x = target.x;
      agent.y = target.y;
      if (agent.route?.length) agent.route.shift();
      agent.moving = Boolean(agent.route?.length);
      agent.speed = 0;
      if (!agent.moving && agent.activity === "travelling") agent.activity = "observing";
      return;
    }
    const pace = (Number(agent.pace) || 0.055) * (this.busy ? 2.05 : 1);
    const brakingDistance = Math.max(0.018, ((Number(agent.speed) || 0) ** 2) / 0.3);
    const targetSpeed = distance < brakingDistance ? pace * Math.max(0.18, distance / brakingDistance) : pace;
    const acceleration = targetSpeed > (Number(agent.speed) || 0) ? 0.22 : 0.32;
    agent.speed = Math.max(0.008, (Number(agent.speed) || 0) + clamp(targetSpeed - (Number(agent.speed) || 0), -acceleration * delta, acceleration * delta));
    const amount = Math.min(distance, agent.speed * delta);
    agent.direction = dx < 0 ? -1 : 1;
    agent.x += (dx / distance) * amount;
    agent.y += (dy / distance) * amount;
    agent.stepPhase = (Number(agent.stepPhase) || 0) + delta * (5.2 + agent.speed * 70);
    agent.moving = true;
  }

  separateAgents() {
    const agents = this.visibleAgents();
    for (let leftIndex = 0; leftIndex < agents.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < agents.length; rightIndex += 1) {
        const left = agents[leftIndex];
        const right = agents[rightIndex];
        const dx = right.x - left.x;
        const dy = right.y - left.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const minimum = left.groupId && left.groupId === right.groupId ? 0.034 : 0.052;
        if (distance >= minimum) continue;
        const push = (minimum - distance) * 0.035;
        left.x = clamp(left.x - (dx / distance) * push, 0.035, 0.965);
        right.x = clamp(right.x + (dx / distance) * push, 0.035, 0.965);
        left.y = clamp(left.y - (dy / distance) * push, 0.2, 0.93);
        right.y = clamp(right.y + (dy / distance) * push, 0.2, 0.93);
      }
    }
  }

  constrainAgentsToTerrain() {
    const graph = sceneGraphs[this.scene.id];
    if (!graph) return;
    const segments = graph.edges.map(([fromId, toId]) => [graph.nodes[fromId], graph.nodes[toId]]).filter(([from, to]) => from && to);
    this.visibleAgents().forEach((agent) => {
      let best = null;
      segments.forEach(([from, to]) => {
        const vx = to.x - from.x;
        const vy = to.y - from.y;
        const lengthSquared = vx * vx + vy * vy || 1;
        const t = clamp(((agent.x - from.x) * vx + (agent.y - from.y) * vy) / lengthSquared);
        const x = from.x + vx * t;
        const y = from.y + vy * t;
        const distance = Math.hypot(agent.x - x, agent.y - y);
        if (!best || distance < best.distance) best = { x, y, distance };
      });
      // Feet stay on the authored walkable centerlines; tiny tolerance avoids jitter.
      if (best && best.distance > 0.006) {
        agent.x = best.x;
        agent.y = best.y;
      }
    });
  }

  scheduleRoutine(time) {
    const agents = this.visibleAgents();
    if (!agents.length) return;
    this.routineCycle += 1;
    this.refreshAmbientFactionPresence();
    const anchors = ["talk", "defend", "scout", "gather", "care", "trade"];
    agents.forEach((agent, index) => {
      const npc = this.state.npcs.find((item) => item.id === agent.id);
      let anchor = npcRoutineAnchor[agent.id] || anchors[index % anchors.length];
      if (npc?.fear > 58) anchor = "care";
      if (npc?.courage > 64 && this.routineCycle % 2 === 0) anchor = "defend";
      if (this.routineCycle % 3 === 0) anchor = anchors[(index + this.routineCycle) % anchors.length];
      const offset = [((index % 3) - 1) * 0.025, (Math.floor(index / 3) - 0.4) * 0.024];
      setAgentDestination(this.world, agent.id, anchor, this.scene.id, offset);
      agent.activity = anchor === "talk" ? "looking for news" : anchor === "defend" ? "watching the border" : anchor === "care" ? "checking supplies" : "crossing the district";
      agent.objective = npc?.routine?.[this.state.language] || agent.objective;
      agent.groupId = null;
    });

    if (agents.length > 1 && this.routineCycle % 2 === 0) {
      const source = agents[this.routineCycle % agents.length];
      const sourceNpc = this.state.npcs.find((npc) => npc.id === source.id);
      const partner = agents
        .filter((agent) => agent.id !== source.id)
        .sort((left, right) => (sourceNpc?.relation?.[right.id] || 0) - (sourceNpc?.relation?.[left.id] || 0))[0];
      const groupId = `routine-${this.state.day}-${this.routineCycle}`;
      [source, partner].forEach((agent, index) => {
        setAgentDestination(this.world, agent.id, "talk", this.scene.id, [index ? 0.035 : -0.035, index ? 0.008 : -0.008]);
        agent.groupId = groupId;
        agent.activity = "exchanging news";
      });
      this.world.groups = [...this.world.groups.filter((group) => !group.id.startsWith("routine-")), {
        id: groupId,
        type: "conversation",
        sceneId: this.scene.id,
        members: [source.id, partner.id],
        anchor: "talk",
        formedAt: this.world.clock
      }].slice(-6);
    }
    this.world.cycle = this.routineCycle;
    this.nextRoutineAt = time + 5200 + (this.routineCycle % 3) * 900;
  }

  refreshAmbientFactionPresence() {
    const sceneId = this.scene.id;
    const existing = this.world.factionPresence || [];
    const otherScenes = existing.filter((presence) => presence.sceneId !== sceneId);
    const crisisPresence = existing.find((presence) => presence.sceneId === sceneId && presence.kind !== "ambient" && presence.stance !== "retreating");
    if (crisisPresence) {
      this.world.factionPresence = [...otherScenes, crisisPresence].slice(-8);
      return;
    }
    const cooldowns = new Set((this.world.props || [])
      .filter((prop) => prop.type === "faction-cooldown" && prop.expiresCycle > this.routineCycle)
      .map((prop) => prop.factionId));
    const candidates = [...this.state.factions]
      .filter((faction) => !cooldowns.has(faction.id))
      .sort((left, right) => right.pressure - left.pressure || left.relation - right.relation);
    const start = this.routineCycle % Math.max(1, candidates.length);
    const visitors = [candidates[start]]
      .filter(Boolean)
      .map((faction) => ({
        id: `ambient-${sceneId}-${faction.id}`,
        kind: "ambient",
        factionId: faction.id,
        name: faction.name,
        sceneId,
        relation: faction.relation,
        pressure: faction.pressure,
        stance: faction.relation >= 20 ? "open" : faction.relation > -20 ? "watching" : "hostile",
        members: faction.pressure >= 55 ? 3 : 2,
        anchor: "talk",
        slot: 0,
        responsePending: true,
        message: factionMessage(faction.id, this.state.language),
        visualX: 1.04
      }));
    this.world.factionPresence = [...otherScenes, ...visitors].slice(-8);
  }

  snapshot(time = performance.now()) {
    this.lastSnapshotAt = time;
    this.onSnapshot?.(copy(this.world));
  }

  draw(time) {
    const context = this.context;
    const visibleAgents = this.visibleAgents().sort((left, right) => left.y - right.y);
    this.canvas.dataset.visibleAgents = String(visibleAgents.length);
    this.canvas.dataset.loadedCharacters = String(visibleAgents.filter((agent) => this.images.has(`character:${agent.id}`)).length);
    this.canvas.dataset.agentPositions = visibleAgents.map((agent) => `${agent.id}:${Math.round(agent.x * this.width)},${Math.round(agent.y * this.height)}`).join(";");
    context.save();
    context.clearRect(0, 0, this.width, this.height);
    this.drawBackground(context);
    this.drawAtmosphere(context, time);
    this.drawRoutes(context, time);
    this.drawProps(context, time);
    this.drawFactionPresence(context, time);
    this.drawGroups(context);
    visibleAgents.forEach((agent, index) => this.drawAgent(context, agent, index, time));
    this.drawEffects(context, time);
    this.drawTransition(context, time);
    context.restore();
    this.positionActionWheel();
  }

  positionActionWheel() {
    if (!this.actionWheel) return;
    const active = this.world.agents[this.activeId];
    const shouldShow = this.hoveredId === this.activeId || this.wheelHovered || performance.now() < this.wheelVisibleUntil;
    if (!active || active.sceneId !== this.scene.id || !shouldShow) {
      this.actionWheel.classList.remove("positioned");
      return;
    }
    const metrics = this.agentMetrics(active);
    const wheelRadius = 106;
    const openLeft = metrics.x > this.width * 0.62;
    const side = openLeft ? -1 : 1;
    const clearance = metrics.width * 1.05 + wheelRadius + 28;
    const x = Math.round(clamp(metrics.x + side * clearance, wheelRadius + 12, this.width - wheelRadius - 12));
    const y = Math.round(clamp(metrics.y - metrics.height * 0.42, wheelRadius + 18, this.height - wheelRadius - 18));
    const position = `${x}:${y}`;
    if (position !== this.lastWheelPosition) {
      this.actionWheel.style.left = `${x}px`;
      this.actionWheel.style.top = `${y}px`;
      this.lastWheelPosition = position;
    }
    this.actionWheel.classList.toggle("preview-left", openLeft);
    this.actionWheel.classList.toggle("wheel-left", openLeft);
    this.actionWheel.classList.add("positioned");
  }

  drawBackground(context) {
    const image = this.images.get(`scene:${this.scene.id}`);
    if (!image) {
      context.fillStyle = "#171917";
      context.fillRect(0, 0, this.width, this.height);
      return;
    }
    this.drawBackgroundImage(context, image, sceneProfiles[this.scene.id]);
  }

  drawBackgroundImage(context, image, profile = {}) {
    const sourceRatio = image.width / image.height;
    const targetRatio = this.width / this.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;
    if (sourceRatio > targetRatio) {
      sourceWidth = image.height * targetRatio;
    } else {
      sourceHeight = image.width / targetRatio;
    }
    const crop = profile.crop || 1;
    sourceWidth /= crop;
    sourceHeight /= crop;
    const focal = profile.focalPoint || [0.5, 0.5];
    sourceX = clamp(image.width * focal[0] - sourceWidth / 2, 0, image.width - sourceWidth);
    sourceY = clamp(image.height * focal[1] - sourceHeight / 2, 0, image.height - sourceHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.filter = `saturate(1.04) contrast(1.06) brightness(${profile.brightness || 1})`;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, this.width, this.height);
    context.filter = "none";
    const vignette = context.createRadialGradient(this.width * focal[0], this.height * focal[1], this.height * 0.16, this.width * focal[0], this.height * focal[1], this.width * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(2,4,3,0.18)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, this.width, this.height);
  }

  drawAtmosphere(context, time) {
    const phase = time / 1000;
    const kind = sceneProfiles[this.scene.id]?.ambience || "dust";
    context.save();
    context.globalCompositeOperation = "screen";
    if (kind.includes("river") || kind === "fountain" || kind === "fountain-windows") {
      const waterY = (kind === "fountain" || kind === "fountain-windows") ? 0.62 : 0.77;
      for (let index = 0; index < 7; index += 1) {
        const x = (0.16 + index * 0.12 + Math.sin(phase * 0.7 + index) * 0.018) * this.width;
        context.strokeStyle = `rgba(142,220,230,${0.06 + (index % 3) * 0.025})`;
        context.beginPath(); context.moveTo(x - 18, waterY * this.height + index % 2 * 6); context.lineTo(x + 22, waterY * this.height + index % 2 * 6); context.stroke();
      }
    }
    if (kind.includes("windows") || kind === "market-lights" || kind === "neon") {
      for (let index = 0; index < 5; index += 1) {
        const pulse = 0.07 + Math.max(0, Math.sin(phase * (kind === "neon" ? 4.5 : 0.7) + index * 2.1)) * 0.09;
        context.fillStyle = kind === "neon" ? `rgba(238,72,181,${pulse})` : `rgba(255,202,105,${pulse})`;
        context.fillRect((0.13 + index * 0.18) * this.width, (0.2 + index % 2 * 0.08) * this.height, 22, 13);
      }
    }
    if (kind.includes("laundry")) {
      context.globalCompositeOperation = "source-over";
      for (let index = 0; index < 6; index += 1) {
        const x = (0.18 + index * 0.105) * this.width;
        const y = (0.34 + Math.sin(phase * 1.4 + index) * 0.006) * this.height;
        context.strokeStyle = "rgba(235,230,211,0.2)"; context.strokeRect(x, y, 24, 13);
      }
    }
    if (kind === "headlights") {
      const x = ((phase * 0.055) % 1.3 - 0.15) * this.width;
      const beam = context.createRadialGradient(x, this.height * 0.62, 0, x, this.height * 0.62, 90);
      beam.addColorStop(0, "rgba(255,235,175,0.22)"); beam.addColorStop(1, "rgba(255,235,175,0)"); context.fillStyle = beam; context.fillRect(x - 100, this.height * 0.42, 200, 180);
    }
    if (kind === "dust" || kind === "market-lights" || kind === "river-fire") {
      for (let index = 0; index < 9; index += 1) {
        const x = ((index * 0.173 + phase * 0.004) % 1) * this.width;
        const y = (0.22 + ((index * 0.271 - phase * 0.008) % 0.62 + 0.62) % 0.62) * this.height;
        context.fillStyle = `rgba(255,205,128,${0.04 + index % 3 * 0.018})`; context.beginPath(); context.arc(x, y, 1 + index % 2, 0, Math.PI * 2); context.fill();
      }
    }
    if (kind === "river-fire") {
      const glow = context.createRadialGradient(this.width * 0.56, this.height * 0.63, 2, this.width * 0.56, this.height * 0.63, 65);
      glow.addColorStop(0, `rgba(255,135,54,${0.16 + Math.sin(phase * 7) * 0.035})`); glow.addColorStop(1, "rgba(255,100,30,0)"); context.fillStyle = glow; context.fillRect(this.width * 0.43, this.height * 0.48, this.width * 0.26, this.height * 0.3);
    }
    context.restore();
  }

  drawTransition(context, time) {
    const transition = this.transition;
    if (!transition) return;
    const progress = clamp((time - transition.startedAt) / transition.duration);
    const eased = progress * progress * (3 - 2 * progress);
    const targetImage = transition.image;
    context.save();
    if (targetImage) {
      context.globalAlpha = clamp((eased - 0.28) / 0.55);
      context.translate((1 - eased) * this.width * 0.075, 0);
      context.scale(1.025 - eased * 0.025, 1.025 - eased * 0.025);
      this.drawBackgroundImage(context, targetImage, transition.profile);
    }
    context.restore();
    context.save();
    context.fillStyle = `rgba(8,9,8,${Math.sin(progress * Math.PI) * 0.24})`;
    context.fillRect(0, 0, this.width, this.height);
    const titleAlpha = clamp(1 - Math.abs(progress - 0.5) * 5);
    context.globalAlpha = titleAlpha;
    context.textAlign = "center";
    context.font = "800 20px Inter, system-ui, sans-serif";
    context.fillStyle = "#fff1d9";
    context.shadowColor = "rgba(0,0,0,0.8)";
    context.shadowBlur = 10;
    context.fillText(transition.name, this.width / 2, this.height * 0.44);
    context.restore();
  }

  drawRoutes(context, time) {
    const active = this.world.agents[this.activeId];
    if (!active || active.sceneId !== this.scene.id || !active.route?.length) return;
    context.save();
    context.strokeStyle = "rgba(242, 218, 164, 0.32)";
    context.lineWidth = 1.4;
    context.setLineDash([5, 8]);
    context.lineDashOffset = -(time / 80) % 13;
    context.beginPath();
    context.moveTo(active.x * this.width, active.y * this.height + 8);
    active.route.forEach((point) => context.lineTo(point.x * this.width, point.y * this.height + 8));
    context.stroke();
    context.restore();
  }

  propPosition(prop) {
    const graph = sceneGraphs[prop.sceneId] || sceneGraphs.piazza;
    const nodeId = graph.anchors[prop.anchor] || prop.anchor;
    const node = graph.nodes[nodeId] || graph.nodes[Object.keys(graph.nodes)[0]];
    const jitter = (prop.id.length % 5) * 0.008;
    return { x: (node.x + jitter) * this.width, y: (node.y + 0.035) * this.height };
  }

  drawProps(context, time) {
    [...this.world.props.filter((prop) => prop.sceneId === this.scene.id), ...this.transientProps].forEach((prop) => {
      const point = this.propPosition(prop);
      const pulse = 0.85 + Math.sin(time / 420 + prop.id.length) * 0.08;
      context.save();
      context.translate(point.x, point.y);
      context.scale(pulse, pulse);
      context.shadowColor = prop.color || "rgba(0,0,0,0.65)";
      context.shadowBlur = prop.type === "clue" || prop.type === "ritual" ? 16 : 8;
      context.shadowOffsetY = 5;
      if (["barricate", "barricade", "cordon", "ambush"].includes(prop.type)) {
        context.strokeStyle = "#b37b4e";
        context.lineWidth = 6;
        context.beginPath();
        context.moveTo(-19, 7);
        context.lineTo(19, -7);
        context.moveTo(-17, -8);
        context.lineTo(18, 8);
        context.stroke();
      } else if (["kit", "triage"].includes(prop.type)) {
        context.fillStyle = "#385a44";
        roundedRect(context, -14, -9, 28, 18, 3);
        context.fill();
        context.fillStyle = "#d7ead7";
        context.fillRect(-2, -6, 4, 12);
        context.fillRect(-6, -2, 12, 4);
      } else if (prop.type === "radio") {
        context.fillStyle = "#252923";
        roundedRect(context, -10, -14, 20, 25, 3);
        context.fill();
        context.strokeStyle = "#b8c4b5";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(5, -13);
        context.lineTo(10, -29);
        context.stroke();
        context.fillStyle = "#79d58a";
        context.fillRect(-6, -9, 8, 3);
      } else if (["supplies", "ration", "parley"].includes(prop.type)) {
        context.fillStyle = "#8a5d39";
        context.fillRect(-15, -10, 30, 20);
        context.strokeStyle = "#d1a36d";
        context.lineWidth = 2;
        context.strokeRect(-15, -10, 30, 20);
        context.beginPath();
        context.moveTo(0, -10);
        context.lineTo(0, 10);
        context.stroke();
      } else if (["clue", "reveal", "descent"].includes(prop.type)) {
        context.fillStyle = prop.color || "#d9b45f";
        context.rotate(-0.18);
        context.fillRect(-10, -7, 20, 14);
        context.fillStyle = "rgba(28,20,13,0.55)";
        context.fillRect(-6, -3, 12, 1.5);
        context.fillRect(-6, 1, 8, 1.5);
      } else if (prop.type === "assembly") {
        context.strokeStyle = prop.color || "#79d58a";
        context.lineWidth = 3;
        [-16, 0, 16].forEach((x) => {
          context.beginPath();
          context.arc(x, 0, 5, 0, Math.PI * 2);
          context.stroke();
        });
        context.beginPath();
        context.moveTo(0, -8);
        context.lineTo(0, -23);
        context.stroke();
      } else if (prop.type === "accuse") {
        context.strokeStyle = prop.color || "#d85b4b";
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(-22, -9);
        context.lineTo(-4, 0);
        context.lineTo(-22, 9);
        context.moveTo(22, -9);
        context.lineTo(4, 0);
        context.lineTo(22, 9);
        context.stroke();
      } else if (prop.type === "ritual") {
        context.fillStyle = prop.color || "#d9b45f";
        for (let index = 0; index < 5; index += 1) {
          const angle = (index / 5) * Math.PI * 2;
          context.beginPath();
          context.arc(Math.cos(angle) * 15, Math.sin(angle) * 7, 3, 0, Math.PI * 2);
          context.fill();
        }
      } else if (prop.type === "deny") {
        context.fillStyle = "#3f4541";
        context.fillRect(-18, -12, 36, 24);
        context.strokeStyle = prop.color || "#9a9d97";
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(-14, 10);
        context.lineTo(14, -10);
        context.stroke();
      } else {
        context.fillStyle = prop.color || "#d9b45f";
        context.beginPath();
        context.moveTo(0, -15);
        context.lineTo(11, 8);
        context.lineTo(-11, 8);
        context.closePath();
        context.fill();
      }
      context.restore();
    });
  }

  tintedCharacter(id, color) {
    const key = `${id}:${color}`;
    if (this.tintCache.has(key)) return this.tintCache.get(key);
    const source = this.images.get(`character:${id}`);
    if (!source) return null;
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext("2d");
    context.drawImage(source, 0, 0);
    context.globalCompositeOperation = "source-atop";
    context.fillStyle = hexToRgba(color, 0.22);
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
    this.tintCache.set(key, canvas);
    return canvas;
  }

  drawFactionPresence(context, time) {
    this.world.factionPresence.filter((presence) => presence.sceneId === this.scene.id).forEach((presence) => {
      const visual = factionVisuals[presence.factionId] || factionVisuals.trullo;
      const destination = presence.stance === "retreating" ? 1.08 : presence.stance === "allied" ? 0.78 : 0.86;
      presence.visualX = Number.isFinite(presence.visualX) ? presence.visualX + (destination - presence.visualX) * 0.018 : 1.04;
      const graph = sceneGraphs[this.scene.id] || sceneGraphs.piazza;
      const anchorId = graph.anchors[presence.anchor] || presence.anchor || "exit";
      const anchor = graph.nodes[anchorId] || graph.nodes.gate || graph.nodes.east || Object.values(graph.nodes)[0];
      const baseX = presence.kind === "ambient" ? anchor.x * this.width : presence.visualX * this.width;
      const baseY = anchor.y * this.height + (presence.slot || 0) * 10;
      const memberIds = ["nando", "ruggero", "leila", "marta", "ilaria"];
      const leadMetrics = this.visibleAgents()[0] ? this.agentMetrics(this.visibleAgents()[0]) : { height: 124 };
      const height = Math.max(118, leadMetrics.height);
      const spacing = Math.max(64, height * 0.56);
      const direction = anchor.x > 0.5 ? -1 : 1;
      for (let index = 0; index < presence.members; index += 1) {
        const image = this.tintedCharacter(memberIds[index % memberIds.length], visual.color);
        if (!image) continue;
        const x = clamp(baseX + direction * index * spacing, height * 0.3, this.width - height * 0.3);
        const y = baseY;
        const width = height * (image.width / image.height);
        context.save();
        context.globalAlpha = presence.stance === "retreating" ? 0.66 : 0.97;
        context.fillStyle = "rgba(0,0,0,0.42)";
        context.beginPath();
        context.ellipse(x, y + 4, width * 0.35, 8, 0, 0, Math.PI * 2);
        context.fill();
        context.drawImage(image, x - width / 2, y - height, width, height);
        context.globalAlpha = 0.9;
        context.fillStyle = visual.color;
        context.fillRect(x - width * 0.28, y - height * 0.46, width * 0.56, 5);
        context.restore();
      }
      const role = presence.factionId === "trullo" ? "banda" : presence.stance === "hostile" ? "pattuglia" : "delegazione";
      const label = `${presence.name} · ${role}`;
      context.save();
      context.font = "700 11px Inter, system-ui, sans-serif";
      const labelWidth = context.measureText(label).width + 18;
      context.fillStyle = "rgba(8,9,8,0.78)";
      roundedRect(context, baseX - labelWidth / 2, baseY + 25, labelWidth, 24, 6);
      context.fill();
      context.strokeStyle = hexToRgba(visual.color, 0.72);
      context.stroke();
      context.fillStyle = visual.accent;
      context.textAlign = "center";
      context.fillText(label, baseX, baseY + 41);
      context.restore();
    });
  }

  drawGroups(context) {
    this.world.groups.filter((group) => group.sceneId === this.scene.id).forEach((group) => {
      const members = group.members.map((id) => this.world.agents[id]).filter(Boolean);
      if (members.length < 2) return;
      context.save();
      context.strokeStyle = "rgba(121,213,138,0.24)";
      context.lineWidth = 1;
      context.setLineDash([3, 6]);
      context.beginPath();
      members.forEach((agent, index) => {
        const x = agent.x * this.width;
        const y = agent.y * this.height + 5;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
      context.restore();
    });
  }

  drawAgent(context, agent, index, time) {
    const image = this.images.get(`character:${agent.id}`);
    if (!image) return;
    const metrics = this.agentMetrics(agent);
    const phase = agent.moving ? (Number(agent.stepPhase) || 0) : index * 1.9;
    const stride = clamp((Number(agent.speed) || 0) / Math.max(0.04, Number(agent.pace) || 0.055));
    const footfall = agent.moving ? Math.abs(Math.sin(phase)) : 0;
    const bob = 0;
    const sway = agent.moving ? Math.sin(phase) * 0.014 * stride : 0;
    const selected = agent.id === this.activeId;
    const hovered = agent.id === this.hoveredId;

    context.save();
    context.fillStyle = `rgba(0,0,0,${0.34 + footfall * 0.12})`;
    context.beginPath();
    context.ellipse(metrics.x + Math.sin(phase) * 2.5 * stride, metrics.y + 4, metrics.width * 0.31 * (1 - footfall * 0.08), 6 + agent.y * 3, 0, 0, Math.PI * 2);
    context.fill();
    context.filter = "none";
    if (selected) {
      context.strokeStyle = "rgba(217,180,95,0.94)";
      context.lineWidth = 2.2;
      context.beginPath();
      context.ellipse(metrics.x, metrics.y + 4, metrics.width * 0.43, 11 + agent.y * 4, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();

    context.save();
    context.translate(metrics.x, metrics.y);
    const focusScale = hovered ? 1.45 : selected ? 1.06 : 1;
    const walkWave = agent.moving ? Math.sin(phase) * stride : 0;
    context.scale((agent.direction < 0 ? -1 : 1) * focusScale * (1 + Math.abs(walkWave) * 0.025), focusScale * (1 - Math.abs(walkWave) * 0.018));
    context.transform(1, 0, walkWave * 0.035, 1, walkWave * 1.8, 0);
    context.rotate(sway + walkWave * 0.012);
    context.shadowColor = "rgba(238,221,174,0.5)";
    context.shadowBlur = 5;
    context.shadowOffsetX = agent.direction < 0 ? 2 : -2;
    if (agent.emotion === "afraid") {
      context.globalAlpha = 0.92;
      context.filter = "saturate(0.78) brightness(0.9)";
    } else if (selected || hovered) {
      context.filter = "saturate(1.12) brightness(1.08) drop-shadow(0 5px 7px rgba(0,0,0,0.5))";
    } else {
      context.filter = "drop-shadow(0 5px 6px rgba(0,0,0,0.46))";
    }
    const footCrop = characterProfiles[agent.id]?.footCrop || 0;
    context.drawImage(image, 0, 0, image.width, image.height - footCrop, -metrics.width / 2, -metrics.height, metrics.width, metrics.height);
    context.restore();

    if (agent.moving && footfall < 0.12 && (agent.lastFootfallPhase ?? -1) !== Math.floor(phase / Math.PI)) {
      agent.lastFootfallPhase = Math.floor(phase / Math.PI);
      this.effects.push({ type: "footfall", x: agent.x, y: agent.y + 0.012, startedAt: time, duration: 260, color: "rgba(225,214,184,0.3)" });
    }

    if (selected || hovered) this.drawAgentLabel(context, agent, metrics, hovered, focusScale);
  }

  drawAgentLabel(context, agent, metrics, expanded, visualScale = 1) {
    const npc = this.state.npcs.find((item) => item.id === agent.id);
    if (!npc) return;
    const title = npc.name;
    const activity = localizeActivity(agent.activity, this.state.language);
    const detail = expanded ? `${npc.trait} · ${activity}` : activity;
    context.save();
    context.font = "800 12px Inter, system-ui, sans-serif";
    const width = Math.max(context.measureText(title).width, context.measureText(detail).width) + 18;
    const height = expanded ? 40 : 24;
    const x = clamp(metrics.x - width / 2, 7, this.width - width - 7);
    const y = Math.max(14, metrics.y - metrics.height * visualScale - height - 8);
    context.fillStyle = "rgba(10,8,7,0.86)";
    roundedRect(context, x, y, width, height, 6);
    context.fill();
    context.strokeStyle = hexToRgba(npc.color || "#d9b45f", 0.75);
    context.stroke();
    context.fillStyle = "#fff1d9";
    context.textAlign = "center";
    context.fillText(title, x + width / 2, y + 16);
    if (expanded) {
      context.font = "600 9px Inter, system-ui, sans-serif";
      context.fillStyle = "#9ee3a8";
      context.fillText(detail, x + width / 2, y + 31);
    }
    context.restore();
  }

  drawEffects(context, time) {
    this.effects.forEach((effect) => {
      const progress = clamp((time - effect.startedAt) / effect.duration);
      const alpha = Math.sin(progress * Math.PI);
      const x = (effect.x ?? 0.5) * this.width;
      const y = (effect.y ?? 0.55) * this.height;
      context.save();
      context.globalAlpha = alpha;
      context.strokeStyle = effect.color || "#d9b45f";
      context.fillStyle = effect.color || "#d9b45f";
      if (effect.type === "rally" || effect.type === "crisis") {
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, y, 22 + progress * 95, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.arc(x, y, 8 + progress * 58, 0, Math.PI * 2);
        context.stroke();
      }
      if (effect.type === "speech") {
        const from = effect.from || { x: x - 50, y };
        const to = effect.to || { x: x + 50, y: y - 18 };
        context.setLineDash([5, 7]);
        context.lineDashOffset = -progress * 35;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.quadraticCurveTo((from.x + to.x) / 2, Math.min(from.y, to.y) - 45, to.x, to.y);
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.arc(to.x, to.y, 4 + progress * 3, 0, Math.PI * 2);
        context.fill();
      }
      if (effect.type === "handoff") {
        const from = effect.from || { x: x - 64, y: y - 32 };
        const to = effect.to || { x: x + 64, y: y - 32 };
        const parcelX = from.x + (to.x - from.x) * progress;
        const parcelY = from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * 22;
        context.fillStyle = effect.color || "#74c7cb";
        context.fillRect(parcelX - 9, parcelY - 7, 18, 14);
        context.strokeStyle = "#f2eadf";
        context.strokeRect(parcelX - 9, parcelY - 7, 18, 14);
      }
      if (effect.type === "standoff") {
        context.lineWidth = 3;
        context.strokeStyle = effect.color || "#d85b4b";
        [-1, 1].forEach((side) => {
          context.beginPath();
          context.moveTo(x + side * (110 - progress * 44), y - 8);
          context.lineTo(x + side * (76 - progress * 22), y - 8);
          context.stroke();
        });
        context.beginPath();
        context.arc(x, y - 8, 16 + progress * 18, 0, Math.PI * 2);
        context.stroke();
      }
      if (effect.type === "footfall") {
        context.globalAlpha = (1 - progress) * 0.34;
        context.lineWidth = 1;
        context.beginPath(); context.ellipse(x, y, 5 + progress * 11, 2 + progress * 3, 0, 0, Math.PI * 2); context.stroke();
      }
      if (effect.type === "secret") {
        const gradient = context.createRadialGradient(x, y, 0, x, y, 110);
        gradient.addColorStop(0, hexToRgba(effect.color || "#d9b45f", 0.5));
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.moveTo(x, y);
        context.arc(x, y, 130, -0.8 + progress * 0.25, 0.2 + progress * 0.25);
        context.closePath();
        context.fill();
      }
      if (effect.type === "float" && effect.text) {
        context.font = "900 14px Inter, system-ui, sans-serif";
        context.textAlign = "center";
        context.shadowColor = "rgba(0,0,0,0.9)";
        context.shadowBlur = 8;
        let lines = String(effect.text).split(" · ");
        if (lines.length === 1 && lines[0].length > 38) {
          const words = lines[0].split(" ");
          lines = words.reduce((rows, word) => {
            const current = rows.at(-1) || "";
            if (`${current} ${word}`.trim().length <= 38) rows[rows.length - 1] = `${current} ${word}`.trim();
            else rows.push(word);
            return rows;
          }, [""]);
        }
        const top = y - progress * 42 - (lines.length - 1) * 9;
        lines.slice(0, 3).forEach((line, index) => context.fillText(line, x, top + index * 18));
      }
      context.restore();
    });
  }

  effect(type, options = {}) {
    this.effects.push({ type, startedAt: performance.now(), duration: options.duration || 1200, ...options });
  }

  beat(text, detail, color) {
    if (this.destroyed) return;
    this.onBeat?.({ text, detail, color });
  }

  beginSequence() {
    this.sequenceId += 1;
    return this.sequenceId;
  }

  sequenceActive(token) {
    return !this.destroyed && token === this.sequenceId;
  }

  async wait(milliseconds, token) {
    const until = performance.now() + milliseconds;
    while (performance.now() < until) {
      if (!this.sequenceActive(token)) return false;
      await sleep(Math.min(40, until - performance.now()));
    }
    return this.sequenceActive(token);
  }

  async waitForAgents(ids, timeout = 4200, token = this.sequenceId) {
    const started = performance.now();
    while (performance.now() - started < timeout) {
      if (!this.sequenceActive(token)) return { status: "cancelled", arrived: false };
      const done = ids.every((id) => {
        const agent = this.world.agents[id];
        if (!agent) return false;
        const destination = agent.destination || agent;
        return !agent.route?.length && Math.hypot(destination.x - agent.x, destination.y - agent.y) < 0.012;
      });
      if (done) return { status: "arrived", arrived: true };
      await sleep(50);
    }
    return { status: "timeout", arrived: false };
  }

  ensureInScene(id, index = 0) {
    const agent = this.world.agents[id];
    if (!agent || agent.sceneId === this.scene.id) return agent;
    const graph = sceneGraphs[this.scene.id];
    const entry = graph.nodes.west || Object.values(graph.nodes)[0];
    agent.sceneId = this.scene.id;
    agent.x = clamp(entry.x - index * 0.025, 0.02, 0.96);
    agent.y = clamp(entry.y + index * 0.025, 0.2, 0.92);
    agent.route = [];
    return agent;
  }

  actionPartner(activeId) {
    const activeNpc = this.state.npcs.find((npc) => npc.id === activeId);
    return this.visibleAgents()
      .filter((agent) => agent.id !== activeId)
      .sort((left, right) => (activeNpc?.relation?.[right.id] || 0) - (activeNpc?.relation?.[left.id] || 0))[0] || null;
  }

  async playNpcAction(action, { language = "it", impactText = "", success = true } = {}) {
    if (this.busy || !actionPresentation[action]) return false;
    this.clearHover();
    this.busy = true;
    const token = this.beginSequence();
    this.canvas.classList.add("directing");
    const presentation = actionPresentation[action];
    const beats = presentation.beats[language] || presentation.beats.it;
    const active = this.ensureInScene(this.activeId);
    const partner = this.actionPartner(this.activeId);
    let ids = [active.id, partner?.id].filter(Boolean);
    if (action === "recruit") {
      ids = this.visibleAgents().map((agent) => agent.id);
    }

    this.beat(beats[0], `${this.state.npcs.find((npc) => npc.id === active.id)?.name} prende l'iniziativa.`, presentation.color);
    ids.forEach((id, index) => {
      const columns = Math.max(2, Math.ceil(Math.sqrt(ids.length)));
      const offset = action === "recruit"
        ? [((index % columns) - (columns - 1) / 2) * 0.05, (Math.floor(index / columns) - 0.4) * 0.045]
        : [index ? 0.038 : -0.038, index ? 0.008 : -0.008];
      setAgentDestination(this.world, id, presentation.anchor, this.scene.id, offset);
      const agent = this.world.agents[id];
      agent.pace = 0.22;
      agent.activity = "moving with purpose";
    });
    const arrival = await this.waitForAgents(ids, 1500, token);
    if (arrival.status === "cancelled") return false;

    this.beat(beats[1], action === "secret" && !success ? "La traccia reagisce male." : "La scena cambia davanti ai tuoi occhi.", presentation.color);
    ids.forEach((id) => {
      this.world.agents[id].activity = { talk: "talking", recruit: "holding the line", trade: "exchanging supplies", secret: "searching" }[action];
    });
    const anchor = sceneGraphs[this.scene.id].nodes[sceneGraphs[this.scene.id].anchors[presentation.anchor]];
    if (action === "talk") {
      const left = this.agentMetrics(active);
      const right = partner ? this.agentMetrics(partner) : { x: left.x + 70, y: left.y - 12 };
      this.effect("speech", { color: presentation.color, duration: 1050, from: { x: left.x, y: left.y - 70 }, to: { x: right.x, y: right.y - 70 } });
    }
    if (action === "recruit") this.effect("rally", { x: anchor.x, y: anchor.y, color: presentation.color, duration: 1100 });
    if (action === "trade") {
      this.transientProps = [{ id: "trade-crate", type: "supplies", sceneId: this.scene.id, anchor: "trade" }];
      this.effect("handoff", { x: anchor.x, y: anchor.y, color: presentation.color, duration: 1200 });
    }
    if (action === "secret") this.effect("secret", { x: anchor.x, y: anchor.y, color: success ? "#d9b45f" : "#d85b4b", duration: 1150 });
    const hostile = this.world.factionPresence.find((presence) => presence.sceneId === this.scene.id && presence.stance === "hostile");
    if (hostile) this.effect("standoff", { x: anchor.x, y: anchor.y, color: factionVisuals[hostile.factionId]?.color || "#d85b4b", duration: 1350 });
    if (!await this.wait(420, token)) return false;

    if (!this.sequenceActive(token)) return false;
    this.onImpact?.({ type: "npc-action", action });
    this.effect("float", { x: anchor.x, y: anchor.y - 0.05, color: presentation.color, text: impactText || beats[2], duration: 1100 });
    const reaction = npcReaction(this.state.npcs.find((npc) => npc.id === active.id), action, language);
    this.beat(beats[2], [reaction, impactText].filter(Boolean).join(" "), presentation.color);
    if (!await this.wait(380, token)) return false;
    this.transientProps = [];
    ids.forEach((id) => {
      this.world.agents[id].pace = 0.05;
      this.world.agents[id].action = null;
    });
    this.busy = false;
    this.canvas.classList.remove("directing");
    this.snapshot();
    return true;
  }

  async playFactionResponse(response, presence, { language = "it" } = {}) {
    if (this.busy || !presence) return false;
    this.clearHover();
    this.busy = true;
    const token = this.beginSequence();
    const active = this.ensureInScene(this.activeId);
    setAgentDestination(this.world, active.id, "talk", this.scene.id, [-0.04, 0]);
    active.pace = 0.2;
    active.activity = "facing the delegation";
    const arrival = await this.waitForAgents([active.id], 1300, token);
    if (arrival.status === "cancelled") return false;
    const color = factionVisuals[presence.factionId]?.color || "#d85b4b";
    const labels = {
      negotiate: language === "it" ? "Si apre una trattativa" : "Negotiations begin",
      stand: language === "it" ? "Testaccio tiene il punto" : "Testaccio holds its ground",
      refuse: language === "it" ? "La richiesta viene respinta" : "The demand is rejected"
    };
    if (response === "negotiate") this.effect("speech", { color, duration: 1500, from: { x: active.x * this.width, y: active.y * this.height - 70 }, to: { x: (active.x + 0.16) * this.width, y: active.y * this.height - 70 } });
    else this.effect("standoff", { x: active.x, y: active.y, color, duration: 1600 });
    this.beat(labels[response], presence.message, color);
    if (!await this.wait(850, token)) return false;
    presence.responsePending = false;
    presence.stance = response === "negotiate" ? "allied" : "retreating";
    this.busy = false;
    this.snapshot();
    return true;
  }

  async playCraft(item, { language = "it" } = {}) {
    if (this.busy) return false;
    this.clearHover();
    this.busy = true;
    const token = this.beginSequence();
    const active = this.ensureInScene(this.activeId);
    const anchor = item === "barricate" ? "defend" : item === "kit" ? "care" : "scout";
    const labels = {
      barricate: language === "it" ? ["Sceglie il varco", "Travi e ferri si incastrano", "La barricata regge"] : ["Choosing the breach", "Beams and iron lock", "The barricade holds"],
      kit: language === "it" ? ["Apre lo zaino", "Il presidio viene preparato", "Il kit e pronto"] : ["Opening the bag", "The station is prepared", "The kit is ready"],
      radio: language === "it" ? ["Cerca un punto alto", "La frequenza si apre", "La radio e in ascolto"] : ["Finding high ground", "The frequency opens", "The radio is listening"]
    }[item] || [item, item, item];
    this.beat(labels[0], "L'oggetto avra un posto reale nel quartiere.", "#d9b45f");
    setAgentDestination(this.world, active.id, anchor, this.scene.id);
    active.pace = 0.22;
    active.activity = "carrying materials";
    if ((await this.waitForAgents([active.id], 1500, token)).status === "cancelled") return false;
    this.beat(labels[1], "Il lavoro e visibile, non soltanto registrato.", "#d9b45f");
    this.transientProps = [{ id: `preview-${item}`, type: item, sceneId: this.scene.id, anchor }];
    this.effect("rally", { x: active.x, y: active.y, color: "#d9b45f", duration: 1300 });
    if (!await this.wait(420, token)) return false;
    this.onImpact?.({ type: "craft", item });
    this.effect("float", { x: active.x, y: active.y - 0.04, text: labels[2], color: "#d9b45f", duration: 1400 });
    this.beat(labels[2], "Resta nella scena e nel salvataggio.", "#79d58a");
    if (!await this.wait(380, token)) return false;
    this.transientProps = [];
    active.pace = 0.05;
    this.busy = false;
    this.snapshot();
    return true;
  }

  async playCrisis(optionId, { language = "it", label = "" } = {}) {
    if (this.busy) return false;
    this.clearHover();
    this.busy = true;
    const token = this.beginSequence();
    const presentation = crisisPresentation[optionId] || { mode: "aftermath", color: "#d9b45f" };
    const presence = this.world.factionPresence[0];
    if (presence) presence.visualX = 1.03;
    const localAgents = this.visibleAgents();
    const defensive = ["defend", "ambush", "order"].includes(optionId);
    const anchor = defensive ? "defend" : optionId === "descend" ? "secret" : "gather";
    this.beat(language === "it" ? "Il confine si muove" : "The border moves", presence ? `${presence.name} entra nella scena.` : label, presentation.color);
    localAgents.forEach((agent, index) => {
      setAgentDestination(this.world, agent.id, anchor, this.scene.id, [(index - (localAgents.length - 1) / 2) * 0.044, (index % 2) * 0.035]);
      agent.pace = 0.22;
      agent.activity = defensive ? "taking position" : "facing the delegation";
    });
    if ((await this.waitForAgents(localAgents.map((agent) => agent.id), 1600, token)).status === "cancelled") return false;
    this.beat(label || presentation.mode, language === "it" ? "La scelta diventa azione." : "The choice becomes action.", presentation.color);
    this.transientProps = [{ id: `preview-${optionId}`, type: presentation.mode, sceneId: this.scene.id, anchor, color: presentation.color }];
    const effectType = ["descend", "reveal"].includes(optionId)
      ? "secret"
      : ["negotiate", "listen"].includes(optionId)
        ? "speech"
        : ["triage", "ritual"].includes(optionId)
          ? "rally"
          : "crisis";
    this.effect(effectType, { x: defensive ? 0.77 : 0.55, y: 0.61, color: presentation.color, duration: 1900 });
    if (!await this.wait(450, token)) return false;
    this.onImpact?.({ type: "crisis", optionId });
    if (presence) presence.stance = ["negotiate", "listen", "ritual"].includes(optionId) ? "allied" : "retreating";
    this.effect("float", { x: 0.61, y: 0.48, text: label || presentation.mode, color: presentation.color, duration: 1600 });
    this.beat(language === "it" ? "Il rione registra il prezzo" : "The district records the cost", language === "it" ? "Risorse, memoria e rapporti cambiano adesso." : "Resources, memory, and relations change now.", presentation.color);
    if (!await this.wait(420, token)) return false;
    this.transientProps = [];
    localAgents.forEach((agent) => { agent.pace = 0.05; });
    this.busy = false;
    this.snapshot();
    return true;
  }

  async playSceneTransition(targetScene, language = "it") {
    if (this.busy) return false;
    this.clearHover();
    this.busy = true;
    const token = this.beginSequence();
    const target = typeof targetScene === "string"
      ? scenes.find((candidate) => candidate.id === targetScene || Object.values(candidate.name || {}).includes(targetScene)) || null
      : targetScene;
    const targetName = typeof targetScene === "string"
      ? targetScene
      : targetScene?.name?.[language] || targetScene?.name?.it || targetScene?.name || targetScene?.id || "";
    let targetImage = target?.image ? this.images.get(`scene:${target.id}`) : null;
    const preload = !targetImage && target?.image
      ? this.loadImage(`scene:${target.id}`, target.image).then((image) => { targetImage = image; }).catch(() => {})
      : Promise.resolve();
    const agents = this.visibleAgents().filter((agent) => agent.id === this.activeId || agent.groupId);
    const moving = agents.length ? agents : this.visibleAgents().slice(0, 2);
    this.beat(language === "it" ? `Verso ${targetName}` : `Toward ${targetName}`, language === "it" ? "Il gruppo raggiunge l'uscita del quartiere." : "The group reaches the district exit.", "#d9b45f");
    moving.forEach((agent, index) => {
      setAgentDestination(this.world, agent.id, "exit", this.scene.id, [index * 0.018, index * 0.022]);
      agent.pace = 0.14;
      agent.activity = "leaving the scene";
    });
    await this.waitForAgents(moving.map((agent) => agent.id), sceneTransitionContract.exitBudgetMs, token);
    if (!this.sequenceActive(token)) return false;
    await Promise.race([preload, this.wait(sceneTransitionContract.preloadGraceMs, token)]);
    if (!this.sequenceActive(token)) return false;
    this.transition = {
      startedAt: performance.now(),
      duration: sceneTransitionContract.crossfadeMs,
      image: targetImage,
      profile: sceneProfiles[target?.id] || sceneProfiles[this.scene.id],
      name: targetName
    };
    if (!await this.wait(sceneTransitionContract.crossfadeMs, token)) return false;
    this.snapshot();
    this.busy = false;
    return true;
  }
}
