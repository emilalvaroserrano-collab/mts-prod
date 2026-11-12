import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function usePortalLive(token: string) {
  const client = useQueryClient();
  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    let socket: WebSocket | null = null;
    let timer = 0;
    let attempt = 0;
    let stopped = false;

    function connect() {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${proto}://${window.location.host}/api/live`);
      socket.onopen = () => {
        attempt = 0;
        socket?.send(JSON.stringify({ type: "hello", token }));
      };
      socket.onmessage = (event) => {
        let body: { type?: string } = {};
        try {
          body = JSON.parse(String(event.data)) as { type?: string };
        } catch {
          return;
        }
        if (body.type === "notices") {
          void client.invalidateQueries({ queryKey: ["customer-notices", token] });
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        const wait = Math.min(15000, 1000 * 2 ** attempt);
        attempt += 1;
        timer = window.setTimeout(connect, wait);
      };
    }

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [client, token]);
}
