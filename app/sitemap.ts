import type { MetadataRoute } from "next";
import { getAllJobs } from "@/lib/db/jobs";
import { ensureDatabaseReady } from "@/lib/db/init";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC_PAGES = [
  { path: "", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { path: "/talentos", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  { path: "/para-empresas", lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  { path: "/planos", lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacidade", lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: siteUrl(p.path),
    lastModified: p.lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    await ensureDatabaseReady();
    const jobs = await getAllJobs();
    for (const job of jobs.filter((j) => j.status === "active")) {
      urls.push({
        url: siteUrl(`/vagas/${job.id}`),
        lastModified: new Date(job.postedAt),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  } catch {
    // Sem banco disponível: publica apenas as páginas estáticas.
  }

  return urls;
}