import { queryAll, queryOne, likeEscape, withTransaction } from "./conn";
import { newId } from "../crypto";
import type { CandidateProfile } from "../types";

function attachSkills(profiles: CandidateProfile[], skillsByProfile: Map<string, string[]>): CandidateProfile[] {
  return profiles.map((p) => ({ ...p, skills: skillsByProfile.get(p.id) ?? [] }));
}

async function loadSkills(profileIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (profileIds.length === 0) return map;
  const placeholders = profileIds.map(() => "?").join(", ");
  const rows = await queryAll(
    `SELECT candidate_profile_id AS pid, skill FROM candidate_skills WHERE candidate_profile_id IN (${placeholders}) ORDER BY skill`,
    profileIds
  );
  for (const row of rows) {
    const pid = String(row.pid);
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid)!.push(String(row.skill));
  }
  return map;
}

function toProfile(row: Record<string, unknown>, skills: string[] = []): CandidateProfile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    fullName: String(row.full_name),
    headline: String(row.headline),
    summary: (row.summary as string | null) ?? null,
    photoUrl: (row.photo_url as string | null) ?? null,
    githubUrl: (row.github_url as string | null) ?? null,
    linkedinUrl: (row.linkedin_url as string | null) ?? null,
    resumeUrl: (row.resume_url as string | null) ?? null,
    experience: String(row.experience),
    location: (row.location as string | null) ?? null,
    availableRemote: Boolean(row.available_remote),
    skills,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function getProfileByUserId(userId: string): Promise<CandidateProfile | undefined> {
  const row = await queryOne("SELECT * FROM candidate_profiles WHERE user_id = ?", [userId]);
  if (!row) return undefined;
  const profile = toProfile(row);
  const skills = await loadSkills([profile.id]);
  return attachSkills([profile], skills)[0];
}

export async function getProfileById(id: string): Promise<CandidateProfile | undefined> {
  const row = await queryOne("SELECT * FROM candidate_profiles WHERE id = ?", [id]);
  if (!row) return undefined;
  const profile = toProfile(row);
  const skills = await loadSkills([profile.id]);
  return attachSkills([profile], skills)[0];
}

export async function upsertProfile(data: {
  userId: string;
  fullName: string;
  headline: string;
  summary?: string | null;
  photoUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  experience: string;
  location?: string | null;
  availableRemote: boolean;
  skills: string[];
}): Promise<CandidateProfile> {
  const now = new Date().toISOString();
  const existing = await getProfileByUserId(data.userId);
  const id = existing?.id ?? newId("cand");

  await withTransaction(async (tx) => {
    if (existing) {
      await tx.execute(
        `UPDATE candidate_profiles SET
          full_name = ?, headline = ?, summary = ?, photo_url = ?, github_url = ?,
          linkedin_url = ?, resume_url = ?, experience = ?, location = ?,
          available_remote = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.fullName.trim(),
          data.headline.trim(),
          data.summary ?? null,
          data.photoUrl ?? null,
          data.githubUrl ?? null,
          data.linkedinUrl ?? null,
          data.resumeUrl ?? null,
          data.experience,
          data.location ?? null,
          data.availableRemote ? 1 : 0,
          now,
          id,
        ]
      );
    } else {
      await tx.execute(
        `INSERT INTO candidate_profiles (
          id, user_id, full_name, headline, summary, photo_url, github_url,
          linkedin_url, resume_url, experience, location, available_remote, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.userId,
          data.fullName.trim(),
          data.headline.trim(),
          data.summary ?? null,
          data.photoUrl ?? null,
          data.githubUrl ?? null,
          data.linkedinUrl ?? null,
          data.resumeUrl ?? null,
          data.experience,
          data.location ?? null,
          data.availableRemote ? 1 : 0,
          now,
          now,
        ]
      );
    }

    await tx.execute("DELETE FROM candidate_skills WHERE candidate_profile_id = ?", [id]);
    const uniqueSkills = [...new Set(data.skills.map((s) => s.trim()).filter(Boolean))].slice(0, 20);
    for (const skill of uniqueSkills) {
      await tx.execute(
        "INSERT INTO candidate_skills (id, candidate_profile_id, skill) VALUES (?, ?, ?)",
        [newId("sk"), id, skill]
      );
    }
  });

  return (await getProfileById(id))!;
}

export type TalentFilter = {
  skill?: string | null;
  cargo?: string | null;
  experience?: string | null;
  location?: string | null;
  remote?: boolean | null;
};

export async function searchTalents(filter: TalentFilter): Promise<CandidateProfile[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filter.skill) {
    where.push(
      "p.id IN (SELECT candidate_profile_id FROM candidate_skills WHERE LOWER(skill) LIKE ? ESCAPE '\\')"
    );
    params.push(`%${likeEscape(filter.skill.toLowerCase())}%`);
  }
  if (filter.cargo) {
    where.push("LOWER(p.headline) LIKE ? ESCAPE '\\'");
    params.push(`%${likeEscape(filter.cargo.toLowerCase())}%`);
  }
  if (filter.experience) {
    where.push("p.experience = ?");
    params.push(filter.experience);
  }
  if (filter.location) {
    where.push("LOWER(COALESCE(p.location, '')) LIKE ? ESCAPE '\\'");
    params.push(`%${likeEscape(filter.location.toLowerCase())}%`);
  }
  if (filter.remote !== null && filter.remote !== undefined) {
    where.push(`p.available_remote = ${filter.remote ? 1 : 0}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await queryAll(
    `SELECT * FROM candidate_profiles p ${whereClause} ORDER BY p.updated_at DESC LIMIT 60`,
    params
  );
  const profiles = rows.map((r) => toProfile(r));
  const skills = await loadSkills(profiles.map((p) => p.id));
  return attachSkills(profiles, skills);
}

export async function listAllProfiles(): Promise<CandidateProfile[]> {
  const rows = await queryAll("SELECT * FROM candidate_profiles ORDER BY updated_at DESC LIMIT 100");
  const profiles = rows.map((r) => toProfile(r));
  const skills = await loadSkills(profiles.map((p) => p.id));
  return attachSkills(profiles, skills);
}

export async function countCandidateProfiles(): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM candidate_profiles");
  return Number(row?.total ?? 0);
}