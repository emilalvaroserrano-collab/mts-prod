type LiveSocket = { send: (data: string) => void };

type Hub = Map<number, Set<LiveSocket>>;

const KEY = "__mtsLiveHub";

function hub(): Hub {
  const g = globalThis as typeof globalThis & { [KEY]?: Hub };
  if (!g[KEY]) g[KEY] = new Map();
  return g[KEY];
}

export function bindLiveSocket(customerId: number, socket: LiveSocket) {
  const set = hub().get(customerId) ?? new Set();
  set.add(socket);
  hub().set(customerId, set);
  return () => {
    set.delete(socket);
    if (!set.size) hub().delete(customerId);
  };
}

export function publishLive(customerId: number, event: { type: "notices" }) {
  const set = hub().get(customerId);
  if (!set) return;
  const body = JSON.stringify(event);
  for (const socket of set) {
    try {
      socket.send(body);
    } catch {
      set.delete(socket);
    }
  }
}
