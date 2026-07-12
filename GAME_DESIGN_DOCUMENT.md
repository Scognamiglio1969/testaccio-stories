# Game Design Document

## Vision

`Testaccio Stories` is a laptop-first isometric social horror game about keeping a district alive while fear, scarcity, rumors, and rival neighborhoods pressure it from outside and inside.

The player controls a visible resident who explores, speaks, trades, investigates, defends, and decides which truths the district can survive.

## Design Pillars

- People remember: NPCs track player actions and change trust, fear, courage, and relations.
- Horror is social: dread comes from distrust, propaganda, scarcity, and collective memory.
- Every choice costs: defense, food, truth, order, and morality pull against each other.
- Laptop table clarity first: the scene, resources, and choices must be readable in one cockpit-like view.
- Public today, expandable tomorrow: the slice is complete but architected for backend and multiplayer.

## Target

Students, narrative players, strategy-light communities, and people who enjoy emergent stories in compact sessions.

## Session

A full run lasts about 30 minutes in the intended production version. The current slice compresses the arc into 8 days for a complete playable run.

## Core Loop

1. Read the district state.
2. Select an NPC on the isometric map.
3. Talk, recruit, trade, or investigate.
4. Watch the characters physically perform the action and react.
5. See memory, gossip, groups, and district relations change.
6. Craft support assets that remain visible in the world.
7. Resolve tactical crises against visible rival crews.
8. Advance the day and reach one of three endings and a final score.

## NPCs

- Teo: observant teen and memory of the group.
- Edo: athletic teen and impulsive defender.
- Jack: outsider teen, radio operator, and network builder.
- Marta: teen organizer of assemblies and the She-Wolf wall.
- Miranda: quiet teen, caregiver, and keeper of difficult secrets.

Each NPC has role, routine, secret, evolution path, trust, fear, courage, morality, relations, and memory.

Each also has a persistent physical state: location, route, destination, direction, current activity, objective, group, action, and emotional posture. They can travel independently, meet, separate, patrol, investigate, exchange news, or gather as a group.

## Dynamic World

Every Testaccio location has an authored navigation graph and action anchors. Character movement is motivated by routines, relationships, fear, courage, crises, and player commands. Autonomous behavior keeps the district alive between commands without turning it into visual noise.

Actions use three readable beats: intent and travel, physical performance, then consequence. Resources and faction relations change only after the impact beat. Rival districts appear as small crews whose stance reflects relation and pressure.

## Systems

Resources:

- food
- money
- health
- stability
- intel
- defense
- trust

Metrics:

- survivors
- secrets
- wealth
- chaos
- morality
- courage
- challenge

## Tactical Crises

Crises happen every other day and present laptop-friendly turn-based choices alongside the live scene. Rival crews arrive at the border; the chosen response is staged physically before outcomes affect resources, metrics, NPC memory, gossip, and faction relations.

## Crafting

Craftable items:

- barricades
- medical kits
- radio

## Endings

- Community Salvation: the district survives through trust and mutual aid.
- Authoritarian Control: the district survives but hardens into fear and control.
- Social Collapse: the district is absorbed or destroyed by internal fracture.

## Lore

The setting evokes a modern Roman district inspired by Testaccio: courtyards, markets, shutters, old walls, cellars, and the myth of ancient shards under the streets. The horror is rooted in neighborhood memory and old debts resurfacing during crisis.

## UI

The first screen is immersive. The game uses a fixed top bar, full-width narrator, resource strip, live isometric world, compact NPC status dock, hover inspector, and an optional dossier dashboard. Commands live in a color-coded radial wheel around the selected resident; the wheel follows movement and disappears while a directed sequence is playing. Hovering or focusing one command reveals a single nearby preview of resource and faction consequences. After impact, affected districts pulse briefly according to whether relations improved or pressure rose. All ten locations are reached from one compact area menu with previous/next controls.

## Scoring

The final score combines survivors, trust, stability, secrets, wealth, inverse chaos, morality, courage, and challenge.

## Badges

Current badge set:

- Custode del Rione
- Lingua Lunga
- Nessuno Resta Indietro
- Il Prezzo dell'Ordine
- Sotto i Cocci
- Tradito ma Vivo
