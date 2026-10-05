import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRoomServer } from './rooms.mjs';

async function fixture(t, options = {}) {
  const app = createRoomServer({ roll: () => 6, passDelay: 30, botDelay: 30, ...options });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  async function call(path, data, cookie = '') {
    const response = await fetch(base + path, { method: data ? 'POST' : 'GET', headers: { Cookie: cookie, ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, value: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const host = await call('/api/rooms', { name: 'Host' });
  const path = `/api/rooms/${host.value.code}`;
  const guest = await call(path + '/join', { name: 'Guest' });
  const action = async (actor, data) => {
    const latest = await call(path, null, actor.cookie);
    return call(path + '/action', { ...data, revision: latest.value.revision }, actor.cookie);
  };
  return { ...app, call, host, guest, path, action, base };
}

test('rooms have authenticated opposite seats, capacity, host controls and reconnect', async t => {
  const f = await fixture(t);
  assert.equal(f.host.status, 201);
  assert.equal(f.guest.value.members[1].color, 'yellow');
  assert.equal(JSON.stringify(f.guest.value).includes('token'), false);
  assert.equal((await f.call(f.path)).status, 401);
  assert.equal((await f.action(f.guest, { type: 'START' })).status, 403);
  assert.equal((await f.call(f.path + '/join', { name: 'Again' }, f.guest.cookie)).value.members.length, 2);
  await f.call(f.path + '/join', { name: 'Three' });
  await f.call(f.path + '/join', { name: 'Four' });
  assert.equal((await f.call(f.path + '/join', { name: 'Five' })).status, 409);
  assert.equal((await f.action(f.host, { type: 'START' })).value.game.players.length, 4);
  assert.equal((await f.call(f.path + '/join', { name: 'Late' })).status, 409);
});

test('only current player acts, dice are server controlled, duplicate and illegal moves rejected', async t => {
  const f = await fixture(t);
  await f.action(f.host, { type: 'START' });
  assert.equal((await f.action(f.guest, { type: 'ROLL' })).status, 403);
  assert.equal((await f.action(f.host, { type: 'ROLL', value: 6 })).status, 400);
  const rolled = await f.action(f.host, { type: 'ROLL' });
  assert.equal(rolled.value.game.dice, 6);
  assert.equal(rolled.value.game.phase, 'roll');
  assert.deepEqual(rolled.value.game.tokens.red, [0, -1, -1, -1]);
  await f.action(f.host, { type: 'ROLL' });
  assert.equal((await f.action(f.host, { type: 'MOVE', token: 8 })).status, 409);
  const moved = await f.action(f.host, { type: 'MOVE', token: 1 });
  assert.deepEqual(moved.value.game.tokens.red, [0, 0, -1, -1]);
  assert.equal((await f.call(f.path + '/action', { type: 'ROLL', revision: rolled.value.revision }, f.host.cookie)).status, 409);
});

test('one legal piece moves automatically and winning allows a host rematch', async t => {
  const f = await fixture(t);
  await f.action(f.host, { type: 'START' });
  const internal = f.rooms.get(f.host.value.code);
  internal.game = { ...internal.game, tokens: { ...internal.game.tokens, red: [50, 56, 56, 56] } };
  const won = await f.action(f.host, { type: 'ROLL' });
  assert.equal(won.value.game.phase, 'won');
  assert.deepEqual(won.value.game.tokens.red, [56, 56, 56, 56]);
  assert.equal((await f.action(f.guest, { type: 'REMATCH' })).status, 403);
  assert.equal((await f.action(f.host, { type: 'REMATCH' })).value.status, 'lobby');
  assert.equal((await f.action(f.host, { type: 'START' })).value.game.rollCount, 0);
});

test('leaving transfers host in lobby and gives computer the seat during play', async t => {
  const f = await fixture(t);
  await f.call(f.path + '/leave', {}, f.host.cookie);
  assert.equal((await f.call(f.path, null, f.guest.cookie)).value.hostId, f.guest.value.viewerId);
  const third = await f.call(f.path + '/join', { name: 'New' });
  await f.action(f.guest, { type: 'START' });
  await f.call(f.path + '/leave', {}, third.cookie);
  const snapshot = await f.call(f.path, null, f.guest.cookie);
  assert.equal(snapshot.value.game.players.find(p => p.color === 'red').type, 'bot');
  assert.equal((await f.call(f.path, null, third.cookie)).status, 401);
});

test('event stream synchronizes snapshots and reconnect retains the same seat', async t => {
  const f = await fixture(t);
  const abort = new AbortController();
  const response = await fetch(f.base + f.path + '/events', { headers: { Cookie: f.guest.cookie }, signal: abort.signal });
  const reader = response.body.getReader();
  async function snapshot() {
    let data = '';
    while (!data.includes('data: ')) data += new TextDecoder().decode((await reader.read()).value);
    return JSON.parse(data.split('data: ')[1].split('\n')[0]);
  }
  const initial = await snapshot();
  assert.equal(initial.viewerId, f.guest.value.viewerId);
  assert.equal(initial.members[1].connected, true);
  await f.action(f.host, { type: 'START' });
  const started = await snapshot();
  assert.equal(started.status, 'game');
  assert.equal(started.game.players.length, 2);
  abort.abort();
  const rejoined = await f.call(f.path + '/join', { name: 'Changed' }, f.guest.cookie);
  assert.equal(rejoined.value.viewerId, f.guest.value.viewerId);
  assert.equal(rejoined.value.members.length, 2);
});

test('leaving with a live event stream keeps the room server healthy', async t => {
  const f = await fixture(t);
  const response = await fetch(f.base + f.path + '/events', { headers: { Cookie: f.guest.cookie } });
  const reader = response.body.getReader();
  await reader.read();
  await f.action(f.host, { type: 'START' });
  assert.equal((await f.call(f.path + '/leave', {}, f.guest.cookie)).status, 200);
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await f.call('/api/health')).status, 200);
  assert.equal((await f.call(f.path, null, f.host.cookie)).value.members[1].abandoned, true);
  await reader.cancel();
});

test('two remaining lobby players are reassigned opposite corners before starting', async t => {
  const f = await fixture(t);
  const third = await f.call(f.path + '/join', { name: 'Third' });
  await f.call(f.path + '/leave', {}, f.guest.cookie);
  const started = await f.action(f.host, { type: 'START' });
  assert.deepEqual(started.value.game.players.map(p => p.color), ['red', 'yellow']);
  assert.equal(started.value.members.find(m => m.id === third.value.viewerId).color, 'yellow');
});

async function until(predicate) {
  const end = Date.now() + 2500;
  while (!predicate()) {
    assert.ok(Date.now() < end, 'Timed out waiting for the room state');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('server expires a pending piece choice without resetting the bonus deadline', async t => {
  const f = await fixture(t, { turnMs: 300 });
  const start = await f.action(f.host, { type: 'START' });
  const deadline = start.value.game.turnDeadline;
  await f.action(f.host, { type: 'ROLL' });
  const choice = await f.action(f.host, { type: 'ROLL' });
  assert.equal(choice.value.game.phase, 'move');
  assert.equal(choice.value.game.turnDeadline, deadline);
  const room = f.rooms.get(f.host.value.code);
  await until(() => room.game.players[0].timeouts === 1);
  assert.equal(room.game.turn, 1);
  assert.equal(room.game.phase, 'roll');
  assert.deepEqual(room.game.tokens.red, [0, -1, -1, -1]);
});

test('autopilot belongs to its authenticated seat and taking control keeps the deadline', async t => {
  const f = await fixture(t, { botDelay: 1000 });
  const start = await f.action(f.host, { type: 'START' });
  assert.equal((await f.action(f.guest, { type: 'AUTOPILOT', color: 'red', enabled: true })).status, 403);
  const auto = await f.action(f.guest, { type: 'AUTOPILOT', enabled: true });
  assert.equal(auto.value.game.players[1].autopilot, true);
  assert.equal(auto.value.game.turnDeadline, start.value.game.turnDeadline);
  const hostAuto = await f.call(f.path + '/action', { type: 'AUTOPILOT', enabled: true, revision: start.value.revision }, f.host.cookie);
  assert.equal(hostAuto.status, 200);
  assert.equal((await f.action(f.host, { type: 'ROLL' })).status, 403);
  const manual = await f.action(f.host, { type: 'AUTOPILOT', enabled: false });
  assert.equal(manual.value.game.players[0].autopilot, false);
  assert.equal(manual.value.game.turnDeadline, start.value.game.turnDeadline);
});

test('three server timeouts disqualify a seat while autopilot continues without strikes', async t => {
  const f = await fixture(t, { turnMs: 100, roll: () => 1 });
  await f.action(f.host, { type: 'START' });
  await f.action(f.guest, { type: 'AUTOPILOT', enabled: true });
  const room = f.rooms.get(f.host.value.code);
  await until(() => room.game.phase === 'won');
  assert.equal(room.game.players[0].timeouts, 3);
  assert.equal(room.game.players[0].disqualified, true);
  assert.equal(room.game.players[1].timeouts, 0);
  assert.equal(room.game.winner, 'yellow');
  assert.equal(room.game.winReason, 'last-standing');
  assert.equal((await f.action(f.host, { type: 'AUTOPILOT', enabled: true })).status, 409);
});
