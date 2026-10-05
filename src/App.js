import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import './App.css';
import LudoBoard from './components/LudoBoard';
import Die from './components/Die';
import Dialog from './components/Dialog';
import Icon from './components/Icon';
import RoomPanel from './components/RoomPanel';
import Confetti from './components/Confetti';
import useRoom from './game/useRoom';
import useTurnClock from './game/useTurnClock';
import { COLORS, OPPOSITE, PLAYER_INFO, DEFAULT_PLAYERS, FINISH, TURN_MS, isAutomated, createGame, gameReducer, legalMoves, chooseBotMove, rollDie, isValidSave } from './game/engine';

export const SAVE_KEY = 'ludo-club.game.v1';
function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (isValidSave(saved)) {
      saved.turnDeadline ??= Date.now() + TURN_MS;
      saved.turnId ??= 0;
      if (saved.players.length === 2 && saved.players[1].color !== OPPOSITE[saved.players[0].color]) {
        const oldColor = saved.players[1].color;
        const color = OPPOSITE[saved.players[0].color];
        return { ...saved, players: [saved.players[0], { ...saved.players[1], color }],
          tokens: { ...saved.tokens, [oldColor]: [-1, -1, -1, -1], [color]: saved.tokens[oldColor] },
          winner: saved.winner === oldColor ? color : saved.winner,
          log: saved.log.map(event => event.color === oldColor ? { ...event, color } : event) };
      }
      return saved;
    }
  } catch { /* Storage can be unavailable or a save can be damaged. */ }
  return createGame();
}
const rules = [
  ['Six gets you started', 'Roll a 6 to bring a piece out of your yard. If all four are locked, piece 1 enters automatically. It lands on your colored starting square.'],
  ['Make your way home', 'Move clockwise, then up your own colored home lane. You need an exact roll to finish. Get all four pieces home to win.'],
  ['Stars keep you safe', 'The eight starred squares, including every starting square, protect pieces of all colors from capture.'],
  ['Send them back', 'Land on an opponent on any other track square to send their pieces back to the yard. Pieces can share a square; stacks do not block movement.'],
  ['Earn another roll', 'A 6, a capture, or bringing a piece home gives you one extra roll. A third consecutive 6 ends your turn; your earlier moves stay.'],
  ['Make your move', 'If only one piece can use the roll, it moves automatically. If several can move, click the piece you want. If none can move, your turn passes automatically.'],
  ['Keep the game moving', 'You have one minute for your whole turn, including bonus rolls. Timeouts forfeit the turn; three total timeouts disqualify you and remove your pieces. The last remaining player wins. The clock continues through dialogs and reconnects.'],
  ['Let the bot help', 'Enable autopilot on your seat to let the computer roll and move for you. Take control again whenever you like. Autopilot does not reset the clock or your timeout count.'],
];

