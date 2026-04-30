// Socket.IO client for real-time updates
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Adjust if needed
let socket: Socket | null = null;

export function connectSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket'] });
  }
  return socket;
}

export function onApprovalUpdate(cb: (data: any) => void) {
  connectSocket().on('approval_update', cb);
}

export function onGraphUpdate(cb: (data: any) => void) {
  connectSocket().on('graph_update', cb);
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
