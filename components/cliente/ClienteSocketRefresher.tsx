"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { toast } from "sonner";

export default function ClienteSocketRefresher({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.refresh();

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      auth: { userId, role: "cliente" },
    });

    socket.on("pedido:estado_cambiado", (data: { pedidoId: string; nuevoEstado: string }) => {
      if (data.nuevoEstado === "LISTO") {
        toast.success("¡Tu pedido está listo para retirar!", { duration: 10000 });
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
      router.refresh();
    });

    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
