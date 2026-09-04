import { queryAll, queryOne, execute } from "./conn";
import { newId } from "../crypto";
import type {
  Company,
  Subscription,
  Payment,
  Plan,
} from "../types";

function toCompany(row: Record<string, unknown>): Company {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    logoColor: String(row.logo_color),
    logoUrl: (row.logo_url as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function getCompanyByUserId(userId: string): Promise<Company | undefined> {
  const row = await queryOne("SELECT * FROM companies WHERE user_id = ?", [userId]);
  return row ? toCompany(row) : undefined;
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
  const row = await queryOne("SELECT * FROM companies WHERE id = ?", [id]);
  return row ? toCompany(row) : undefined;
}

export async function createCompany(data: {
  userId: string;
  name: string;
  logoColor?: string;
  logoUrl?: string | null;
  website?: string | null;
  description?: string | null;
}): Promise<Company> {
  const id = newId("co");
  const color = data.logoColor || "#6d28d9";
  const createdAt = new Date().toISOString();
  await execute(
    "INSERT INTO companies (id, user_id, name, logo_color, logo_url, website, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      data.userId,
      data.name.trim(),
      color,
      data.logoUrl ?? null,
      data.website ?? null,
      data.description ?? null,
      createdAt,
    ]
  );
  return {
    id,
    userId: data.userId,
    name: data.name.trim(),
    logoColor: color,
    logoUrl: data.logoUrl ?? null,
    website: data.website ?? null,
    description: data.description ?? null,
    createdAt,
  };
}

export async function updateCompany(
  id: string,
  data: Partial<Pick<Company, "name" | "logoColor" | "logoUrl" | "website" | "description">>
): Promise<void> {
  const sets: string[] = [];
  const params: (string | null)[] = [];
  if (data.name !== undefined) {
    sets.push("name = ?");
    params.push(data.name.trim());
  }
  if (data.logoColor !== undefined) {
    sets.push("logo_color = ?");
    params.push(data.logoColor);
  }
  if (data.logoUrl !== undefined) {
    sets.push("logo_url = ?");
    params.push(data.logoUrl);
  }
  if (data.website !== undefined) {
    sets.push("website = ?");
    params.push(data.website);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    params.push(data.description);
  }
  if (sets.length === 0) return;
  params.push(id);
  await execute(`UPDATE companies SET ${sets.join(", ")} WHERE id = ?`, params);
}

export async function listCompanies(): Promise<Company[]> {
  const rows = await queryAll("SELECT * FROM companies ORDER BY created_at DESC");
  return rows.map(toCompany);
}

export async function deleteCompany(id: string): Promise<void> {
  // Remove dependências vinculadas em cascade manual (portável entre SQLite e PG).
  await execute(
    "DELETE FROM applications WHERE job_id IN (SELECT id FROM jobs WHERE company_id = ?)",
    [id]
  );
  await execute(
    "DELETE FROM favorites WHERE job_id IN (SELECT id FROM jobs WHERE company_id = ?)",
    [id]
  );
  await execute(
    "DELETE FROM job_views WHERE job_id IN (SELECT id FROM jobs WHERE company_id = ?)",
    [id]
  );
  await execute("DELETE FROM payments WHERE company_id = ?", [id]);
  await execute("DELETE FROM subscriptions WHERE company_id = ?", [id]);
  await execute("DELETE FROM jobs WHERE company_id = ?", [id]);
  await execute("DELETE FROM companies WHERE id = ?", [id]);
}

/* ------------------------- Subscriptions ------------------------- */

export async function getActiveSubscription(
  companyId: string
): Promise<Subscription | undefined> {
  const row = await queryOne(
    "SELECT * FROM subscriptions WHERE company_id = ? AND status = 'active' AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
    [companyId, new Date().toISOString()]
  );
  if (!row) return undefined;
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    plan: row.plan as Plan,
    status: row.status as Subscription["status"],
    startedAt: String(row.started_at),
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
  };
}

// Plano efetivo = assinatura ativa, senão "free".
export async function getEffectivePlan(companyId: string): Promise<Plan> {
  const sub = await getActiveSubscription(companyId);
  return sub?.plan ?? "free";
}

