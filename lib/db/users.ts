import crypto from "node:crypto";
import { queryAll, queryOne, execute, likeEscape } from "./conn";
import { newId, hashPassword, newSalt } from "../crypto";
import type { User, UserRole } from "../types";

export type OAuthProvider = "google" | "facebook";

export type StoredUser = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  name: string;
  created_at: string;
  google_id?: string | null;
  facebook_id?: string | null;
  avatar_url?: string | null;
};

export async function getUserByEmail(email: string): Promise<StoredUser | undefined> {
  const row = await queryOne("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  return row as unknown as StoredUser | undefined;
}

export async function getUserById(id: string): Promise<StoredUser | undefined> {
  const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
  return row as unknown as StoredUser | undefined;
}

export function oauthProviderColumn(provider: OAuthProvider): "google_id" | "facebook_id" {
  return provider === "google" ? "google_id" : "facebook_id";
}

export async function getUserByOAuth(
  provider: OAuthProvider,
  providerId: string
): Promise<StoredUser | undefined> {
  const column = oauthProviderColumn(provider);
  const row = await queryOne(`SELECT * FROM users WHERE ${column} = ?`, [providerId]);
  return row as unknown as StoredUser | undefined;
}

// Senha impossível para contas criadas via login social: o usuário nunca
// autentica por senha, e mesmo que a hash vaze não pode ser usada.
function dummyPasswordHash(salt: string): string {
  return hashPassword(crypto.randomBytes(32).toString("hex"), salt);
}

export async function createOAuthUser({
  provider,
  providerId,
  email,
  name,
  avatarUrl,
}: {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}): Promise<User> {
  const id = newId(provider === "google" ? "ug" : "uf");
  const salt = newSalt();
  const createdAt = new Date().toISOString();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim() || "Usuário DevJobs";
  const column = oauthProviderColumn(provider);
  await execute(
    `INSERT INTO users (id, email, password_hash, salt, role, name, created_at, ${column}, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      cleanEmail,
      dummyPasswordHash(salt),
      salt,
      "candidate",
      cleanName,
      createdAt,
      providerId,
      avatarUrl ?? null,
    ]
  );
  return { id, email: cleanEmail, role: "candidate", name: cleanName, createdAt };
}

export async function linkOAuthId(
  userId: string,
  provider: OAuthProvider,
  providerId: string
): Promise<void> {
  const column = oauthProviderColumn(provider);
  await execute(`UPDATE users SET ${column} = ? WHERE id = ?`, [providerId, userId]);
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<void> {
  await execute("UPDATE users SET avatar_url = ? WHERE id = ?", [avatarUrl, userId]);
}

export async function createUser({
  email,
  password,
  role,
  name,
}: {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}): Promise<User> {
  const id = newId("u");
  const salt = newSalt();
  const createdAt = new Date().toISOString();
  await execute(
    "INSERT INTO users (id, email, password_hash, salt, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, email.trim().toLowerCase(), hashPassword(password, salt), salt, role, name.trim(), createdAt]
  );
  return { id, email: email.trim().toLowerCase(), role, name: name.trim(), createdAt };
}

export async function listUsers(): Promise<StoredUser[]> {
  const rows = await queryAll("SELECT * FROM users ORDER BY created_at DESC");
  return rows as unknown as StoredUser[];
}

export async function countUsersByRole(role: UserRole): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM users WHERE role = ?", [role]);
  return Number(row?.total ?? 0);
}

export async function deleteUser(id: string): Promise<void> {
  await execute("DELETE FROM users WHERE id = ?", [id]);
}

export async function updateUserName(id: string, name: string): Promise<void> {
  await execute("UPDATE users SET name = ? WHERE id = ?", [name.trim(), id]);
}

export async function searchCandidates(term: string): Promise<StoredUser[]> {
  const rows = await queryAll(
    "SELECT * FROM users WHERE role = 'candidate' AND (LOWER(name) LIKE ? ESCAPE '\\')",
    [`%${likeEscape(term.toLowerCase())}%`]
  );
  return rows as unknown as StoredUser[];
}