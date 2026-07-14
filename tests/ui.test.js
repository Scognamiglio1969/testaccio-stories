import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../src/worldRuntime.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const data = readFileSync(new URL("../src/gameData.js", import.meta.url), "utf8");

assert.match(main, /class="simple-game/);
assert.match(main, /class="hero-character"/);
assert.match(main, /characterAssets\[npc\.id\]/);
assert.match(main, /data-simple-action/);
assert.match(main, /data-action-preview/);
assert.match(main, /renderActionExplanation/);
assert.match(main, /previewSimpleAction/);
assert.match(main, /data-action-category/);
assert.match(main, /data-simple-clock/);
assert.match(main, /finishSimpleAction/);
assert.match(main, /class="pulse-score/);
assert.match(main, /data-simple-panel="people"/);
assert.match(main, /data-simple-panel="districts"/);
assert.match(main, /data-simple-panel="place"/);
assert.match(main, /factionAssets\[faction\.id\]/);
assert.match(main, /data-simple-result/);
assert.match(main, /gameLost/);
assert.doesNotMatch(main.slice(main.indexOf("function renderGame"), main.indexOf("function nextMoveCopy")), /resources|forecast|journal|mission/);

assert.match(data, /export const simpleActions/);
assert.equal((data.match(/category: "(?:social|street|intel|field)"/g) || []).length, 20);
assert.match(runtime, /factionAssets/);
assert.match(runtime, /this\.mode === "game"/);
assert.match(runtime, /`faction:\$\{presence\.factionId\}`/);
assert.match(runtime, /imageSmoothingQuality = "high"/);
assert.match(styles, /\.simple-layout/);
assert.match(styles, /\.hero-character > img/);
assert.match(styles, /\.action-five/);
assert.match(styles, /\.action-explanation/);
assert.match(styles, /\.predicted-positive/);
assert.match(styles, /\.simple-result\.positive/);
assert.match(styles, /\.simple-result\.negative/);

console.log("Focused desktop UI contract test passed.");
