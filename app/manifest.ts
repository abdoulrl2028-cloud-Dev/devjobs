import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Web App Manifest — permite instalar o site como app no Android
// ("Adicionar à tela inicial") e no desktop (Chrome/Edge/Windows).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevJobs — Vagas de tecnologia",
    short_name: "DevJobs",
    description:
      "Encontre as melhores vagas de tecnologia: frontend, backend, mobile, dados, DevOps e muito mais.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b14",
    theme_color: "#6d28d9",
    lang: "pt-BR",
    categories: ["business", "productivity", "jobs"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}