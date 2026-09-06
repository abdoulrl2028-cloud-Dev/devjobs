import { queryAll, queryOne, execute } from "./conn";

export type Coupon = {
  code: string;
  percent: number;
  active: boolean;
};

export function toCoupon(row: Record<string, unknown>): Coupon {
  return {
    code: String(row.code),
    percent: Number(row.percent),
    active: Boolean(row.active),
  };
}

// Devolve apenas cupons ativos e dentro do limite de usos.
export async function findCouponByCode(code: string): Promise<Coupon | undefined> {
  const row = await queryOne(
    `SELECT code, percent, active, max_uses, used_count
     FROM coupons
     WHERE UPPER(code) = UPPER(?) AND active = 1`,
    [code.trim()]
  );
  if (!row) return undefined;
  const maxUses = Number(row.max_uses);
  const used = Number(row.used_count);
  if (maxUses > 0 && used >= maxUses) return undefined;
  return toCoupon(row);
}

// Calcula o preço final com desconto (em reais inteiros).
export function discountedPrice(base: number, percent: number): number {
  const pct = Math.min(100, Math.max(0, percent));
  return Math.round((base * (100 - pct)) / 100);
}

export async function registerCouponUse(code: string): Promise<void> {
  try {
    await execute("UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code) = UPPER(?)", [code.trim()]);
  } catch {
    // Tabela ausente em DBs antigos sem migração: ignora silenciosamente.
  }
}

export async function findAllCoupons(): Promise<Coupon[]> {
  const rows = await queryAll("SELECT code, percent, active FROM coupons ORDER BY created_at ASC");
  return rows.map(toCoupon);
}