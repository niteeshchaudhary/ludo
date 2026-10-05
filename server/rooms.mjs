import http from 'node:http';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { COLORS, OPPOSITE, createGame, gameReducer, legalMoves, chooseBotMove, isAutomated, TURN_MS } from '../src/game/engine.js';

const SEAT_ORDER = ['red', 'yellow', 'green', 'blue'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

export function createRoomServer({ roll = () => randomInt(1, 7), passDelay = 1050, botDelay = 800, turnMs = TURN_MS, publicPort = 3000, staticDir = null } = {}) {
  const rooms = new Map();
  const cookieName = code => `ludo_seat_${code}`;
  function cookie(response, code, token) {
    response.setHeader('Set-Cookie', `${cookieName(code)}=${token}; Path=/api/rooms/${code}; HttpOnly; SameSite=Strict; Max-Age=${token ? 86400 : 0}`);
  }
  function authorize(request, room) {
    const cookies = Object.fromEntries((request.headers.cookie || '').split(';').map(c => c.trim().split('=')));
    const member = room.members.find(m => !m.abandoned && m.token === cookies[cookieName(room.code)]);
    if (!member) fail(401, 'Join this room to continue.');
    return member;
  }
  function joinUrls(code) {
    const addresses = Object.entries(networkInterfaces())
      .sort(([a], [b]) => Number(/wi-fi|wlan/i.test(b)) - Number(/wi-fi|wlan/i.test(a)))
      .flatMap(([, entries]) => entries || []).filter(a => a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'));
    return [...new Set(addresses.map(a => `http://${a.address}:${publicPort}/?room=${code}`))];
  }
  function view(room, member) {
    return {
      code: room.code, revision: room.revision, status: room.game ? 'game' : 'lobby', game: room.game, serverNow: Date.now(),
      hostId: room.hostId, viewerId: member.id, joinUrls: joinUrls(room.code),
      members: room.members.map(m => ({ id: m.id, name: m.name, color: m.color, connected: m.streams.size > 0, abandoned: !!m.abandoned })),
    };
  }
  function broadcast(room) {
    room.revision++;
    room.updated = Date.now();
    for (const m of room.members) for (const stream of m.streams) {
      if (!stream.destroyed && !stream.writableEnded) stream.write(`data: ${JSON.stringify(view(room, m))}\n\n`);
    }
  }
  function destroy(room) {
    clearTimeout(room.timer);
    clearTimeout(room.deadlineTimer);
    rooms.delete(room.code);
    for (const m of room.members) for (const stream of m.streams) stream.end();
  }
  function schedule(room) {
    clearTimeout(room.timer);
    clearTimeout(room.deadlineTimer);
    if (!room.game || room.game.phase === 'won') return;
    const state = room.game;
    const player = state.players[state.turn];
    if (!isAutomated(player) && ['roll', 'move'].includes(state.phase)) {
      room.deadlineTimer = setTimeout(() => {
        if (!rooms.has(room.code)) return;
        room.game = gameReducer(room.game, { type: 'TIMEOUT' });
        if (room.game.turnId !== state.turnId && room.game.phase !== 'won') room.game = { ...room.game, turnDeadline: Date.now() + turnMs };
        broadcast(room); schedule(room);
      }, Math.max(0, state.turnDeadline - Date.now()));
      room.deadlineTimer.unref();
    }
    const autoPiece = state.phase === 'move' && legalMoves(state).length === 1;
    if (autoPiece) {
      room.game = gameReducer(state, { type: 'MOVE', token: legalMoves(state)[0] });
      broadcast(room);
      schedule(room);
      return;
    }
    if (state.phase !== 'pass' && !isAutomated(player)) return;
    room.timer = setTimeout(() => {
      if (!rooms.has(room.code)) return;
      const action = state.phase === 'pass' ? { type: 'ADVANCE' }
        : state.phase === 'roll' ? { type: 'ROLL', value: roll() }
        : { type: 'MOVE', token: chooseBotMove(state) };
      room.game = gameReducer(room.game, action);
      if (action.type === 'ADVANCE') room.game = { ...room.game, turnDeadline: Date.now() + turnMs };
      broadcast(room);
      schedule(room);
    }, state.phase === 'pass' ? passDelay : botDelay);
    room.timer.unref();
  }
  function json(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(data));
  }
  async function body(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) fail(415, 'Send a JSON request.');
    let text = '';
    for await (const chunk of request) {
      text += chunk;
      if (Buffer.byteLength(text) > 4096) fail(413, 'Request too large.');
    }
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Invalid request.');
      return data;
    } catch { fail(400, 'Invalid JSON request.'); }
  }
  function newMember(data, room) {
    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 20) : '';
    if (!name) fail(400, 'Enter your player name.');
    const color = SEAT_ORDER.find(c => !room.members.some(m => m.color === c));
    if (!color) fail(409, 'This room is full.');
    const member = { id: randomUUID(), token: randomBytes(24).toString('hex'), color, name, streams: new Set() };
    room.members.push(member);
    return member;
  }
  function serveFile(request, response, pathname) {
    if (!staticDir || !['GET', 'HEAD'].includes(request.method)) return false;
    const root = path.resolve(staticDir);
    const target = path.resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(root + path.sep)) fail(403, 'Invalid path.');
    const file = fs.existsSync(target) && fs.statSync(target).isFile() ? target : path.join(root, 'index.html');
    if (!fs.existsSync(file)) fail(404, 'Run npm run build first.');
    response.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
    return true;
  }
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/health' && request.method === 'GET') return json(response, 200, { ok: true });
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        if (rooms.size >= 200) fail(503, 'Too many rooms. Try again later.');
        const data = await body(request);
        let code;
        do { code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(''); } while (rooms.has(code));
        const room = { code, revision: 0, game: null, members: [], timer: null, updated: Date.now() };
        const member = newMember(data, room);
        room.hostId = member.id;
        rooms.set(code, room);
        cookie(response, code, member.token);
        return json(response, 201, view(room, member));
      }
      const match = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|events|action|leave))?$/);
      if (!match) {
        if (url.pathname.startsWith('/api/')) fail(404, 'Unknown room endpoint.');
        if (serveFile(request, response, decodeURIComponent(url.pathname))) return;
        fail(404, 'Not found.');
      }
      const [, code, route] = match;
      const room = rooms.get(code);
      if (!room) fail(404, 'Room not found. Create a new room or check the code.');
      if (route === 'join' && request.method === 'POST') {
        const data = await body(request);
        let member;
        try { member = authorize(request, room); } catch { /* A new device needs a new seat. */ }
        if (!member) {
          if (room.game) fail(409, 'This game has started. Wait for the next round.');
          member = newMember(data, room);
          broadcast(room);
        }
        cookie(response, code, member.token);
        return json(response, 200, view(room, member));
      }
      const member = authorize(request, room);
      if (!route && request.method === 'GET') return json(response, 200, view(room, member));
      if (route === 'events' && request.method === 'GET') {
        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        response.write('retry: 1500\n\n');
        member.streams.add(response);
        response.on('error', () => member.streams.delete(response));
        broadcast(room);
        const heartbeat = setInterval(() => {
          if (!response.destroyed && !response.writableEnded) response.write(': heartbeat\n\n');
          room.updated = Date.now();
        }, 15000);
        heartbeat.unref();
        response.on('close', () => {
          clearInterval(heartbeat);
          member.streams.delete(response);
          if (rooms.has(code) && !member.abandoned) broadcast(room);
        });
        return;
      }
      if (route === 'leave' && request.method === 'POST') {
        await body(request);
        cookie(response, code, '');
        const streams = [...member.streams];
        member.streams.clear();
        for (const stream of streams) stream.end();
        if (room.game) {
          member.abandoned = true;
          room.game = { ...room.game, players: room.game.players.map(p => p.color === member.color ? { ...p, type: 'bot' } : p) };
        } else room.members = room.members.filter(m => m !== member);
        const remaining = room.members.filter(m => !m.abandoned);
        if (!remaining.length) destroy(room);
        else {
          if (room.hostId === member.id) room.hostId = remaining[0].id;
          broadcast(room);
          schedule(room);
        }
        return json(response, 200, { ok: true });
      }
      if (route === 'action' && request.method === 'POST') {
        const data = await body(request);
        if (data.type !== 'AUTOPILOT' && data.revision !== room.revision) fail(409, 'The room changed. Please try again.');
        if (data.type === 'START' || data.type === 'REMATCH') {
          if (member.id !== room.hostId) fail(403, 'Only the host can start a round.');
          if (data.type === 'REMATCH') {
            if (room.game?.phase !== 'won') fail(409, 'Finish this round before starting another.');
            room.members = room.members.filter(m => !m.abandoned);
            room.game = null;
          } else {
            if (room.game) fail(409, 'This round has already started.');
            if (room.members.length < 2) fail(400, 'At least two players must join.');
            if (room.members.length === 2) room.members[1].color = OPPOSITE[room.members[0].color];
            room.game = createGame(COLORS.flatMap(color => room.members.filter(m => m.color === color).map(m => ({ color, name: m.name, type: 'human' }))));
            room.game.turnDeadline = Date.now() + turnMs;
          }
        } else {
          if (!room.game) fail(409, 'Wait for the host to start the game.');
          const currentPlayer = room.game.players[room.game.turn];
          if (!isAutomated(currentPlayer) && ['roll', 'move'].includes(room.game.phase) && Date.now() >= room.game.turnDeadline) {
            room.game = gameReducer(room.game, { type: 'TIMEOUT' });
            if (room.game.phase !== 'won') room.game = { ...room.game, turnDeadline: Date.now() + turnMs };
            broadcast(room); schedule(room);
            fail(409, 'The turn timed out.');
          }
          if (data.type === 'AUTOPILOT') {
            if (data.color !== undefined && data.color !== member.color) fail(403, 'You can only change your own autopilot.');
            const next = gameReducer(room.game, { type: 'AUTOPILOT', color: member.color, enabled: data.enabled });
            if (next === room.game) fail(409, 'Autopilot is not available for this seat.');
            room.game = next;
            broadcast(room); schedule(room);
            return json(response, 200, view(room, member));
          }
          if (currentPlayer.disqualified || isAutomated(currentPlayer)) fail(403, 'This seat is not under manual control.');
          if (room.game.players[room.game.turn].color !== member.color) fail(403, 'It is not your turn.');
          if (!['ROLL', 'MOVE'].includes(data.type)) fail(400, 'Invalid game action.');
          if (data.type === 'ROLL' && Object.hasOwn(data, 'value')) fail(400, 'The server rolls the die.');
          const next = gameReducer(room.game, data.type === 'ROLL' ? { type: 'ROLL', value: roll() } : { type: 'MOVE', token: data.token });
          if (next === room.game) fail(409, 'That action is not available.');
          room.game = next;
        }
        broadcast(room);
        schedule(room);
        return json(response, 200, view(room, member));
      }
      fail(405, 'Method not allowed.');
    } catch (error) {
      if (!response.headersSent) json(response, error.status || 500, { error: error.status ? error.message : 'Room server error. Try again.' });
      else response.end();
    }
  });
  const expiry = setInterval(() => {
    for (const room of rooms.values()) if (Date.now() - room.updated > 86400000) destroy(room);
  }, 60000);
  expiry.unref();
  function close() {
    clearInterval(expiry);
    for (const room of rooms.values()) destroy(room);
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  }
  return { server, rooms, close };
}
