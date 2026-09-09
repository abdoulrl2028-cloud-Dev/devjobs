// Migrações do banco de dados (SQL portável entre SQLite e Postgres).
// Executadas automaticamente na inicialização (lib/db/init.ts).

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  logo_color TEXT NOT NULL DEFAULT '#6d28d9',
  logo_url TEXT,
  website TEXT,
  description TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  remote INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  currency TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  quantity INTEGER NOT NULL DEFAULT 1,
  contact_email TEXT NOT NULL,
  apply_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  featured INTEGER NOT NULL DEFAULT 0,
  sponsored INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  logo_color TEXT,
  responsibilities TEXT NOT NULL DEFAULT '[]',
  requirements TEXT NOT NULL DEFAULT '[]',
  benefits TEXT NOT NULL DEFAULT '[]',
  views INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON jobs(featured);
CREATE INDEX IF NOT EXISTS idx_jobs_sponsored ON jobs(sponsored);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  candidate_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'applied',
  applied_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_unique ON applications(job_id, candidate_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, job_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  job_id TEXT,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL,
  stripe_payment_id TEXT,
  coupon_code TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS candidate_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  tier TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_id TEXT,
  started_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidate_subscriptions_user ON candidate_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_candidate_subscriptions_status ON candidate_subscriptions(status);

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  photo_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  experience TEXT NOT NULL DEFAULT '0-1',
  location TEXT,
  available_remote INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidates_location ON candidate_profiles(location);
CREATE INDEX IF NOT EXISTS idx_candidates_experience ON candidate_profiles(experience);

CREATE TABLE IF NOT EXISTS candidate_skills (
  id TEXT PRIMARY KEY,
  candidate_profile_id TEXT NOT NULL REFERENCES candidate_profiles(id),
  skill TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill ON candidate_skills(skill);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_profile ON candidate_skills(candidate_profile_id);

CREATE TABLE IF NOT EXISTS job_views (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  viewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_views_job ON job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_date ON job_views(viewed_at);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  percent INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  max_uses INTEGER NOT NULL DEFAULT 0,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

/* ---------- DevJobs Premium (candidato) ---------- */

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  location TEXT,
  remote INTEGER NOT NULL DEFAULT 0,
  type TEXT,
  salary_min INTEGER,
  tags TEXT NOT NULL DEFAULT '[]',
  frequency TEXT NOT NULL DEFAULT 'weekly',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_run_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  job_id TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  track TEXT NOT NULL,
  job_id TEXT,
  topic TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL DEFAULT '[]',
  answers TEXT NOT NULL DEFAULT '[]',
  score INTEGER,
  metrics TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interviews_user ON interviews(user_id);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user ON ai_analyses(user_id);
`;

export async function migrateDatabase(): Promise<void> {
  const { runMigrations } = await import("./conn");
  await runMigrations(SCHEMA_SQL);
}