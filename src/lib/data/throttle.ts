// Per-instance guard for a provider's rate limit: after a rejection no request goes
// out until the provider's window resets, and identical requests in flight share one
// call. Hammering a provider while limited only keeps the limit in place.
export class RateLimitError extends Error {}

export function throttle(name: string) {
  let blockedUntil = 0;
  const inflight = new Map<string, Promise<unknown>>();
  return {
    run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      if (Date.now() < blockedUntil) return Promise.reject(new RateLimitError(`${name}: rate limited, retrying after the window resets`));
      const pending = inflight.get(key);
      if (pending) return pending as Promise<T>;
      const p = fn().finally(() => inflight.delete(key));
      inflight.set(key, p);
      return p;
    },
    block(seconds: number) {
      blockedUntil = Math.max(blockedUntil, Date.now() + seconds * 1000);
    },
  };
}
