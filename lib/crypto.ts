import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "devjobs-demo-secret-change-me";
const KEY_LENGTH = 32;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;

export function newSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return crypto
    .scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS)
    .toString("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "candidate" | "company" | "admin";
};

const SESSION_DAYS = 7;

export function createSessionToken(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      exp: Date.now() + SESSION_DAYS * 86400000,
      iat: Date.now(),
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sign(payload), sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;
    return {
      id: data.sub,
      name: data.name,
      email: data.email,
      role: data.role ?? "candidate",
    };
  } catch {
    return null;
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("hex")}`;
}