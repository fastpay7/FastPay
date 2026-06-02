import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function connectSocket(userId) {
  const s = getSocket()
  if (!s.connected) s.connect()
  s.emit('register', userId)
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
    socket = null
  }
}
