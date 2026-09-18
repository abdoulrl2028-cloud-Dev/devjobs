import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/cadastro",
        "/profile",
        "/dashboard",
        "/favoritos",
        "/admin",
        "/pagamento",
        "/publicar-vaga",
        "/api/",
      ],
    },
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl("/"),
  };
}