export async function createSubscription(data: {
  companyId: string;
  plan: Plan;
  durationDays?: number;
}): Promise<Subscription> {
  const id = newId("sub");
  const now = new Date();
  const startsAt = now.toISOString();
  const days = data.durationDays ?? (data.plan === "empresa" ? 30 : 30);
  const expiresAt = new Date(now.getTime() + days * 86400000).toISOString();
  await execute(
    "INSERT INTO subscriptions (id, company_id, plan, status, started_at, expires_at, created_at) VALUES (?, ?, ?, 'active', ?, ?, ?)",
    [id, data.companyId, data.plan, startsAt, expiresAt, startsAt]
  );
  return {
    id,
    companyId: data.companyId,
    plan: data.plan,
    status: "active",
    startedAt: startsAt,
    expiresAt,
    createdAt: startsAt,
  };
}

export async function countActiveSubscriptions(companyId?: string): Promise<number> {
  const params: string[] = [];
  let where = "status = 'active' AND expires_at > ?";
  params.push(new Date().toISOString());
  if (companyId) {
    where += " AND company_id = ?";
    params.push(companyId);
  }
  const row = await queryOne(
    `SELECT COUNT(*) AS total FROM subscriptions WHERE ${where}`,
    params
  );
  return Number(row?.total ?? 0);
}

/* ------------------------- Payments ------------------------- */

export async function createPayment(data: {
  companyId: string;
  jobId?: string | null;
  plan: Plan;
  amount: number;
  currency?: string;
  status: Payment["status"];
  stripePaymentId?: string | null;
}): Promise<Payment> {
  const id = newId("pay");
  const createdAt = new Date().toISOString();
  await execute(
    "INSERT INTO payments (id, company_id, job_id, plan, amount, currency, status, stripe_payment_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      data.companyId,
      data.jobId ?? null,
      data.plan,
      data.amount,
      data.currency ?? "BRL",
      data.status,
      data.stripePaymentId ?? null,
      createdAt,
    ]
  );
  return {
    id,
    companyId: data.companyId,
    plan: data.plan,
    amount: data.amount,
    currency: data.currency ?? "BRL",
    status: data.status,
    stripePaymentId: data.stripePaymentId ?? null,
    createdAt,
  };
}

function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    plan: row.plan as Plan,
    amount: Number(row.amount),
    currency: String(row.currency),
    status: row.status as Payment["status"],
    stripePaymentId: (row.stripe_payment_id as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listPayments(companyId?: string): Promise<Payment[]> {
  const params: string[] = [];
  let where = "1 = 1";
  if (companyId) {
    where = "company_id = ?";
    params.push(companyId);
  }
  const rows = await queryAll(
    `SELECT * FROM payments WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  return rows.map(rowToPayment);
}

export async function getPaymentsForJob(jobId: string): Promise<Payment[]> {
  const rows = await queryAll(
    "SELECT * FROM payments WHERE job_id = ? ORDER BY created_at DESC",
    [jobId]
  );
  return rows.map(rowToPayment);
}

// Encontra um pagamento pendente vinculado à vaga — usado para confirmar
// sem depender apenas de campos enviados pelo cliente.
export async function findPendingPayment(
  companyId: string,
  jobId: string,
  plan: Plan
): Promise<Payment | null> {
  const row = await queryOne(
    "SELECT * FROM payments WHERE company_id = ? AND job_id = ? AND plan = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [companyId, jobId, plan]
  );
  return row ? rowToPayment(row) : null;
}

export async function setPaymentStatus(id: string, status: Payment["status"]): Promise<void> {
  await execute("UPDATE payments SET status = ? WHERE id = ?", [status, id]);
}

export async function sumPaidPayments(since?: string): Promise<number> {
  const params: string[] = [];
  let where = "status = 'paid'";
  if (since) {
    where += " AND created_at >= ?";
    params.push(since);
  }
  const row = await queryOne(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE ${where}`, params);
  return Number(row?.total ?? 0);
}

export async function countPaidPayments(): Promise<number> {
  const row = await queryOne("SELECT COUNT(*) AS total FROM payments WHERE status = 'paid'");
  return Number(row?.total ?? 0);
}

export async function sumPaidPaymentsForCompany(companyId: string): Promise<number> {
  const row = await queryOne(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE company_id = ? AND status = 'paid'",
    [companyId]
  );
  return Number(row?.total ?? 0);
}