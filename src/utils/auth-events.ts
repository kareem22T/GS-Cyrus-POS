type Listener = () => void;
const listeners = new Set<Listener>();

export const onUnauthorized = (cb: Listener) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const emitUnauthorized = () => {
  for (const cb of Array.from(listeners)) {
    try {
      cb();
    } catch (err) {
      // swallow listener errors
      console.warn("onUnauthorized listener error:", err);
    }
  }
};
