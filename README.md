# Testaccio Stories

Laptop-first social horror game set in a contemporary Roman district inspired by Testaccio.

The current release is a playable dynamic-world slice: ten cinematic locations, five persistent teenage NPCs, independent movement, social groups, visible rival crews, animated actions, tactical crises, crafting props, memory, gossip, scoring, three endings, badges, local saves, and a backend-ready state model.

## Run

```bash
npm start
```

Open `http://127.0.0.1:4173`.

## Test

```bash
npm test
```

The suite checks the original gameplay loop plus all ten navigation graphs, group formation, scene travel, crafting props, faction arrivals, crisis aftermath, legacy-save migration, and the desktop radial-command UI contract.

## Dynamic World

- Full-body isometric figures for Teo, Edo, Jack, Marta, and Miranda.
- A dependency-free Canvas 2D world stage rendered inside the existing DOM interface.
- Authored waypoint graphs for all ten Testaccio locations.
- Perspective scaling, y-depth sorting, shadows, route visualization, separation, and hover inspection.
- A four-direction action wheel that follows the selected resident and clears during directed sequences.
- One contextual impact preview at a time, showing resource and faction consequences without restoring a wall of action cards.
- Short green/red faction pulses acknowledge which rival districts changed after a command.
- Compact status dock and a single location menu for all ten scenes, avoiding stacked action cards and clipped scene tabs.
- Routine-driven autonomous movement derived from role, fear, courage, and relationships.
- Persistent scene, position, destination, direction, activity, group, objective, emotion, route, props, and faction presence.
- Visual command pipeline: intent, travel, action, impact, reaction, state update, save.
- Distinct sequences for listening, rallying, trading, investigating, crafting, scene travel, and every crisis response.

## Publish Without Vercel

The app is static and can be deployed for free on:

- Netlify: connect the GitHub repository and publish the repository root.
- Cloudflare Pages: leave the build command empty and use `/` as the output directory.
- GitHub Pages: serve the repository root.

## Scope

- Real: laptop-first UI, dynamic world, five stateful NPCs, groups, factions, actions, crises, crafting, local saves, local leaderboard, and IT/EN.
- Not simulated: real-time network multiplayer and a hosted leaderboard.
- Backend-ready: the complete world state is serializable and can later be synchronized through Supabase or Firebase.
