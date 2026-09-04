import { queryAll, queryOne, execute, likeEscape } from "./conn";
import { newId, hashPassword, newSalt } from "../crypto";
import type { User, UserRole } from "../types";

export type StoredUser = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  name: string;
  created_at: string;
};

export async function getUserByEmail(email: string): Promise<StoredUser | undefined> {
  const row = await queryOne("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  return row as unknown as StoredUser | undefined;
}

export async function getUserById(id: string): Promise<StoredUser | undefined> {
  const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
  return row as unknown as StoredUser | undefined;
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