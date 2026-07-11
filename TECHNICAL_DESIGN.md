# Technical Design

## Stack

- Static web app
- Vanilla ES modules
- CSS-driven isometric 2.5D presentation
- No runtime dependencies
- LocalStorage persistence
- Free static hosting compatible

The implementation intentionally avoids heavy dependencies for the first public slice. This keeps deployment simple and performance strong on laptop browsers while remaining adaptive.

## Files

- `index.html`: app shell and metadata
- `src/main.js`: UI rendering and interaction binding
- `src/engine.js`: deterministic game state transitions
- `src/gameData.js`: NPCs, crises, strings, badges, seed leaderboard
- `src/styles.css`: visual system and responsive UI
- `assets/key-art.png`: generated key art
- `server.js`: local static server
- `tests/game.test.js`: smoke test for gameplay systems

## State

Game state is a single JSON object with:

- current language
- player name
- day
- phase
- resources
- metrics
- NPC state
- inventory
- journal
- gossip
- pending crisis
- ending
- badges

## Persistence

The current version saves to `localStorage`:

- `mdq-save`
- `mdq-leaderboard`
- `mdq-feedback`

## Backend Adapter

Phase 2 can replace local persistence with Supabase or Firebase:

- Auth: magic link or email/password.
- Saves: JSON state table by user.
- Leaderboard: final score insert after completion.
- Feedback: table with contact and message.
- Multiplayer: server-authored event seeds and seasonal district states.

## Performance

Rendering is DOM/CSS rather than WebGL for the public slice. This avoids GPU instability and allows fast iteration.

## Security Notes

The current slice has no server-side trust boundary. Leaderboards are local only and must be server validated before public competition.
