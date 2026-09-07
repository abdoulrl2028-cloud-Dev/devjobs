export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://devjobs-rachids-projects-5d6d0be4.vercel.app";

export function siteUrl(path = ""): string {
  return `${BASE_URL}${path}`;
}

export function jsonLd(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data) };
}

export const openGraphDefaults = {
  siteName: "DevJobs",
  images: [{ url: siteUrl("/icon-512.png"), width: 512, height: 512, alt: "DevJobs" }],
  locale: "pt_BR",
  type: "website" as const,
};