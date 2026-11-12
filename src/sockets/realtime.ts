import http from 'http';
import { Server } from 'socket.io';
import { corsOrigin } from '../config/env';
import { myCouple } from '../models/couple';
import { verifyToken } from '../services/jwt';

export function initRealtime(server: http.Server) {
  const io = new Server(server, { cors: { origin: corsOrigin } });

  io.use((socket, next) => {
    try {
      socket.data.uid = verifyToken(String(socket.handshake.auth.token ?? ''));
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const couple = await myCouple(socket.data.uid);
    if (!couple) {
      socket.emit('no-couple');
      return socket.disconnect();
    }
    const room = `couple:${couple.id}`;
    socket.join(room);
    const peerOnline = (io.sockets.adapter.rooms.get(room)?.size ?? 1) > 1;
    socket.emit('joined', { role: couple.role, code: couple.code, peerOnline });
    socket.to(room).emit('peer-joined');

    for (const ev of ['state', 'event', 'emote']) {
      socket.on(ev, (payload) => socket.to(room).emit(ev, payload));
    }
    socket.on('disconnect', () => socket.to(room).emit('peer-left'));
  });

  return io;
}
