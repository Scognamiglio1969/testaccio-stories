# Test Plan

## Automated

Run:

```bash
npm test
```

Coverage:

- create, save, and migrate game/world state
- NPC actions, memory, gossip, resources, and score
- all ten connected waypoint graphs and action anchors
- scene travel with persistent residents
- five-person group formation without collapsing to one position
- persistent crafting props
- faction arrival and crisis aftermath
- endings and badges

## Dynamic World QA

- Start a new game and confirm five full-body figures appear with no circular portrait tokens.
- Wait ten seconds and confirm routine-driven movement begins.
- Confirm characters follow streets, sort by depth, scale with perspective, and do not overlap incoherently.
- Hover every character: the figure enlarges and the inspector shows name, role, activity, trust, fear, and courage.
- Confirm the four radial commands follow the selected character, remain readable, and disappear during action direction.
- Hover and keyboard-focus every radial command; confirm only one impact preview appears and lists the matching resource and faction changes.
- Complete an action and confirm only the affected district pills pulse, with warning color when pressure increases.
- Click every character and confirm selection changes without moving everyone to the same point.
- Run Listen, Rally, Trade, and Investigate; verify three distinct visual beats and that resources change only after impact.
- Open the dossier and craft barricade, kit, and radio; verify each object appears in the scene and survives reload.
- Change locations and verify departure, fade, correct arrival direction, and residents left in their previous location.
- Advance to a crisis and verify a labeled rival crew enters visibly.
- Resolve every crisis option across test runs; confirm the staged response, faction reaction, aftermath prop, memory, and resource changes agree.

## Desktop Viewports

Check at 1366 x 768, 1440 x 900, and 1920 x 1080:

- Canvas is nonblank and correctly framed.
- Narrator spans the available width and never covers scene controls.
- Map, compact status dock, hover inspector, radial action wheel, area selector, lore, and dashboard do not overlap incoherently.
- Text and buttons are not clipped.
- Background details remain sharp after loading and are not obscured by stacked dark overlays.
- Crisis screen keeps the live world and tactical choices visible.
- Movement remains smooth with all five local NPCs and a five-member rival crew.

## Persistence

- Refresh during normal play and confirm scene, positions, groups, props, and activities return.
- Load a save created before world version 2 and confirm automatic migration.
- Confirm an interrupted animation reloads the last committed valid state.

## Deployment

- Static hosting serves `index.html` and ES modules with JavaScript MIME types.
- Every scene and character PNG loads without a 404.
- No console errors or unhandled promise rejections occur during a full run.
- Local leaderboard and settings persist.
