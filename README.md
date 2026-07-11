# Testaccio Stories

Laptop-first social horror game set in a contemporary Roman district inspired by Testaccio.

The current release is a polished vertical slice built for same-day publication: playable core loop, five stateful NPCs, memory, gossip, tactical crises, resources, scoring, three endings, badges, local persistence, and a backend-ready adapter.

## Run

```bash
npm start
```

Open `http://localhost:4173`.

## Test

```bash
npm test
```

## Publish without Vercel

This app is static and can be deployed for free on:

- Netlify: drag the project folder or connect GitHub.
- Cloudflare Pages: build command empty, output directory `/`.
- GitHub Pages: serve the repository root.

## Current Scope

- Real: laptop-first UI, game loop, NPC memory, gossip, crises, crafting, local saves, local leaderboard, i18n IT/EN.
- Simulated: online multiplayer and hosted leaderboard.
- Ready for phase 2: Supabase/Firebase auth, save sync, online leaderboard, seasonal multiplayer events.
