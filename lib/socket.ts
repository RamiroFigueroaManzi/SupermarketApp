import { Server as SocketServer } from "socket.io";
import type { Server as HTTPServer } from "http";

// globalThis comparte la instancia entre el server.js de esbuild y los
// chunks de Next.js (que son módulos separados en el mismo proceso Node.js)
const g = globalThis as unknown as { __socketIO?: SocketServer };

export function initSocket(httpServer: HTTPServer): SocketServer {
  if (g.__socketIO) return g.__socketIO;

  g.__socketIO = new SocketServer(httpServer, {
    path: "/api/socket",
    transports: ["websocket", "polling"],
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  g.__socketIO.on("connection", (socket) => {
    const { userId, role } = socket.handshake.auth as {
      userId?: string;
      role?: string;
    };

    if (userId) socket.join(`cliente:${userId}`);
    if (role === "OPERADOR" || role === "ADMINISTRADOR") socket.join("operadores");
  });

  return g.__socketIO;
}

export function emitOrderStatusChanged(
  userId: string,
  pedidoId: string,
  nuevoEstado: string
) {
  if (!g.__socketIO) return;
  g.__socketIO.to(`cliente:${userId}`).emit("pedido:estado_cambiado", {
    pedidoId,
    nuevoEstado,
    timestamp: new Date().toISOString(),
  });
}

export function emitOrdersListUpdated(payload: {
  pedidoId: string;
  estado: string;
  clienteNombre: string;
  cantidadItems: number;
}) {
  if (!g.__socketIO) return;
  g.__socketIO.to("operadores").emit("pedidos:lista_actualizada", payload);
}
