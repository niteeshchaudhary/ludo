import React, { useState } from 'react';
import { PLAYER_INFO } from '../game/engine';

export default function RoomPanel({ network }) {
  const { room, pending, error, connected } = network;
  const [name, setName] = useState('');
  const [named, setNamed] = useState(false);
  const [code, setCode] = useState(network.invite);
  const [address, setAddress] = useState(0);
  const host = room?.viewerId === room?.hostId;
  const localHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const origin = localHost ? room?.joinUrls[address] || room?.joinUrls[0] : `${window.location.origin}/?room=${room?.code}`;
  return <div className="room-panel">
    {!room && !named ? <form onSubmit={e => { e.preventDefault(); if (name.trim()) { setName(name.trim()); setNamed(true); } }}>
      <p className="dialog-intro">First, what should your friends call you?</p>
      <label>Your name<input autoFocus value={name} maxLength={20} placeholder="Player name" onChange={e => setName(e.target.value)} /></label>
      <button className="button button-dark full-width" disabled={!name.trim()}>Continue</button>
    </form> : !room ? <>
      <div className="room-greeting"><strong>Hi, {name}!</strong><button className="text-button" onClick={() => setNamed(false)}>Change name</button></div>
      <p className="dialog-intro">Play on separate devices connected to the same network. Create a room, then share its code or link.</p>
      <button className="button button-dark full-width" disabled={pending || !name.trim()} onClick={() => network.create(name)}>Create room</button>
      <div className="room-divider">OR JOIN FRIENDS</div>
      <form onSubmit={e => { e.preventDefault(); network.join(code, name); }}><label>Room code<input value={code} maxLength={6} placeholder="ABC234" onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" /></label><button className="button button-outline full-width" disabled={pending || !name.trim() || code.length !== 6}>Join room</button></form>
    </> : <>
      <p className="dialog-intro">{room.status === 'lobby' ? 'Invite 2–4 players, then the room host can start.' : 'Everyone sees the same board. Only the active player can roll and move.'}</p>
      <div className="room-code">{room.code}</div>
      {localHost && room.joinUrls.length > 1 && <label>Network address<select value={address} onChange={e => setAddress(Number(e.target.value))}>{room.joinUrls.map((url, i) => <option key={url} value={i}>{new URL(url).host}</option>)}</select></label>}
      <label>Invite link<input aria-label="Invite link" readOnly value={origin || `${window.location.origin}/?room=${room.code}`} onFocus={e => e.target.select()} /></label>
      <div className="room-members">{room.members.map(member => <div key={member.id} style={{ '--player-color': PLAYER_INFO[member.color].hex }}><span className="player-dot" /><strong>{member.name}{member.id === room.viewerId ? ' (you)' : ''}</strong><small>{member.abandoned ? 'Computer' : member.connected ? 'Connected' : 'Reconnecting'}{member.id === room.hostId ? ' · Host' : ''}</small></div>)}</div>
      <p className="setup-note">{connected ? 'Connected to room' : 'Reconnecting to room…'}</p>
      {room.status === 'lobby' && (host ? <button className="button button-dark full-width" disabled={pending || !connected || room.members.length < 2} onClick={() => network.action({ type: 'START' })}>Start room game</button> : <p>Waiting for the host to start.</p>)}
      {room.game?.phase === 'won' && host && <button className="button button-dark full-width" disabled={pending || !connected} onClick={() => network.action({ type: 'REMATCH' })}>Set up another round</button>}
      <button className="text-button" disabled={pending} onClick={network.leave}>Leave room</button>
      <p className="reset-note">During a game, a computer takes over a seat when its player leaves. Rooms last while the server is running.</p>
    </>}
    {pending && <p role="status">Connecting…</p>}
    {error && <p className="room-error" role="alert">{error}</p>}
  </div>;
}
