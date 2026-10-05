# Ludo Club

A rebuilt Ludo game in React. Play with 2–4 players on one screen, computer opponents, or friends on separate devices over your LAN. The default game is you against three computers.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm start
```

`npm start` launches the React app on **0.0.0.0:3000** and its room server on 127.0.0.1:3001. The app proxies room requests, so other devices only need port 3000. The terminal prints available LAN addresses. Open http://localhost:3000 on the host; friends open its Wi-Fi IP address, for example `http://192.168.1.50:3000`, on the same network.

To set the host explicitly in PowerShell:

```powershell
$env:HOST="0.0.0.0"
npm start
```

If Windows prompts about network access, allow Node.js on your private network.

### LAN rooms

Click **Create / join room**, enter your name, and press **Continue**. Then choose **Create room** or enter a code to **Join room**. Share its six-character code or invite link. Friends join from their own browsers. After 2–4 players join, the host clicks **Start room game**. Each device controls its own color; turns and moves update live. Click the die to roll. A single legal piece moves automatically; multiple choices require clicking a piece.

Dice and legal moves are controlled by the server. Reloading reconnects to your seat on the same browser and address. A temporary disconnection retains your seat; explicitly leaving gives the seat to a computer. Each human turn has a one-minute countdown, including bonus rolls. The server enforces it even if the player disconnects. A timeout forfeits the turn; three total timeouts disqualify that player and remove their pieces. If only one player remains, they win.

Use **Enable autopilot** below your own name to let the bot roll and move. Use **Take control** to resume manual play, including during another player’s turn. Autopilot preserves timeout strikes and the original turn deadline; if you take control after that deadline, the turn times out immediately. Computer-controlled seats do not incur timeouts. In a shared-screen game, each human seat has its own toggle.

Wins include a brief confetti celebration and trophy animation. After a win, the host can set up another round through **Room details**. Rooms are held in memory and disappear when the server stops. No account is required.

When creating from localhost, the invite link uses a LAN address. If your computer has multiple network adapters, select the Wi-Fi address in **Network address**. All players should use the same LAN address throughout a game.

For a production build with one server:

```sh
npm run build
npm run serve
```

This serves the app and room API together on **0.0.0.0:3000**. `HOST` and `PORT` can override the defaults.

## Verify

```sh
npm test -- --watchAll=false --runInBand
npm run test:server
npm run build
```

Tests cover game rules, route geometry, saved-game validation, UI interaction, timer cancellation, and 100 seeded games played through to a winner.

## Playing

Use **New game** to choose player names and local/computer/empty seats. Click the die or **Roll dice** to roll. If exactly one piece can use the roll, it moves automatically; if several can move, select a highlighted piece. Moves hop through each intervening square. Captured pieces wait for the landing, then quickly retrace their route to the yard. Controls wait for movement to finish; reduced-motion preferences skip these animations. Single-device games save in browser local storage and restores pending moves on reload. Opening rules or setup pauses local computer moves; the human turn clock continues. Reloading retains the deadline and timeout strikes. The app works without storage, but that game will not survive closing the tab.

House rules: a six enters a piece; when all four pieces are locked, piece 1 enters automatically; two-player games use opposite corners; exact rolls finish; eight starred squares are safe; unsafe landings capture every opposing piece there. Stacks do not block movement. A six, capture, or finish earns one bonus roll. The third consecutive six forfeits that roll without undoing earlier moves. No available move ends the turn. First to finish all four pieces wins.

## Code

- `src/game/engine.js`: pure reducer, legal moves, route coordinates, computer choices, fair dice, and save validation.
- `src/components/LudoBoard.js`: responsive SVG board with accessible HTML token buttons.
- `src/App.js`: game flow, cancellable timers, player setup, saves, rules, and winner flow.
- `src/App.css`: desktop and mobile presentation with reduced-motion support.

- `server/rooms.mjs`: authoritative LAN rooms, authenticated seats, live events, server dice, and automated turns.
- `src/game/useRoom.js`: room requests, live synchronization, and seat reconnect.
- `scripts/dev.cjs`: runs both development services and prints LAN URLs.

See [REBUILD_PLAN.md](REBUILD_PLAN.md) for the replacement plan and rule decisions.
