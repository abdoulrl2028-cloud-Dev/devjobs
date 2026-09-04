import crypto from "node:crypto";

export type User = {
  id: string;
  name: string;
  email: string;
};

type StoredUser = User & {
  passwordHash: string;
  salt: string;
};

const SECRET = process.env.AUTH_SECRET || "devjobs-demo-secret-change-me";
const COOKIE_NAME = "devjobs_session";
const SESSION_DAYS = 7;

// scrypt: KDF lento e resistente a ataques de força bruta com GPU.
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 32;

function hashPassword(password: string, salt: string): string {
  return crypto
    .scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)
    .toString("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const storedUsers: StoredUser[] = [
  {
    id: "u_demo",
    name: "Ana Souza",
    email: "demo@devjobs.com",
    salt: "demo-salt-v2",
    passwordHash: hashPassword("demo123", "demo-salt-v2"),
  },
  {
    id: "u_admin",
    name: "Admin Dev",
    email: "admin@devjobs.com",
    salt: "admin-salt-v2",
    passwordHash: hashPassword("admin123", "admin-salt-v2"),
  },
];

export function verifyCredentials(email: string, password: string): User | null {
  const user = storedUsers.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
  if (!user) return null;

  const incoming = Buffer.from(hashPassword(password, user.salt), "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  if (incoming.length !== expected.length || !crypto.timingSafeEqual(incoming, expected)) {
    return null;
  }
  return { id: user.id, name: user.name, email: user.email };
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(user: User): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      exp: Date.now() + SESSION_DAYS * 86400000,
      iat: Date.now(),
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): User | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sign(payload), sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;
    return { id: data.sub, name: data.name, email: data.email };
  } catch {
    return null;
  }
}

export function isSameOrigin(
  request: Request,
  compareHeaders: string[] = ["origin", "referer"]
): boolean {
  const host = request.headers.get("host");
  if (!host) return false;
  return compareHeaders.every((header) => {
    const value = request.headers.get(header);
    if (!value) return true; // ausente (ex.: curl) — não bloqueia
    try {
      return new URL(value).host === host;
    } catch {
      return false;
    }
  });
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function hasValidCredentialsShape(
  email: unknown,
  password: unknown
): email is string {
  return (
    typeof email === "string" &&
    typeof password === "string" &&
    isValidEmail(email) &&
    password.length >= 6 &&
    email.length <= 254 &&
    password.length <= 128
  );
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: (maxAge?: number) => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }),
};