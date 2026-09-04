import { NextRequest } from "next/server";
import { hashPassword, safeEqual, createSessionToken, verifySessionToken } from "./crypto";
import { getUserByEmail } from "./db/users";
import type { User } from "./types";

export type { SessionUser } from "./crypto";

export const COOKIE_NAME = "devjobs_session";

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

export async function verifyCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const stored = await getUserByEmail(email);
  if (!stored) return null;

  const incoming = Buffer.from(hashPassword(password, stored.salt), "hex");
  const expected = Buffer.from(stored.password_hash, "hex");
  if (
    incoming.length !== expected.length ||
    !safeEqual(incoming.toString("hex"), expected.toString("hex"))
  ) {
    return null;
  }

  return {
    id: stored.id,
    email: stored.email,
    role: stored.role,
    name: stored.name,
    createdAt: stored.created_at,
  };
}

export function readSessionUserFromRequest(
  request: NextRequest
): ReturnType<typeof verifySessionToken> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
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

export { createSessionToken, verifySessionToken };