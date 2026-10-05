import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'ludo-club.room.v1';
export default function useRoom() {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const current = useRef(null);
  const busy = useRef(false);
  const invite = new URLSearchParams(window.location.search).get('room') || '';
  const update = useCallback(value => {
    if (current.current?.code === value.code && current.current.revision > value.revision) return;
    current.current = value;
    setRoom(value);
    try { localStorage.setItem(KEY, value.code); } catch { /* Optional resume. */ }
  }, []);
  const request = useCallback(async (path, body) => {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || 'The room request failed.');
    return value;
  }, []);
  useEffect(() => {
    let code;
    try { code = localStorage.getItem(KEY); } catch { return; }
    if (!code || (invite && invite !== code)) return;
    let active = true;
    request(`/api/rooms/${code}`).then(value => { if (active) update(value); }).catch(() => { try { localStorage.removeItem(KEY); } catch { /* Optional resume. */ } });
    return () => { active = false; };
  }, [invite, request, update]);
  useEffect(() => {
    if (!room?.code) return;
    setConnected(false);
    const stream = new EventSource(`/api/rooms/${room.code}/events`);
    stream.onmessage = event => {
      if (current.current?.code !== room.code) return;
      update(JSON.parse(event.data)); setConnected(true);
    };
    stream.onerror = () => setConnected(false);
    return () => { stream.close(); setConnected(false); };
  }, [room?.code, update]);
  const run = useCallback(async (operation) => {
    if (busy.current) return;
    busy.current = true; setPending(true); setError('');
    try { await operation(); } catch (e) { setError(e.message); }
    finally { busy.current = false; setPending(false); }
  }, []);
  const create = (name) => run(async () => update(await request('/api/rooms', { name })));
  const join = (code, name) => run(async () => {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalized)) throw new Error('Enter the six-character room code.');
    update(await request(`/api/rooms/${normalized}/join`, { name }));
  });
  const action = useCallback(value => run(async () => {
    const snapshot = current.current;
    if (!snapshot) return;
    try { update(await request(`/api/rooms/${snapshot.code}/action`, { ...value, revision: snapshot.revision })); }
    catch (e) { update(await request(`/api/rooms/${snapshot.code}`)); throw e; }
  }), [run, request, update]);
  const leave = () => run(async () => {
    await request(`/api/rooms/${current.current.code}/leave`, {});
    current.current = null; setRoom(null); setConnected(false);
    try { localStorage.removeItem(KEY); } catch { /* Optional resume. */ }
    window.history.replaceState(null, '', window.location.pathname);
  });
  return { room, connected, pending, error, invite, create, join, action, leave };
}
