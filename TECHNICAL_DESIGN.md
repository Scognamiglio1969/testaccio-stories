# Technical Design

## Stack

- Static web app with native ES modules
- Canvas 2D dynamic world runtime
- DOM/CSS interface and dossier
- No runtime dependencies or build step
- LocalStorage persistence
- Free static-hosting compatible

The world stage is intentionally local and dependency-free. It provides the scene graph, timeline, movement, depth sorting, effects, camera fades, hover, and click handling that would otherwise be delegated to a game framework, while keeping deployment reproducible offline.

## Architecture

- `index.html`: app shell and metadata
- `src/main.js`: UI rendering, interaction lock, command direction, and runtime lifecycle
- `src/engine.js`: deterministic gameplay transitions and scoring
- `src/worldData.js`: ten waypoint graphs, action beats, faction visuals, and character asset map
- `src/worldState.js`: world creation, migration, routing, groups, props, travel, and faction state
- `src/worldRuntime.js`: Canvas rendering, autonomous routines, input, animation timelines, and visual effects
- `src/gameData.js`: NPCs, scenes, crises, strings, badges, and seed leaderboard
- `src/styles.css`: laptop cockpit, overlays, canvas framing, and responsive crisis layout
- `assets/characters/`: optimized transparent full-body character renders
- `tests/game.test.js`: original gameplay smoke test
- `tests/world.test.js`: navigation, grouping, persistence, crafting, and crisis tests

## Command Pipeline

Player commands do not update the interface immediately.

1. `main.js` validates the command and locks conflicting controls.
2. `WorldRuntime` moves the involved agents through authored waypoints.
3. The runtime shows the action-specific visual beat and emits the impact cue.
4. `engine.js` applies the deterministic resource, memory, gossip, and faction effects.
5. `worldState.js` persists positions, groups, objects, and aftermath.
6. The interface renders the new state and unlocks controls.

Correct gameplay state never depends solely on an animation timer. Reloading after an interruption hydrates a valid world from the last committed state.

## Persistent World State

The save contains a versioned `world` object with:

- current viewed scene and world clock
- per-NPC scene, normalized position, destination, direction, activity, objective, group, emotion, and route
- active social groups and their membership
- crafted and narrative props by scene
- faction presence, stance, pressure, and visual progress
- last semantic sequence

Legacy saves without `world` are migrated automatically from the current scene and NPC data.

## Rendering

The Canvas renderer draws the existing cinematic location art as a high-quality cover-fitted background with restrained contrast and vignette treatment. Agents are sorted by their y coordinate, scaled by depth, grounded with animated shadows, flipped by direction, and given procedural idle/walk motion. Only hover and selection produce a ground indicator; characters are never represented as portrait circles in the world.

Each frame also projects the active resident's screen position to the DOM radial-command wheel. Position writes are rounded and skipped when unchanged. The wheel is clamped away from scene navigation and lore overlays, remains click-through at its center, and fades while the command pipeline is locked. The runtime also chooses the free side for the contextual impact preview. Faction effects from one action share a sequence identifier so the DOM can acknowledge the exact affected districts once, then clear the highlight without mutating gameplay state.

Faction crews use detailed tinted character cutouts, group formations, labels, and stance-dependent movement. Persistent props have distinct scene drawings for barricades, kits, radios, supplies, clues, rituals, triage, and crisis aftermath.

## Performance

- One Canvas element and one animation loop
- Device pixel ratio capped at 2
- Five optimized character PNGs totaling less than 1 MB
- Normalized coordinates independent of viewport size
- Cached faction tint canvases
- Maximum frame delta capped to avoid jumps after a suspended tab
- World snapshots throttled during autonomous play

## Persistence and Backend

Current LocalStorage keys:

- `mdq-save`
- `mdq-leaderboard`
- `mdq-feedback`
- `ts-audio`

The `world` object is JSON-safe. A future backend can store the same command results and server-authoritative event seeds without serializing Canvas or DOM state.

## Security

The current slice has no server-side trust boundary. Scores and saves are local and must be validated server-side before public competitive leaderboards or multiplayer synchronization are enabled.
