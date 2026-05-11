import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
  auth: { token: localStorage.getItem('token') },
  autoConnect: false,
});

export default socket;
