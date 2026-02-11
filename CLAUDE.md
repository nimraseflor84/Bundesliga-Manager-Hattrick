# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Project

No build system — pure ES6 modules served directly. Start a local HTTP server:

```bash
cd "Bundesliga Manager Hattrick"
python3 -m http.server 8080
# Open http://localhost:8080
```

Opening `index.html` directly may fail due to CORS restrictions on ES module imports.

## Architecture

**Vanilla JavaScript SPA** with hash-based routing, no frameworks or dependencies.

### Core Layer (`src/core/`)
- **EventBus.js** — Singleton pub/sub (`eventBus.on/off/emit`). Screens auto-cleanup subscriptions on `unmount()`.
- **GameState.js** — Single source of truth. Updates via `gameState.update('dotted.path', value)` which emits `state:changed` and `state:<path>` events. All game data lives here: teams, players, fixtures, results.
- **Router.js** — Hash-based SPA router. Screens registered in `app.js` with `router.register('#hash', screenInstance)`. Calls `unmount()` on previous screen, then `mount()` on new one.
- **SaveManager.js** — Wraps localStorage with key prefix `bmh_savegame_<slot>`. Auto-saves after each matchday.

### Engine Layer (`src/engine/`) — Pure logic, no DOM
- **MatchEngine.js** — Poisson-distributed goal simulation. Home ~1.6, away ~1.2 base expected goals, modified by team strength ratio.
- **LeagueManager.js** — Central orchestrator. Simulates matchdays, updates standings, manages player stats (fitness/morale/injuries), processes finances, controls transfer windows. Also handles auto-lineup for AI teams.
- **Calendar.js** — Round-robin fixture generation. 18 teams → 34 matchdays (circle method).
- **FinanceEngine.js** — Income (tickets, TV, sponsors, fanshop, VIP) and expenses (salaries, maintenance). Stadium upgrade logic.
- **TransferMarket.js** — Player valuation (market value × age × performance × contract factors), buy/sell with negotiation chance.

### Screen Layer (`src/ui/`) — All extend `Screen` base class
Each screen implements `render()` which calls `this.setContent(htmlString)`. Navigation via `_renderNav(activeId)` + `_bindNav()` pattern repeated in every screen. Status bar via `_renderStatusBar()`.

### Data Flow
```
User Action → Screen event handler → Engine method → GameState.update() → EventBus emit → Screen re-render
```

## Key Conventions

**Language**: All UI text is German. Positions use German abbreviations: TW (goalkeeper), IV/LV/RV (defenders), ZDM/ZM/ZOM/LM/RM (midfield), LA/RA/ST (attack).

**CSS**: DOS-themed components use `.dos-window`, `.dos-btn`, `.dos-table` classes. Color palette via CSS variables (`--text-green: #55ff55`, `--text-red: #ff5555`, `--text-yellow: #ffff55`, `--text-cyan: #55ffff`). Fonts: "Press Start 2P" for headings, "VT323" for body.

**Money format**: Stored as EUR integers. Display: `X.X Mio.` for millions, `X Tsd.` for thousands.

**Player attributes**: 0-99 scale. Fitness/morale: 0-100. Effective team strength = lineup avg overall × (fitness/100) × (0.8 + morale/500).

## Adding a New Screen

1. Create `src/ui/MyScreen.js` extending `Screen`
2. Implement `render()` with `_renderNav('myscreen')`, `_bindNav()`, `_renderStatusBar()`
3. Register in `app.js`: `router.register('#myscreen', new MyScreen())`
4. Add nav entry to `_renderNav()` in all existing screens

## Adding a New Engine Module

1. Create `src/engine/MyEngine.js` with static methods
2. Import `gameState` from core for data access
3. Import `eventBus` to emit domain events
4. Hook into `LeagueManager.simulateMatchday()` if it should run each matchday

## GameState Structure

Top-level: `version`, `season`, `playerTeamId`, `currentMatchday`, `transferWindow`, `teams[]`, `players[]`, `fixtures[][]`, `results[]`.

- `teams[].lineup` — Array of 11 player IDs mapping to formation slot indices
- `teams[].stadium` — Capacity, roof, fanShop, parking, vipBoxes, ticketPrice
- `teams[].finances` — Income/expense arrays with category, amount, matchday
- `players[]` — 270 entries with attributes, salary, contract, fitness, morale, injury state
- `fixtures[matchday][match]` — `{ home, away }` team IDs
- `results[].matches[]` — Goals, events with minute/type/team

## Transfer Window Timing

Summer: matchdays 1-4, Winter: matchdays 17-20, Closed otherwise. Controlled in `LeagueManager.simulateMatchday()`.
