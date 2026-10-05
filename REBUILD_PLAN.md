# Ludo rebuild

## Why replace it

The original mixes game rules with DOM positions, mutates state in place, generates only 4 and 6, and uses independent timers without a reliable turn boundary. It has no complete win flow, responsive board, or meaningful tests.

## Architecture

1. A pure game engine owns token progress, legal moves, captures, turns, and winning. React renders that state; screen coordinates never determine game rules.
2. One 52-square track and four five-square home lanes drive an SVG board and HTML token buttons. Token positions are proportional to the board, including separated stacks.
3. A reducer runs a roll → choose → resolve flow. Click the die or roll button to roll; one legal move resolves automatically, while multiple legal moves require selection. Animation and computer timers are cancellable. Invalid and duplicate actions are ignored by the engine.
4. Two to four configurable human/computer seats. Default: one human and three computers. Saves are versioned and validated; unavailable browser storage does not prevent play.
5. A warm, responsive interface: explicit turn prompt, selectable pieces, safe-square symbols, progress, recent moves, keyboard access, rule dialog, and winner screen.

6. LAN multiplayer uses a Node HTTP server with room codes, private seat cookies, and live server-sent events. The server owns dice, move validation, single-option movement, passing, and abandoned-seat computers. Browser state is a view of that authoritative game. One startup command binds the app to all network interfaces; local games remain available separately.

## Chosen house rules

- Roll a six to leave the yard. Entry uses the whole roll. When all four pieces are locked, piece 1 enters automatically.
- Two-player games always use opposite corners, including LAN rooms after lobby departures.
- Move clockwise, then into your own home lane; an exact roll is required to finish.
- The four starting squares and four starred squares are safe for every color.
- Landing on an unsafe square captures opposing pieces there. Stacks do not form blockades; every captured piece returns to its yard.
- A six, capture, or finished piece earns one extra roll (bonuses do not accumulate).
- A third consecutive six forfeits that roll and ends the turn; earlier moves remain.
- No legal moves ends the turn. First player to bring all four pieces home wins.

## Verification

Engine tests cover all colors' routes, safe squares, captures, exact finishing, bonus turns, three sixes, inactive seats, invalid actions, winning, and saved-state validation. Seeded full-game simulations exercise the state machine through completion. UI tests cover rolling, choosing a piece, configuration, rules, and reload. Run the production build and inspect desktop/mobile layouts and live interaction in the browser.

Room tests verify capacity, authentication, host permissions, turn ownership, server dice, duplicate moves, automatic movement, wins/rematches, leaving, and live reconnect. Browser checks use independent sessions on the LAN address to verify synchronization and input permissions.

## Turn clock and autopilot

Human turns have a 60-second absolute deadline, shared by their bonus rolls. Local saves retain the deadline; LAN rooms enforce it on the server. Timeouts forfeit the turn and count cumulatively. The third timeout disqualifies the player, clears their pieces, and skips their seat. A remaining sole player wins without needing all pieces home. Autopilot controls a human seat through the existing bot strategy, is reversible by its owner, and preserves deadlines and penalties. Rematches reset penalties and autopilot.
