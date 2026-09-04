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

function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(`${salt}${password}`).digest("hex");
}

const storedUsers: StoredUser[] = [
  {
    id: "u_demo",
    name: "Ana Souza",
    email: "demo@devjobs.com",
    salt: "demo-salt",
    passwordHash: hashPassword("demo123", "demo-salt"),
  },
  {
    id: "u_admin",
    name: "Admin Dev",
    email: "admin@devjobs.com",
    salt: "admin-salt",
    passwordHash: hashPassword("admin123", "admin-salt"),
  },
];

export function verifyCredentials(email: string, password: string): User | null {
  const user = storedUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return null;
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) return null;
  return { id: user.id, name: user.name, email: user.email };
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function createSessionToken(user: User): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, name: user.name, email: user.email, exp: Date.now() + SESSION_DAYS * 86400000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): User | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.exp === "number" && data.exp < Date.now()) return null;
    return { id: data.sub, name: data.name, email: data.email };
  } catch {
    return null;
  }
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