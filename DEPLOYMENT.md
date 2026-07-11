# Deployment

## Local Verification

```bash
npm test
npm start
```

Open `http://localhost:4173`.

## Netlify

Free path:

1. Push repository to GitHub.
2. Create a Netlify site from Git.
3. Build command: leave empty.
4. Publish directory: `/`.
5. Deploy.

## Cloudflare Pages

Free path:

1. Push repository to GitHub.
2. Create a Cloudflare Pages project.
3. Framework preset: none.
4. Build command: leave empty.
5. Output directory: `/`.
6. Deploy.

## GitHub Pages

Free path:

1. Push repository to GitHub.
2. Enable Pages from the repository settings.
3. Source: main branch, root folder.

## Backend Phase

For online leaderboard and authentication, add Supabase:

- `players`
- `player_saves`
- `leaderboard`
- `feedback`
- `season_events`

Then replace local adapters in `src/engine.js`.
