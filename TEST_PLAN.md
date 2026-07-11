# Test Plan

## Automated

Run:

```bash
npm test
```

Coverage:

- create game state
- NPC action changes memory and gossip
- crisis creation
- crisis resolution
- score calculation
- ending generation

## Manual Compact View QA

- Open at 772 x 734 and 390 x 844 viewports.
- Start new game.
- Tap all five NPCs.
- Use all four NPC actions.
- Open and close dossier.
- Switch all dossier tabs.
- Craft each item if resources allow.
- Advance to a crisis.
- Resolve a crisis.
- Finish a run.
- Verify score, badges, and ending.
- Switch language and verify no broken UI.

## Manual Desktop QA

- Open at 1440 x 900.
- Verify map and panels do not overlap incoherently.
- Verify bottom sheet becomes side panel.
- Verify landing remains readable.

## Deployment QA

- Static hosting serves `index.html`.
- `assets/key-art.png` loads.
- Refresh after save restores state.
- Leaderboard persists locally.
- No console errors during a full run.
