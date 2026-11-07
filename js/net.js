// Playing together, peer to peer (WebRTC), with signalling over public Nostr relays (Trystero).
// No Teduh server and no account. Shared: display name, colour, hat, position, preset phrases and
// community-project deliveries. Like any peer-to-peer call, other players' browsers can see your IP address.

import { PHRASES, PROJECTS, ITEMS } from './data.js';

const APP_ID = 'teduh-sky-islands-v1';
export const PLAZA = 'plaza';

function wrapAction(room, name) {
  const made = room.makeAction(name);
  if (Array.isArray(made)) {
    const [send, receive] = made;
    return { send: (data, peerId) => send(data, peerId), on: (handler) => receive(handler) };
  }
  return {
    send: (data, peerId) => made.send(data, peerId ? { target: peerId } : {}).catch(() => {}),
    on: (handler) => {
      made.onMessage = (data, meta) => handler(data, meta && meta.peerId);
    },
  };
}
function onRoom(room, eventName, handler) {
  if (typeof room[eventName] === 'function' && room[eventName].length > 0) {
    room[eventName](handler);
  } else {
    room[eventName] = handler;
  }
}

export const safeName = (value) => String(value || 'Guest').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 18) || 'Guest';
const safeColor = (value) => (/^#[0-9a-f]{6}$/i.test(value) ? value : '#8c9196');
const safeHat = (value) => (['hat_straw', 'hat_cap', 'hat_crown'].includes(value) ? value : null);
export function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
export const cleanRoomCode = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

// handlers: { join(id, info), leave(id), state(id, {x,z,f}), say(id, phraseId), give(id, {p, item, n}) }
export async function joinTogether(roomCode, profile, handlers) {
  const { joinRoom } = await import('../vendor/trystero-nostr.js');
  const room = joinRoom({ appId: APP_ID }, `teduh-${roomCode}`);
  const actions = {
    hello: wrapAction(room, 'hello'),
    state: wrapAction(room, 'state'),
    say: wrapAction(room, 'say'),
    give: wrapAction(room, 'give'),
  };
  const known = new Map();
  let lastState = null;
  let me = { ...profile };

  onRoom(room, 'onPeerJoin', (peerId) => {
    actions.hello.send({ name: me.name, color: me.color, hat: me.hat }, peerId);
    if (lastState) {
      actions.state.send(lastState, peerId);
    }
  });
  onRoom(room, 'onPeerLeave', (peerId) => {
    if (known.has(peerId)) {
      known.delete(peerId);
      handlers.leave(peerId);
    }
  });
  actions.hello.on((data, peerId) => {
    if (!data || known.has(peerId) || known.size >= 24) {
      return;
    }
    const info = { name: safeName(data.name), color: safeColor(data.color), hat: safeHat(data.hat) };
    known.set(peerId, info);
    handlers.join(peerId, info);
  });
  actions.state.on((data, peerId) => {
    if (!known.has(peerId) || !data) {
      return;
    }
    const clamp = (n) => Math.max(-60, Math.min(60, Number(n) || 0));
    handlers.state(peerId, { x: clamp(data.x), z: clamp(data.z), f: Number(data.f) || 0 });
  });
  actions.say.on((data, peerId) => {
    if (known.has(peerId) && data && PHRASES.some((p) => p.id === data.id)) {
      handlers.say(peerId, data.id);
    }
  });
  actions.give.on((data, peerId) => {
    if (!known.has(peerId) || !data) {
      return;
    }
    const project = PROJECTS.find((p) => p.id === data.p);
    const n = Math.floor(Number(data.n) || 0);
    if (project && ITEMS[data.item] && project.need[data.item] && n > 0 && n <= 20) {
      handlers.give(peerId, { p: project.id, item: data.item, n });
    }
  });

  return {
    code: roomCode,
    sendState(state) {
      const rounded = { x: Math.round(state.x * 10) / 10, z: Math.round(state.z * 10) / 10, f: Math.round(state.f * 10) / 10 };
      const changed = !lastState || lastState.x !== rounded.x || lastState.z !== rounded.z || lastState.f !== rounded.f;
      lastState = rounded;
      if (changed) {
        actions.state.send(rounded);
      }
    },
    say(phraseId) {
      actions.say.send({ id: phraseId });
    },
    give(projectId, item, n) {
      actions.give.send({ p: projectId, item, n });
    },
    updateProfile(profileUpdate) {
      me = { ...me, ...profileUpdate };
      actions.hello.send({ name: me.name, color: me.color, hat: me.hat });
    },
    peerName: (peerId) => (known.has(peerId) ? known.get(peerId).name : 'Guest'),
    peerCount: () => known.size,
    leave() {
      room.leave();
    },
  };
}
