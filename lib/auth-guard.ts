// Proteção contra brute-force distribuído: além do rate limit por IP (proxy),
// bloqueia tentativas repetidas em uma mesma conta (e+IP) com janela deslizante.
// Em memória por instância — suficiente para o volume deste app.

type Entry = {
  fails: number;
  windowStart: number;
  lockedUntil: number;
};

const map = new Map<string, Entry>();
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const LOCKOUT_MS = 15 * 60 * 1000;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function key(email: string, ip: string): string {
  return `${normalize(email)}|${ip}`;
}

function entry(k: string, now: number): Entry {
  let e = map.get(k);
  if (!e) {
    e = { fails: 0, windowStart: now, lockedUntil: 0 };
    map.set(k, e);
  }
  if (now - e.windowStart > WINDOW_MS) {
    e.fails = 0;
    e.windowStart = now;
    e.lockedUntil = 0;
  }
  return e;
}

export function loginAttemptAllowed(
  email: string,
  ip: string
): { allowed: boolean; retryAfterSeconds?: number } {
  const e = entry(key(email, ip), Date.now());
  const now = Date.now();
  if (e.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((e.lockedUntil - now) / 1000),
    };
  }
  if (e.fails >= MAX_FAILS) {
    e.lockedUntil = now + LOCKOUT_MS;
    e.fails = 0;
    return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { allowed: true };
}

export function recordLoginFailure(email: string, ip: string): void {
  const e = entry(key(email, ip), Date.now());
  e.fails += 1;
}

export function clearLoginFailures(email: string, ip: string): void {
  map.delete(key(email, ip));
}