function App() {
  const [localGame, localDispatch] = useReducer((state, action) => action.type === 'NEW' ? createGame(action.players) : gameReducer(state, action), undefined, loadGame);
  const network = useRoom();
  const { room, connected, pending, action: roomAction } = network;
  const game = room?.game || localGame;
  const member = room?.members.find(m => m.id === room.viewerId);
  const myTurn = !room || (!!room.game && member?.color === game.players[game.turn].color);
  const roomReady = !room || (connected && !pending && myTurn);
  const dispatch = action => room ? roomAction(action) : localDispatch(action);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(false);
  const rollLock = useRef(false);
  const [modal, setModal] = useState(network.invite ? 'room' : null);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const [draft, setDraft] = useState(DEFAULT_PLAYERS);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const player = game.players[game.turn];
  const isBot = isAutomated(player);
  const seconds = useTurnClock(game.turnDeadline, room?.serverNow);
  const expired = !isBot && seconds === 0;
  const movable = legalMoves(game);
  const canRoll = game.phase === 'roll' && !rolling && !moving && !isBot && !expired && !modal && roomReady;
  const colorStyle = { '--player-color': PLAYER_INFO[player.color].hex };
  const totalHome = game.players.reduce((n, p) => n + game.tokens[p.color].filter(t => t === FINISH).length, 0);
  const recentEvents = game.log[0]?.text === game.message ? game.log.slice(1, 4) : game.log.slice(0, 3);

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(localGame)); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
  }, [localGame]);

  useEffect(() => {
    if (room || isBot || !['roll', 'move'].includes(game.phase)) return;
    const timer = setTimeout(() => {
      rollLock.current = false; setRolling(false);
      localDispatch({ type: 'TIMEOUT' });
    }, Math.max(0, game.turnDeadline - Date.now()));
    return () => clearTimeout(timer);
  }, [room, isBot, game.phase, game.turnDeadline, game.turnId]);

  function toggleAutopilot(seat) {
    if (!room && seat.color === player.color) { rollLock.current = false; setRolling(false); }
    dispatch({ type: 'AUTOPILOT', color: seat.color, enabled: !seat.autopilot });
  }

  const roomCode = room?.code;
  const roomStatus = room?.status;
  useEffect(() => {
    if (!roomCode) return;
    setRolling(false); setMoving(false); rollLock.current = false; setWinnerDismissed(false);
    setModal(roomStatus === 'lobby' ? 'room' : null);
  }, [roomCode, roomStatus]);

  const beginRoll = useCallback(() => {
    if (game.phase !== 'roll' || rollLock.current || moving || modal || !roomReady || expired) return;
    rollLock.current = true;
    setRolling(true);
  }, [game.phase, modal, roomReady, moving, expired]);

  useEffect(() => {
    if (!rolling || modal) return;
    const timer = setTimeout(async () => {
      if (roomCode) await roomAction({ type: 'ROLL' });
      else localDispatch({ type: 'ROLL', value: rollDie() });
      rollLock.current = false;
      setRolling(false);
    }, 480);
    return () => clearTimeout(timer);
  }, [rolling, modal, roomCode, roomAction]);

  useEffect(() => {
    if (room || modal || rolling || moving || game.phase === 'won') return;
    if (!isBot && game.phase === 'move') {
      const available = legalMoves(game);
      if (available.length === 1) localDispatch({ type: 'MOVE', token: available[0] });
      return;
    }
    let action;
    if (game.phase === 'pass') action = () => localDispatch({ type: 'ADVANCE' });
    else if (isBot && game.phase === 'roll') action = beginRoll;
    else if (isBot && game.phase === 'move') action = () => localDispatch({ type: 'MOVE', token: chooseBotMove(game) });
    if (!action) return;
    const timer = setTimeout(action, game.phase === 'pass' ? 1050 : 800);
    return () => clearTimeout(timer);
  }, [game, isBot, rolling, moving, modal, beginRoll, room]);

  function openSetup() {
    if (room) { setModal('room'); return; }
    setDraft(COLORS.map(color => game.players.find(p => p.color === color) || { color, name: PLAYER_INFO[color].label, type: 'off' }));
    setModal('setup');
  }
  function startGame(e) {
    e.preventDefault();
    rollLock.current = false;
    setRolling(false);
    setWinnerDismissed(false);
    localDispatch({ type: 'NEW', players: draft });
    setModal(null);
  }
  const enabledCount = draft.filter(p => p.type !== 'off').length;
  const allBots = draft.filter(p => p.type !== 'off').every(p => p.type === 'bot');
  const prompt = room && !room.game ? 'Waiting for the host to start the room game.'
    : room && !connected ? 'Reconnecting to the room…'
    : room && !myTurn ? `Waiting for ${player.name} to play…`
    : game.phase === 'won' ? `${player.name === 'You' ? 'You take' : `${player.name} takes`} the crown!`
    : moving ? 'Pieces on the move…'
    : rolling ? 'A little luck is on its way…'
    : game.phase === 'move' ? isBot ? `${player.name} is choosing a piece…` : movable.length === 1 ? 'Moving your only available piece…' : `Choose a highlighted piece to move ${game.dice}.`
    : game.phase === 'pass' ? 'Passing the dice…'
    : isBot ? `${player.name} is getting ready to roll…` : game.sixes ? 'You earned another roll. Make it count.' : 'Roll the dice. Let’s make a move.';

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#main" aria-label="Ludo Club home"><span className="brand-icon"><Icon name="dice" size={27} /></span><span>ludo<span className="brand-period">.</span><small>THE GOOD OLD GAME</small></span></a>
      <div className="sidebar-section-label">YOUR PLAYROOM</div>
      <div className="nav-active"><Icon name="dice" /><span>Ludo classic</span><span className="nav-dot" /></div>
      <button className="nav-button" onClick={openSetup}><Icon name="plus" /><span>New game</span></button>
      <button className="nav-button" onClick={() => setModal('room')}><Icon name="people" /><span>LAN rooms</span></button>
      <button className="nav-button" onClick={() => setModal('rules')}><Icon name="help" /><span>How to play</span></button>
      <div className="sidebar-note"><div className="mini-pieces"><i /><i /><i /><i /></div><h3>Small board.<br />Big rivalries.</h3><p>A little strategy, a little luck,<br />and one more round.</p><span>MADE FOR GOOD COMPANY</span></div>
      <div className="sidebar-footer"><span className="online-dot" /> {storageAvailable ? 'Saved on this browser' : 'Playing on this device'}<small>No account. Just play.</small></div>
    </aside>
    <main id="main" className="main-content">
      <header className="page-header"><div><div className="eyebrow"><span /> THE PLAYROOM</div><h1>A classic, <span>for a reason.</span></h1><p>Pick your color. Find your luck. Bring it home.</p></div><button className="button button-outline" onClick={openSetup}><Icon name="plus" size={18} /> New game</button></header>
      <div className="room-banner"><span>{room ? `Room ${room.code} · You are ${PLAYER_INFO[member.color].label} · ${connected ? 'Connected' : 'Reconnecting…'}` : 'Friends on the same Wi-Fi? Play together on separate devices.'}</span><button className="text-button" onClick={() => setModal('room')}>{room ? 'Room details' : 'Create / join room'}</button></div>
      {network.error && modal !== 'room' && <p className="room-error" role="alert">{network.error}</p>}
      <div className="game-layout">
        <section className="board-panel" aria-label="Game board">
          <div className="board-toolbar"><div><span className="live-indicator" /> Ludo classic <span className="tag">{game.players.length} PLAYERS</span></div><button className="text-button" onClick={() => setModal('rules')}><Icon name="help" size={16} /> Rules</button></div>
          <LudoBoard key={roomCode || 'local'} onAnimating={setMoving} game={game} onMove={token => dispatch({ type: 'MOVE', token })} interactive={!isBot && !expired && !rolling && !moving && !modal && roomReady} />
          <div className="board-caption"><span><Icon name="star" size={15} /> Starred squares are safe</span><span>First to bring all 4 home wins <Icon name="trophy" size={15} /></span></div>
        </section>
        <aside className="game-controls" aria-label="Game controls">
          <section className="turn-card" style={colorStyle}>
            <div className="card-eyebrow"><span className="player-dot" /> {game.phase === 'won' ? 'WINNER’S CIRCLE' : 'AT THE DICE'}</div>
            <div className="turn-heading"><h2>{game.phase === 'won' ? player.name === 'You' ? 'You win!' : `${player.name} wins!` : `${player.name}${player.name === 'You' ? 'r' : '’s'} turn`}</h2><span className="turn-color">{PLAYER_INFO[player.color].label}</span></div>
            {game.phase !== 'won' && (!room || room.game) && <div className={`turn-clock ${seconds <= 10 && !isBot ? 'turn-clock-urgent' : ''}`}><span>{isBot ? player.autopilot ? 'Autopilot is playing' : 'Computer is playing' : 'Turn time remaining'}</span>{!isBot && <strong role="timer" aria-label="Turn time remaining">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong>}</div>}
            <div className="dice-stage"><span className="dice-orbit orbit-one" /><span className="dice-orbit orbit-two" /><Die value={game.dice} rolling={rolling} disabled={!canRoll} onRoll={beginRoll} /></div>
            <p className="turn-prompt" aria-live="polite">{prompt}</p>
            {game.phase === 'move' && !isBot && <div className="piece-choices" aria-label="Available pieces">{movable.map(token => <button key={token} disabled={!roomReady || expired || rolling || moving || !!modal} className={player.color === 'yellow' ? 'choice-gold' : ''} onClick={() => dispatch({ type: 'MOVE', token })} style={colorStyle} aria-label={`Move ${PLAYER_INFO[player.color].label} piece ${token + 1}`}>{token + 1}</button>)}</div>}
            <button className="button roll-button" style={colorStyle} disabled={!canRoll} onClick={beginRoll}><Icon name="dice" size={20} /> {rolling ? 'Rolling…' : game.phase === 'move' ? 'Select a piece' : game.phase === 'won' ? 'Game complete' : game.phase === 'pass' ? 'Next turn…' : isBot ? 'Computer’s turn' : 'Roll dice'}<Icon name="arrow" size={18} /></button>
            <div className="turn-hint">{game.phase === 'move' ? `${movable.length} ${movable.length === 1 ? 'piece' : 'pieces'} can move` : game.sixes && game.phase === 'roll' ? `${game.sixes} consecutive ${game.sixes === 1 ? 'six' : 'sixes'} · three ends your turn` : 'Roll a 6 to leave your home base'}</div>
          </section>
          <section className="players-card"><div className="card-title"><h3>The players</h3><Icon name="people" size={18} /></div>
            {game.players.map((p, i) => {
              const home = game.tokens[p.color].filter(t => t === FINISH).length;
              const inPlay = game.tokens[p.color].filter(t => t >= 0 && t < FINISH).length;
              return <div key={p.color} className={`player-row ${p.disqualified ? 'player-row-out' : i === game.turn ? 'player-row-active' : ''}`} style={{ '--player-color': PLAYER_INFO[p.color].hex }}>
                <div className="player-avatar">{isAutomated(p) ? <Icon name="bot" size={19} /> : <Icon name="people" size={19} />}</div>
                <div className="player-details"><div>{p.name}<span>{p.disqualified ? 'OUT' : p.autopilot ? 'AUTO' : p.type === 'bot' ? 'CPU' : room ? 'LAN' : 'LOCAL'}</span></div><small>{p.disqualified ? 'Disqualified · 3 timeouts' : `${inPlay} in play · ${home} home${p.timeouts ? ` · ${p.timeouts}/3 timeouts` : ''}`}</small>
                  {p.type === 'human' && !p.disqualified && game.phase !== 'won' && (!room || (!!room.game && member?.color === p.color)) && <button className="autopilot-button" aria-pressed={!!p.autopilot} disabled={!!room && (!connected || pending)} onClick={() => toggleAutopilot(p)} aria-label={`${p.autopilot ? 'Take control of' : 'Enable autopilot for'} ${p.name}`}>{p.autopilot ? 'Take control' : 'Enable autopilot'}</button>}</div>
                <div className="home-progress" aria-label={`${p.name}: ${home} of 4 pieces home`}>{[0, 1, 2, 3].map(n => <i key={n} className={n < home ? 'is-home' : ''} />)}</div>
              </div>;
            })}
          </section>
          <section className="activity-card"><div className="card-title"><h3>Around the board</h3><span className="activity-count">{game.rollCount} rolls</span></div><div className="activity-current" role="status"><span style={{ background: PLAYER_INFO[player.color].hex }} />{game.message}</div>
            <ol className="activity-list">{recentEvents.map(event => <li key={event.id}><span style={{ background: PLAYER_INFO[event.color].hex }} />{event.text}</li>)}</ol>
            {!game.log.length && <p className="activity-empty">Every great game starts with a roll.</p>}
          </section>
        </aside>
      </div>
      <footer className="main-footer"><span><Icon name="check" size={15} /> {room ? 'Live game shared with your room' : storageAvailable ? 'Your game saves automatically' : 'Browser storage unavailable; keep this tab open'}</span><span>{totalHome} / {game.players.length * 4} pieces home <span className="footer-divider">/</span> Enjoy the journey.</span></footer>
    </main>
    {modal === 'room' && <Dialog title="Play together on your network" onClose={() => setModal(null)}><RoomPanel network={network} /></Dialog>}
    {modal === 'rules' && <Dialog title="A quick guide to Ludo" onClose={() => setModal(null)}><p className="dialog-intro">Four pieces. One finish line. Here are our house rules.</p><ol className="rules-list">{rules.map(([title, text], i) => <li key={title}><span>{String(i + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol><button className="button button-dark full-width" onClick={() => setModal(null)}>Got it. Let’s play <Icon name="arrow" size={18} /></button></Dialog>}
    {modal === 'setup' && <Dialog title="Good company. New game." onClose={() => setModal(null)}><form onSubmit={startGame}><p className="dialog-intro">Choose 2–4 players. Share the screen with friends or take on the computer.</p><div className="setup-players">{draft.map((p, i) => <div className="setup-row" key={p.color} style={{ '--player-color': PLAYER_INFO[p.color].hex }}><span className="setup-color" /><label><span className="sr-only">{PLAYER_INFO[p.color].label} player name</span><input aria-label={`${PLAYER_INFO[p.color].label} player name`} value={p.name} maxLength={20} disabled={p.type === 'off'} onChange={e => setDraft(draft.map((row, n) => n === i ? { ...row, name: e.target.value } : row))} /></label><select aria-label={`${PLAYER_INFO[p.color].label} player type`} value={p.type} onChange={e => setDraft(draft.map((row, n) => n === i ? { ...row, type: e.target.value } : row))}><option value="human">Local player</option><option value="bot">Computer</option><option value="off">Empty seat</option></select></div>)}</div><p className="setup-note">{enabledCount < 2 ? 'Choose at least two players to start.' : allBots ? 'All computer players selected. Sit back and watch a game.' : enabledCount === 2 ? 'Two-player games automatically use opposite corners.' : 'Choose your colors and opponents.'}</p><p className="reset-note">Starting a new game replaces your current saved game.</p><button className="button button-dark full-width" type="submit" disabled={enabledCount < 2}>Let’s play <Icon name="arrow" size={18} /></button></form></Dialog>}
    {(!room || room.game) && game.phase === 'won' && !moving && !modal && !winnerDismissed && <Dialog title={`${player.name === 'You' ? 'You take' : `${player.name} takes`} the crown!`} onClose={() => setWinnerDismissed(true)}><Confetti /><div className="winner-content" style={colorStyle}><div className="victory-kicker">VICTORY!</div><div className="winner-trophy"><Icon name="trophy" size={52} /></div><h3>{game.winReason === 'last-standing' ? 'Last player standing!' : 'All roads lead home.'}</h3><p>{game.winReason === 'last-standing' ? 'Every other player was disqualified.' : `Four pieces home. ${game.rollCount} rolls around the board.`}<br />A well-earned win for {player.name}.</p><button className="button button-dark full-width" onClick={openSetup}>One more round <Icon name="arrow" size={18} /></button><button className="text-button" onClick={() => setWinnerDismissed(true)}>Take a look at the board</button></div></Dialog>}
  </div>;
}
export default App;
