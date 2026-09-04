export function formatSalary(salary: { min: number; max: number; currency: string } | null): string {
  if (!salary) return "Salário a combinar";
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: salary.currency,
    maximumFractionDigits: 0,
  });
  return `${fmt.format(salary.min)} – ${fmt.format(salary.max)}`;
}

export function formatPostedAt(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "há 1 dia";
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "há 1 semana" : `há ${weeks} semanas`;
}

export const jobTypeLabels: Record<string, string> = {
  "full-time": "Tempo integral",
  "part-time": "Meio período",
  contract: "Contrato",
  internship: "Estágio",
};

export function initials(company: string): string {
  return company
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}